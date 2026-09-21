import { Hono } from 'hono'
import { z } from 'zod'
import type { Env } from '../types'
import { getDb } from '../utils/db'
import { clamp, r2 } from '../utils/money'

const monthQuery = z.object({
  month: z.string().regex(/^[1-9]|1[0-2]$/),
  year: z.string().regex(/^\d{4}$/),
})

const MARK_CODES = ['P', 'A', 'R', 'HD', 'HF', 'L'] as const
const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEKDAY_DOW: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

const pad = (n: number) => String(n).padStart(2, '0')
const monthDays = (month: number, year: number) => new Date(year, month, 0).getDate()
const dateStr = (month: number, year: number, dayNo: number) => `${year}-${pad(month)}-${pad(dayNo)}`
const monthStart = (month: number, year: number) => `${year}-${pad(month)}-01`
const monthEnd = (month: number, year: number) => `${year}-${pad(month)}-${pad(monthDays(month, year))}`

const defaultMark = (date: string, weeklyOffDow: number, holidays: Set<string>): string => {
  const dow = new Date(`${date}T00:00:00`).getDay()
  if (dow === weeklyOffDow) return 'R'
  if (holidays.has(date)) return 'HD'
  return 'P'
}

interface GridTotals {
  p: number; a: number; r: number; hd: number; hf: number; l: number
  ot_hours: number; ot_days: number; payable_days: number; actual_salary: number; total_days: number
}

function computeGrid(stored: Record<string, string>, holidays: Set<string>, weeklyOffDow: number, monthlyEarnings: number, workingHours: number, otHours: number, month: number, year: number): GridTotals {
  const days = monthDays(month, year)
  const counts = { P: 0, A: 0, R: 0, HD: 0, HF: 0, L: 0 }
  for (let d = 1; d <= days; d++) {
    const date = dateStr(month, year, d)
    const final = stored[date] || defaultMark(date, weeklyOffDow, holidays)
    counts[final as keyof typeof counts]++
  }
  const wHrs = workingHours > 0 ? workingHours : 8
  const otDays = r2(otHours / wHrs)
  const payable = counts.P + counts.R + counts.HD + counts.HF / 2 + otDays
  const actual = monthlyEarnings > 0 && days > 0 ? r2((monthlyEarnings / days) * payable) : 0
  return {
    p: counts.P, a: counts.A, r: counts.R, hd: counts.HD, hf: counts.HF, l: counts.L,
    ot_hours: otHours, ot_days: otDays, payable_days: payable, actual_salary: actual, total_days: days,
  }
}

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

