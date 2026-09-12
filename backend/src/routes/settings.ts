import { Hono } from 'hono'
import { z } from 'zod'
import type { Env } from '../types'
import { getDb } from '../utils/db'
import { hashPassword, verifyPassword } from '../utils/hash'
import { requireRole, ROLES } from '../middleware/auth'

const settingsPatch = z.object({
  company_name: z.string().min(1).max(191).optional(),
  company_tagline: z.string().max(191).optional(),
  address: z.string().max(500).optional(),
  state: z.string().max(100).optional(),
  pincode: z.string().max(10).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().max(191).optional().or(z.literal('')),
  website: z.string().max(191).optional(),
  gstin: z.string().max(30).optional(),
  pan: z.string().max(20).optional(),
  cin: z.string().max(30).optional(),
  salary_basis_days: z.number().int().min(1).max(31).optional(),
  pf_rate: z.number().min(0).max(100).optional(),
  pf_cap: z.number().min(0).optional(),
  pf_eligibility: z.number().min(0).optional(),
  esic_rate: z.number().min(0).max(100).optional(),
  esic_eligibility: z.number().min(0).optional(),
  professional_tax_amount: z.number().min(0).optional(),
  professional_tax_min_gross: z.number().min(0).optional(),
  lwf_employee_amount: z.number().min(0).optional(),
  lwf_employer_amount: z.number().min(0).optional(),
  state_name: z.string().max(100).optional(),
  bonus_percent: z.number().min(0).max(100).optional(),
  bonus_max_percent: z.number().min(0).max(100).optional(),
  bonus_wage_ceiling: z.number().min(0).optional(),
  tds_percent: z.number().min(0).max(100).optional(),
  default_ot_rate: z.number().min(0).optional(),
  attendance_lock_enabled: z.boolean().optional(),
})

const leaveTypeSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(20),
  paid_default: z.boolean().optional(),
  max_days: z.number().int().positive().optional().nullable(),
})

const shiftTypeSchema = z.object({
  name: z.string().min(1).max(100),
  start_time: z.string().max(10).optional().nullable(),
  end_time: z.string().max(10).optional().nullable(),
})

const ADMIN_ROLES = ['super_admin', 'admin'] as const

const assignableRoles = (callerRole: string): string[] =>
  ROLES.filter((r) => callerRole === 'super_admin' || r !== 'super_admin')

const userCreateSchema = z.object({
  name: z.string().min(1).max(191),
  email: z.string().email().max(191),
  password: z.string().min(8).max(191),
  role: z.enum(['super_admin', 'admin', 'hr', 'payroll', 'finance', 'manager', 'employee']).optional(),
  employee_id: z.number().int().positive().nullable().optional(),
})

const userUpdateSchema = z.object({
  name: z.string().min(1).max(191).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  role: z.enum(['super_admin', 'admin', 'hr', 'payroll', 'finance', 'manager', 'employee']).optional(),
  password: z.string().min(8).max(191).optional(),
  employee_id: z.number().int().positive().nullable().optional(),
})

const passwordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8).max(191),
})

export const settingsRoutes = new Hono<{ Bindings: Env }>()

settingsRoutes.get('/', async (c) => {
  const db = getDb(c.env)
  const caller = c.get('user')
  const isAdmin = caller?.role === 'super_admin' || caller?.role === 'admin'
  const [settings, leaveTypes, shiftTypes, users] = await Promise.all([
    db.prepare('SELECT * FROM settings WHERE id = 1').first(),
    db.prepare('SELECT * FROM leave_types ORDER BY id').all(),
    db.prepare('SELECT * FROM shift_types ORDER BY id').all(),
    isAdmin
      ? db.prepare(`SELECT u.id, u.name, u.email, u.role, u.status, u.employee_id,
          (e.first_name || ' ' || e.last_name) AS employee_name
        FROM users u LEFT JOIN employees e ON e.id = u.employee_id ORDER BY u.id`).all()
      : Promise.resolve({ results: [] as unknown[] }),
  ])
  return c.json({ data: { settings, leave_types: leaveTypes.results, shift_types: shiftTypes.results, users: users.results } })
})

