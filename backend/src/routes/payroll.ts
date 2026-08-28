import { Hono } from 'hono'
import { z } from 'zod'
import type { Env } from '../types'
import { getDb } from '../utils/db'
import { r2 } from '../utils/money'
import { calculatePayroll } from '../services/payroll'

export const payrollRoutes = new Hono<{ Bindings: Env }>()

const monthSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  client_id: z.number().int().positive().optional(),
  site_id: z.number().int().positive().optional(),
  employee_ids: z.array(z.number().int().positive()).optional(),
})

async function loadConfig(db: D1Database) {
  const s = await db.prepare('SELECT * FROM settings WHERE id = 1').first()
  return {
    salary_basis_days: Number(s?.salary_basis_days || 26),
    pf_rate: Number(s?.pf_rate || 12),
    pf_cap: Number(s?.pf_cap || 1800),
    pf_eligibility: Number(s?.pf_eligibility || 15000),
    esic_rate: Number(s?.esic_rate || 0.75),
    esic_eligibility: Number(s?.esic_eligibility || 21000),
    professional_tax_amount: Number(s?.professional_tax_amount || 200),
    professional_tax_min_gross: Number(s?.professional_tax_min_gross || 10000),
    lwf_employee_amount: Number(s?.lwf_employee_amount || 0),
    tds_percent: Number(s?.tds_percent || 0),
  }
}

async function collectEmployees(db: D1Database, month: number, year: number, scope?: { client_id?: number; site_id?: number; employee_ids?: number[] }) {
  const where: string[] = [`a.month = ${month}`, `a.year = ${year}`]
  const params: number[] = []
  if (scope?.site_id) { where.push('e.site_id = ?'); params.push(scope.site_id) }
  if (scope?.client_id) { where.push('c.id = ?'); params.push(scope.client_id) }
  if (scope?.employee_ids?.length) { where.push(`e.id IN (${scope.employee_ids.map(() => '?').join(',')})`); params.push(...scope.employee_ids) }
  const rows = await db
    .prepare(
      `SELECT e.id AS employee_id, e.first_name, e.last_name, e.employee_code, e.designation, e.status,
        a.id AS attendance_id, a.present_days, a.absent_days, a.paid_leave, a.unpaid_leave, a.ot_hours, a.status AS attendance_status,
        s.id AS site_id, s.name AS site_name, c.id AS client_id, c.name AS client_name,
        st.basic, st.hra, st.conveyance, st.other_allowance, st.overtime_rate, st.pf_applicable AS st_pf, st.esic_applicable AS st_esic, st.other_deduction,
        COALESCE(es.pf_applicable, st.pf_applicable) AS pf_applicable,
        COALESCE(es.esi_applicable, st.esic_applicable) AS esi_applicable,
        COALESCE(es.lwf_applicable, 0) AS lwf_applicable,
        COALESCE(es.pt_applicable, 1) AS pt_applicable,
        COALESCE(es.tds_applicable, 0) AS tds_applicable
       FROM attendance_monthly a
       JOIN employees e ON e.id = a.employee_id
       JOIN salary_structures st ON st.id = (
         SELECT st2.id FROM salary_structures st2 WHERE st2.employee_id = e.id
         ORDER BY st2.effective_from DESC, st2.id DESC LIMIT 1
       )
       LEFT JOIN employee_statutory es ON es.employee_id = e.id
       LEFT JOIN sites s ON s.id = e.site_id
       LEFT JOIN clients c ON c.id = s.client_id
       WHERE ${where.join(' AND ')}
       ORDER BY e.first_name`
    )
    .bind(...params)
    .all()
  return rows.results
}

async function fetchAdvances(db: D1Database, month: number, year: number, employeeIds: number[]) {
  if (!employeeIds.length) return new Map<number, number>()
  const rows = await db
    .prepare(`SELECT employee_id, SUM(amount) AS amount FROM advances WHERE month = ? AND year = ? AND employee_id IN (${employeeIds.map(() => '?').join(',')}) GROUP BY employee_id`)
    .bind(month, year, ...employeeIds)
    .all()
  const map = new Map<number, number>()
  for (const r of rows.results as any[]) map.set(Number(r.employee_id), Number(r.amount))
  return map
}

