import { Hono } from 'hono'
import { z } from 'zod'
import type { Env } from '../types'
import { getDb } from '../utils/db'

export const essRoutes = new Hono<{ Bindings: Env }>()

const HR_ONLY = ['super_admin', 'admin', 'hr'] as const

function ownEmployee(c: any): number | null {
  const caller = c.get('user')
  if (caller.role !== 'employee') return null
  return caller.employee_id ? Number(caller.employee_id) : null
}

const noProfile = (c: any) =>
  c.json({ error: { code: 'forbidden', message: 'Your login is not linked to an employee profile. Ask HR to link it.' } }, 403)

const LATEST_STRUCT = `JOIN salary_structures st ON st.id = (
  SELECT st2.id FROM salary_structures st2 WHERE st2.employee_id = e.id
  ORDER BY st2.effective_from DESC, st2.id DESC LIMIT 1)`

// ---------- My profile ----------
essRoutes.get('/me', async (c) => {
  const eid = ownEmployee(c)
  if (!eid) return noProfile(c)
  const db = getDb(c.env)
  const emp = await db.prepare(
    `SELECT e.id, e.employee_code, e.first_name, e.last_name, e.email, e.mobile, e.designation,
      e.department, e.joining_date, e.status, e.employee_type, e.shift_type,
      s.name AS site_name, c.name AS client_name,
      st.basic, st.hra, st.conveyance, st.other_allowance, st.overtime_rate, st.effective_from AS salary_effective_from,
      es.pf_applicable, es.esi_applicable, es.lwf_applicable, es.pt_applicable, es.tds_applicable
     FROM employees e ${LATEST_STRUCT}
     LEFT JOIN sites s ON s.id = e.site_id
     LEFT JOIN clients c ON c.id = s.client_id
     LEFT JOIN employee_statutory es ON es.employee_id = e.id
     WHERE e.id = ?`
  ).bind(eid).first()
  if (!emp) return c.json({ error: { code: 'not_found', message: 'Linked employee profile not found.' } }, 404)
  return c.json({ data: emp })
})

// ---------- My attendance ----------
essRoutes.get('/attendance', async (c) => {
  const eid = ownEmployee(c)
  if (!eid) return noProfile(c)
  const year = Number(c.req.query('year')) || new Date().getFullYear()
  const rows = await getDb(c.env)
    .prepare('SELECT * FROM attendance_monthly WHERE employee_id = ? AND year = ? ORDER BY month')
    .bind(eid, year).all()
  return c.json({ data: rows.results })
})

// ---------- Attendance regularization ----------
const regSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  present_days: z.number().min(0).max(31),
  absent_days: z.number().min(0).max(31),
  paid_leave: z.number().min(0).max(31),
  unpaid_leave: z.number().min(0).max(31),
  reason: z.string().min(5).max(500),
})

essRoutes.post('/regularizations', async (c) => {
  const eid = ownEmployee(c)
  if (!eid) return noProfile(c)
  const body = await c.req.json().catch(() => null)
  const parsed = regSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: { code: 'validation_error', message: 'Month, day corrections and a reason (min 5 chars) are required.' } }, 400)
  }
  const d = parsed.data
  const db = getDb(c.env)
  const dup = await db.prepare(
    "SELECT id FROM attendance_regularizations WHERE employee_id = ? AND month = ? AND year = ? AND status = 'pending'"
  ).bind(eid, d.month, d.year).first()
  if (dup) {
    return c.json({ error: { code: 'conflict', message: 'A correction for this month is already pending review.' } }, 409)
  }
  const info = await db.prepare(
    `INSERT INTO attendance_regularizations (employee_id, month, year, present_days, absent_days, paid_leave, unpaid_leave, reason)
     VALUES (?,?,?,?,?,?,?,?)`
  ).bind(eid, d.month, d.year, d.present_days, d.absent_days, d.paid_leave, d.unpaid_leave, d.reason).run()
  const row = await db.prepare('SELECT * FROM attendance_regularizations WHERE id = ?').bind(Number(info.meta.last_row_id)).first()
  return c.json({ data: row, message: 'Correction submitted for HR review.' }, 201)
})

essRoutes.get('/regularizations', async (c) => {
  const eid = ownEmployee(c)
  if (!eid) return noProfile(c)
  const rows = await getDb(c.env)
    .prepare('SELECT * FROM attendance_regularizations WHERE employee_id = ? ORDER BY year DESC, month DESC LIMIT 100')
    .bind(eid).all()
  return c.json({ data: rows.results })
})

// ---------- HR requests ----------
const requestSchema = z.object({
  subject: z.string().min(3).max(191),
  message: z.string().max(1000).optional().nullable(),
})

essRoutes.post('/requests', async (c) => {
  const eid = ownEmployee(c)
  if (!eid) return noProfile(c)
  const body = await c.req.json().catch(() => null)
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Subject (min 3 chars) is required.' } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const info = await db.prepare('INSERT INTO hr_requests (employee_id, subject, message) VALUES (?,?,?)')
    .bind(eid, d.subject, d.message ?? null).run()
  const row = await db.prepare('SELECT * FROM hr_requests WHERE id = ?').bind(Number(info.meta.last_row_id)).first()
  return c.json({ data: row, message: 'Request submitted.' }, 201)
})

essRoutes.get('/requests', async (c) => {
  const eid = ownEmployee(c)
  if (!eid) return noProfile(c)
  const rows = await getDb(c.env)
    .prepare('SELECT * FROM hr_requests WHERE employee_id = ? ORDER BY created_at DESC, id DESC LIMIT 100')
    .bind(eid).all()
  return c.json({ data: rows.results })
})

