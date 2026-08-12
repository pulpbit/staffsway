import { Hono } from 'hono'
import { z } from 'zod'
import type { Env } from '../types'
import { getDb } from '../utils/db'
import { clamp } from '../utils/money'

const monthQuery = z.object({
  month: z.string().regex(/^[1-9]|1[0-2]$/),
  year: z.string().regex(/^\d{4}$/),
})

const itemSchema = z.object({
  employee_id: z.number().int().positive(),
  present_days: z.number().int().min(0).max(31).optional(),
  absent_days: z.number().int().min(0).max(31).optional(),
  paid_leave: z.number().int().min(0).max(31).optional(),
  unpaid_leave: z.number().int().min(0).max(31).optional(),
  ot_hours: z.number().min(0).max(200).optional(),
  remarks: z.string().max(500).optional().nullable(),
})

export const attendanceRoutes = new Hono<{ Bindings: Env }>()

attendanceRoutes.get('/months', async (c) => {
  const db = getDb(c.env)
  const rows = await db
    .prepare(
      `SELECT month, year, status, COUNT(*) AS employee_count,
        SUM(present_days) AS total_present, SUM(absent_days) AS total_absent,
        SUM(ot_hours) AS total_ot
       FROM attendance_monthly GROUP BY month, year, status ORDER BY year DESC, month DESC`
    )
    .all()
  return c.json({ data: rows.results })
})

// Attendance sheet: every active employee (optionally filtered) + their record for the month
attendanceRoutes.get('/sheet', async (c) => {
  const q = c.req.query()
  const parsed = monthQuery.safeParse(q)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Select a month and year.' } }, 400)
  const { month, year } = parsed.data
  const clientId = q.client_id && q.client_id !== '' ? Number(q.client_id) : null
  const siteId = q.site_id && q.site_id !== '' ? Number(q.site_id) : null
  const search = q.search

  const where: string[] = ['e.status = \'active\'']
  const params: (string | number)[] = []
  if (siteId) { where.push('e.site_id = ?'); params.push(siteId) }
  if (clientId) { where.push('c.id = ?'); params.push(clientId) }
  if (search) { const t = `%${search}%`; where.push('(e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_code LIKE ?)'); params.push(t, t, t) }

  const rows = await getDb(c.env)
    .prepare(
      `SELECT e.id AS employee_id, e.employee_code, e.first_name, e.last_name, e.designation, e.status,
        s.id AS site_id, s.name AS site_name, c.id AS client_id, c.name AS client_name,
        a.id AS attendance_id, a.present_days, a.absent_days, a.paid_leave, a.unpaid_leave, a.ot_hours, a.remarks, a.status AS attendance_status
       FROM employees e
       LEFT JOIN sites s ON s.id = e.site_id
       LEFT JOIN clients c ON c.id = s.client_id
       LEFT JOIN attendance_monthly a ON a.employee_id = e.id AND a.month = ? AND a.year = ?
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY e.first_name ASC`
    )
    .bind(month, year, ...params)
    .all()

  const finalizable = await getDb(c.env)
    .prepare('SELECT COUNT(*) AS n FROM attendance_monthly WHERE month = ? AND year = ? AND status = \'finalized\'')
    .bind(month, year)
    .first()

  return c.json({
    data: {
      month: Number(month),
      year: Number(year),
      rows: rows.results,
      finalized_count: Number(finalizable?.n || 0),
    },
  })
})

attendanceRoutes.get('/', async (c) => {
  const q = c.req.query()
  const where: string[] = []
  const params: (string | number)[] = []
  if (q.month && q.year) {
    const parsed = monthQuery.safeParse(q)
    if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Invalid month or year.' } }, 400)
    where.push('a.month = ?'); params.push(Number(parsed.data.month))
    where.push('a.year = ?'); params.push(Number(parsed.data.year))
  }
  if (q.client_id && q.client_id !== '') { where.push('c.id = ?'); params.push(Number(q.client_id)) }
  if (q.site_id && q.site_id !== '') { where.push('e.site_id = ?'); params.push(Number(q.site_id)) }
  if (q.employee_id && q.employee_id !== '') { where.push('e.id = ?'); params.push(Number(q.employee_id)) }
  if (q.status && q.status !== '') { where.push('a.status = ?'); params.push(q.status) }
  if (q.search) { const t = `%${q.search}%`; where.push('(e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_code LIKE ?)'); params.push(t, t, t) }
  const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : ''
  const rows = await getDb(c.env)
    .prepare(
      `SELECT a.*, e.employee_code, e.first_name, e.last_name, e.designation, s.name AS site_name, c.name AS client_name
       FROM attendance_monthly a
       JOIN employees e ON e.id = a.employee_id
       LEFT JOIN sites s ON s.id = e.site_id
       LEFT JOIN clients c ON c.id = s.client_id
       ${whereSql}
       ORDER BY e.first_name ASC`
    )
    .bind(...params)
    .all()
  return c.json({ data: rows.results })
})

const bulkSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  items: z.array(itemSchema).min(1),
})

