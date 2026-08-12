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
        st.basic, st.hra, st.conveyance, st.other_allowance, st.overtime_rate, st.pf_applicable, st.esic_applicable, st.other_deduction
       FROM attendance_monthly a
       JOIN employees e ON e.id = a.employee_id
       JOIN salary_structures st ON st.employee_id = e.id
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

payrollRoutes.get('/', async (c) => {
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

// Months that have attendance, with payroll status
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

payrollRoutes.get('/preview', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = monthSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const { month, year, client_id, site_id, employee_ids } = parsed.data
  const db = getDb(c.env)
  const cfg = await loadConfig(db)
  const emps = await collectEmployees(db, month, year, { client_id, site_id, employee_ids })
  const advances = await fetchAdvances(db, month, year, emps.map((r: any) => Number(r.employee_id)))

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
        overtime_rate: Number(r.overtime_rate), pf_applicable: Number(r.pf_applicable), esic_applicable: Number(r.esic_applicable), other_deduction: Number(r.other_deduction),
      }
      const advance = advances.get(Number(r.employee_id)) || 0
      const calc = calculatePayroll({ attendance, salary, advance, payrollSettings: cfg })
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
        overtime_rate: Number(r.overtime_rate), pf_applicable: Number(r.pf_applicable), esic_applicable: Number(r.esic_applicable), other_deduction: Number(r.other_deduction),
      }
      const advance = advances.get(Number(r.employee_id)) || 0
      const calc = calculatePayroll({ attendance, salary, advance, payrollSettings: cfg })
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
        `INSERT INTO payroll_items (payroll_id, employee_id, attendance_id, present_days, absent_days, paid_leave, unpaid_leave, ot_hours, basic, hra, conveyance, other_allowance, overtime_earnings, attendance_deduction, gross, pf, esic, professional_tax, advance_deduction, other_deduction, total_deductions, net_salary, status)
         SELECT id, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft' FROM payroll WHERE month = ? AND year = ?`
      )
        .bind(
          r.employee_id, attendance.id ?? null, attendance.present_days, attendance.absent_days,
          attendance.paid_leave, attendance.unpaid_leave, attendance.ot_hours,
          r.basic, r.hra, r.conveyance, r.other_allowance, calc.overtimeEarnings, calc.attendanceDeduction,
          calc.gross, calc.pf, calc.esic, calc.professionalTax, calc.advance, calc.otherDeduction,
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
  await db.prepare(sql).bind(id).run()
  const updated = await db.prepare('SELECT * FROM payroll WHERE id = ?').bind(id).first()
  return c.json({ data: updated, message })
})