settingsRoutes.put('/', requireRole('super_admin', 'admin'), async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = settingsPatch.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const fields = Object.keys(d) as (keyof typeof d)[]
  if (!fields.length) return c.json({ error: { code: 'validation_error', message: 'Nothing to update.' } }, 400)
  const db = getDb(c.env)
  const sets: string[] = []
  const params: (string | number | boolean)[] = []
  for (const f of fields) {
    const v = d[f]
    if (v !== undefined) {
      sets.push(`${f} = ?`)
      params.push(typeof v === 'boolean' ? (v ? 1 : 0) : v)
    }
  }
  sets.push("updated_at = datetime('now')")
  params.push(1)
  await db.prepare(`UPDATE settings SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run()
  const updated = await db.prepare('SELECT * FROM settings WHERE id = 1').first()
  return c.json({ data: updated, message: 'Settings saved.' })
})

settingsRoutes.post('/leave-types', requireRole('super_admin', 'admin'), async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = leaveTypeSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.' } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  try {
    await db.prepare('INSERT INTO leave_types (name, code, paid_default, max_days) VALUES (?,?,?,?)').bind(d.name, d.code, d.paid_default === false ? 0 : 1, d.max_days ?? null).run()
  } catch {
    return c.json({ error: { code: 'conflict', message: 'A leave type with this code already exists.' } }, 409)
  }
  const rows = await db.prepare('SELECT * FROM leave_types ORDER BY id').all()
  return c.json({ data: rows.results, message: 'Leave type added.' })
})

settingsRoutes.post('/shift-types', requireRole('super_admin', 'admin'), async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = shiftTypeSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.' } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  await db.prepare('INSERT INTO shift_types (name, start_time, end_time) VALUES (?,?,?)').bind(d.name, d.start_time ?? null, d.end_time ?? null).run()
  const rows = await db.prepare('SELECT * FROM shift_types ORDER BY id').all()
  return c.json({ data: rows.results, message: 'Shift type added.' })
})

function assertCanManage(callerRole: string, targetRole: string | null, newRole?: string): string | null {
  if (callerRole !== 'super_admin') {
    if (targetRole === 'super_admin') return 'Only a Super Admin can modify another Super Admin.'
    if (newRole === 'super_admin') return 'Only a Super Admin can grant the Super Admin role.'
  }
  return null
}

settingsRoutes.post('/users', requireRole('super_admin', 'admin'), async (c) => {
  const body = await c.req.json().catch(() => null)
  const caller = c.get('user')
  const parsed = userCreateSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const role = d.role ?? 'admin'
  const denied = assertCanManage(caller.role, null, role)
  if (denied) return c.json({ error: { code: 'forbidden', message: denied } }, 403)
  if (!assignableRoles(caller.role).includes(role)) {
    return c.json({ error: { code: 'forbidden', message: 'You cannot assign this role.' } }, 403)
  }
  const db = getDb(c.env)
  const dup = await db.prepare('SELECT id FROM users WHERE email = ?').bind(d.email).first()
  if (dup) return c.json({ error: { code: 'conflict', message: 'A user with this email already exists.' } }, 409)
  const hash = await hashPassword(d.password)
  if (d.employee_id != null) {
    const emp = await db.prepare('SELECT id FROM employees WHERE id = ?').bind(d.employee_id).first()
    if (!emp) return c.json({ error: { code: 'validation_error', message: 'Linked employee does not exist.' } }, 400)
  }
  await db.prepare('INSERT INTO users (name, email, password_hash, role, status, employee_id) VALUES (?,?,?,?,?,?)')
    .bind(d.name, d.email, hash, role, 'active', d.employee_id ?? null).run()
  const rows = await db.prepare(`SELECT u.id, u.name, u.email, u.role, u.status, u.employee_id,
      (e.first_name || ' ' || e.last_name) AS employee_name
    FROM users u LEFT JOIN employees e ON e.id = u.employee_id ORDER BY u.id`).all()
  return c.json({ data: rows.results, message: 'User added.' })
})

settingsRoutes.patch('/users/:id', requireRole('super_admin', 'admin'), async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id)) return c.json({ error: { code: 'validation_error', message: 'Invalid user id.' } }, 400)
  const body = await c.req.json().catch(() => null)
  const parsed = userUpdateSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.' } }, 400)
  const d = parsed.data
  const caller = c.get('user')
  const db = getDb(c.env)
  const target = await db.prepare('SELECT id, role FROM users WHERE id = ?').bind(id).first()
  if (!target) return c.json({ error: { code: 'not_found', message: 'User not found.' } }, 404)
  const denied = assertCanManage(caller.role, String(target.role), d.role)
  if (denied) return c.json({ error: { code: 'forbidden', message: denied } }, 403)
  if (d.role && !assignableRoles(caller.role).includes(d.role)) {
    return c.json({ error: { code: 'forbidden', message: 'You cannot assign this role.' } }, 403)
  }
  if (Number(target.id) === caller.id && d.status === 'inactive') {
    return c.json({ error: { code: 'validation_error', message: 'You cannot deactivate your own account.' } }, 400)
  }
  const sets: string[] = []
  const params: (string | number | null)[] = []
  if (d.name !== undefined) { sets.push('name = ?'); params.push(d.name) }
  if (d.status !== undefined) { sets.push('status = ?'); params.push(d.status) }
  if (d.role !== undefined) { sets.push('role = ?'); params.push(d.role) }
  if (d.employee_id !== undefined) {
    if (d.employee_id != null) {
      const emp = await db.prepare('SELECT id FROM employees WHERE id = ?').bind(d.employee_id).first()
      if (!emp) return c.json({ error: { code: 'validation_error', message: 'Linked employee does not exist.' } }, 400)
    }
    sets.push('employee_id = ?')
    params.push(d.employee_id ?? null)
  }
  if (d.password !== undefined) {
    sets.push('password_hash = ?')
    params.push(await hashPassword(d.password))
  }
  if (!sets.length) return c.json({ error: { code: 'validation_error', message: 'Nothing to update.' } }, 400)
  params.push(id)
  await db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run()
  const rows = await db.prepare(`SELECT u.id, u.name, u.email, u.role, u.status, u.employee_id,
      (e.first_name || ' ' || e.last_name) AS employee_name
    FROM users u LEFT JOIN employees e ON e.id = u.employee_id ORDER BY u.id`).all()
  return c.json({ data: rows.results, message: 'User updated.' })
})

settingsRoutes.post('/password', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = passwordSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'New password must be at least 8 characters.' } }, 400)
  const { current_password, new_password } = parsed.data
  const db = getDb(c.env)
  const user = c.get('user')
  const row = await db.prepare('SELECT password_hash FROM users WHERE id = ?').bind(user.id).first()
  if (!row) return c.json({ error: { code: 'not_found', message: 'User not found.' } }, 404)
  const ok = await verifyPassword(current_password, String(row.password_hash))
  if (!ok) return c.json({ error: { code: 'invalid_credentials', message: 'Current password is incorrect.' } }, 400)
  const hash = await hashPassword(new_password)
  await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(hash, user.id).run()
  return c.json({ data: { ok: true }, message: 'Password updated successfully.' })
})