attendanceRoutes.post('/bulk', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = bulkSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const { month, year, items } = parsed.data
  const db = getDb(c.env)

  const settings = await db.prepare('SELECT attendance_lock_enabled FROM settings WHERE id = 1').first()
  const lockEnabled = settings?.attendance_lock_enabled === 1
  const existingFinalized = await db.prepare('SELECT employee_id FROM attendance_monthly WHERE month = ? AND year = ? AND status = \'finalized\'').bind(month, year).all()
  const finalizedSet = new Set(existingFinalized.results.map((r: any) => r.employee_id))

  const ops: D1PreparedStatement[] = []
  const upserted: number[] = []
  for (const it of items) {
    if (lockEnabled && finalizedSet.has(it.employee_id)) continue
    const present = clamp(it.present_days ?? 0, 0, 31)
    const absent = clamp(it.absent_days ?? 0, 0, 31)
    const paid = clamp(it.paid_leave ?? 0, 0, 31)
    const unpaid = clamp(it.unpaid_leave ?? 0, 0, 31)
    const ot = clamp(it.ot_hours ?? 0, 0, 200)
    const existing = await db.prepare('SELECT id, status FROM attendance_monthly WHERE employee_id = ? AND month = ? AND year = ?').bind(it.employee_id, month, year).first()
    if (existing) {
      if (lockEnabled && existing.status === 'finalized') continue
      ops.push(
        db.prepare(
          `UPDATE attendance_monthly SET present_days = ?, absent_days = ?, paid_leave = ?, unpaid_leave = ?, ot_hours = ?, remarks = ?, updated_at = datetime('now') WHERE id = ?`
        ).bind(present, absent, paid, unpaid, ot, it.remarks ?? null, existing.id)
      )
      upserted.push(Number(existing.id))
    } else {
      ops.push(
        db.prepare(
          `INSERT INTO attendance_monthly (employee_id, month, year, present_days, absent_days, paid_leave, unpaid_leave, ot_hours, remarks, status) VALUES (?,?,?,?,?,?,?,?,?, 'draft')`
        ).bind(it.employee_id, month, year, present, absent, paid, unpaid, ot, it.remarks ?? null)
      )
      upserted.push(0)
    }
  }
  if (!ops.length) {
    return c.json({ error: { code: 'conflict', message: 'No changes were saved. Attendance for the selected month is already locked.' } }, 409)
  }
  await db.batch(ops)
  return c.json({ data: { saved: ops.length, employees: items.length }, message: `${ops.length} attendance record${ops.length === 1 ? '' : 's'} saved.` })
})

const updateSchema = z.object({
  present_days: z.number().int().min(0).max(31).optional(),
  absent_days: z.number().int().min(0).max(31).optional(),
  paid_leave: z.number().int().min(0).max(31).optional(),
  unpaid_leave: z.number().int().min(0).max(31).optional(),
  ot_hours: z.number().min(0).max(200).optional(),
  remarks: z.string().max(500).optional().nullable(),
  status: z.enum(['draft', 'finalized']).optional(),
})

attendanceRoutes.put('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.' } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const existing = await db.prepare('SELECT * FROM attendance_monthly WHERE id = ?').bind(id).first()
  if (!existing) return c.json({ error: { code: 'not_found', message: 'Attendance record not found.' } }, 404)
  if (existing.status === 'finalized' && d.status !== 'finalized') {
    return c.json({ error: { code: 'conflict', message: 'This month has been locked. Unlock it before editing.' } }, 409)
  }
  const fields = ['present_days', 'absent_days', 'paid_leave', 'unpaid_leave', 'ot_hours', 'remarks', 'status'] as const
  const sets: string[] = []
  const params: (number | string | null)[] = []
  for (const f of fields) {
    if (f in d && d[f as keyof typeof d] !== undefined) {
      sets.push(`${f} = ?`)
      params.push(d[f as keyof typeof d] as number | string | null)
    }
  }
  if (!sets.length) return c.json({ error: { code: 'validation_error', message: 'Nothing to update.' } }, 400)
  sets.push('updated_at = datetime(\'now\')')
  params.push(id)
  await db.prepare(`UPDATE attendance_monthly SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run()
  const updated = await db.prepare('SELECT a.*, e.employee_code, e.first_name, e.last_name FROM attendance_monthly a JOIN employees e ON e.id = a.employee_id WHERE a.id = ?').bind(id).first()
  return c.json({ data: updated })
})

const finalizeSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  locked: z.boolean().optional(),
})

attendanceRoutes.post('/finalize', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = finalizeSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Invalid month or year.' } }, 400)
  const { month, year, locked } = parsed.data
  const db = getDb(c.env)
  const status = locked === false ? 'draft' : 'finalized'
  const res = await db
    .prepare('UPDATE attendance_monthly SET status = ?, updated_at = datetime(\'now\') WHERE month = ? AND year = ?')
    .bind(status, month, year)
    .run()
  return c.json({ data: { updated: Number(res.meta.changes), status, month, year }, message: `Attendance for ${month}/${year} ${status === 'finalized' ? 'locked' : 'unlocked'}.` })
})
