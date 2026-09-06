import { Hono } from 'hono'
import type { Env } from '../types'
import { getDb } from '../utils/db'
import { r2 as r2Round } from '../utils/money'

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

// Latest salary structure per employee (avoids duplicate rows after revisions)
const LATEST_STRUCT = `JOIN salary_structures st ON st.id = (
  SELECT st2.id FROM salary_structures st2 WHERE st2.employee_id = e.id
  ORDER BY st2.effective_from DESC, st2.id DESC LIMIT 1
)`

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
       ${LATEST_STRUCT}
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
        pi.incentive, pi.bonus, pi.arrears,
        pi.attendance_deduction, pi.gross, pi.pf, pi.esic, pi.professional_tax, pi.lwf, pi.tds, pi.advance_deduction, pi.loan_deduction, pi.other_deduction,
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
       ${LATEST_STRUCT}
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
      `SELECT c.id, c.name AS client_name, c.client_code, c.primary_contact_person, c.company_email, c.status,
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
        a.present_days, a.ot_hours,
        (SELECT st3.overtime_rate FROM salary_structures st3 WHERE st3.employee_id = e.id ORDER BY st3.effective_from DESC, st3.id DESC LIMIT 1) AS overtime_rate,
        ROUND(a.ot_hours * (SELECT st3.overtime_rate FROM salary_structures st3 WHERE st3.employee_id = e.id ORDER BY st3.effective_from DESC, st3.id DESC LIMIT 1), 2) AS ot_amount, a.status
       FROM attendance_monthly a
       JOIN employees e ON e.id = a.employee_id
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

// 9. Bank salary statement (net payable per employee with bank details, for bank upload)
reportRoutes.get('/bank-statement', async (c) => {
  const q = c.req.query()
  const month = Number(q.month)
  const year = Number(q.year)
  if (!month || !year) return c.json({ error: { code: 'validation_error', message: 'Select month and year.' } }, 400)
  const s = scope(q)
  const where = ['p.month = ?', 'p.year = ?', ...s.where]
  const params: (string | number)[] = [month, year, ...s.params]
  const rows = await getDb(c.env)
    .prepare(
      `SELECT e.id AS employee_id, e.employee_code, e.first_name, e.last_name,
        e.bank_name, e.bank_account, e.bank_ifsc,
        s.name AS site_name, c.name AS client_name,
        pi.net_salary, p.status AS payroll_status
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
  const list = rows.results as any[]
  const totalNet = list.reduce((acc, r) => acc + Number(r.net_salary || 0), 0)
  const missingBank = list.filter((r) => !r.bank_account || !r.bank_ifsc).length
  return c.json({ data: list, meta: { month, year, total_net: r2Round(totalNet), missing_bank_details: missingBank, employee_count: list.length } })
})

// 10. Employee Master — full master record (superset of /employees)
reportRoutes.get('/employee-master', async (c) => {
  const q = c.req.query()
  const s = scope(q)
  const where = s.where.length ? ` WHERE ${s.where.join(' AND ')}` : ''
  const rows = await getDb(c.env)
    .prepare(
      `SELECT e.id, e.employee_code, e.first_name, e.last_name, e.gender, e.dob, e.mobile, e.email, e.address, e.city, e.state,
        e.pincode, e.pan, e.uan, e.bank_name, e.bank_account, e.bank_ifsc, e.designation, e.department, e.employee_type,
        e.shift_type, e.joining_date, e.status, e.grade, e.reporting_manager, e.previous_employment,
        s.name AS site_name, c.name AS client_name, st.basic
       FROM employees e
       LEFT JOIN sites s ON s.id = e.site_id
       LEFT JOIN clients c ON c.id = s.client_id
       ${LATEST_STRUCT}
       ${where} ORDER BY e.employee_code`
    )
    .bind(...s.params)
    .all()
  const active = rows.results.filter((r: any) => r.status === 'active').length
  return c.json({ data: rows.results, meta: { total: rows.results.length, active } })
})