async function fetchSheetRows(db: D1Database, month: number, year: number, opts: { client_id?: number | null; site_id?: number | null; search?: string }) {
  const where: string[] = ['e.status = \'active\'']
  const params: (string | number)[] = []
  if (opts.site_id) { where.push('e.site_id = ?'); params.push(opts.site_id) }
  if (opts.client_id) { where.push('c.id = ?'); params.push(opts.client_id) }
  if (opts.search) { const t = `%${opts.search}%`; where.push('(e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_code LIKE ?)'); params.push(t, t, t) }

  const empRows = await db
    .prepare(
      `SELECT e.id AS employee_id, e.employee_code, e.first_name, e.last_name,
        e.father_name, e.spouse_name, e.designation, e.status,
        s.id AS site_id, s.name AS site_name,
        COALESCE(s.weekly_off, 'Sun') AS weekly_off,
        c.id AS client_id, c.name AS client_name,
        (COALESCE(st.basic,0) + COALESCE(st.hra,0) + COALESCE(st.conveyance,0) + COALESCE(st.other_allowance,0)) AS monthly_earnings,
        COALESCE(st.working_hours, 0) AS working_hours,
        am.id AS attendance_id,
        am.present_days, am.absent_days, am.paid_leave, am.unpaid_leave, am.ot_hours, am.status AS attendance_status
       FROM employees e
       LEFT JOIN sites s ON s.id = e.site_id
       LEFT JOIN clients c ON c.id = s.client_id
       LEFT JOIN salary_structures st ON st.id = (
         SELECT st2.id FROM salary_structures st2 WHERE st2.employee_id = e.id AND st2.effective_from <= ?
         ORDER BY st2.effective_from DESC, st2.id DESC LIMIT 1
       )
       LEFT JOIN attendance_monthly am ON am.employee_id = e.id AND am.month = ? AND am.year = ?
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY e.first_name ASC`
    )
    .bind(monthEnd(month, year), month, year, ...params)
    .all()

  const daily = await db
    .prepare('SELECT employee_id, date, mark FROM attendance_daily WHERE date BETWEEN ? AND ?')
    .bind(monthStart(month, year), monthEnd(month, year))
    .all()
  const byEmp = new Map<number, Record<string, string>>()
  for (const d of (daily.results as any[])) {
    const m = byEmp.get(d.employee_id) || {}
    m[d.date] = d.mark
    byEmp.set(d.employee_id, m)
  }

  const holRows = await db
    .prepare('SELECT date, name FROM holidays WHERE date BETWEEN ? AND ?')
    .bind(monthStart(month, year), monthEnd(month, year))
    .all()
  const holidays = new Set((holRows.results as any[]).map((h) => h.date))

  const days = Array.from({ length: monthDays(month, year) }, (_, i) => {
    const dayNo = i + 1
    const date = dateStr(month, year, dayNo)
    return { date, dayNo, dow: new Date(`${date}T00:00:00`).getDay(), label: WEEKDAY_NAMES[new Date(`${date}T00:00:00`).getDay()] }
  })

  let anyGrid = false
  for (const e of empRows.results as any[]) {
    if (byEmp.has(Number(e.employee_id))) { anyGrid = true; break }
  }

  const rows = (empRows.results as any[]).map((e) => {
    const stored = byEmp.get(Number(e.employee_id)) || null
    const weeklyOffDow = WEEKDAY_DOW[e.weekly_off] ?? 0
    const earnings = Number(e.monthly_earnings) || 0
    const workHrs = Number(e.working_hours) || 0
    const dim = monthDays(month, year)
    const base = {
      employee_id: Number(e.employee_id), employee_code: e.employee_code, first_name: e.first_name, last_name: e.last_name,
      father_name: e.father_name || null, spouse_name: e.spouse_name || null, designation: e.designation, status: e.status,
      site_id: e.site_id, site_name: e.site_name, client_id: e.client_id, client_name: e.client_name,
      weekly_off: e.weekly_off, monthly_earnings: earnings, working_hours: workHrs,
      attendance_id: Number(e.attendance_id) || null, attendance_status: e.attendance_status || null,
    }
    if (stored) {
      const calc = computeGrid(stored, holidays, weeklyOffDow, earnings, workHrs, Number(e.ot_hours) || 0, month, year)
      return { ...base, legacy: false, marks: stored, ...calc }
    }
    const present = Number(e.present_days) || 0
    const absent = Number(e.absent_days) || 0
    const paid = Number(e.paid_leave) || 0
    const unpaid = Number(e.unpaid_leave) || 0
    const ot = Number(e.ot_hours) || 0
    const payable = dim - absent - unpaid
    const actual = earnings > 0 ? r2((earnings / dim) * Math.max(0, payable)) : 0
    return {
      ...base, legacy: !stored,
      marks: null,
      present_days: present, absent_days: absent, paid_leave: paid, unpaid_leave: unpaid, ot_hours: ot,
      p: present, a: absent + unpaid, r: 0, hd: paid, hf: 0, l: unpaid, ot_days: 0,
      payable_days: Math.max(0, payable), actual_salary: actual, total_days: dim,
    }
  })

  return { days, holidays: holRows.results as any[], anyGrid, rows }
}

// Attendance sheet: every active employee (optionally filtered) + their marks for the month.
attendanceRoutes.get('/sheet', async (c) => {
  const q = c.req.query()
  const parsed = monthQuery.safeParse(q)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Select a month and year.' } }, 400)
  const { month, year } = parsed.data
  const clientId = q.client_id && q.client_id !== '' ? Number(q.client_id) : null
  const siteId = q.site_id && q.site_id !== '' ? Number(q.site_id) : null
  const search = q.search

  const data = await fetchSheetRows(getDb(c.env), Number(month), Number(year), { client_id: clientId, site_id: siteId, search })

  const finalizable = await getDb(c.env)
    .prepare('SELECT COUNT(*) AS n FROM attendance_monthly WHERE month = ? AND year = ? AND status = \'finalized\'')
    .bind(Number(month), Number(year))
    .first()

  return c.json({
    data: {
      month: Number(month),
      year: Number(year),
      total_days: monthDays(Number(month), Number(year)),
      days: data.days,
      holidays: data.holidays,
      anyGrid: data.anyGrid,
      rows: data.rows,
      finalized_count: Number(finalizable?.n || 0),
    },
  })
})