// ================= HR side =================
const hrGuard = (c: any) => {
  const caller = c.get('user')
  if (!caller || !HR_ONLY.includes(caller.role as any)) {
    return c.json({ error: { code: 'forbidden', message: 'Only HR/Admin can review submissions.' } }, 403)
  }
  return null
}

essRoutes.get('/admin/regularizations', async (c) => {
  const denied = hrGuard(c)
  if (denied) return denied
  const status = c.req.query('status') || 'pending'
  const db = getDb(c.env)
  const rows = await db.prepare(
    `SELECT ar.*, e.employee_code, e.first_name, e.last_name, e.designation,
      am.present_days AS recorded_present, am.absent_days AS recorded_absent,
      am.paid_leave AS recorded_paid, am.unpaid_leave AS recorded_unpaid, am.status AS attendance_status
     FROM attendance_regularizations ar
     JOIN employees e ON e.id = ar.employee_id
     LEFT JOIN attendance_monthly am ON am.employee_id = ar.employee_id AND am.month = ar.month AND am.year = ar.year
     ${status !== 'all' ? 'WHERE ar.status = ?' : ''}
     ORDER BY ar.created_at DESC`
  ).bind(...(status !== 'all' ? [status] : [])).all()
  return c.json({ data: rows.results })
})

essRoutes.patch('/admin/regularizations/:id', async (c) => {
  const denied = hrGuard(c)
  if (denied) return denied
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => null)
  const parsed = z.object({
    action: z.enum(['approve', 'reject']),
    reply: z.string().max(500).optional().nullable(),
  }).safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'action must be approve or reject.' } }, 400)
  const db = getDb(c.env)
  const user = c.get('user')
  const reg: any = await db.prepare('SELECT * FROM attendance_regularizations WHERE id = ?').bind(id).first()
  if (!reg) return c.json({ error: { code: 'not_found', message: 'Correction not found.' } }, 404)
  if (reg.status !== 'pending') return c.json({ error: { code: 'conflict', message: 'This correction was already reviewed.' } }, 409)

  if (parsed.data.action === 'reject') {
    await db.prepare("UPDATE attendance_regularizations SET status='rejected', reviewed_by=?, reviewed_at=datetime('now'), reply=? WHERE id=?")
      .bind(user.email, parsed.data.reply ?? null, id).run()
    const row = await db.prepare('SELECT * FROM attendance_regularizations WHERE id = ?').bind(id).first()
    return c.json({ data: row, message: 'Correction rejected.' })
  }

  // Approve → apply onto the monthly sheet only while payroll for that period is still in draft.
  const att: any = await db.prepare('SELECT * FROM attendance_monthly WHERE employee_id = ? AND month = ? AND year = ?')
    .bind(reg.employee_id, reg.month, reg.year).first()
  if (!att) return c.json({ error: { code: 'conflict', message: 'No monthly attendance sheet exists for this period yet.' } }, 409)
  if (String(att.status) !== 'draft') {
    return c.json({ error: { code: 'conflict', message: 'Attendance for this month is locked (payroll processed). Correction cannot be applied.' } }, 409)
  }
  await db.prepare(`UPDATE attendance_monthly SET present_days=?, absent_days=?, paid_leave=?, unpaid_leave=?, updated_at=datetime('now') WHERE id=?`)
    .bind(Number(reg.present_days), Number(reg.absent_days), Number(reg.paid_leave), Number(reg.unpaid_leave), att.id).run()
  await db.prepare("UPDATE attendance_regularizations SET status='approved', reviewed_by=?, reviewed_at=datetime('now'), reply=? WHERE id=?")
    .bind(user.email, parsed.data.reply ?? null, id).run()
  const updatedAtt = await db.prepare('SELECT * FROM attendance_monthly WHERE id = ?').bind(att.id).first()
  const row = await db.prepare('SELECT * FROM attendance_regularizations WHERE id = ?').bind(id).first()
  return c.json({ data: { regularization: row, attendance: updatedAtt }, message: 'Correction approved and applied to the monthly sheet.' })
})

essRoutes.get('/admin/requests', async (c) => {
  const denied = hrGuard(c)
  if (denied) return denied
  const status = c.req.query('status') || 'open'
  const db = getDb(c.env)
  const rows = await db.prepare(
    `SELECT r.*, e.employee_code, e.first_name, e.last_name, e.designation
     FROM hr_requests r JOIN employees e ON e.id = r.employee_id
     ${status !== 'all' ? 'WHERE r.status = ?' : ''}
     ORDER BY r.created_at DESC`
  ).bind(...(status !== 'all' ? [status] : [])).all()
  return c.json({ data: rows.results })
})

essRoutes.patch('/admin/requests/:id/resolve', async (c) => {
  const denied = hrGuard(c)
  if (denied) return denied
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => null)
  const parsed = z.object({ reply: z.string().max(1000).optional().nullable() }).safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Invalid reply.' } }, 400)
  const db = getDb(c.env)
  const user = c.get('user')
  const req: any = await db.prepare('SELECT * FROM hr_requests WHERE id = ?').bind(id).first()
  if (!req) return c.json({ error: { code: 'not_found', message: 'Request not found.' } }, 404)
  if (req.status === 'resolved') return c.json({ error: { code: 'conflict', message: 'Request already resolved.' } }, 409)
  await db.prepare("UPDATE hr_requests SET status='resolved', reply=?, resolved_by=?, resolved_at=datetime('now') WHERE id=?")
    .bind(parsed.data.reply ?? null, user.email, id).run()
  const row = await db.prepare('SELECT * FROM hr_requests WHERE id = ?').bind(id).first()
  return c.json({ data: row, message: 'Request resolved.' })
})