// 11. Late / Early report
reportRoutes.get('/late-early', async (c) => {
  const q = c.req.query()
  const month = Number(q.month)
  const year = Number(q.year)
  if (!month || !year) return c.json({ error: { code: 'validation_error', message: 'Select month and year.' } }, 400)
  const s = scope(q)
  const where = ['a.month = ?', 'a.year = ?', ...s.where]
  const params: (string | number)[] = [month, year, ...s.params]
  const rows = await getDb(c.env)
    .prepare(
      `SELECT e.employee_code, e.first_name, e.last_name, e.designation, e.department, s.name AS site_name, c.name AS client_name,
        a.present_days, a.late_marks, a.early_departures, a.status
       FROM attendance_monthly a
       JOIN employees e ON e.id = a.employee_id
       LEFT JOIN sites s ON s.id = e.site_id
       LEFT JOIN clients c ON c.id = s.client_id
       WHERE ${where.join(' AND ')}
       ORDER BY (a.late_marks + a.early_departures) DESC`
    )
    .bind(...params)
    .all()
  const totalLate = rows.results.reduce((acc, r: any) => acc + Number(r.late_marks || 0), 0)
  const totalEarly = rows.results.reduce((acc, r: any) => acc + Number(r.early_departures || 0), 0)
  return c.json({ data: rows.results, meta: { month, year, total_late_marks: totalLate, total_early_departures: totalEarly } })
})

// 12. Leave report (approved + pending days per employee / leave type in a range)
reportRoutes.get('/leave', async (c) => {
  const q = c.req.query()
  const year = Number(q.year)
  const where: string[] = []
  const params: (string | number)[] = []
  if (q.from && q.from !== '') { where.push('lr.end_date >= ?'); params.push(q.from) }
  if (q.to && q.to !== '') { where.push('lr.start_date <= ?'); params.push(q.to) }
  if (year) { where.push('(substr(lr.start_date,1,4) = ? OR substr(lr.end_date,1,4) = ?)'); params.push(String(year), String(year)) }
  const s = scope(q)
  where.push(...s.where)
  params.push(...s.params)
  const base = `FROM leave_requests lr
    JOIN employees e ON e.id = lr.employee_id
    LEFT JOIN sites s ON s.id = e.site_id
    LEFT JOIN clients c ON c.id = s.client_id
    LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id`
  const w = where.length ? ` WHERE ${where.join(' AND ')}` : ''
  // Detail rows per request
  const rows = await getDb(c.env)
    .prepare(
      `SELECT e.employee_code, e.first_name, e.last_name, e.designation, lt.name AS leave_type, lt.code AS leave_code,
        lr.start_date, lr.end_date, lr.days, lr.status,
        CASE WHEN lr.status = 'approved' THEN lr.days ELSE 0 END AS approved_days,
        CASE WHEN lr.status IN ('pending_manager','pending_hr') THEN lr.days ELSE 0 END AS pending_days
       ${base} ${w} ORDER BY lr.start_date DESC`
    )
    .bind(...params)
    .all()
  // Summary grouped by employee + leave type
  const summary = await getDb(c.env)
    .prepare(
      `SELECT e.id AS employee_id, e.employee_code, e.first_name, e.last_name, lt.name AS leave_type, lt.code AS leave_code,
        SUM(CASE WHEN lr.status = 'approved' THEN lr.days ELSE 0 END) AS approved_days,
        SUM(CASE WHEN lr.status IN ('pending_manager','pending_hr') THEN lr.days ELSE 0 END) AS pending_days,
        SUM(CASE WHEN lr.status = 'rejected' THEN lr.days ELSE 0 END) AS rejected_days
       ${base} ${w} GROUP BY e.id, lt.id ORDER BY e.first_name, lt.name`
    )
    .bind(...params)
    .all()
  return c.json({ data: rows.results, meta: { summary: summary.results } })
})