// Monthly EMI due per employee across active loans (capped at outstanding).
async function fetchLoans(db: D1Database, employeeIds: number[]) {
  if (!employeeIds.length) return new Map<number, number>()
  const rows = await db
    .prepare(`SELECT employee_id, SUM(MIN(emi_amount, outstanding)) AS amount FROM employee_loans WHERE status = 'active' AND outstanding > 0 AND employee_id IN (${employeeIds.map(() => '?').join(',')}) GROUP BY employee_id`)
    .bind(...employeeIds)
    .all()
  const map = new Map<number, number>()
  for (const r of rows.results as any[]) map.set(Number(r.employee_id), Number(r.amount || 0))
  return map
}

payrollRoutes.get('/', async (c) => {
  const caller = c.get('user')
  if (caller.role === 'employee') {
    return c.json({ error: { code: 'forbidden', message: 'Employee logins cannot view payroll runs. Use My Space.' } }, 403)
  }
  const db = getDb(c.env)
  const rows = await db
    .prepare(
      `SELECT p.*,
        (SELECT COUNT(*) FROM payroll_items i WHERE i.payroll_id = p.id) AS item_count,
        (SELECT COUNT(*) FROM salary_slips sp WHERE sp.month = p.month AND sp.year = p.year) AS slip_count
       FROM payroll p ORDER BY p.year DESC, p.month DESC`
    )
    .all()
  return c.json({ data: rows.results })
})

// ---------- Loans ----------
payrollRoutes.get('/loans', async (c) => {
  const db = getDb(c.env)
  const status = c.req.query('status')
  const where = status ? 'WHERE l.status = ?' : ''
  const rows = await db
    .prepare(
      `SELECT l.*, e.employee_code, e.first_name, e.last_name, e.designation,
        (l.principal - l.outstanding) AS recovered
       FROM employee_loans l JOIN employees e ON e.id = l.employee_id
       ${where} ORDER BY l.status = 'active' DESC, l.id DESC`
    )
    .bind(...(status ? [status] : []))
    .all()
  return c.json({ data: rows.results })
})

const loanSchema = z.object({
  employee_id: z.number().int().positive(),
  principal: z.number().positive(),
  emi_amount: z.number().positive().max(10000000),
  start_month: z.number().int().min(1).max(12),
  start_year: z.number().int().min(2000).max(2100),
  remarks: z.string().max(500).optional(),
})

