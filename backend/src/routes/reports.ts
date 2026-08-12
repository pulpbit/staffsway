import { Hono } from 'hono'
import type { Env } from '../types'
import { getDb } from '../utils/db'

export const reportRoutes = new Hono<{ Bindings: Env }>()

function scope(q: Record<string, string | undefined>) {
  const where: string[] = []
  const params: (string | number)[] = []
  if (q.client_id && q.client_id !== '') { where.push('c.id = ?'); params.push(Number(q.client_id)) }
  if (q.site_id && q.site_id !== '') { where.push('e.site_id = ?'); params.push(Number(q.site_id)) }
  if (q.employee_id && q.employee_id !== '') { where.push('e.id = ?'); params.push(Number(q.employee_id)) }
  if (q.status && q.status !== '') { where.push('e.status = ?'); params.push(q.status) }
  if (q.designation && q.designation !== '') { where.push('e.designation = ?'); params.push(q.designation) }
  if (q.search) { const t = `%${q.search}%`; where.push('(e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_code LIKE ?)'); params.push(t, t, t) }
  return { where, params }
}

// 1. Employee report (all employees + salary + assignment)
reportRoutes.get('/employees', async (c) => {
  const q = c.req.query()
  const s = scope(q)
  const where = s.where.length ? ` WHERE ${s.where.join(' AND ')}` : ''
  const rows = await getDb(c.env)
    .prepare(
      `SELECT e.id, e.employee_code, e.first_name, e.last_name, e.gender, e.mobile, e.email, e.designation, e.department,
        e.employee_type, e.shift_type, e.joining_date, e.status, e.city, e.state,
        s.name AS site_name, c.name AS client_name,
        st.basic, st.hra, st.conveyance, st.other_allowance, st.overtime_rate, st.other_deduction
       FROM employees e
       LEFT JOIN sites s ON s.id = e.site_id
       LEFT JOIN clients c ON c.id = s.client_id
       LEFT JOIN salary_structures st ON st.employee_id = e.id
       ${where} ORDER BY e.first_name`
    )
    .bind(...s.params)
    .all()
  return c.json({ data: rows.results })
})

// 2. Monthly attendance report
reportRoutes.get('/attendance', async (c) => {
  const q = c.req.query()
  const month = Number(q.month)
  const year = Number(q.year)
  if (!month || !year) return c.json({ error: { code: 'validation_error', message: 'Select month and year.' } }, 400)
  const s = scope(q)
  const where = ['a.month = ?', 'a.year = ?', ...s.where]
  const params: (string | number)[] = [month, year, ...s.params]
  const rows = await getDb(c.env)
    .prepare(
      `SELECT e.employee_code, e.first_name, e.last_name, e.designation, s.name AS site_name, c.name AS client_name,
        a.present_days, a.absent_days, a.paid_leave, a.unpaid_leave, a.ot_hours, a.status, a.remarks,
        ROUND(CAST(a.present_days AS REAL) / (a.present_days + a.absent_days + a.paid_leave + a.unpaid_leave) * 100, 1) AS attendance_percent
       FROM attendance_monthly a
       JOIN employees e ON e.id = a.employee_id
       LEFT JOIN sites s ON s.id = e.site_id
       LEFT JOIN clients c ON c.id = s.client_id
       WHERE ${where.join(' AND ')}
       ORDER BY e.first_name`
    )
    .bind(...params)
    .all()
  return c.json({ data: rows.results, meta: { month, year } })
})

// 3. Payroll register
reportRoutes.get('/payroll-register', async (c) => {
  const q = c.req.query()
  const month = Number(q.month)
  const year = Number(q.year)
  if (!month || !year) return c.json({ error: { code: 'validation_error', message: 'Select month and year.' } }, 400)
  const s = scope(q)
  const where = ['p.month = ?', 'p.year = ?', ...s.where]
  const params: (string | number)[] = [month, year, ...s.params]
  const rows = await getDb(c.env)
    .prepare(
      `SELECT e.employee_code, e.first_name, e.last_name, e.designation, s.name AS site_name, c.name AS client_name,
        pi.present_days, pi.ot_hours, pi.basic, pi.hra, pi.conveyance, pi.other_allowance, pi.overtime_earnings,
        pi.attendance_deduction, pi.gross, pi.pf, pi.esic, pi.professional_tax, pi.advance_deduction, pi.other_deduction,
        pi.total_deductions, pi.net_salary, pi.status, p.status AS payroll_status
       FROM payroll_items pi
       JOIN payroll p ON p.id = pi.payroll_id
       JOIN employees e ON e.id = pi.employee_id
       LEFT JOIN sites s ON s.id = e.site_id
       LEFT JOIN clients c ON c.id = s.client_id
       WHERE ${where.join(' AND ')}
       ORDER BY e.first_name`
    )
    .bind(...params)
    .all()
  const totals = rows.results.reduce(
    (acc: { gross: number; deductions: number; net: number }, r: any) => {
      acc.gross += Number(r.gross || 0)
      acc.deductions += Number(r.total_deductions || 0)
      acc.net += Number(r.net_salary || 0)
      return acc
    },
    { gross: 0, deductions: 0, net: 0 }
  )
  return c.json({ data: rows.results, meta: { month, year, totals } })
})

