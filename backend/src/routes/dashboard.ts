import { Hono } from 'hono'
import type { Env } from '../types'
import { getDb } from '../utils/db'

export const dashboardRoutes = new Hono<{ Bindings: Env }>()

// ---------- Management Dashboard ----------

dashboardRoutes.get('/management', async (c) => {
  const db = getDb(c.env)
  const now = new Date()
  const month = Number(c.req.query('month') || now.getMonth() + 1)
  const year = Number(c.req.query('year') || now.getFullYear())
  const mm = String(month).padStart(2, '0')

  const [empToday, onLeaveToday, joiningsMonth, exitsMonth, deptManpower, attTrend, salaryTrend, monthAtt, prevYearEmp] = await Promise.all([
    db.prepare(`SELECT COUNT(*) as total FROM employees WHERE status = 'active'`).first(),
    db.prepare(`
      SELECT COUNT(*) as on_leave FROM leave_requests
      WHERE status = 'approved' AND date('now') BETWEEN start_date AND end_date
    `).first(),
    db.prepare(`
      SELECT COUNT(*) as new_joinings FROM employees
      WHERE status = 'active' AND joining_date LIKE ? || '%'
    `).bind(`${year}-${mm}`).first(),
    db.prepare(`
      SELECT COUNT(*) as exits FROM separations
      WHERE status = 'approved' AND COALESCE(last_working_date, resignation_date) LIKE ? || '%'
    `).bind(`${year}-${mm}`).first(),
    db.prepare(`
      SELECT department AS name, COUNT(e.id) AS value
      FROM employees e
      WHERE e.status = 'active' AND e.department IS NOT NULL AND e.department != ''
      GROUP BY e.department ORDER BY value DESC
    `).all(),
    db.prepare(`
      SELECT a.month, a.year,
        SUM(a.present_days) AS present,
        SUM(a.absent_days) AS absent,
        SUM(a.ot_hours) AS ot,
        SUM(a.paid_leave) AS paid_leave,
        SUM(a.late_marks) AS late_marks
      FROM attendance_monthly a
      GROUP BY a.month, a.year ORDER BY a.year, a.month LIMIT 12
    `).all(),
    db.prepare(`
      SELECT p.month, p.year, p.net_total
      FROM payroll p ORDER BY p.year DESC, p.month DESC LIMIT 12
    `).all(),
    db.prepare(`
      SELECT SUM(a.present_days) AS present, SUM(a.absent_days) AS absent,
        SUM(a.ot_hours) AS ot, SUM(a.paid_leave) AS paid_leave,
        SUM(a.late_marks) AS late_marks, COUNT(*) AS enrolled
      FROM attendance_monthly a WHERE a.month = ? AND a.year = ?
    `).bind(month, year).first(),
    db.prepare(`SELECT COUNT(*) as prev_active FROM employees WHERE status = 'active' AND joining_date < ?`).bind(`${year}-01-01`).first(),
  ])

  const n = (v: unknown): number => Number(v || 0)
  const totalActive = n(empToday?.total)
  const onLeave = n(onLeaveToday?.on_leave)
  const enrolled = n(monthAtt?.enrolled)

  // Selected-month attendance figures (attendance is a monthly summary model).
  const monthlyPresent = n(monthAtt?.present)
  const monthlyAbsent = n(monthAtt?.absent)
  const monthlyOt = n(monthAtt?.ot)
  const monthlyLate = n(monthAtt?.late_marks)

  const newJoinings = n(joiningsMonth?.new_joinings)
  const resignations = n(exitsMonth?.exits)
  const prevActive = n(prevYearEmp?.prev_active)
  const annualExits = (attTrend.results as any[]).length
    ? (await db.prepare(`SELECT COUNT(*) AS n FROM separations WHERE status = 'approved' AND COALESCE(last_working_date, resignation_date) LIKE ? || '%'`).bind(`${year}-`).first())
    : null
  const attritionRate = prevActive > 0 ? ((n(annualExits?.n) / prevActive) * 100) : 0

  // Payroll salary cost for the selected month/year
  const monthPay = (salaryTrend.results as any[]).find((p) => Number(p.month) === month && Number(p.year) === year)
  const salaryCost = monthPay ? n(monthPay.net_total) : 0

  // Department-wise fallback using employee group
  const deptData = (deptManpower.results || []).length > 0
    ? deptManpower.results
    : (await db.prepare(`SELECT designation AS name, COUNT(*) AS value FROM employees WHERE status = 'active' GROUP BY designation ORDER BY value DESC LIMIT 8`).all()).results

  return c.json({
    data: {
      month,
      year,
      employees: totalActive,
      enrolled: enrolled,
      present_subtotal: monthlyPresent,
      absent_subtotal: monthlyAbsent,
      late_marks: monthlyLate,
      on_leave: onLeave,
      new_joinings: newJoinings,
      resignations: resignations,
      salary_cost: salaryCost,
      overtime_hours: monthlyOt,
      attrition_rate: Math.round(attritionRate * 100) / 100,
      department_manpower: deptData,
      attendance_trend: attTrend.results,
      salary_cost_trend: salaryTrend.results,
    },
  })
})