payrollRoutes.post('/loans', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = loanSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  if (parsed.data.emi_amount > parsed.data.principal) return c.json({ error: { code: 'validation_error', message: 'Monthly EMI cannot exceed the loan principal.' } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const emp = await db.prepare('SELECT id FROM employees WHERE id = ?').bind(d.employee_id).first()
  if (!emp) return c.json({ error: { code: 'not_found', message: 'Employee not found.' } }, 404)
  const info = await db
    .prepare(`INSERT INTO employee_loans (employee_id, principal, emi_amount, outstanding, start_month, start_year, remarks) VALUES (?,?,?,?,?,?,?)`)
    .bind(d.employee_id, r2(d.principal), r2(d.emi_amount), r2(d.principal), d.start_month, d.start_year, d.remarks ?? null)
    .run()
  const created = await db.prepare('SELECT * FROM employee_loans WHERE id = ?').bind(info.meta.last_row_id).first()
  return c.json({ data: created, message: `Loan recorded. ₹${r2(d.emi_amount)} EMI will be deducted monthly from payroll.` }, 201)
})

payrollRoutes.patch('/loans/:id/:action', async (c) => {
  const id = Number(c.req.param('id'))
  const action = c.req.param('action')
  if (!['cancel', 'close'].includes(action)) return c.json({ error: { code: 'validation_error', message: 'Invalid action.' } }, 400)
  const db = getDb(c.env)
  const loan = await db.prepare('SELECT * FROM employee_loans WHERE id = ?').bind(id).first()
  if (!loan) return c.json({ error: { code: 'not_found', message: 'Loan not found.' } }, 404)
  if ((loan as any).status !== 'active') return c.json({ error: { code: 'conflict', message: `Loan is already ${(loan as any).status}.` } }, 409)
  const newStatus = action === 'cancel' ? 'cancelled' : 'closed'
  await db.prepare('UPDATE employee_loans SET status = ? WHERE id = ?').bind(newStatus, id).run()
  const updated = await db.prepare('SELECT * FROM employee_loans WHERE id = ?').bind(id).first()
  return c.json({ data: updated, message: action === 'cancel' ? 'Loan cancelled. No further EMIs will be deducted.' : 'Loan closed and written off.' })
})

// ---------- Full & Final Settlement ----------
payrollRoutes.get('/settlements', async (c) => {
  const db = getDb(c.env)
  const rows = await db
    .prepare(
      `SELECT s.*, e.employee_code, e.first_name, e.last_name, e.designation, e.status AS employee_status
       FROM settlements s JOIN employees e ON e.id = s.employee_id ORDER BY s.id DESC`
    )
    .all()
  return c.json({ data: rows.results })
})

const settlementSchema = z.object({
  employee_id: z.number().int().positive(),
  exit_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  unpaid_days: z.number().min(0).max(62).default(0),
  encash_days: z.number().min(0).max(300).default(0),
  notice_recovery: z.number().min(0).default(0),
  other_recovery: z.number().min(0).default(0),
  ignore_loan_outstanding: z.boolean().optional(),
  remarks: z.string().max(500).optional(),
})

payrollRoutes.post('/settlements', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = settlementSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const emp: any = await db
    .prepare(
      `SELECT e.id, e.first_name, st.basic, st.hra, st.conveyance, st.other_allowance
       FROM employees e
       JOIN salary_structures st ON st.id = (
         SELECT st2.id FROM salary_structures st2 WHERE st2.employee_id = e.id
         ORDER BY st2.effective_from DESC, st2.id DESC LIMIT 1
       )
       WHERE e.id = ?`
    )
    .bind(d.employee_id)
    .first()
  if (!emp) return c.json({ error: { code: 'not_found', message: 'Employee not found.' } }, 404)

  const s = await db.prepare('SELECT salary_basis_days FROM settings WHERE id = 1').first()
  const basis = Number(s?.salary_basis_days || 26)
  const monthly = Number(emp.basic || 0) + Number(emp.hra || 0) + Number(emp.conveyance || 0) + Number(emp.other_allowance || 0)
  const dailyRate = monthly / basis
  const unpaidAmount = r2(dailyRate * d.unpaid_days)
  // Leave encashment is computed on Basic only (consistent with leave module).
  const encashAmount = r2((Number(emp.basic || 0) / basis) * d.encash_days)
  let loanOutstanding = 0
  if (!d.ignore_loan_outstanding) {
    const l: any = await db
      .prepare(`SELECT COALESCE(SUM(outstanding), 0) AS total FROM employee_loans WHERE employee_id = ? AND status = 'active'`)
      .bind(d.employee_id)
      .first()
    loanOutstanding = r2(Number(l?.total || 0))
  }
  const netPayable = Math.max(0, r2(unpaidAmount + encashAmount - d.notice_recovery - d.other_recovery - loanOutstanding))

  const info = await db
    .prepare(
      `INSERT INTO settlements (employee_id, exit_date, unpaid_days, unpaid_amount, encash_days, encashment_amount, notice_recovery, other_recovery, loan_outstanding, net_payable, remarks)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    )
    .bind(d.employee_id, d.exit_date, d.unpaid_days, unpaidAmount, d.encash_days, encashAmount, r2(d.notice_recovery), r2(d.other_recovery), loanOutstanding, netPayable, d.remarks ?? null)
    .run()
  const created = await db.prepare('SELECT * FROM settlements WHERE id = ?').bind(info.meta.last_row_id).first()
  return c.json({ data: created, message: `F&F settlement prepared. Net payable ₹${netPayable}.` }, 201)
})

payrollRoutes.patch('/settlements/:id/paid', async (c) => {
  const id = Number(c.req.param('id'))
  const db = getDb(c.env)
  const row = await db.prepare('SELECT * FROM settlements WHERE id = ?').bind(id).first()
  if (!row) return c.json({ error: { code: 'not_found', message: 'Settlement not found.' } }, 404)
  if ((row as any).status === 'paid') return c.json({ error: { code: 'conflict', message: 'Settlement already marked as paid.' } }, 409)
  await db.prepare(`UPDATE settlements SET status = 'paid', paid_at = datetime('now') WHERE id = ?`).bind(id).run()
  const updated = await db.prepare('SELECT * FROM settlements WHERE id = ?').bind(id).first()
  return c.json({ data: updated, message: 'Settlement marked as paid.' })
})
payrollRoutes.get('/months', async (c) => {
  const db = getDb(c.env)
  const rows = await db
    .prepare(
      `SELECT a.month, a.year, COUNT(*) AS employee_count,
        SUM(a.present_days) AS total_present, SUM(a.ot_hours) AS total_ot,
        (SELECT p.status FROM payroll p WHERE p.month = a.month AND p.year = a.year) AS payroll_status,
        (SELECT p.id FROM payroll p WHERE p.month = a.month AND p.year = a.year) AS payroll_id
       FROM attendance_monthly a GROUP BY a.month, a.year ORDER BY a.year DESC, a.month DESC`
    )
    .all()
  return c.json({ data: rows.results })
})

payrollRoutes.post('/preview', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = monthSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const { month, year, client_id, site_id, employee_ids } = parsed.data
  const db = getDb(c.env)
  const cfg = await loadConfig(db)
  const emps = await collectEmployees(db, month, year, { client_id, site_id, employee_ids })
  const advances = await fetchAdvances(db, month, year, emps.map((r: any) => Number(r.employee_id)))
  const loans = await fetchLoans(db, emps.map((r: any) => Number(r.employee_id)))

  const items = emps
    .map((raw) => {
      const r = raw as any
      const attendance = {
        id: Number(r.attendance_id), employee_id: Number(r.employee_id), month, year,
        present_days: Number(r.present_days), absent_days: Number(r.absent_days), paid_leave: Number(r.paid_leave),
        unpaid_leave: Number(r.unpaid_leave), ot_hours: Number(r.ot_hours), remarks: '', status: r.attendance_status,
      }
      const salary = {
        basic: Number(r.basic), hra: Number(r.hra), conveyance: Number(r.conveyance), other_allowance: Number(r.other_allowance),
        overtime_rate: Number(r.overtime_rate), pf_applicable: Number(r.st_pf ?? 1), esic_applicable: Number(r.st_esic ?? 1), other_deduction: Number(r.other_deduction),
      }
      const statutory = {
        pf_applicable: Number(r.pf_applicable ?? 1),
        esi_applicable: Number(r.esi_applicable ?? 1),
        lwf_applicable: Number(r.lwf_applicable || 0),
        pt_applicable: Number(r.pt_applicable || 0),
        tds_applicable: Number(r.tds_applicable || 0),
      }
      const advance = advances.get(Number(r.employee_id)) || 0
      const loanDeduction = loans.get(Number(r.employee_id)) || 0
      const calc = calculatePayroll({ attendance, salary, statutory, advance, loanDeduction, payrollSettings: cfg })
      if (!calc) return null
      return {
        employee_id: Number(r.employee_id), employee_code: r.employee_code, name: `${r.first_name} ${r.last_name}`,
        designation: r.designation, site_name: r.site_name, client_name: r.client_name,
        present_days: attendance.present_days, absent_days: attendance.absent_days,
        paid_leave: attendance.paid_leave, unpaid_leave: attendance.unpaid_leave, ot_hours: attendance.ot_hours,
        attendance_status: r.attendance_status, has_attendance_draft: attendance.status !== 'finalized',
        ...calc,
      }
    })
    .filter(Boolean)

  const totals = items.reduce(
    (acc, it: any) => {
      acc.earnings += it.earnings
      acc.overtimeEarnings += it.overtimeEarnings
      acc.gross += it.gross
      acc.deductions += it.totalDeductions
      acc.net += it.net
      return acc
    },
    { earnings: 0, overtimeEarnings: 0, gross: 0, deductions: 0, net: 0 }
  )

  return c.json({ data: { month, year, items, totals: { ...totals, gross: r2(totals.gross), net: r2(totals.net), deductions: r2(totals.deductions) } } })
})

payrollRoutes.post('/generate', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = monthSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const { month, year, client_id, site_id, employee_ids } = parsed.data
  const db = getDb(c.env)

  const existing = await db.prepare('SELECT * FROM payroll WHERE month = ? AND year = ?').bind(month, year).first()
  if (existing && existing.status !== 'draft') {
    return c.json({ error: { code: 'conflict', message: `Payroll for ${month}/${year} is already ${existing.status}. You cannot regenerate it.` } }, 409)
  }

  const cfg = await loadConfig(db)
  const emps = await collectEmployees(db, month, year, { client_id, site_id, employee_ids })
  const advances = await fetchAdvances(db, month, year, emps.map((r: any) => Number(r.employee_id)))
  const loans = await fetchLoans(db, emps.map((r: any) => Number(r.employee_id)))

  const items = emps
    .map((raw) => {
      const r = raw as any
      const attendance = {
        id: Number(r.attendance_id), employee_id: Number(r.employee_id), month, year,
        present_days: Number(r.present_days), absent_days: Number(r.absent_days), paid_leave: Number(r.paid_leave),
        unpaid_leave: Number(r.unpaid_leave), ot_hours: Number(r.ot_hours), remarks: '', status: r.attendance_status,
      }
      const salary = {
        basic: Number(r.basic), hra: Number(r.hra), conveyance: Number(r.conveyance), other_allowance: Number(r.other_allowance),
        overtime_rate: Number(r.overtime_rate), pf_applicable: Number(r.st_pf ?? 1), esic_applicable: Number(r.st_esic ?? 1), other_deduction: Number(r.other_deduction),
      }
      const statutory = {
        pf_applicable: Number(r.pf_applicable ?? 1),
        esi_applicable: Number(r.esi_applicable ?? 1),
        lwf_applicable: Number(r.lwf_applicable || 0),
        pt_applicable: Number(r.pt_applicable || 0),
        tds_applicable: Number(r.tds_applicable || 0),
      }
      const advance = advances.get(Number(r.employee_id)) || 0
      const loanDeduction = loans.get(Number(r.employee_id)) || 0
      const calc = calculatePayroll({ attendance, salary, statutory, advance, loanDeduction, payrollSettings: cfg })
      if (!calc) return null
      return { r, attendance, calc }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  if (!items.length) {
    return c.json({ error: { code: 'not_found', message: 'No attendance found for the selected month and scope. Enter attendance before generating payroll.' } }, 400)
  }

  const totals = items.reduce(
    (acc, { calc }) => {
      acc.gross += calc.gross
      acc.deductions += calc.totalDeductions
      acc.net += calc.net
      return acc
    },
    { gross: 0, deductions: 0, net: 0 }
  )

  const ops: D1PreparedStatement[] = []
  if (existing) {
    ops.push(db.prepare('DELETE FROM salary_slips WHERE payroll_item_id IN (SELECT id FROM payroll_items WHERE payroll_id = ?)').bind(existing.id))
    ops.push(db.prepare('DELETE FROM payroll_items WHERE payroll_id = ?').bind(existing.id))
    ops.push(db.prepare('UPDATE payroll SET status = \'draft\', total_employees = ?, gross_total = ?, deduction_total = ?, net_total = ?, finalized_at = NULL, paid_at = NULL WHERE id = ?').bind(items.length, r2(totals.gross), r2(totals.deductions), r2(totals.net), existing.id))
    ops.push(db.prepare('DELETE FROM sqlite_sequence WHERE name = \'salary_slips\''))
  } else {
    ops.push(db.prepare('INSERT INTO payroll (month, year, status, total_employees, gross_total, deduction_total, net_total) VALUES (?,?,?,?,?,?,?)').bind(month, year, 'draft', items.length, r2(totals.gross), r2(totals.deductions), r2(totals.net)))
  }

  for (const { r, attendance, calc } of items) {
    ops.push(
      db.prepare(
        `INSERT INTO payroll_items (payroll_id, employee_id, attendance_id, present_days, absent_days, paid_leave, unpaid_leave, ot_hours, basic, hra, conveyance, other_allowance, overtime_earnings, attendance_deduction, gross, pf, esic, professional_tax, lwf, tds, advance_deduction, loan_deduction, other_deduction, total_deductions, net_salary, status)
         SELECT id, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft' FROM payroll WHERE month = ? AND year = ?`
      )
        .bind(
          r.employee_id, attendance.id ?? null, attendance.present_days, attendance.absent_days,
          attendance.paid_leave, attendance.unpaid_leave, attendance.ot_hours,
          r.basic, r.hra, r.conveyance, r.other_allowance, calc.overtimeEarnings, calc.attendanceDeduction,
          calc.gross, calc.pf, calc.esic, calc.professionalTax, calc.lwf, calc.tds, calc.advance, calc.loanDeduction, calc.otherDeduction,
          calc.totalDeductions, calc.net, month, year
        )
    )
  }

  await db.batch(ops)

  const payroll = await db.prepare('SELECT * FROM payroll WHERE month = ? AND year = ?').bind(month, year).first()
  return c.json({
    data: payroll,
    message: `Payroll draft generated for ${items.length} employees. Review and finalize to continue.`,
  })
})