// 13. PF report (employee + employer contributions per payroll month)
reportRoutes.get('/pf', async (c) => {
  const q = c.req.query()
  const month = Number(q.month)
  const year = Number(q.year)
  if (!month || !year) return c.json({ error: { code: 'validation_error', message: 'Select month and year.' } }, 400)
  const s = scope(q)
  const where = ['p.month = ?', 'p.year = ?', ...s.where]
  const params: (string | number)[] = [month, year, ...s.params]
  const rows = await getDb(c.env)
    .prepare(
      `SELECT e.employee_code, e.first_name, e.last_name, e.uan, e.pan, e.designation, s.name AS site_name, c.name AS client_name,
        (pi.basic + pi.hra) AS epf_wages, pi.gross, pi.pf AS employee_pf,
        ROUND(pi.pf, 2) AS employer_pf,
        ROUND(pi.pf * (8.33 / 12.0), 2) AS eps_wages,
        p.status AS payroll_status
       FROM payroll_items pi
       JOIN payroll p ON p.id = pi.payroll_id
       JOIN employees e ON e.id = pi.employee_id
       LEFT JOIN sites s ON s.id = e.site_id
       LEFT JOIN clients c ON c.id = s.client_id
       WHERE ${where.join(' AND ')} AND pi.pf > 0
       ORDER BY e.first_name`
    )
    .bind(...params)
    .all()
  const employeePf = rows.results.reduce((acc, r: any) => acc + Number(r.employee_pf || 0), 0)
  const employerPf = rows.results.reduce((acc, r: any) => acc + Number(r.employer_pf || 0), 0)
  return c.json({ data: rows.results, meta: { month, year, total_employee_pf: r2Round(employeePf), total_employer_pf: r2Round(employerPf), total_pf: r2Round(employeePf + employerPf), employee_count: rows.results.length } })
})

// 14. ESI report
reportRoutes.get('/esi', async (c) => {
  const q = c.req.query()
  const month = Number(q.month)
  const year = Number(q.year)
  if (!month || !year) return c.json({ error: { code: 'validation_error', message: 'Select month and year.' } }, 400)
  const s = scope(q)
  const where = ['p.month = ?', 'p.year = ?', ...s.where]
  const params: (string | number)[] = [month, year, ...s.params]
  const rows = await getDb(c.env)
    .prepare(
      `SELECT e.employee_code, e.first_name, e.last_name, e.designation, e.mobile, s.name AS site_name, c.name AS client_name,
        pi.gross, pi.esic AS employee_esi,
        ROUND(pi.esic * (3.25 / 0.75), 2) AS employer_esi,
        ROUND(pi.esic + (pi.esic * (3.25 / 0.75)), 2) AS total_esi,
        p.status AS payroll_status
       FROM payroll_items pi
       JOIN payroll p ON p.id = pi.payroll_id
       JOIN employees e ON e.id = pi.employee_id
       LEFT JOIN sites s ON s.id = e.site_id
       LEFT JOIN clients c ON c.id = s.client_id
       WHERE ${where.join(' AND ')} AND pi.esic > 0
       ORDER BY e.first_name`
    )
    .bind(...params)
    .all()
  const employeeEsi = rows.results.reduce((acc, r: any) => acc + Number(r.employee_esi || 0), 0)
  const employerEsi = rows.results.reduce((acc, r: any) => acc + Number(r.employer_esi || 0), 0)
  return c.json({ data: rows.results, meta: { month, year, total_employee_esi: r2Round(employeeEsi), total_employer_esi: r2Round(employerEsi), total_esi: r2Round(employeeEsi + employerEsi), employee_count: rows.results.length } })
})

