import { Hono } from 'hono'
import { z } from 'zod'
import type { Env } from '../types'
import { getDb } from '../utils/db'
import { isValidAadhaar, normalizeAadhaar } from '../utils/aadhaar'
import { throttle } from '../utils/throttle'

/**
 * PUBLIC referrer registration intake. Mounted in index.ts BEFORE the global auth
 * middleware, alongside /api/auth, so these three endpoints are reachable
 * without a login.
 *
 * A referrer refers staff to Staffsway and registers them on the company's
 * behalf. This is not a commercial arrangement, so nothing here deals in rates,
 * agreements or billing.
 *
 * Threat model, since this is the app's only unauthenticated write surface:
 *   - `cors({ origin: '*' })` is already set globally, so any origin can post
 *     here. Rate limiting, a honeypot and a minimum fill time blunt casual
 *     abuse; they do not stop a determined attacker. For a real production
 *     rollout, put this page on its own host, restrict CORS for this path, and
 *     add Cloudflare Turnstile.
 *   - The referrer dropdown is self-asserted. A submitter can claim any referer.
 *     That is a claim for HR to verify at review, NOT an authenticated identity.
 *   - Nothing here ever returns an employee record. Duplicate Aadhaar comes
 *     back as a bare status so the endpoint cannot be used to confirm who holds
 *     a given Aadhaar number. The authenticated equivalent
 *     (employees.ts /check-aadhaar) is the one that returns the person.
 */

const APPLICATION_SCHEMA = z.object({
  referrer_id: z.number().int().positive(),
  full_name: z.string().trim().min(2).max(150),
  aadhaar: z.string().min(1).max(20),
  father_name: z.string().trim().max(100).optional().nullable(),
  gender: z.enum(['Male', 'Female', 'Other']).optional().nullable(),
  dob: z.string().optional().nullable(),
  marital_status: z.enum(['Single', 'Married', 'Divorced', 'Widowed']).optional().nullable(),
  nationality: z.string().trim().max(50).optional().nullable(),
  mobile: z.string().trim().min(6).max(20),
  alternate_mobile: z.string().trim().max(20).optional().nullable(),
  email: z.string().trim().email().max(191).optional().nullable().or(z.literal('')),
  address: z.string().trim().max(500).optional().nullable(),
  state: z.string().trim().max(100).optional().nullable(),
  district: z.string().trim().max(100).optional().nullable(),
  pincode: z.string().trim().max(10).optional().nullable(),
  permanent_same_as_present: z.boolean().optional(),
  permanent_address: z.string().trim().max(500).optional().nullable(),
  permanent_state: z.string().trim().max(100).optional().nullable(),
  permanent_district: z.string().trim().max(100).optional().nullable(),
  permanent_pincode: z.string().trim().max(10).optional().nullable(),
  emergency_contact_name: z.string().trim().max(100).optional().nullable(),
  emergency_contact_phone: z.string().trim().max(20).optional().nullable(),
  emergency_contact_relation: z.string().trim().max(50).optional().nullable(),
  bank_name: z.string().trim().max(100).optional().nullable(),
  bank_holder_name: z.string().trim().max(100).optional().nullable(),
  bank_account: z.string().trim().max(30).optional().nullable(),
  bank_ifsc: z.string().trim().max(20).optional().nullable(),
  pan: z.string().trim().max(20).optional().nullable(),
  uan: z.string().trim().max(20).optional().nullable(),
  esi_number: z.string().trim().max(20).optional().nullable(),
  experience: z.string().trim().max(50).optional().nullable(),
  previous_employment: z.string().trim().max(1000).optional().nullable(),
  // Anti-spam only. A real person never sees this field, so anything in it is
  // a bot. The extra "started_at" check below catches the other common trick.
  website: z.string().max(0).optional(),
  started_at: z.number().int().positive().optional(),
})

const checkSchema = z.object({
  aadhaar: z.string().min(1).max(20),
  website: z.string().max(0).optional(),
  started_at: z.number().int().positive().optional(),
})

const MIN_FILL_MS = 4_000

function clientKey(c: { req: { header: (n: string) => string | undefined } }): string {
  return c.req.header('CF-Connecting-IP') || 'local'
}

export const publicReferrerRoutes = new Hono<{ Bindings: Env }>()

/** Honeypot only. Cheap enough to also run on the fast Aadhaar check. */
function honeypot(website: string | undefined): string | null {
  return website ? 'Unable to submit this form.' : null
}

/** Honeypot plus a minimum fill time. Used on the real submission. */
function spamGuard(startedAt: number | undefined, website: string | undefined): string | null {
  const bot = honeypot(website)
  if (bot) return bot
  // A real person cannot complete the whole form in under 4s.
  if (startedAt && Date.now() - startedAt < MIN_FILL_MS) return 'Please take a moment to complete the form.'
  return null
}

/** Bare availability verdict. Never includes the matching person. */
async function aadhaarAvailability(db: D1Database, aadhaar: string) {
  const employee = await db.prepare('SELECT id FROM employees WHERE aadhaar = ?').bind(aadhaar).first()
  if (employee) return { available: false, reason: 'employee' as const }
  const pending = await db
    .prepare("SELECT id FROM referrer_applications WHERE aadhaar = ? AND status = 'pending'")
    .bind(aadhaar)
    .first()
  if (pending) return { available: false, reason: 'pending' as const }
  return { available: true, reason: null }
}