payrollRoutes.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const caller = c.get('user')
  if (caller.role === 'employee') {
    return c.json({ error: { code: 'forbidden', message: 'Employee logins cannot view payroll runs. Use My Space.' } }, 403)
  }
  const db = getDb(c.env)
  const payroll = await db.prepare('SELECT * FROM payroll WHERE id = ?').bind(id).first()
  if (!payroll) return c.json({ error: { code: 'not_found', message: 'Payroll not found.' } }, 404)
  const items = await db.prepare(
    `SELECT pi.*, e.employee_code, e.first_name, e.last_name, e.designation, s.name AS site_name, c.name AS client_name
     FROM payroll_items pi
     JOIN employees e ON e.id = pi.employee_id
     LEFT JOIN sites s ON s.id = e.site_id
     LEFT JOIN clients c ON c.id = s.client_id
     WHERE pi.payroll_id = ? ORDER BY e.first_name`
  ).bind(id).all()
  return c.json({ data: { ...(payroll as object), items: items.results } })
})

const itemAdjustSchema = z.object({
  incentive: z.number().min(0).max(1000000).optional(),
  bonus: z.number().min(0).max(1000000).optional(),
  arrears: z.number().min(0).max(1000000).optional(),
  other_deduction: z.number().min(0).max(1000000).optional(),
})

