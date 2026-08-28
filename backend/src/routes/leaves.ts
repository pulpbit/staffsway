import { Hono } from 'hono'
import { z } from 'zod'
import type { Env } from '../types'
import { getDb } from '../utils/db'
import { requireRole } from '../middleware/auth'

const HR_ONLY = ['super_admin', 'admin', 'hr'] as const

const requestSchema = z.object({
  employee_id: z.number().int().positive(),
  leave_type_id: z.number().int().positive().nullable().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().max(500).optional().nullable(),
})

const approvalSchema = z.object({
  level: z.enum(['manager', 'hr']),
  action: z.enum(['approve', 'reject']),
  remarks: z.string().max(500).optional().nullable(),
})

const r2 = (n: number) => Math.round(n * 100) / 100

async function holidaySet(db: any, year?: number): Promise<Set<string>> {
  const rows = year
    ? await db.prepare('SELECT date FROM holidays WHERE date LIKE ?').bind(`${year}-%`).all()
    : await db.prepare('SELECT date FROM holidays').all()
  return new Set((rows.results as any[]).map(r => r.date))
}

// Working days between two dates inclusive, excluding Sundays and holidays.
function workingDays(start: string, end: string, holidays: Set<string>): number {
  const s = new Date(start + 'T00:00:00Z')
  const e = new Date(end + 'T00:00:00Z')
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || s > e) return 0
  let days = 0
  for (let d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10)
    if (d.getUTCDay() === 0 || holidays.has(iso)) continue
    days += 1
  }
  return days
}

export const leaveRoutes = new Hono<{ Bindings: Env }>()

// ---------- Leave types (read; managed in Settings) ----------
leaveRoutes.get('/types', async (c) => {
  const rows = await getDb(c.env).prepare('SELECT * FROM leave_types ORDER BY id').all()
  return c.json({ data: rows.results })
})

// ---------- Holidays ----------
leaveRoutes.get('/holidays', async (c) => {
  const year = c.req.query('year')
  const db = getDb(c.env)
  const res = year
    ? await db.prepare('SELECT * FROM holidays WHERE date LIKE ? ORDER BY date').bind(`${year}-%`).all()
    : await db.prepare('SELECT * FROM holidays ORDER BY date').all()
  return c.json({ data: res.results })
})

leaveRoutes.post('/holidays', requireRole(...HR_ONLY), async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), name: z.string().min(1).max(100) }).safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Valid date and name required.' } }, 400)
  const db = getDb(c.env)
  try {
    await db.prepare('INSERT INTO holidays (date, name) VALUES (?,?)').bind(parsed.data.date, parsed.data.name).run()
  } catch {
    return c.json({ error: { code: 'conflict', message: 'A holiday already exists on this date.' } }, 409)
  }
  return c.json({ data: parsed.data, message: 'Holiday added.' }, 201)
})

leaveRoutes.delete('/holidays/:id', requireRole(...HR_ONLY), async (c) => {
  const id = Number(c.req.param('id'))
  const res = await getDb(c.env).prepare('DELETE FROM holidays WHERE id = ?').bind(id).run()
  if (!res.meta.changes) return c.json({ error: { code: 'not_found', message: 'Holiday not found.' } }, 404)
  return c.json({ data: { id }, message: 'Holiday removed.' })
})

// ---------- Apply ----------
leaveRoutes.post('/requests', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)

  const caller = c.get('user')
  if (caller.role === 'employee') {
    if (!caller.employee_id) return c.json({ error: { code: 'forbidden', message: 'Your login is not linked to an employee profile.' } }, 403)
    if (d.employee_id !== Number(caller.employee_id)) {
      return c.json({ error: { code: 'forbidden', message: 'You can only apply for your own leave.' } }, 403)
    }
  }

  const emp = await db.prepare('SELECT id, status, employee_code, first_name, last_name FROM employees WHERE id = ?').bind(d.employee_id).first()
  if (!emp) return c.json({ error: { code: 'not_found', message: 'Employee not found.' } }, 404)

  const type = d.leave_type_id ? await db.prepare('SELECT * FROM leave_types WHERE id = ?').bind(d.leave_type_id).first() : null
  if (d.leave_type_id && !type) return c.json({ error: { code: 'not_found', message: 'Leave type not found.' } }, 404)

  const holidays = await holidaySet(db, Number(d.start_date.slice(0, 4)))
  const days = workingDays(d.start_date, d.end_date, holidays)
  if (days <= 0) return c.json({ error: { code: 'validation_error', message: 'Selected range has no working days (Sundays and holidays excluded).' } }, 400)
  if (type && Number((type as any).max_days) > 0 && days > Number((type as any).max_days)) {
    return c.json({ error: { code: 'validation_error', message: `${(type as any).name} allows max ${type!.max_days} days per application.` } }, 400)
  }

  // Balance guard for paid types: available must cover the request.
  if (type && (type as any).paid_default === 1) {
    const year = Number(d.start_date.slice(0, 4))
    const bals = await balanceRows(db, d.employee_id, year)
    const bal = bals.find(b => b.leave_type_id === d.leave_type_id)
    if (!bal || bal.available < days) {
      return c.json({ error: { code: 'validation_error', message: `Insufficient ${type!.name} balance. Available: ${bal?.available ?? 0} day(s), requested: ${days}.` } }, 400)
    }
  }

  const user = c.get('user')
  const info = await db
    .prepare(`INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, days, reason, status, created_by)
      VALUES (?,?,?,?,?,?, 'pending_manager', ?)`)
    .bind(d.employee_id, d.leave_type_id ?? null, d.start_date, d.end_date, days, d.reason ?? null, user?.email ?? null)
    .run()
  const created = await getRequest(db, Number(info.meta.last_row_id))
  return c.json({ data: created, message: `Applied for ${days} day(s). Pending manager approval.` }, 201)
})

