import { Hono } from 'hono'
import { z } from 'zod'
import type { Env } from '../types'
import { getDb } from '../utils/db'
import { normalizeAadhaar } from '../utils/aadhaar'
import { createEmployee, EmployeeConflictError } from '../services/employeeCreation'

/**
 * Referrer master + the public registration review queue.
 *
 * A referrer refers staff to Staffsway and registers them on the company's
 * behalf. Deliberately NOT a commercial supplier model: no rate card, no
 * agreement, no GST tracking, no billing. The record is only enough to identify
 * and contact a referrer.
 *
 * Authenticated (mounted after the global auth middleware in index.ts) and
 * write-guarded to super_admin/admin/hr by the MASTERDATA_WRITE loop.
 *
 * The referrer master follows routes/clients.ts closely — that is the
 * established master-data shape in this codebase (Zod schema, explicit column
 * list, list with search + status filters and live counts, detail with related
 * rows).
 */

// Contact only. Adding a commercial field here needs a real reason: the point of
// this table is "who referred this person", not "what they bill us".
//
// contact_person / phone / email are nullable in the database, so a row that was
// loaded and sent straight back carries null rather than ''. Zod would reject
// null on a string field, which failed the save with "Please correct the
// highlighted fields." while the form itself had nothing wrong - switching a
// referrer's status looked broken because of it. null is normalised to '' here
// and the handlers store '' as null, so both shapes mean "no value".
const nullableText = (max: number, opts: { email?: boolean } = {}) => {
  const base = opts.email ? z.string().trim().email().max(max) : z.string().trim().max(max)
  return z.preprocess((v) => (v === null ? '' : v), base.optional().or(z.literal('')))
}

const referrerSchema = z.object({
  name: z.string().trim().min(1).max(191),
  referrer_code: z.string().trim().max(20).optional(),
  contact_person: nullableText(191),
  phone: nullableText(20),
  email: nullableText(191, { email: true }),
  status: z.enum(['active', 'inactive']).optional(),
})

// The public form never collects employment details, so HR supplies them here.
// Site, role and basic pay are REQUIRED: approving with them blank would create
// an employee who cannot be rostered or paid.
const APPROVE_SCHEMA = z.object({
  joining_date: z.string().min(1),
  site_id: z.number().int().positive(),
  designation: z.string().trim().min(1).max(100),
  department: z.string().trim().max(100).optional().nullable(),
  employee_type: z.enum(['permanent', 'contract', 'daily_wages']).optional(),
  shift_type: z.string().trim().max(50).optional().nullable(),
  basic: z.number().positive(),
  hra: z.number().min(0).optional(),
  conveyance: z.number().min(0).optional(),
  other_allowance: z.number().min(0).optional(),
  other_allowance_label: z.string().trim().max(100).optional().nullable(),
  working_hours: z.number().min(1).max(24).optional(),
  grade: z.string().trim().max(50).optional().nullable(),
  reporting_manager: z.string().trim().max(100).optional().nullable(),
  pf_applicable: z.boolean().optional(),
  esi_applicable: z.boolean().optional(),
  pt_applicable: z.boolean().optional(),
})

const REJECT_SCHEMA = z.object({
  reason: z.string().trim().min(3).max(500),
})

const REFERRER_COLUMNS = `id, referrer_code, name, contact_person, phone, email, status, created_at, updated_at`

const APPLICATION_COLUMNS = `a.id, a.referrer_id, a.full_name, a.aadhaar, a.father_name, a.gender, a.dob,
  a.marital_status, a.nationality, a.mobile, a.alternate_mobile, a.email, a.address, a.state, a.district,
  a.pincode, a.permanent_same_as_present, a.permanent_address, a.permanent_state, a.permanent_district,
  a.permanent_pincode, a.emergency_contact_name, a.emergency_contact_phone, a.emergency_contact_relation,
  a.bank_name, a.bank_holder_name, a.bank_account, a.bank_ifsc, a.pan, a.uan, a.esi_number, a.experience,
  a.previous_employment, a.status, a.rejection_reason, a.reviewed_by, a.reviewed_at, a.employee_id,
  a.created_at, a.updated_at,
  r.name AS referrer_name, r.referrer_code AS referrer_code,
  e.employee_code AS employee_code, u.name AS reviewer_name`

const APPLICATION_FROM = `FROM referrer_applications a
  LEFT JOIN referrers r ON r.id = a.referrer_id
  LEFT JOIN employees e ON e.id = a.employee_id
  LEFT JOIN users u ON u.id = a.reviewed_by`

const nextReferrerCode = async (db: D1Database): Promise<string> => {
  const row: any = await db.prepare("SELECT COUNT(*) AS n FROM referrers WHERE referrer_code LIKE 'REF%'").first()
  return `REF${String(Number(row?.n || 0) + 1).padStart(4, '0')}`
}

