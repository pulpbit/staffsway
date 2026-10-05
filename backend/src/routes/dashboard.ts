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

  const [empToday, onLeaveToday, joiningsMonth, exitsMonth, deptManpower, attTrend, salaryTrend, monthAtt, prevYearEmp, pendingInfo, insights, payFinancials, prevPay, birthdays, clientsWithCounts, upcomingHolidays, dueCompliance] = await Promise.all([
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
    db.prepare(`
      SELECT id, employee_code, first_name, last_name, designation, dob, father_name, uan, esi_number, bank_account, bank_ifsc
      FROM employees
      WHERE status = 'active' AND (
        (dob IS NULL OR dob = '') OR (father_name IS NULL OR father_name = '') OR
        (uan IS NULL OR uan = '') OR (esi_number IS NULL OR esi_number = '') OR
        (bank_account IS NULL OR bank_account = '') OR (bank_ifsc IS NULL OR bank_ifsc = '')
      )
      ORDER BY id DESC LIMIT 20
    `).all(),
    // Single sweep for everything the insight cards need. Kept as one query so
    // the dashboard costs one extra round trip rather than one per card.
    db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM leave_requests WHERE status = 'pending_manager' OR status = 'pending_hr') AS pending_leaves,
        (SELECT COUNT(*) FROM separations WHERE status = 'pending') AS pending_separations,
        (SELECT COUNT(*) FROM hr_requests WHERE status = 'open') AS open_hr_requests,
        (SELECT COUNT(*) FROM employees WHERE status = 'active' AND (uan IS NULL OR TRIM(uan) = '')) AS missing_pf,
        (SELECT COUNT(*) FROM employees WHERE status = 'active' AND (esi_number IS NULL OR TRIM(esi_number) = '')) AS missing_esi,
        (SELECT COUNT(*) FROM employees WHERE status = 'active' AND (bank_account IS NULL OR TRIM(bank_account) = '' OR bank_ifsc IS NULL OR TRIM(bank_ifsc) = '')) AS missing_bank,
        (SELECT COUNT(*) FROM attendance_monthly WHERE month = ? AND year = ? AND status != 'approved') AS pending_attendance,
        (SELECT status FROM payroll WHERE month = ? AND year = ?) AS payroll_status,
        (SELECT COUNT(*) FROM compliance_records WHERE status != 'done' AND year = ?) AS pending_compliance,
        (SELECT COUNT(*) FROM leave_requests WHERE status = 'approved') AS approved_leaves,
        (SELECT COUNT(*) FROM leave_requests WHERE status = 'rejected') AS rejected_leaves
    `).bind(month, year, month, year, year).first(),
    // Money figures for the selected month, summed from payroll_items.
    db.prepare(`
      SELECT
        COALESCE(SUM(i.gross), 0) AS earnings,
        COALESCE(SUM(i.total_deductions), 0) AS deductions,
        COALESCE(SUM(i.net_salary), 0) AS net,
        COALESCE(SUM(i.pf), 0) AS pf,
        COALESCE(SUM(i.esic), 0) AS esi
      FROM payroll_items i
      JOIN payroll p ON p.id = i.payroll_id
      WHERE p.month = ? AND p.year = ?
    `).bind(month, year).first(),
    db.prepare(`
      SELECT COALESCE(SUM(i.net_salary), 0) AS prev_net
      FROM payroll_items i
      JOIN payroll p ON p.id = i.payroll_id
      WHERE (p.year < ?) OR (p.year = ? AND p.month < ?)
    `).bind(year, year, month).first(),
    // Birthdays in the next 30 days. Compares MM-DD so it works across the
    // year boundary, which a plain julianday range would miss in December.
    db.prepare(`
      SELECT id, employee_code, first_name, last_name, designation, dob,
        CAST(substr(dob, 6, 2) AS INTEGER) AS b_month,
        CAST(substr(dob, 9, 2) AS INTEGER) AS b_day
      FROM employees
      WHERE status = 'active' AND dob IS NOT NULL AND TRIM(dob) != ''
        AND length(dob) >= 10
    `).all(),
    db.prepare(`
      SELECT c.id, c.name, c.status,
        (SELECT COUNT(*) FROM employees e
          JOIN sites s ON s.id = e.site_id
          WHERE s.client_id = c.id AND e.status = 'active') AS employee_count
      FROM clients c
      ORDER BY employee_count DESC, c.name
    `).all(),
    db.prepare(`
      SELECT h.date, h.name FROM holidays h
      WHERE h.date >= date('now', 'start of month')
      ORDER BY h.date LIMIT 6
    `).all(),
    db.prepare(`
      SELECT obligation, due_date, status FROM compliance_records
      WHERE status != 'done'
      ORDER BY due_date LIMIT 6
    `).all(),
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

  // ---- Insight cards -------------------------------------------------------
  // Every count below comes from a table, so the cards are empty rather than
  // invented when the database has nothing to report.

  // Days-until-birthday, allowing for the year boundary.
  const today = new Date()
  const upcomingBirthdays = (birthdays.results || [])
    .map((b: any) => {
      let next = new Date(today.getFullYear(), n(b.b_month) - 1, n(b.b_day))
      if (next.getTime() < today.getTime() - 86400000) next = new Date(today.getFullYear() + 1, n(b.b_month) - 1, n(b.b_day))
      return {
        id: b.id,
        employee_code: b.employee_code,
        name: `${b.first_name} ${b.last_name}`.trim(),
        designation: b.designation,
        date: b.dob,
        in_days: Math.round((next.getTime() - today.getTime()) / 86400000),
      }
    })
    .filter((b: any) => b.in_days >= 0 && b.in_days <= 30)
    .sort((a: any, b: any) => a.in_days - b.in_days)
    .slice(0, 5)

  const payrollStatus = (insights as any)?.payroll_status || null
  // Salary is only outstanding if there is somebody to pay and the run for the
  // selected month has not been paid. Without this guard a missing payroll row
  // (status null) read as pending work on an otherwise empty database.
  const hasPayrollWork = totalActive > 0 || enrolled > 0
  const salaryPending = hasPayrollWork && payrollStatus !== 'paid' ? 1 : 0

  // Payroll money figures for the selected month, summed from payroll_items.
  // Derived rather than hardcoded so an empty database reports zero.
  const financials = {
    earnings: n((payFinancials as any)?.earnings),
    deductions: n((payFinancials as any)?.deductions),
    net: n((payFinancials as any)?.net),
    pf: n((payFinancials as any)?.pf),
    esi: n((payFinancials as any)?.esi),
  }
  const prevNet = n((prevPay as any)?.prev_net)
  const payrollTrendPct = prevNet > 0
    ? Math.round(((financials.net - prevNet) / prevNet) * 1000) / 10
    : null

  const alerts = [
    { key: 'birthdays', label: 'Upcoming Birthdays', count: upcomingBirthdays.length, tone: 'rose' },
    { key: 'pf', label: 'Missing PF / UAN', count: n((insights as any)?.missing_pf), tone: 'purple' },
    { key: 'esic', label: 'Missing ESIC Number', count: n((insights as any)?.missing_esi), tone: 'emerald' },
    { key: 'bank', label: 'Missing Bank Details', count: n((insights as any)?.missing_bank), tone: 'amber' },
    { key: 'salary', label: 'Salary Pending', count: salaryPending, tone: 'amber' },
    { key: 'compliance', label: 'Statutory Filings Due', count: n((insights as any)?.pending_compliance), tone: 'blue' },
  ]

  // Field-level gaps across all active staff, not just the 20 sampled above.
  const fieldGaps = (pendingInfo.results || []).reduce((acc: Record<string, number>, r: any) => {
    const missing: string[] = r.missing || []
    for (const f of missing) acc[f] = (acc[f] || 0) + 1
    return acc
  }, {})
  const totalGaps = Object.values(fieldGaps).reduce((a, b) => a + b, 0)

  // Work actually waiting on someone.
  const tasks = [
    { key: 'leaves', title: 'Review pending leave requests', count: n((insights as any)?.pending_leaves), route: '/leave', status: n((insights as any)?.pending_leaves) > 0 ? 'pending' : 'done' },
    { key: 'separations', title: 'Process pending separations', count: n((insights as any)?.pending_separations), route: '/separation', status: n((insights as any)?.pending_separations) > 0 ? 'pending' : 'done' },
    { key: 'attendance', title: `Finalise attendance for ${month}/${year}`, count: n((insights as any)?.pending_attendance), route: '/attendance', status: n((insights as any)?.pending_attendance) > 0 ? 'in_progress' : 'done' },
    { key: 'payroll', title: payrollStatus === 'paid' ? `Salary processed for ${month}/${year}` : hasPayrollWork ? `Process salary for ${month}/${year}` : `No payroll run for ${month}/${year}`, count: salaryPending, route: '/payroll', status: salaryPending > 0 ? 'pending' : 'done' },
    { key: 'hr', title: 'Respond to open HR requests', count: n((insights as any)?.open_hr_requests), route: '/helpdesk', status: n((insights as any)?.open_hr_requests) > 0 ? 'pending' : 'done' },
    { key: 'records', title: 'Complete missing employee records', count: totalGaps, route: '/employees', status: totalGaps > 0 ? 'pending' : 'done' },
  ]

  const activeClients = (clientsWithCounts.results || [])
    .filter((c: any) => c.status === 'active')
    .slice(0, 6)
    .map((c: any) => ({ id: c.id, name: c.name, employees: n(c.employee_count), status: c.status }))

  const topClients = (clientsWithCounts.results || [])
    .filter((c: any) => n(c.employee_count) > 0)
    .slice(0, 5)
    .map((c: any) => ({ id: c.id, name: c.name, staff: n(c.employee_count) }))
  const topClientMax = topClients.length > 0 ? topClients[0].staff : 0

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
      payroll_status: payrollStatus,
      alerts,
      upcoming_birthdays: upcomingBirthdays,
      field_gaps: fieldGaps,
      tasks,
      financials,
      prev_net: prevNet,
      payroll_trend_pct: payrollTrendPct,
      leave_counts: {
        pending: n((insights as any)?.pending_leaves),
        approved: n((insights as any)?.approved_leaves),
        rejected: n((insights as any)?.rejected_leaves),
      },
      active_clients: activeClients,
      top_clients: topClients,
      top_client_max: topClientMax,
      holidays: (upcomingHolidays.results || []).map((h: any) => ({ date: h.date, name: h.name })),
      due_compliance: (dueCompliance.results || []).map((r: any) => ({ obligation: r.obligation, due_date: r.due_date, status: r.status })),
      pending_info: (pendingInfo.results || []).map((r: any) => ({
        id: r.id,
        employee_code: r.employee_code,
        first_name: r.first_name,
        last_name: r.last_name,
        designation: r.designation,
        missing: (['dob', 'father_name', 'uan', 'esi_number', 'bank_account', 'bank_ifsc'] as const).filter((k) => !String(r[k] ?? '').trim()),
      })),
    },
  })
})

dashboardRoutes.get('/', async (c) => {
  const db = getDb(c.env)
  const now = new Date()
  const month = Number(c.req.query('month') || now.getMonth() + 1)
  const year = Number(c.req.query('year') || now.getFullYear())

  const [emp, att, pay, cli, sit, payrollMonth, recentEmps, recentPay, attTrend, payrollTrend, byClient, byDesignation, deptCount, activityFeed] = await Promise.all([
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
    db.prepare(`
      SELECT 'leave' AS kind, e.first_name || ' ' || e.last_name AS who,
        'requested leave' AS action, COALESCE(lt.name, 'Leave') AS tag, l.created_at AS at
      FROM leave_requests l
      JOIN employees e ON e.id = l.employee_id
      LEFT JOIN leave_types lt ON lt.id = l.leave_type_id
      UNION ALL
      SELECT 'employee', e.first_name || ' ' || e.last_name, 'joined', COALESCE(e.designation, 'Staff'), e.created_at
      FROM employees e
      UNION ALL
      SELECT 'attendance', e.first_name || ' ' || e.last_name, 'marked ' || a.mark, a.date, a.created_at
      FROM attendance_daily a
      JOIN employees e ON e.id = a.employee_id
      UNION ALL
      SELECT 'hr_request', e.first_name || ' ' || e.last_name, 'raised an HR request', COALESCE(r.subject, 'Request'), r.created_at
      FROM hr_requests r
      JOIN employees e ON e.id = r.employee_id
      ORDER BY at DESC LIMIT 8
    `).all(),
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
      activity: (activityFeed.results || []).map((a: any) => ({
        kind: a.kind,
        who: a.who,
        action: a.action,
        tag: a.tag,
        at: a.at,
      })),
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