function getRequest(db: any, id: number) {
  return db.prepare(`SELECT lr.*, t.name AS type_name, t.code AS type_code, t.paid_default,
    e.first_name, e.last_name, e.employee_code
    FROM leave_requests lr
    LEFT JOIN leave_types t ON t.id = lr.leave_type_id
    LEFT JOIN employees e ON e.id = lr.employee_id
    WHERE lr.id = ?`).bind(id).first()
}

// ---------- History ----------
leaveRoutes.get('/requests', async (c) => {
  const db = getDb(c.env)
  const caller = c.get('user')
  let employeeId = Number(c.req.query('employee_id') || 0)
  if (caller.role === 'employee') {
    if (!caller.employee_id) return c.json({ error: { code: 'forbidden', message: 'Your login is not linked to an employee profile.' } }, 403)
    employeeId = Number(caller.employee_id)
  }
  const status = c.req.query('status') || ''
  const year = Number(c.req.query('year') || 0)
  let sql = `SELECT lr.*, t.name AS type_name, t.code AS type_code,
    e.first_name, e.last_name, e.employee_code
    FROM leave_requests lr
    LEFT JOIN leave_types t ON t.id = lr.leave_type_id
    LEFT JOIN employees e ON e.id = lr.employee_id WHERE 1=1`
  const params: (string | number)[] = []
  if (Number.isInteger(employeeId) && employeeId > 0) { sql += ' AND lr.employee_id = ?'; params.push(employeeId) }
  if (status) { sql += ' AND lr.status = ?'; params.push(status) }
  if (year > 0) { sql += " AND lr.start_date LIKE ?"; params.push(`${year}-%`) }
  sql += ' ORDER BY lr.created_at DESC, lr.id DESC LIMIT 500'
  const res = await db.prepare(sql).bind(...params).all()
  return c.json({ data: res.results })
})

// ---------- Approvals ----------
leaveRoutes.patch('/requests/:id/approval', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => null)
  const parsed = approvalSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Invalid input.' } }, 400)
  const { level, action, remarks } = parsed.data
  const user = c.get('user')

  // Employee logins cannot approve anything.
  if (user.role === 'employee') {
    return c.json({ error: { code: 'forbidden', message: 'Employees cannot review leave requests.' } }, 403)
  }

  // Manager step may be done by manager/hr/admin; HR step only hr/admin.
  if (level === 'hr' && !HR_ONLY.includes(user.role as any)) {
    return c.json({ error: { code: 'forbidden', message: 'Only HR/Admin can give final approval.' } }, 403)
  }

  const db = getDb(c.env)
  const req: any = await db.prepare('SELECT * FROM leave_requests WHERE id = ?').bind(id).first()
  if (!req) return c.json({ error: { code: 'not_found', message: 'Leave request not found.' } }, 404)
  if (req.status !== 'pending_manager' && req.status !== 'pending_hr') {
    return c.json({ error: { code: 'conflict', message: 'This request is already closed.' } }, 409)
  }
  if (level === 'manager' && req.status !== 'pending_manager') {
    return c.json({ error: { code: 'conflict', message: 'Manager approval already done for this request.' } }, 409)
  }
  if (level === 'hr' && req.status !== 'pending_hr') {
    return c.json({ error: { code: 'conflict', message: 'Manager approval is still pending.' } }, 409)
  }

  const now = "datetime('now')"
  if (action === 'reject') {
    const col = level === 'manager' ? 'manager_status' : 'hr_status'
    const byCol = level === 'manager' ? 'manager_by' : 'hr_by'
    const atCol = level === 'manager' ? 'manager_at' : 'hr_at'
    const remCol = level === 'manager' ? 'manager_remarks' : 'hr_remarks'
    await db.prepare(`UPDATE leave_requests SET status='rejected', ${col}='rejected', ${byCol}=?, ${atCol}=${now}, ${remCol}=?, updated_at=${now} WHERE id=?`)
      .bind(user?.email ?? null, remarks ?? null, id).run()
    const updated = await getRequest(db, id)
    return c.json({ data: updated, message: 'Leave request rejected.' })
  }

  if (level === 'manager') {
    await db.prepare(`UPDATE leave_requests SET status='pending_hr', manager_status='approved', manager_by=?, manager_at=${now}, manager_remarks=?, updated_at=${now} WHERE id=?`)
      .bind(user?.email ?? null, remarks ?? null, id).run()
    const updated = await getRequest(db, id)
    return c.json({ data: updated, message: 'Manager approved — now pending HR approval.' })
  }

  await db.prepare(`UPDATE leave_requests SET status='approved', hr_status='approved', hr_by=?, hr_at=${now}, hr_remarks=?, updated_at=${now} WHERE id=?`)
    .bind(user?.email ?? null, remarks ?? null, id).run()
  const updated = await getRequest(db, id)
  return c.json({ data: updated, message: 'Leave approved and balance updated.' })
})