// Adjust variable pay on a DRAFT payroll item (incentive/bonus/arrears/other deduction).
// Statutory deductions are recomputed since they depend on gross.
payrollRoutes.patch('/:id/items/:itemId', async (c) => {
  const id = Number(c.req.param('id'))
  const itemId = Number(c.req.param('itemId'))
  const body = await c.req.json().catch(() => null)
  const parsed = itemAdjustSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const db = getDb(c.env)

  const payroll = await db.prepare('SELECT * FROM payroll WHERE id = ?').bind(id).first()
  if (!payroll) return c.json({ error: { code: 'not_found', message: 'Payroll not found.' } }, 404)
  if ((payroll as any).status !== 'draft') return c.json({ error: { code: 'conflict', message: 'Only a draft payroll can be adjusted.' } }, 409)

  const item: any = await db.prepare('SELECT * FROM payroll_items WHERE id = ? AND payroll_id = ?').bind(itemId, id).first()
  if (!item) return c.json({ error: { code: 'not_found', message: 'Payroll item not found.' } }, 404)

  const cfg = await loadConfig(db)
  const flags: any = await db
    .prepare(`SELECT COALESCE(pf_applicable,1) AS pf, COALESCE(esi_applicable,1) AS esi, COALESCE(lwf_applicable,0) AS lwf, COALESCE(pt_applicable,1) AS pt, COALESCE(tds_applicable,0) AS tds FROM employee_statutory WHERE employee_id = ?`)
    .bind(item.employee_id)
    .first() || {}

  const inc = parsed.data.incentive !== undefined ? r2(parsed.data.incentive) : Number(item.incentive || 0)
  const bonus = parsed.data.bonus !== undefined ? r2(parsed.data.bonus) : Number(item.bonus || 0)
  const arrears = parsed.data.arrears !== undefined ? r2(parsed.data.arrears) : Number(item.arrears || 0)
  const otherDed = parsed.data.other_deduction !== undefined ? r2(parsed.data.other_deduction) : Number(item.other_deduction || 0)

  const earnings = Number(item.basic) + Number(item.hra) + Number(item.conveyance) + Number(item.other_allowance)
  const absentDays = Number(item.absent_days) + Number(item.unpaid_leave)
  const attendanceDeduction = r2((earnings / cfg.salary_basis_days) * absentDays)
  const gross = r2(earnings - attendanceDeduction + Number(item.overtime_earnings) + inc + bonus + arrears)

  const pfBase = Number(item.basic) + Number(item.hra)
  const pf = Number(flags.pf ?? 1) === 1 && pfBase <= cfg.pf_eligibility ? Math.min(r2((pfBase * cfg.pf_rate) / 100), cfg.pf_cap) : 0
  const esic = Number(flags.esi ?? 1) === 1 && gross <= cfg.esic_eligibility ? r2((gross * cfg.esic_rate) / 100) : 0
  const professionalTax = Number(flags.pt ?? 1) === 1 && gross >= cfg.professional_tax_min_gross ? cfg.professional_tax_amount : 0
  const lwf = Number(flags.lwf ?? 0) === 1 ? r2(cfg.lwf_employee_amount) : 0
  const tds = Number(flags.tds ?? 0) === 1 && cfg.tds_percent > 0 ? r2((gross * cfg.tds_percent) / 100) : 0

  const totalDeductions = r2(pf + esic + professionalTax + lwf + tds + Number(item.advance_deduction || 0) + Number(item.loan_deduction || 0) + otherDed)
  const net = r2(gross - totalDeductions)

  await db
    .prepare(
      `UPDATE payroll_items SET incentive = ?, bonus = ?, arrears = ?, other_deduction = ?,
        attendance_deduction = ?, gross = ?, pf = ?, esic = ?, professional_tax = ?, lwf = ?, tds = ?,
        total_deductions = ?, net_salary = ? WHERE id = ?`
    )
    .bind(inc, bonus, arrears, otherDed, attendanceDeduction, gross, pf, esic, professionalTax, lwf, tds, totalDeductions, net, itemId)
    .run()

  const t: any = await db
    .prepare('SELECT COALESCE(SUM(gross),0) AS g, COALESCE(SUM(total_deductions),0) AS d, COALESCE(SUM(net_salary),0) AS n FROM payroll_items WHERE payroll_id = ?')
    .bind(id)
    .first()
  await db.prepare('UPDATE payroll SET gross_total = ?, deduction_total = ?, net_total = ? WHERE id = ?').bind(r2(t.g), r2(t.d), r2(t.n), id).run()

  const updated = await db.prepare('SELECT * FROM payroll_items WHERE id = ?').bind(itemId).first()
  return c.json({ data: updated, message: 'Payroll item adjusted.' })
})