// 4. Salary report (per employee monthly salary)
reportRoutes.get('/salary', async (c) => {
  const q = c.req.query()
  const s = scope(q)
  const where = s.where.length ? ` WHERE ${s.where.join(' AND ')}` : ''
  const rows = await getDb(c.env)
    .prepare(
      `SELECT e.employee_code, e.first_name, e.last_name, e.designation, e.status, s.name AS site_name, c.name AS client_name,
        st.basic, st.hra, st.conveyance, st.other_allowance, st.overtime_rate, st.other_deduction,
        (st.basic + st.hra + st.conveyance + st.other_allowance) AS monthly_salary
       FROM employees e
       LEFT JOIN sites s ON s.id = e.site_id
       LEFT JOIN clients c ON c.id = s.client_id
       LEFT JOIN salary_structures st ON st.employee_id = e.id
       ${where} ORDER BY e.first_name`
    )
    .bind(...s.params)
    .all()
  return c.json({ data: rows.results })
})

// 5 & 6. Client-wise / Site-wise employee report
reportRoutes.get('/by-client', async (c) => {
  const rows = await getDb(c.env)
    .prepare(
      `SELECT c.id, c.name AS client_name, c.contact_person, c.phone, c.status,
        COUNT(e.id) AS employee_count,
        SUM(e.status = 'active') AS active_count,
        COUNT(DISTINCT s.id) AS site_count
       FROM clients c
       LEFT JOIN sites s ON s.id = c.id
       LEFT JOIN employees e ON e.site_id = s.id
       GROUP BY c.id ORDER BY employee_count DESC`
    )
    .all()
  return c.json({ data: rows.results })
})

reportRoutes.get('/by-site', async (c) => {
  const rows = await getDb(c.env)
    .prepare(
      `SELECT s.id, s.name AS site_name, s.location, s.supervisor_name, s.shift_type, s.status, c.name AS client_name,
        COUNT(e.id) AS employee_count,
        SUM(e.status = 'active') AS active_count
       FROM sites s
       LEFT JOIN clients c ON c.id = s.client_id
       LEFT JOIN employees e ON e.site_id = s.id
       GROUP BY s.id ORDER BY employee_count DESC`
    )
    .all()
  return c.json({ data: rows.results })
})

// 7. OT report
reportRoutes.get('/ot', async (c) => {
  const q = c.req.query()
  const month = Number(q.month)
  const year = Number(q.year)
  if (!month || !year) return c.json({ error: { code: 'validation_error', message: 'Select month and year.' } }, 400)
  const s = scope(q)
  const where = ['a.month = ?', 'a.year = ?', ...s.where]
  const params: (string | number)[] = [month, year, ...s.params]
  const rows = await getDb(c.env)
    .prepare(
      `SELECT e.employee_code, e.first_name, e.last_name, e.designation, s.name AS site_name, c.name AS client_name,
        a.present_days, a.ot_hours, st.overtime_rate,
        ROUND(a.ot_hours * st.overtime_rate, 2) AS ot_amount, a.status
       FROM attendance_monthly a
       JOIN employees e ON e.id = a.employee_id
       JOIN salary_structures st ON st.employee_id = e.id
       LEFT JOIN sites s ON s.id = e.site_id
       LEFT JOIN clients c ON c.id = s.client_id
       WHERE ${where.join(' AND ')} AND a.ot_hours > 0
       ORDER BY a.ot_hours DESC`
    )
    .bind(...params)
    .all()
  const totalOt = rows.results.reduce((acc, r: any) => acc + Number(r.ot_hours || 0), 0)
  return c.json({ data: rows.results, meta: { month, year, total_ot_hours: totalOt } })
})

// 8. Active / inactive employees
reportRoutes.get('/status', async (c) => {
  const rows = await getDb(c.env)
    .prepare(
      `SELECT e.status, e.employee_code, e.first_name, e.last_name, e.designation, s.name AS site_name, c.name AS client_name, e.joining_date
       FROM employees e LEFT JOIN sites s ON s.id = e.site_id LEFT JOIN clients c ON c.id = s.client_id
       ORDER BY e.status, e.first_name`
    )
    .all()
  const summary = rows.results.reduce(
    (acc: Record<string, number>, r: any) => {
      acc[r.status] = (acc[r.status] || 0) + 1
      return acc
    },
    {}
  )
  return c.json({ data: rows.results, meta: { summary } })
})