// Active referrers only, and only the two fields the public form needs. No
// phone, email or internal notes: none of that should be world-readable.
publicReferrerRoutes.get('/options', async (c) => {
  const db = getDb(c.env)
  const rows = await db
    .prepare("SELECT id, name, referrer_code FROM referrers WHERE status = 'active' ORDER BY name ASC")
    .all()
  return c.json({ data: rows.results })
})

publicReferrerRoutes.post('/check-aadhaar', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = checkSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Enter a valid Aadhaar number.' } }, 400)

  // Deliberately no minimum-fill-time check here: this fires the moment 12
  // digits are typed, and a person can genuinely do that in under 4 seconds.
  const bot = honeypot(parsed.data.website)
  if (bot) return c.json({ error: { code: 'rejected', message: bot } }, 400)

  const gate = throttle(`apply-check:${clientKey(c)}`, 40, 5 * 60 * 1000)
  if (gate.blocked) {
    return c.json(
      { error: { code: 'rate_limited', message: 'Too many checks. Please wait a few minutes and try again.' } },
      429
    )
  }

  if (!isValidAadhaar(parsed.data.aadhaar)) {
    return c.json({ error: { code: 'validation_error', message: 'Enter a valid 12-digit Aadhaar number.' } }, 400)
  }

  const db = getDb(c.env)
  return c.json({ data: await aadhaarAvailability(db, normalizeAadhaar(parsed.data.aadhaar)) })
})

publicReferrerRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = APPLICATION_SCHEMA.safeParse(body)
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'validation_error',
          message: 'Please correct the highlighted fields.',
          fields: parsed.error.flatten().fieldErrors,
        },
      },
      400
    )
  }
  const d = parsed.data

  const spam = spamGuard(d.started_at, d.website)
  if (spam) return c.json({ error: { code: 'rejected', message: spam } }, 400)

  const gate = throttle(`apply-submit:${clientKey(c)}`, 10, 60 * 60 * 1000)
  if (gate.blocked) {
    return c.json(
      { error: { code: 'rate_limited', message: 'Too many submissions. Please try again later.' } },
      429
    )
  }

  if (!isValidAadhaar(d.aadhaar)) {
    return c.json(
      { error: { code: 'validation_error', message: 'Enter a valid 12-digit Aadhaar number.', fields: { aadhaar: ['Invalid Aadhaar'] } } },
      400
    )
  }

  const db = getDb(c.env)
  const referrer = await db
    .prepare("SELECT id, name FROM referrers WHERE id = ? AND status = 'active'")
    .bind(d.referrer_id)
    .first()
  if (!referrer) {
    return c.json({ error: { code: 'validation_error', message: 'Please select a valid referrer.' } }, 400)
  }

  const aadhaar = normalizeAadhaar(d.aadhaar)
  const email = d.email ? String(d.email).trim() : ''

  // Re-checked here, not just at the form step: the public form is two separate
  // requests, and an employee can be created in between. The partial unique
  // indexes are the real guarantee; this is for a clean error message.
  const availability = await aadhaarAvailability(db, aadhaar)
  if (!availability.available) {
    const message =
      availability.reason === 'employee'
        ? 'This Aadhaar number is already registered with us. Please contact HR.'
        : 'A registration for this Aadhaar number is already under review.'
    return c.json({ error: { code: 'conflict', message, fields: { aadhaar: [message] } } }, 409)
  }

  const permOn = !!d.permanent_same_as_present
  try {
    const info = await db
      .prepare(
        `INSERT INTO referrer_applications
           (referrer_id, full_name, aadhaar, father_name, gender, dob, marital_status, nationality,
            mobile, alternate_mobile, email, address, state, district, pincode,
            permanent_same_as_present, permanent_address, permanent_state, permanent_district, permanent_pincode,
            emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
            bank_name, bank_holder_name, bank_account, bank_ifsc, pan, uan, esi_number,
            experience, previous_employment, status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      )
      .bind(
        d.referrer_id, d.full_name.trim(), aadhaar, d.father_name ?? null, d.gender ?? null, d.dob ?? null,
        d.marital_status ?? null, d.nationality || 'Indian',
        d.mobile.trim(), d.alternate_mobile ?? null, email || null,
        d.address ?? null, d.state ?? null, d.district ?? null, d.pincode ?? null,
        permOn ? 1 : 0,
        permOn ? (d.address ?? null) : (d.permanent_address ?? null),
        permOn ? (d.state ?? null) : (d.permanent_state ?? null),
        permOn ? (d.district ?? null) : (d.permanent_district ?? null),
        permOn ? (d.pincode ?? null) : (d.permanent_pincode ?? null),
        d.emergency_contact_name ?? null, d.emergency_contact_phone ?? null, d.emergency_contact_relation ?? null,
        d.bank_name ?? null, d.bank_holder_name ?? null, d.bank_account ?? null, d.bank_ifsc ?? null,
        d.pan ?? null, d.uan ?? null, d.esi_number ?? null,
        d.experience ?? null, d.previous_employment ?? null,
        'pending'
      )
      .run()

    return c.json(
      {
        data: {
          id: Number(info.meta.last_row_id),
          reference: `REF-${String(info.meta.last_row_id).padStart(6, '0')}`,
        },
        message: 'Registration submitted for review.',
      },
      201
    )
  } catch (err) {
    // Lost the race against a concurrent submit for the same Aadhaar. The
    // partial unique index caught it, which is the outcome we want anyway.
    const msg = String((err as Error)?.message || err)
    if (/unique constraint/i.test(msg) && /aadhaar/i.test(msg)) {
      return c.json(
        { error: { code: 'conflict', message: 'A registration for this Aadhaar number is already under review.' } },
        409
      )
    }
    throw err
  }
})