dashboardRoutes.get('/', async (c) => {
  const db = getDb(c.env)
  const now = new Date()
  const month = Number(c.req.query('month') || now.getMonth() + 1)
  const year = Number(c.req.query('year') || now.getFullYear())

  const [emp, att, pay, cli, sit, payrollMonth, recentEmps, recentPay, attTrend, payrollTrend, byClient, byDesignation, deptCount] = await Promise.all([
    db.prepare(`SELECT COUNT(*) AS total, SUM(status='active') AS active, SUM(status='inactive') AS inactive FROM employees`).first(),
    db.prepare(`SELECT COUNT(*) AS n, SUM(present_days) AS present, SUM(absent_days) AS absent, SUM(paid_leave) AS paid_leave, SUM(unpaid_leave) AS unpaid_leave, SUM(ot_hours) AS ot FROM attendance_monthly WHERE month = ? AND year = ?`).bind(month, year).first(),
    db.prepare(`SELECT COUNT(*) AS n, SUM(status='draft') AS draft, SUM(status='finalized') AS finalized, SUM(status='paid') AS paid FROM payroll`).first(),
    db.prepare(`SELECT COUNT(*) AS total, SUM(status='active') AS active FROM clients`).first(),
    db.prepare(`SELECT COUNT(*) AS total, SUM(status='active') AS active FROM sites`).first(),
    db.prepare(`SELECT p.*, (SELECT COUNT(*) FROM payroll_items i WHERE i.payroll_id = p.id) AS item_count FROM payroll p WHERE p.month = ? AND p.year = ?`).bind(month, year).first(),
    db.prepare(
      `SELECT e.id, e.employee_code, e.first_name, e.last_name, e.designation, e.status, s.name AS site_name, c.name AS client_name
       FROM employees e LEFT JOIN sites s ON s.id = e.site_id LEFT JOIN clients c ON c.id = s.client_id
       ORDER BY e.id DESC LIMIT 6`
    ).all(),
    db.prepare(`SELECT p.id, p.month, p.year, p.status, p.gross_total, p.net_total FROM payroll p ORDER BY p.year DESC, p.month DESC LIMIT 6`).all(),
    db.prepare(
      `SELECT a.month, a.year, SUM(a.present_days) AS present, SUM(a.absent_days) AS absent, SUM(a.ot_hours) AS ot
       FROM attendance_monthly a GROUP BY a.month, a.year ORDER BY a.year, a.month LIMIT 12`
    ).all(),
    db.prepare(`SELECT p.month, p.year, p.status, p.gross_total, p.net_total FROM payroll p ORDER BY p.year, p.month LIMIT 12`).all(),
    db.prepare(
      `SELECT c.name AS name, COUNT(e.id) AS value FROM employees e JOIN sites s ON s.id = e.site_id JOIN clients c ON c.id = s.client_id GROUP BY c.id ORDER BY value DESC`
    ).all(),
    db.prepare(`SELECT designation AS name, COUNT(*) AS value FROM employees GROUP BY designation ORDER BY value DESC LIMIT 10`).all(),
    db.prepare(`SELECT department AS name, COUNT(*) AS value FROM employees GROUP BY department ORDER BY value DESC`).all(),
  ])

  const n = (v: unknown): number => Number(v || 0)

  return c.json({
    data: {
      month,
      year,
      kpi: {
        employees: n(emp?.total),
        active_employees: n(emp?.active),
        inactive_employees: n(emp?.inactive),
        clients: n(cli?.total),
        sites: n(sit?.total),
        present_days: n(att?.present),
        absent_days: n(att?.absent),
        ot_hours: n(att?.ot),
        payroll: payrollMonth ? { ...payrollMonth, gross_total: n((payrollMonth as any).gross_total), net_total: n((payrollMonth as any).net_total), deduction_total: n((payrollMonth as any).deduction_total) } : null,
      },
      totals: {
        attendance_records: n(att?.n),
        payroll_counts: { total: n(pay?.n), draft: n(pay?.draft), finalized: n(pay?.finalized), paid: n(pay?.paid) },
        client_active: n(cli?.active),
        site_active: n(sit?.active),
      },
      recent_employees: recentEmps.results,
      recent_payroll: recentPay.results,
      charts: {
        attendance_trend: attTrend.results,
        payroll_trend: payrollTrend.results,
        employees_by_client: byClient.results,
        employees_by_designation: byDesignation.results,
        employees_by_department: deptCount.results,
      },
    },
  })
})