leaveRoutes.patch('/requests/:id/cancel', async (c) => {
  const id = Number(c.req.param('id'))
  const user = c.get('user')
  const db = getDb(c.env)
  const req: any = await db.prepare('SELECT * FROM leave_requests WHERE id = ?').bind(id).first()
  if (!req) return c.json({ error: { code: 'not_found', message: 'Leave request not found.' } }, 404)
  if (user.role === 'employee' && Number(req.employee_id) !== Number(user.employee_id)) {
    return c.json({ error: { code: 'forbidden', message: 'You can only cancel your own requests.' } }, 403)
  }
  if (!req.status.startsWith('pending')) return c.json({ error: { code: 'conflict', message: 'Only pending requests can be cancelled.' } }, 409)
  await db.prepare("UPDATE leave_requests SET status='cancelled', updated_at=datetime('now') WHERE id = ?").bind(id).run()
  return c.json({ data: await getRequest(db, id), message: 'Request cancelled.' })
})

// ---------- Balances ----------
async function balanceRows(db: any, employeeId: number, year: number) {
  const types = (await db.prepare('SELECT * FROM leave_types ORDER BY id').all()).results as any[]
  const emp: any = await db.prepare('SELECT * FROM employees WHERE id = ?').bind(employeeId).first()
  const dojMonth = emp?.joining_date ? Math.max(0, 12 - Number(emp.joining_date.slice(5, 7)) + 1) : 12
  const balances = (await db.prepare('SELECT * FROM leave_balances WHERE employee_id = ? AND year = ?').bind(employeeId, year).all()).results as any[]
  const usedRows = (await db.prepare(`SELECT leave_type_id, SUM(days) AS d FROM leave_requests WHERE employee_id = ? AND status = 'approved' AND start_date LIKE ? GROUP BY leave_type_id`).bind(employeeId, `${year}-%`).all()).results as any[]
  const pendingRows = (await db.prepare(`SELECT leave_type_id, SUM(days) AS d FROM leave_requests WHERE employee_id = ? AND status LIKE 'pending%' AND start_date LIKE ? GROUP BY leave_type_id`).bind(employeeId, `${year}-%`).all()).results as any[]
  const usedOf = new Map(usedRows.map(r => [r.leave_type_id ?? 0, Number(r.d)]))
  const pendingOf = new Map(pendingRows.map(r => [r.leave_type_id ?? 0, Number(r.d)]))

  const now = new Date()
  const monthsElapsed = year < now.getFullYear() ? 12 : year > now.getFullYear() ? 0 : now.getMonth() + 1

  return types.map(t => {
    const manual = balances.find(b => b.leave_type_id === t.id)
    const entitled = Number(t.annual_quota) || 0
    const accrued = entitled === 0 ? 0 : (t.accrual_monthly === 1 ? r2(entitled * Math.min(monthsElapsed, dojMonth) / 12) : entitled)
    const compOff = Number(manual?.comp_off_extra) || 0
    const encashed = Number(manual?.encashed) || 0
    const used = usedOf.get(t.id) || 0
    const pending = pendingOf.get(t.id) || 0
    const available = r2(accrued + compOff - encashed - used - pending)
    return {
      leave_type_id: t.id, name: t.name, code: t.code, paid: t.paid_default === 1,
      accrual_monthly: t.accrual_monthly === 1, is_comp_off: t.is_comp_off === 1,
      entitled, accrued, comp_off_extra: compOff, encashed, used, pending, available,
    }
  })
}