// Attendance report: employee detail + client/site rollups + totals.
attendanceRoutes.get('/report', async (c) => {
  const q = c.req.query()
  const parsed = monthQuery.safeParse(q)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Select a month and year.' } }, 400)
  const month = Number(parsed.data.month)
  const year = Number(parsed.data.year)
  const clientId = q.client_id && q.client_id !== '' ? Number(q.client_id) : null
  const siteId = q.site_id && q.site_id !== '' ? Number(q.site_id) : null

  const data = await fetchSheetRows(getDb(c.env), month, year, { client_id: clientId, site_id: siteId })

  const employees = data.rows.map((r: any) => ({
    employee_id: r.employee_id, employee_code: r.employee_code, name: `${r.first_name} ${r.last_name}`.trim(),
    father_name: r.father_name, designation: r.designation, status: r.status,
    client_id: r.client_id, client_name: r.client_name, site_id: r.site_id, site_name: r.site_name,
    attendance_status: r.attendance_status,
    p: r.p ?? 0, a: r.a ?? 0, rest: r.r ?? 0, hd: r.hd ?? 0, hf: r.hf ?? 0, l: r.l ?? 0,
    ot_hours: r.ot_hours ?? 0, ot_days: r.ot_days ?? 0, payable_days: r.payable_days ?? 0,
    monthly_earnings: r.monthly_earnings ?? 0, actual_salary: r.actual_salary ?? 0,
  }))

  const groups = new Map<string, any>()
  for (const e of employees) {
    const key = `${e.client_id ?? 0}:${e.site_id ?? 0}`
    const g = groups.get(key) || { client_id: e.client_id, client_name: e.client_name, site_id: e.site_id, site_name: e.site_name, headcount: 0, p: 0, a: 0, rest: 0, hd: 0, hf: 0, l: 0, ot_hours: 0, ot_days: 0, payable_days: 0, monthly_earnings: 0, actual_salary: 0 }
    g.headcount++
    g.p += e.p; g.a += e.a; g.rest += e.rest; g.hd += e.hd; g.hf += e.hf; g.l += e.l
    g.ot_hours += e.ot_hours; g.ot_days += e.ot_days; g.payable_days += e.payable_days
    g.monthly_earnings += e.monthly_earnings; g.actual_salary += e.actual_salary
    groups.set(key, g)
  }

  const totals = employees.reduce(
    (acc, e) => {
      acc.headcount++
      acc.p += e.p; acc.a += e.a; acc.rest += e.rest; acc.hd += e.hd; acc.hf += e.hf; acc.l += e.l
      acc.ot_hours += e.ot_hours; acc.ot_days += e.ot_days; acc.payable_days += e.payable_days
      acc.monthly_earnings += e.monthly_earnings; acc.actual_salary += e.actual_salary
      return acc
    },
    { headcount: 0, p: 0, a: 0, rest: 0, hd: 0, hf: 0, l: 0, ot_hours: 0, ot_days: 0, payable_days: 0, monthly_earnings: 0, actual_salary: 0 }
  )
  totals.p = r2(totals.p); totals.ot_days = r2(totals.ot_days); totals.payable_days = r2(totals.payable_days); totals.actual_salary = r2(totals.actual_salary)

  for (const g of groups.values()) {
    g.p = r2(g.p); g.ot_days = r2(g.ot_days); g.payable_days = r2(g.payable_days); g.actual_salary = r2(g.actual_salary)
  }

  return c.json({ data: { month, year, total_days: monthDays(month, year), employees, groups: Array.from(groups.values()), totals } })
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

const marksItemSchema = z.object({
  employee_id: z.number().int().positive(),
  marks: z.record(z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.enum(MARK_CODES)),
  ot_hours: z.number().min(0).max(200).optional(),
})

const marksSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  items: z.array(marksItemSchema).min(1),
})