// 15. Department-wise manpower
reportRoutes.get('/dept-manpower', async (c) => {
  const q = c.req.query()
  const s = scope(q)
  const where = s.where.length ? ` WHERE ${s.where.join(' AND ')}` : ''
  const rows = await getDb(c.env)
    .prepare(
      `SELECT e.department, COUNT(e.id) AS total_count,
        SUM(e.status = 'active') AS active_count,
        SUM(e.status != 'active') AS inactive_count,
        SUM(e.gender = 'Male') AS male_count,
        SUM(e.gender = 'Female') AS female_count,
        SUM(e.employee_type = 'permanent') AS permanent_count,
        SUM(e.employee_type = 'contract') AS contract_count
       FROM employees e
       ${where} GROUP BY e.department ORDER BY total_count DESC`
    )
    .bind(...s.params)
    .all()
  return c.json({ data: rows.results, meta: { department_count: rows.results.length } })
})

// 16. Shift report
reportRoutes.get('/shift', async (c) => {
  const q = c.req.query()
  const s = scope(q)
  const where = s.where.length ? ` WHERE ${s.where.join(' AND ')}` : ''
  const rows = await getDb(c.env)
    .prepare(
      `SELECT COALESCE(e.shift_type, 'Not Assigned') AS shift_name, COUNT(e.id) AS employee_count,
        SUM(e.status = 'active') AS active_count,
        COUNT(DISTINCT s.id) AS site_count
       FROM employees e
       LEFT JOIN sites s ON s.id = e.site_id
       ${where} GROUP BY e.shift_type ORDER BY employee_count DESC`
    )
    .bind(...s.params)
    .all()
  return c.json({ data: rows.results })
})

// 17. Joining report (employees joining between from/to)
reportRoutes.get('/joining', async (c) => {
  const q = c.req.query()
  const where: string[] = []
  const params: (string | number)[] = []
  if (q.from && q.from !== '') { where.push('e.joining_date >= ?'); params.push(q.from) }
  if (q.to && q.to !== '') { where.push('e.joining_date <= ?'); params.push(q.to) }
  const s = scope(q)
  where.push(...s.where)
  params.push(...s.params)
  const w = where.length ? ` WHERE ${where.join(' AND ')}` : ''
  const rows = await getDb(c.env)
    .prepare(
      `SELECT e.employee_code, e.first_name, e.last_name, e.designation, e.department, e.employee_type, e.shift_type,
        e.joining_date, e.status, s.name AS site_name, c.name AS client_name
       FROM employees e
       LEFT JOIN sites s ON s.id = e.site_id
       LEFT JOIN clients c ON c.id = s.client_id
       ${w} ORDER BY e.joining_date DESC`
    )
    .bind(...params)
    .all()
  return c.json({ data: rows.results, meta: { total: rows.results.length } })
})

// 18. Exit report (from separations)
reportRoutes.get('/exit', async (c) => {
  const q = c.req.query()
  const where: string[] = []
  const params: (string | number)[] = []
  if (q.from && q.from !== '') { where.push('COALESCE(sp.last_working_date, sp.resignation_date) >= ?'); params.push(q.from) }
  if (q.to && q.to !== '') { where.push('COALESCE(sp.last_working_date, sp.resignation_date) <= ?'); params.push(q.to) }
  const s = scope(q)
  where.push(...s.where)
  params.push(...s.params)
  const w = where.length ? ` WHERE ${where.join(' AND ')}` : ''
  const rows = await getDb(c.env)
    .prepare(
      `SELECT sp.id, e.employee_code, e.first_name, e.last_name, e.designation, e.department, sp.separation_type,
        sp.resignation_date, sp.last_working_date, sp.notice_period_days, sp.reason, sp.status,
        s.name AS site_name, c.name AS client_name
       FROM separations sp
       JOIN employees e ON e.id = sp.employee_id
       LEFT JOIN sites s ON s.id = e.site_id
       LEFT JOIN clients c ON c.id = s.client_id
       ${w} ORDER BY COALESCE(sp.last_working_date, sp.resignation_date) DESC`
    )
    .bind(...params)
    .all()
  const approved = rows.results.filter((r: any) => r.status === 'approved').length
  return c.json({ data: rows.results, meta: { total: rows.results.length, approved_exits: approved } })
})