export const referrerRoutes = new Hono<{ Bindings: Env }>()

// ---------- Registration review queue ----------
//
// Registered BEFORE referrerRoutes.get('/:id') below. Hono resolves static
// segments ahead of params, but relying on that is fragile, and the cost of
// getting it wrong is a silent 404 on the whole review queue.

referrerRoutes.get('/applications', async (c) => {
  const status = c.req.query('status')
  const referrerId = c.req.query('referrer_id')
  const search = c.req.query('search')
  const where: string[] = []
  const params: (string | number)[] = []
  if (status && status !== '') {
    where.push('a.status = ?')
    params.push(status)
  }
  if (referrerId && referrerId !== '') {
    where.push('a.referrer_id = ?')
    params.push(Number(referrerId))
  }
  if (search) {
    where.push('(a.full_name LIKE ? OR a.aadhaar LIKE ? OR a.mobile LIKE ? OR r.name LIKE ?)')
    const t = `%${search}%`
    params.push(t, t, t, t)
  }
  const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : ''
  const db = getDb(c.env)
  const rows = await db
    .prepare(
      `SELECT ${APPLICATION_COLUMNS} ${APPLICATION_FROM}${whereSql}
       ORDER BY CASE a.status WHEN 'pending' THEN 0 ELSE 1 END, a.created_at DESC LIMIT 500`
    )
    .bind(...params)
    .all()
  const counts = await db
    .prepare('SELECT status, COUNT(*) AS n FROM referrer_applications GROUP BY status')
    .all()
  return c.json({ data: rows.results, counts: counts.results })
})

referrerRoutes.get('/applications/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const db = getDb(c.env)
  const row = await db.prepare(`SELECT ${APPLICATION_COLUMNS} ${APPLICATION_FROM} WHERE a.id = ?`).bind(id).first()
  if (!row) return c.json({ error: { code: 'not_found', message: 'Registration not found.' } }, 404)
  return c.json({ data: row })
})

/**
 * Approving creates the employee. The registration supplies identity/contact/bank;
 * the approving HR user supplies everything employment-related (site, role,
 * joining date, salary), because none of that is collected on the public form.
 */
referrerRoutes.post('/applications/:id/approve', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => null)
  const parsed = APPROVE_SCHEMA.safeParse(body)
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'validation_error',
          message: 'Site, designation and basic pay are required to create the employee.',
          fields: parsed.error.flatten().fieldErrors,
        },
      },
      400
    )
  }
  const d = parsed.data
  const db = getDb(c.env)
  const user = c.get('user') as any

  const app: any = await db.prepare('SELECT * FROM referrer_applications WHERE id = ?').bind(id).first()
  if (!app) return c.json({ error: { code: 'not_found', message: 'Registration not found.' } }, 404)
  if (app.status !== 'pending') {
    return c.json({ error: { code: 'conflict', message: `This registration was already ${app.status}.` } }, 409)
  }

  const referrer: any = app.referrer_id
    ? await db.prepare('SELECT id, name FROM referrers WHERE id = ?').bind(app.referrer_id).first()
    : null

  let employeeId: number
  try {
    employeeId = await createEmployee(db, {
      full_name: app.full_name,
      aadhaar: normalizeAadhaar(app.aadhaar),
      father_name: app.father_name,
      spouse_name: null,
      gender: app.gender,
      dob: app.dob,
      marital_status: app.marital_status,
      nationality: app.nationality || 'Indian',
      mobile: app.mobile,
      alternate_mobile: app.alternate_mobile,
      email: app.email,
      address: app.address,
      state: app.state,
      district: app.district,
      pincode: app.pincode,
      permanent_same_as_present: !!app.permanent_same_as_present,
      permanent_address: app.permanent_same_as_present ? app.address : app.permanent_address,
      permanent_state: app.permanent_same_as_present ? app.state : app.permanent_state,
      permanent_district: app.permanent_same_as_present ? app.district : app.permanent_district,
      permanent_pincode: app.permanent_same_as_present ? app.pincode : app.permanent_pincode,
      emergency_contact_name: app.emergency_contact_name,
      emergency_contact_phone: app.emergency_contact_phone,
      emergency_contact_relation: app.emergency_contact_relation,
      bank_name: app.bank_name,
      bank_holder_name: app.bank_holder_name,
      bank_account: app.bank_account,
      bank_ifsc: app.bank_ifsc,
      pan: app.pan,
      uan: app.uan,
      esi_number: app.esi_number,
      previous_employment: app.previous_employment,
      joining_date: d.joining_date,
      designation: d.designation,
      department: d.department,
      grade: d.grade,
      reporting_manager: d.reporting_manager,
      employee_type: d.employee_type ?? 'contract',
      shift_type: d.shift_type ?? 'General',
      site_id: d.site_id,
      status: 'active',
      source: 'referrer',
      referrer_id: app.referrer_id,
      referrer_application_id: app.id,
      salary: {
        basic: d.basic,
        hra: d.hra ?? 0,
        conveyance: d.conveyance ?? 0,
        other_allowance: d.other_allowance ?? 0,
        other_allowance_label: d.other_allowance_label ?? null,
        working_hours: d.working_hours ?? 8,
      },
      statutory: {
        pf_applicable: d.pf_applicable,
        esi_applicable: d.esi_applicable,
        pt_applicable: d.pt_applicable,
      },
    })
  } catch (err) {
    if (err instanceof EmployeeConflictError) {
      return c.json({ error: { code: 'conflict', message: err.message } }, 409)
    }
    throw err
  }

  await db
    .prepare(
      "UPDATE referrer_applications SET status = 'approved', employee_id = ?, reviewed_by = ?, reviewed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
    )
    .bind(employeeId, user?.id ?? null, id)
    .run()

  const employee: any = await db.prepare('SELECT id, employee_code, first_name, last_name FROM employees WHERE id = ?').bind(employeeId).first()
  return c.json(
    {
      data: { employee, employee_id: employeeId, referrer_name: referrer?.name ?? null },
      message: `Approved. Created employee ${employee?.employee_code}.`,
    },
    201
  )
})