leaveRoutes.get('/balances', async (c) => {
  const db = getDb(c.env)
  const caller = c.get('user')
  const year = Number(c.req.query('year')) || new Date().getFullYear()
  let employeeId = Number(c.req.query('employee_id') || 0)
  if (caller.role === 'employee') {
    if (!caller.employee_id) return c.json({ error: { code: 'forbidden', message: 'Your login is not linked to an employee profile.' } }, 403)
    employeeId = Number(caller.employee_id)
  }
  if (Number.isInteger(employeeId) && employeeId > 0) {
    return c.json({ data: await balanceRows(db, employeeId, year) })
  }
  const emps = (await db.prepare("SELECT id, employee_code, first_name, last_name FROM employees WHERE status = 'active' ORDER BY first_name").all()).results as any[]
  const out = []
  for (const e of emps) out.push({ employee: e, rows: await balanceRows(db, e.id, year) })
  return c.json({ data: out })
})

// Comp-off credit / revoke (manual adjustment).
leaveRoutes.post('/compoff', requireRole(...HR_ONLY), async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = z.object({
    employee_id: z.number().int().positive(),
    leave_type_id: z.number().int().positive(),
    days: z.number().refine(v => v !== 0),
    remarks: z.string().max(300).optional().nullable(),
  }).safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Employee, leave type and non-zero days are required.' } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const year = new Date().getFullYear()
  await db.prepare(`INSERT INTO leave_balances (employee_id, leave_type_id, year, comp_off_extra) VALUES (?,?,?,?)
    ON CONFLICT(employee_id, leave_type_id, year) DO UPDATE SET comp_off_extra = comp_off_extra + excluded.comp_off_extra`)
    .bind(d.employee_id, d.leave_type_id, year, d.days).run()
  const rows = await balanceRows(db, d.employee_id, year)
  return c.json({ data: rows.find(r => r.leave_type_id === d.leave_type_id), message: `Comp-off ${d.days > 0 ? 'credited' : 'revoked'}: ${Math.abs(d.days)} day(s).` })
})

// ---------- Encashment ----------
leaveRoutes.get('/encashments', async (c) => {
  const year = Number(c.req.query('year')) || new Date().getFullYear()
  const db = getDb(c.env)
  const res = await db.prepare(`SELECT le.*, e.first_name, e.last_name, e.employee_code, t.name AS type_name
    FROM leave_encashments le
    LEFT JOIN employees e ON e.id = le.employee_id
    LEFT JOIN leave_types t ON t.id = le.leave_type_id
    WHERE le.year = ? ORDER BY le.created_at DESC`).bind(year).all()
  return c.json({ data: res.results })
})

leaveRoutes.post('/encashments', requireRole(...HR_ONLY), async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = z.object({
    employee_id: z.number().int().positive(),
    leave_type_id: z.number().int().positive(),
    days: z.number().positive(),
  }).safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Employee, leave type and positive days are required.' } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const year = new Date().getFullYear()
  const bal = (await balanceRows(db, d.employee_id, year)).find(r => r.leave_type_id === d.leave_type_id)
  if (!bal) return c.json({ error: { code: 'not_found', message: 'Leave type not found.' } }, 404)
  if (bal.available < d.days) return c.json({ error: { code: 'validation_error', message: `Insufficient balance. Available: ${bal.available} day(s).` } }, 400)

  const setRow: any = await db.prepare('SELECT salary_basis_days FROM settings LIMIT 1').first()
  const sal: any = await db.prepare('SELECT basic FROM salary_structures WHERE employee_id = ? ORDER BY effective_from DESC, id DESC LIMIT 1').bind(d.employee_id).first()
  const basisDays = Number(setRow?.salary_basis_days) || 26
  const perDay = ((sal?.basic) || 0) / basisDays
  const amount = r2(perDay * d.days)

  const user = c.get('user')
  const info = await db.prepare('INSERT INTO leave_encashments (employee_id, leave_type_id, year, days, amount, created_by) VALUES (?,?,?,?,?,?)')
    .bind(d.employee_id, d.leave_type_id, year, d.days, amount, user?.email ?? null).run()
  await db.prepare(`INSERT INTO leave_balances (employee_id, leave_type_id, year, encashed) VALUES (?,?,?,?)
    ON CONFLICT(employee_id, leave_type_id, year) DO UPDATE SET encashed = encashed + excluded.encashed`)
    .bind(d.employee_id, d.leave_type_id, year, d.days).run()
  const created = await db.prepare('SELECT * FROM leave_encashments WHERE id = ?').bind(Number(info.meta.last_row_id)).first()
  return c.json({ data: created, message: `Encashed ${d.days} day(s) for ₹${amount.toFixed(2)} (${basisDays}-day basis on latest Basic).` }, 201)
})