payrollRoutes.post('/:id/finalize', async (c) => {
  const id = Number(c.req.param('id'))
  const db = getDb(c.env)
  const payroll = await db.prepare('SELECT * FROM payroll WHERE id = ?').bind(id).first()
  if (!payroll) return c.json({ error: { code: 'not_found', message: 'Payroll not found.' } }, 404)
  if (payroll.status === 'paid' || payroll.status === 'finalized') {
    return c.json({ error: { code: 'conflict', message: 'This payroll has already been finalized.' } }, 409)
  }
  const items = await db.prepare('SELECT id, employee_id FROM payroll_items WHERE payroll_id = ? ORDER BY id').bind(id).all()
  const slipRows: D1PreparedStatement[] = []
  items.results.forEach((it: any, i) => {
    const slipNumber = `SL-${payroll.year}-${String(payroll.month).padStart(2, '0')}-${String(i + 1).padStart(4, '0')}`
    slipRows.push(db.prepare('INSERT INTO salary_slips (payroll_item_id, employee_id, slip_number, month, year) VALUES (?,?,?,?,?)').bind(it.id, it.employee_id, slipNumber, payroll.month, payroll.year))
  })
  const ops: D1PreparedStatement[] = [
    db.prepare('UPDATE payroll_items SET status = \'finalized\' WHERE payroll_id = ?').bind(id),
    db.prepare('UPDATE payroll SET status = \'finalized\', finalized_at = datetime(\'now\') WHERE id = ?').bind(id),
  ]
  if (slipRows.length) ops.push(...slipRows)
  await db.batch(ops)
  return c.json({ data: { id, status: 'finalized', slips: slipRows.length }, message: `Payroll finalized with ${slipRows.length} salary slips generated.` })
})