referrerRoutes.post('/applications/:id/reject', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => null)
  const parsed = REJECT_SCHEMA.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: { code: 'validation_error', message: 'Please give a reason for rejecting this registration.', fields: parsed.error.flatten().fieldErrors } }, 400)
  }
  const db = getDb(c.env)
  const user = c.get('user') as any

  const res = await db
    .prepare(
      "UPDATE referrer_applications SET status = 'rejected', rejection_reason = ?, reviewed_by = ?, reviewed_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND status = 'pending'"
    )
    .bind(parsed.data.reason, user?.id ?? null, id)
    .run()
  if (!res.meta.changes) {
    return c.json({ error: { code: 'conflict', message: 'Registration not found or no longer pending.' } }, 409)
  }
  return c.json({ data: { ok: true }, message: 'Registration rejected.' })
})

// ---------- Referrer master ----------

referrerRoutes.get('/', async (c) => {
  const search = c.req.query('search')
  const status = c.req.query('status')
  const where: string[] = []
  const params: string[] = []
  if (search) {
    where.push('(r.name LIKE ? OR r.referrer_code LIKE ? OR r.contact_person LIKE ? OR r.phone LIKE ? OR r.email LIKE ?)')
    const t = `%${search}%`
    params.push(t, t, t, t, t)
  }
  if (status && status !== '') {
    where.push('r.status = ?')
    params.push(status)
  }
  const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : ''
  const db = getDb(c.env)
  const rows = await db
    .prepare(
      `SELECT r.*,
        (SELECT COUNT(*) FROM referrer_applications a WHERE a.referrer_id = r.id) AS application_count,
        (SELECT COUNT(*) FROM referrer_applications a WHERE a.referrer_id = r.id AND a.status = 'pending') AS pending_count,
        (SELECT COUNT(*) FROM employees e WHERE e.referrer_id = r.id) AS employee_count,
        (SELECT COUNT(*) FROM employees e WHERE e.referrer_id = r.id AND e.status = 'active') AS active_employees
       FROM referrers r${whereSql} ORDER BY r.name ASC`
    )
    .bind(...params)
    .all()
  return c.json({ data: rows.results })
})

referrerRoutes.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const db = getDb(c.env)
  const referrer = await db.prepare(`SELECT ${REFERRER_COLUMNS} FROM referrers WHERE id = ?`).bind(id).first()
  if (!referrer) return c.json({ error: { code: 'not_found', message: 'Referrer not found.' } }, 404)
  const applications = await db
    .prepare(
      `SELECT a.id, a.full_name, a.aadhaar, a.mobile, a.status, a.created_at, a.employee_id, e.employee_code
       FROM referrer_applications a
       LEFT JOIN employees e ON e.id = a.employee_id
       WHERE a.referrer_id = ? ORDER BY a.created_at DESC LIMIT 100`
    )
    .bind(id)
    .all()
  const employees = await db
    .prepare(
      `SELECT e.id, e.employee_code, e.first_name, e.last_name, e.designation, e.status, e.joining_date, e.site_id
       FROM employees e WHERE e.referrer_id = ? ORDER BY e.joining_date DESC LIMIT 100`
    )
    .bind(id)
    .all()
  return c.json({ data: { ...(referrer as object), applications: applications.results, employees: employees.results } })
})

referrerRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = referrerSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  }
  const d = parsed.data
  const db = getDb(c.env)

  const dup = await db.prepare('SELECT id FROM referrers WHERE name = ?').bind(d.name).first()
  if (dup) return c.json({ error: { code: 'conflict', message: 'A referrer with this name already exists.' } }, 409)

  let referrerCode = d.referrer_code ? d.referrer_code.toUpperCase() : await nextReferrerCode(db)
  if (d.referrer_code) {
    const codeDup = await db.prepare('SELECT id FROM referrers WHERE referrer_code = ?').bind(referrerCode).first()
    if (codeDup) return c.json({ error: { code: 'conflict', message: 'Referrer code already in use.' } }, 409)
  }

  try {
    const info = await db
      .prepare(
        `INSERT INTO referrers (referrer_code, name, contact_person, phone, email, status)
         VALUES (?,?,?,?,?,?)`
      )
      .bind(referrerCode, d.name, d.contact_person || null, d.phone || null, d.email || null, d.status ?? 'active')
      .run()
    const created = await db
      .prepare(`SELECT ${REFERRER_COLUMNS} FROM referrers WHERE id = ?`)
      .bind(Number(info.meta.last_row_id))
      .first()
    return c.json({ data: created }, 201)
  } catch (err) {
    const msg = String((err as Error)?.message || err)
    if (/unique constraint/i.test(msg) && /referrer_code/i.test(msg)) {
      return c.json({ error: { code: 'conflict', message: 'Referrer code already in use.' } }, 409)
    }
    throw err
  }
})

referrerRoutes.put('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => null)
  const parsed = referrerSchema.partial().safeParse(body)
  if (!parsed.success) {
    return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  }
  const d = parsed.data
  const db = getDb(c.env)

  if (d.name) {
    const dup = await db.prepare('SELECT id FROM referrers WHERE name = ? AND id != ?').bind(d.name, id).first()
    if (dup) return c.json({ error: { code: 'conflict', message: 'A referrer with this name already exists.' } }, 409)
  }

  const fields: Record<string, unknown> = { ...d }
  delete fields.referrer_code
  const sets: string[] = []
  const params: (string | number | null)[] = []
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue
    sets.push(`${k} = ?`)
    params.push((v as string | number | null) || null)
  }
  if (d.referrer_code && d.referrer_code !== '') {
    const wanted = d.referrer_code.toUpperCase()
    const dup = await db.prepare('SELECT id FROM referrers WHERE referrer_code = ? AND id != ?').bind(wanted, id).first()
    if (dup) return c.json({ error: { code: 'conflict', message: 'Referrer code already in use by another referrer.' } }, 409)
    sets.push('referrer_code = ?')
    params.push(wanted)
  }
  if (!sets.length) return c.json({ error: { code: 'validation_error', message: 'Nothing to update.' } }, 400)
  sets.push("updated_at = datetime('now')")
  params.push(id)
  const res = await db.prepare(`UPDATE referrers SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run()
  if (!res.meta.changes) return c.json({ error: { code: 'not_found', message: 'Referrer not found.' } }, 404)
  const updated = await db.prepare(`SELECT ${REFERRER_COLUMNS} FROM referrers WHERE id = ?`).bind(id).first()
  return c.json({ data: updated })
})

// A real delete. employees.referrer_id and referrer_applications.referrer_id
// are declared ON DELETE SET NULL (migration 0029), so staff and registration
// history survive the removal of the referrer itself - only the link goes.
//
// The links are cleared explicitly rather than relying on the FK: SQLite only
// honours foreign keys when the pragma is on for that connection, so depending
// on it would leave dangling referrer_id rows on a connection where it is off.
referrerRoutes.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const db = getDb(c.env)
  const referrer = await db.prepare('SELECT id, name FROM referrers WHERE id = ?').bind(id).first()
  if (!referrer) return c.json({ error: { code: 'not_found', message: 'Referrer not found.' } }, 404)

  await db.prepare('UPDATE employees SET referrer_id = NULL, updated_at = datetime(\'now\') WHERE referrer_id = ?').bind(id).run()
  await db.prepare('UPDATE referrer_applications SET referrer_id = NULL, updated_at = datetime(\'now\') WHERE referrer_id = ?').bind(id).run()

  const res = await db.prepare('DELETE FROM referrers WHERE id = ?').bind(id).run()
  if (!res.meta.changes) return c.json({ error: { code: 'not_found', message: 'Referrer not found.' } }, 404)
  return c.json({ data: { ok: true }, message: `${(referrer as any).name} deleted.` })
})