// 19. Attrition report (monthly trend over a year + period summary)
reportRoutes.get('/attrition', async (c) => {
  const q = c.req.query()
  const year = Number(q.year || new Date().getFullYear())
  const s = scope(q)
  // Only employee-scoped filters apply to joining/exit trend (client/site live on employees)
  const empWhere: string[] = []
  const empParams: (string | number)[] = []
  s.where.forEach((w, i) => {
    if (w.startsWith('e.')) { empWhere.push(w); empParams.push(s.params[i]) }
  })
  const empW = empWhere.length ? ` AND ${empWhere.join(' AND ')}` : ''

  const jTrend = await getDb(c.env)
    .prepare(`SELECT CAST(substr(joining_date, 6, 2) AS INTEGER) AS m, COUNT(*) AS n FROM employees WHERE joining_date LIKE ? || '%' ${empW} GROUP BY m`)
    .bind(`${year}-`, ...empParams)
    .all()
  const eTrend = await getDb(c.env)
    .prepare(`SELECT CAST(substr(COALESCE(sp.last_working_date, sp.resignation_date), 6, 2) AS INTEGER) AS m, COUNT(*) AS n
       FROM separations sp JOIN employees e ON e.id = sp.employee_id
       WHERE COALESCE(sp.last_working_date, sp.resignation_date) LIKE ? || '%' ${empW} GROUP BY m`)
    .bind(`${year}-`, ...empParams)
    .all()

  const jMap = new Map((jTrend.results as any[]).map((r) => [Number(r.m), Number(r.n)]))
  const eMap = new Map((eTrend.results as any[]).map((r) => [Number(r.m), Number(r.n)]))
  const trend = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    return { month: m, joinings: jMap.get(m) || 0, exits: eMap.get(m) || 0 }
  })

  const annualJoinings = trend.reduce((acc, r) => acc + r.joinings, 0)
  const annualExits = trend.reduce((acc, r) => acc + r.exits, 0)
  const avgHeadcount = (annualJoinings + annualExits) / 2
  const attritionRate = annualExits > 0 && avgHeadcount > 0 ? (annualExits / avgHeadcount) * 100 : 0

  return c.json({
    data: trend,
    meta: {
      year,
      total_joinings: annualJoinings,
      total_exits: annualExits,
      attrition_rate: Math.round(attritionRate * 100) / 100,
    },
  })
})

// 20. Expense report
reportRoutes.get('/expense', async (c) => {
  const q = c.req.query()
  const where: string[] = []
  const params: (string | number)[] = []
  if (q.from && q.from !== '') { where.push('x.expense_date >= ?'); params.push(q.from) }
  if (q.to && q.to !== '') { where.push('x.expense_date <= ?'); params.push(q.to) }
  if (q.category && q.category !== '') { where.push('x.category = ?'); params.push(q.category) }
  if (q.site_id && q.site_id !== '') { where.push('x.site_id = ?'); params.push(Number(q.site_id)) }
  if (q.client_id && q.client_id !== '') { where.push('s.client_id = ?'); params.push(Number(q.client_id)) }
  const w = where.length ? ` WHERE ${where.join(' AND ')}` : ''
  const rows = await getDb(c.env)
    .prepare(
      `SELECT x.id, x.category, x.description, x.amount, x.expense_date, x.payment_method, x.vendor, x.reference,
        s.name AS site_name, c.name AS client_name
       FROM expenses x
       LEFT JOIN sites s ON s.id = x.site_id
       LEFT JOIN clients c ON c.id = s.client_id
       ${w} ORDER BY x.expense_date DESC`
    )
    .bind(...params)
    .all()
  const total = rows.results.reduce((acc, r: any) => acc + Number(r.amount || 0), 0)
  const byCategory = rows.results.reduce((acc: Record<string, number>, r: any) => {
    acc[r.category] = (acc[r.category] || 0) + Number(r.amount || 0)
    return acc
  }, {})
  return c.json({ data: rows.results, meta: { total_expense: r2Round(total), expense_count: rows.results.length, by_category: byCategory } })
})