// Save the full day-by-day grid for a list of employees of one month.
// Stores attendance_daily rows, recomputes the attendance_monthly aggregate
// (including payable days + actual salary) and keeps the legacy count columns
// in sync for backward compatibility.
attendanceRoutes.post('/marks', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = marksSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const { month, year, items } = parsed.data
  const db = getDb(c.env)
  const dim = monthDays(month, year)
  const start = monthStart(month, year)
  const end = monthEnd(month, year)

  const settings = await db.prepare('SELECT attendance_lock_enabled FROM settings WHERE id = 1').first()
  const lockEnabled = settings?.attendance_lock_enabled === 1
  const existingFinalized = await db.prepare('SELECT employee_id FROM attendance_monthly WHERE month = ? AND year = ? AND status = \'finalized\'').bind(month, year).all()
  const finalizedSet = new Set(existingFinalized.results.map((r: any) => r.employee_id))

  const holidays = new Set(
    ((await db.prepare('SELECT date FROM holidays WHERE date BETWEEN ? AND ?').bind(start, end).all()).results as any[]).map((h) => h.date)
  )

  const ops: D1PreparedStatement[] = []
  const saved: number[] = []

  for (const it of items) {
    if (lockEnabled && finalizedSet.has(it.employee_id)) continue
    const existing = await db.prepare('SELECT id, status FROM attendance_monthly WHERE employee_id = ? AND month = ? AND year = ?').bind(it.employee_id, month, year).first()
    if (existing && lockEnabled && existing.status === 'finalized') continue
    if (existing?.status === 'finalized') continue

    // Validate the grid covers every day of the month.
    const marks = it.marks
    const misses: string[] = []
    for (let d = 1; d <= dim; d++) {
      const date = dateStr(month, year, d)
      if (!marks[date]) misses.push(date)
    }
    if (misses.length) {
      return c.json({ error: { code: 'validation_error', message: `Complete day grid required â€” missing ${misses.length} date(s).` } }, 400)
    }

    const salary = await db
      .prepare(
        `SELECT (COALESCE(basic,0) + COALESCE(hra,0) + COALESCE(conveyance,0) + COALESCE(other_allowance,0)) AS monthly_earnings, COALESCE(working_hours,0) AS working_hours
         FROM salary_structures WHERE employee_id = ? AND effective_from <= ? ORDER BY effective_from DESC, id DESC LIMIT 1`
      )
      .bind(it.employee_id, monthEnd(month, year))
      .first()
    const earnings = Number((salary as any)?.monthly_earnings) || 0
    const workHrs = Number((salary as any)?.working_hours) || 8

    const siteWeek = await db
      .prepare(`SELECT COALESCE(weekly_off,'Sun') AS weekly_off FROM sites WHERE id = (SELECT site_id FROM employees WHERE id = ?)`)
      .bind(it.employee_id)
      .first()
    const weeklyOffDow = WEEKDAY_DOW[(siteWeek as any)?.weekly_off || 'Sun'] ?? 0

    // Full grid = sent marks (already the final grid the user saw).
    const counts = { P: 0, A: 0, R: 0, HD: 0, HF: 0, L: 0 }
    for (let d = 1; d <= dim; d++) {
      const date = dateStr(month, year, d)
      counts[marks[date] as keyof typeof counts]++
    }
    // Keep defaults honest even if a date is force-marked equal to default:
    // recompute against default so an OLD stored override equal to the default is harmless.
    const pCount = counts.P
    const aCount = counts.A
    const rCount = counts.R
    const hdCount = counts.HD
    const hfCount = counts.HF
    const lCount = counts.L

    const otHours = it.ot_hours ?? 0
    const otDays = r2(otHours / workHrs)
    const payable = pCount + rCount + hdCount + hfCount / 2 + otDays
    const actual = earnings > 0 && dim > 0 ? r2((earnings / dim) * payable) : 0

    // Rewrite daily rows for this employee + month.
    ops.push(db.prepare('DELETE FROM attendance_daily WHERE employee_id = ? AND date BETWEEN ? AND ?').bind(it.employee_id, start, end))
    for (const [date, mark] of Object.entries(marks)) {
      ops.push(
        db.prepare('INSERT INTO attendance_daily (employee_id, date, mark) VALUES (?,?,?)').bind(it.employee_id, date, mark)
      )
    }

    if (existing) {
      ops.push(
        db.prepare(
          `UPDATE attendance_monthly SET present_days = ?, absent_days = ?, paid_leave = ?, unpaid_leave = ?, ot_hours = ?,
            total_days = ?, rest_days = ?, holiday_days = ?, half_days = ?, leave_days = ?, ot_days = ?, payable_days = ?, actual_salary = ?,
            updated_at = datetime('now') WHERE id = ?`
        ).bind(pCount, aCount + lCount, rCount + hdCount, 0, otHours, dim, rCount, hdCount, hfCount, lCount, otDays, payable, actual, existing.id)
      )
    } else {
      ops.push(
        db.prepare(
          `INSERT INTO attendance_monthly (employee_id, month, year, present_days, absent_days, paid_leave, unpaid_leave, ot_hours, status,
            total_days, rest_days, holiday_days, half_days, leave_days, ot_days, payable_days, actual_salary)
           VALUES (?,?,?,?,?,?,?,?,'draft',?,?,?,?,?,?,?,?)`
        ).bind(it.employee_id, month, year, pCount, aCount + lCount, rCount + hdCount, 0, otHours, dim, rCount, hdCount, hfCount, lCount, otDays, payable, actual)
      )
    }
    saved.push(it.employee_id)
  }

  if (!ops.length) {
    return c.json({ error: { code: 'conflict', message: 'No changes were saved. Attendance for the selected month is already locked.' } }, 409)
  }
  await db.batch(ops)
  return c.json({ data: { saved: saved.length }, message: `${saved.length} attendance record${saved.length === 1 ? '' : 's'} saved.` })
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
