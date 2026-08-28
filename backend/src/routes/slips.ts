import { Hono } from 'hono'
import type { Env } from '../types'
import { getDb } from '../utils/db'

export const slipRoutes = new Hono<{ Bindings: Env }>()

slipRoutes.get('/', async (c) => {
  const q = c.req.query()
  const caller = c.get('user')
  const where: string[] = []
  const params: (string | number)[] = []
  if (caller.role === 'employee') {
    if (!caller.employee_id) return c.json({ error: { code: 'forbidden', message: 'Your login is not linked to an employee profile.' } }, 403)
    where.push('sp.employee_id = ?')
    params.push(Number(caller.employee_id))
  }
  if (q.month && q.year) { where.push('sp.month = ?'); params.push(Number(q.month)); where.push('sp.year = ?'); params.push(Number(q.year)) }
  if (q.employee_id && q.employee_id !== '') { where.push('sp.employee_id = ?'); params.push(Number(q.employee_id)) }
  if (q.search) {
    const t = `%${q.search}%`
    where.push('(e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_code LIKE ? OR sp.slip_number LIKE ?)')
    params.push(t, t, t, t)
  }
  const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : ''
  const rows = await getDb(c.env)
    .prepare(
      `SELECT sp.*, e.employee_code, e.first_name, e.last_name, e.designation, pi.net_salary, pi.gross, pi.total_deductions, p.status AS payroll_status
       FROM salary_slips sp
       JOIN payroll_items pi ON pi.id = sp.payroll_item_id
       JOIN employees e ON e.id = sp.employee_id
       JOIN payroll p ON p.month = sp.month AND p.year = sp.year
       ${whereSql}
       ORDER BY sp.year DESC, sp.month DESC, e.first_name ASC`
    )
    .bind(...params)
    .all()
  return c.json({ data: rows.results })
})

slipRoutes.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const db = getDb(c.env)
  const slip = await db.prepare('SELECT * FROM salary_slips WHERE id = ?').bind(id).first()
  if (!slip) return c.json({ error: { code: 'not_found', message: 'Salary slip not found.' } }, 404)
  const caller = c.get('user')
  if (caller.role === 'employee' && Number(slip.employee_id) !== Number(caller.employee_id)) {
    return c.json({ error: { code: 'forbidden', message: 'You can only view your own salary slips.' } }, 403)
  }

  const item = await db.prepare(
    `SELECT pi.*, e.employee_code, e.first_name, e.last_name, e.designation, e.department, e.gender, e.joining_date,
       e.bank_name, e.bank_account, e.bank_ifsc, e.uan, e.pan,
       s.name AS site_name, c.name AS client_name,
       a.present_days AS att_present, a.absent_days AS att_absent, a.paid_leave AS att_paid, a.unpaid_leave AS att_unpaid, a.ot_hours AS att_ot
     FROM payroll_items pi
     JOIN employees e ON e.id = pi.employee_id
     LEFT JOIN sites s ON s.id = e.site_id
     LEFT JOIN clients c ON c.id = s.client_id
     LEFT JOIN attendance_monthly a ON a.employee_id = pi.employee_id AND a.month = ? AND a.year = ?
     WHERE pi.id = ?`
  ).bind(slip.month, slip.year, slip.payroll_item_id).first()

  if (!item) return c.json({ error: { code: 'not_found', message: 'Salary slip data not found.' } }, 404)

  const settings = await db.prepare('SELECT * FROM settings WHERE id = 1').first()
  const payroll = await db.prepare('SELECT * FROM payroll WHERE month = ? AND year = ?').bind(slip.month, slip.year).first()

  return c.json({
    data: {
      slip,
      item,
      payroll: { status: payroll?.status, finalized_at: payroll?.finalized_at, paid_at: payroll?.paid_at },
      company: settings,
    },
  })
})