// 21. Asset report
reportRoutes.get('/asset', async (c) => {
  const q = c.req.query()
  const where: string[] = []
  const params: (string | number)[] = []
  if (q.asset_type && q.asset_type !== '') { where.push('a.asset_type = ?'); params.push(q.asset_type) }
  if (q.status && q.status !== '') { where.push('a.status = ?'); params.push(q.status) }
  const w = where.length ? ` WHERE ${where.join(' AND ')}` : ''
  const rows = await getDb(c.env)
    .prepare(
      `SELECT a.id, a.asset_code, a.asset_type, a.brand, a.model, a.serial_number, a.purchase_date, a.purchase_price,
        a.warranty_expiry, a.status,
        CASE WHEN EXISTS (SELECT 1 FROM asset_assignments aa WHERE aa.asset_id = a.id AND aa.return_date IS NULL)
          THEN (SELECT e.first_name || ' ' || e.last_name FROM asset_assignments aa JOIN employees e ON e.id = aa.employee_id WHERE aa.asset_id = a.id AND aa.return_date IS NULL ORDER BY aa.issue_date DESC LIMIT 1)
          ELSE NULL END AS assigned_employee,
        (SELECT aa.issue_date FROM asset_assignments aa WHERE aa.asset_id = a.id AND aa.return_date IS NULL ORDER BY aa.issue_date DESC LIMIT 1) AS assigned_date
       FROM assets a
       ${w} ORDER BY a.asset_type, a.asset_code`
    )
    .bind(...params)
    .all()
  const byStatus = rows.results.reduce((acc: Record<string, number>, r: any) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc }, {})
  const totalValue = rows.results.reduce((acc, r: any) => acc + Number(r.purchase_price || 0), 0)
  return c.json({ data: rows.results, meta: { total: rows.results.length, by_status: byStatus, total_value: r2Round(totalValue) } })
})

// 22. Performance report
reportRoutes.get('/performance', async (c) => {
  const q = c.req.query()
  const where: string[] = []
  const params: (string | number)[] = []
  if (q.period && q.period !== '') { where.push('pr.review_period = ?'); params.push(q.period) }
  const s = scope(q)
  where.push(...s.where)
  params.push(...s.params)
  const w = where.length ? ` WHERE ${where.join(' AND ')}` : ''
  const rows = await getDb(c.env)
    .prepare(
      `SELECT e.employee_code, e.first_name, e.last_name, e.designation, e.department, s.name AS site_name, c.name AS client_name,
        pr.review_period, pr.review_type, pr.overall_rating, pr.status, pr.reviewer_name, pr.reviewer_id
       FROM performance_reviews pr
       JOIN employees e ON e.id = pr.employee_id
       LEFT JOIN sites s ON s.id = e.site_id
       LEFT JOIN clients c ON c.id = s.client_id
       ${w} ORDER BY pr.created_at DESC`
    )
    .bind(...params)
    .all()
  const rated = rows.results.filter((r: any) => r.overall_rating != null)
  const avgRating = rated.length ? rated.reduce((acc: number, r: any) => acc + Number(r.overall_rating), 0) / rated.length : null
  const byStatus = rows.results.reduce((acc: Record<string, number>, r: any) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc }, {})
  return c.json({ data: rows.results, meta: { total: rows.results.length, reviewed: rated.length, avg_rating: avgRating != null ? Math.round(avgRating * 100) / 100 : null, by_status: byStatus } })
})
