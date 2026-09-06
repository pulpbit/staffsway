import { Hono } from 'hono'
import { z } from 'zod'
import type { Env } from '../types'
import { getDb } from '../utils/db'
import { verifyPassword, hashPassword, needsRehash } from '../utils/hash'
import { signJwt, getSecret } from '../utils/jwt'
import { authMiddleware } from '../middleware/auth'

const loginSchema = z.object({
  email: z.string().email().max(191),
  password: z.string().min(1).max(191),
})

const employeeLoginSchema = z.object({
  username: z.string().min(1).max(30),
  password: z.string().regex(/^\d{6}$/, 'Password must be your 6-digit date of birth (DDMMYY).'),
})

// Employee My Space password = date of birth in DDMMYY (e.g. 1996-06-20 -> 200696)
function dobDdmmyy(dob: string | null): string {
  if (!dob) return ''
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dob).trim())
  if (iso) {
    const [, y, m, d] = iso
    return `${d}${m}${y.slice(2)}`
  }
  const t = new Date(String(dob))
  if (!isNaN(t.getTime())) {
    return `${String(t.getDate()).padStart(2, '0')}${String(t.getMonth() + 1).padStart(2, '0')}${String(t.getFullYear()).slice(2)}`
  }
  return ''
}

const WINDOW_MS = 5 * 60 * 1000
const MAX_ATTEMPTS = 10

type Bucket = { count: number; resetAt: number }
const attempts = new Map<string, Bucket>()

function pruneExpired(now: number): void {
  if (attempts.size < 500) return
  for (const [k, b] of attempts) if (b.resetAt < now) attempts.delete(k)
}

function throttle(key: string): { blocked: boolean; retryAfterSec: number } {
  const now = Date.now()
  pruneExpired(now)
  const b = attempts.get(key)
  if (!b || b.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { blocked: false, retryAfterSec: 0 }
  }
  b.count += 1
  if (b.count > MAX_ATTEMPTS) {
    return { blocked: true, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) }
  }
  return { blocked: false, retryAfterSec: 0 }
}

function clearThrottle(key: string): void {
  attempts.delete(key)
}

export const authRoutes = new Hono<{ Bindings: Env }>()

authRoutes.post('/login', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: { code: 'validation_error', message: 'Please enter a valid email and password.', fields: parsed.error.flatten().fieldErrors } }, 400)
  }
  const { email, password } = parsed.data
  const ip = c.req.header('CF-Connecting-IP') || 'local'
  const key = `${ip}:${email.toLowerCase()}`

  const gate = throttle(key)
  if (gate.blocked) {
    return c.json({ error: { code: 'rate_limited', message: `Too many failed attempts. Try again in ${Math.ceil(gate.retryAfterSec / 60)} minute(s).` } }, 429)
  }

  const db = getDb(c.env)
  const user = await db.prepare('SELECT id, name, email, password_hash, role, status, employee_id FROM users WHERE email = ?').bind(email).first()
  const ok = user ? await verifyPassword(password, String(user.password_hash)) : false
  if (!user || !ok || user.status !== 'active') {
    return c.json({ error: { code: 'invalid_credentials', message: 'Invalid email or password.' } }, 401)
  }
  clearThrottle(key)

  // Transparent upgrade: legacy salted-SHA-256 hashes are re-hashed with PBKDF2 on successful login.
  let storedHash = String(user.password_hash)
  if (needsRehash(storedHash)) {
    storedHash = await hashPassword(password)
    await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(storedHash, Number(user.id)).run()
  }

  const sessionUser = { id: Number(user.id), name: String(user.name), email: String(user.email), role: String(user.role), employee_id: (user as any).employee_id ?? null }
  const token = await signJwt(sessionUser, getSecret(c.env))
  return c.json({ data: { token, user: sessionUser } })
})

authRoutes.post('/employee-login', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = employeeLoginSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: { code: 'validation_error', message: 'Enter your Employee ID and Date of Birth (DDMMYY).', fields: parsed.error.flatten().fieldErrors } }, 400)
  }
  const { username, password } = parsed.data
  const ip = c.req.header('CF-Connecting-IP') || 'local'
  const key = `${ip}:emp:${username.trim().toUpperCase()}`

  const gate = throttle(key)
  if (gate.blocked) {
    return c.json({ error: { code: 'rate_limited', message: `Too many failed attempts. Try again in ${Math.ceil(gate.retryAfterSec / 60)} minute(s).` } }, 429)
  }

  const db = getDb(c.env)
  const emp: any = await db.prepare('SELECT id, employee_code, first_name, last_name, dob, email, status FROM employees WHERE UPPER(employee_code) = ?').bind(username.trim().toUpperCase()).first()
  if (!emp || dobDdmmyy(emp.dob) !== password) {
    return c.json({ error: { code: 'invalid_credentials', message: 'Invalid Employee ID or Date of Birth.' } }, 401)
  }
  if (emp.status !== 'active') {
    return c.json({ error: { code: 'inactive', message: 'This account is inactive. Contact HR.' } }, 403)
  }
  clearThrottle(key)

  const empId = Number(emp.id)
  const name = [String(emp.first_name || ''), String(emp.last_name || '')].filter((p) => p && p !== '-').join(' ')
  const sessionUser = {
    id: empId,
    name,
    email: emp.email || `${String(emp.employee_code).toLowerCase()}@staffsway.local`,
    role: 'employee',
    employee_id: empId,
  }
  const token = await signJwt(sessionUser, getSecret(c.env))
  return c.json({ data: { token, user: sessionUser } })
})

authRoutes.use('/me', authMiddleware)
authRoutes.get('/me', (c) => {
  return c.json({ data: { user: c.get('user') } })
})

authRoutes.post('/logout', (c) => {
  return c.json({ data: { ok: true } })
})