const statusSchema = z.object({ status: z.enum(['processing', 'paid']) })

payrollRoutes.post('/:id/status', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => null)
  const parsed = statusSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Invalid status.' } }, 400)
  const db = getDb(c.env)
  const payroll = await db.prepare('SELECT * FROM payroll WHERE id = ?').bind(id).first()
  if (!payroll) return c.json({ error: { code: 'not_found', message: 'Payroll not found.' } }, 404)

  let sql = ''
  let message = ''
  if (parsed.data.status === 'paid') {
    if (payroll.status === 'draft') return c.json({ error: { code: 'conflict', message: 'Finalize the payroll before marking it as paid.' } }, 409)
    sql = "UPDATE payroll SET status = 'paid', paid_at = datetime('now') WHERE id = ?"
    message = 'Payroll marked as paid.'
  } else {
    sql = "UPDATE payroll SET status = 'processing' WHERE id = ?"
    message = 'Payroll moved to processing.'
  }
  const ops: D1PreparedStatement[] = [db.prepare(sql).bind(id)]
  if (parsed.data.status === 'paid') {
    // Recover loan EMIs for this run — oldest loan first per employee.
    const items = await db
      .prepare('SELECT employee_id, SUM(loan_deduction) AS total FROM payroll_items WHERE payroll_id = ? AND loan_deduction > 0 GROUP BY employee_id')
      .bind(id)
      .all()
    for (const row of items.results as any[]) {
      let remaining = Number(row.total || 0)
      const loans = await db
        .prepare(`SELECT id, outstanding FROM employee_loans WHERE employee_id = ? AND status = 'active' AND outstanding > 0 ORDER BY id`)
        .bind(row.employee_id)
        .all()
      for (const loan of loans.results as any[]) {
        if (remaining <= 0) break
        const take = Math.min(Number(loan.outstanding), remaining)
        remaining -= take
        const left = Math.max(0, Number(loan.outstanding) - take)
        ops.push(db.prepare('UPDATE employee_loans SET outstanding = ?, status = CASE WHEN ? <= 0 THEN \'closed\' ELSE status END WHERE id = ?').bind(left, left, loan.id))
      }
    }
  }
  await db.batch(ops)
  const updated = await db.prepare('SELECT * FROM payroll WHERE id = ?').bind(id).first()
  return c.json({ data: updated, message })
})
