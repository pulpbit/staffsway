import { Hono } from 'hono'
import { z } from 'zod'
import type { Env } from '../types'
import { getDb } from '../utils/db'
import { resolveClientCode } from '../utils/clientCode'

const clientSchema = z.object({
  name: z.string().min(1).max(191),
  client_code: z.string().max(10).optional(),
  primary_contact_person: z.string().max(191).optional().or(z.literal('')),
  hr_contact_person: z.string().max(191).optional().or(z.literal('')),
  company_email: z.string().email().max(191).optional().or(z.literal('')),
  address_line1: z.string().max(191).optional().or(z.literal('')),
  address_line2: z.string().max(191).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(100).optional().or(z.literal('')),
  district: z.string().max(100).optional().or(z.literal('')),
  pincode: z.string().max(10).optional().or(z.literal('')),
  gst_no: z.string().max(50).optional().or(z.literal('')),
  company_pan: z.string().max(50).optional().or(z.literal('')),
  payroll_cycle: z.string().max(50).optional(),
  salary_calculation: z.string().max(50).optional(),
  overtime_enabled: z.boolean().optional(),
  leave_policy_enabled: z.boolean().optional(),
  arrears_enabled: z.boolean().optional(),
  advance_loan_enabled: z.boolean().optional(),
  bank_name: z.string().max(100).optional().or(z.literal('')),
  bank_account: z.string().max(50).optional().or(z.literal('')),
  bank_ifsc: z.string().max(20).optional().or(z.literal('')),
  bank_account_holder: z.string().max(191).optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']).optional(),
})

const CLIENT_COLUMNS = `id, client_code, name, primary_contact_person, hr_contact_person,
  company_email, address_line1, address_line2, city, state, district, pincode,
  gst_no, company_pan, payroll_cycle, salary_calculation,
  overtime_enabled, leave_policy_enabled, arrears_enabled, advance_loan_enabled,
  bank_name, bank_account, bank_ifsc, bank_account_holder, status, created_at, updated_at`

export const clientRoutes = new Hono<{ Bindings: Env }>()

// Generate a client code preview from a name (rule: show before saving).
clientRoutes.get('/generate-code', async (c) => {
  const name = c.req.query('name') || ''
  const excludeId = c.req.query('exclude_id') ? Number(c.req.query('exclude_id')) : undefined
  if (!name.trim()) return c.json({ data: { code: '' } })
  const db = getDb(c.env)
  const code = await resolveClientCode(db, name, excludeId)
  return c.json({ data: { code } })
})

clientRoutes.get('/', async (c) => {
  const search = c.req.query('search')
  const status = c.req.query('status')
  const where: string[] = []
  const params: string[] = []
  if (search) {
    where.push('(name LIKE ? OR client_code LIKE ? OR primary_contact_person LIKE ? OR company_email LIKE ?)')
    const t = `%${search}%`
    params.push(t, t, t, t)
  }
  if (status && status !== '') { where.push('status = ?'); params.push(status) }
  const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : ''
  const db = getDb(c.env)
  const rows = await db
    .prepare(
      `SELECT c.*,
        (SELECT COUNT(*) FROM sites s WHERE s.client_id = c.id) AS site_count,
        (SELECT COUNT(*) FROM employees e JOIN sites s ON s.id = e.site_id WHERE s.client_id = c.id AND e.status = 'active') AS active_employees,
        (SELECT COUNT(*) FROM employees e JOIN sites s ON s.id = e.site_id WHERE s.client_id = c.id) AS total_employees
       FROM clients c${whereSql} ORDER BY c.name ASC`
    )
    .bind(...params)
    .all()
  return c.json({ data: rows.results })
})

clientRoutes.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const db = getDb(c.env)
  const client = await db.prepare(`SELECT ${CLIENT_COLUMNS} FROM clients WHERE id = ?`).bind(id).first()
  if (!client) return c.json({ error: { code: 'not_found', message: 'Client not found.' } }, 404)
  const sites = await db.prepare(
    `SELECT s.*,
      (SELECT COUNT(*) FROM employees e WHERE e.site_id = s.id AND e.status = 'active') AS active_employees,
      (SELECT COUNT(*) FROM employees e WHERE e.site_id = s.id) AS total_employees
     FROM sites s WHERE s.client_id = ? ORDER BY s.name`
  ).bind(id).all()
  const employees = await db.prepare(
    `SELECT e.id, e.employee_code, e.first_name, e.last_name, e.designation, e.status, e.joining_date, e.shift_type, s.name AS site_name
     FROM employees e JOIN sites s ON s.id = e.site_id WHERE s.client_id = ? ORDER BY e.first_name`
  ).bind(id).all()
  return c.json({ data: { ...(client as object), sites: sites.results, employees: employees.results } })
})

clientRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = clientSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)

  const dup = await db.prepare('SELECT id FROM clients WHERE name = ?').bind(d.name).first()
  if (dup) return c.json({ error: { code: 'conflict', message: 'A client with this name already exists.' } }, 409)

  // Generate code with retry-on-contention so a UNIQUE race never blocks creation.
  let clientCode: string
  let info: D1Result | null = null
  for (let attempt = 0; attempt < 10; attempt++) {
    clientCode = await resolveClientCode(db, d.name)
    try {
      info = await db
        .prepare(
          `INSERT INTO clients (client_code, name, primary_contact_person, hr_contact_person, company_email,
             address_line1, address_line2, city, state, district, pincode,
             gst_no, company_pan, payroll_cycle, salary_calculation,
             overtime_enabled, leave_policy_enabled, arrears_enabled, advance_loan_enabled,
             bank_name, bank_account, bank_ifsc, bank_account_holder, status)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
        )
        .bind(
          clientCode,
          d.name,
          d.primary_contact_person || null,
          d.hr_contact_person || null,
          d.company_email || null,
          d.address_line1 || null,
          d.address_line2 || null,
          d.city || null,
          d.state || null,
          d.district || null,
          d.pincode || null,
          d.gst_no || null,
          d.company_pan || null,
          d.payroll_cycle ?? 'monthly',
          d.salary_calculation ?? 'calendar_days',
          d.overtime_enabled ? 1 : 0,
          d.leave_policy_enabled ? 1 : 0,
          d.arrears_enabled ? 1 : 0,
          d.advance_loan_enabled ? 1 : 0,
          d.bank_name || null,
          d.bank_account || null,
          d.bank_ifsc || null,
          d.bank_account_holder || null,
          d.status ?? 'active'
        )
        .run()
      break
    } catch (err) {
      const msg = String((err as Error)?.message || err)
      if (!/unique constraint/i.test(msg) || !/client_code/i.test(msg)) throw err
      info = null
    }
  }
  if (!info) throw new Error('Could not allocate a unique client code.')
  const created = await db.prepare(`SELECT ${CLIENT_COLUMNS} FROM clients WHERE id = ?`).bind(Number(info.meta.last_row_id)).first()
  return c.json({ data: created }, 201)
})

clientRoutes.put('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => null)
  const parsed = clientSchema.partial().safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.' } }, 400)
  const d = parsed.data
  const db = getDb(c.env)

  // Client code is only ever changed by an admin passing it explicitly (rules 11-12).
  let clientCodeset: string | null = null
  if (d.client_code && d.client_code !== '') {
    const wanted = d.client_code.toUpperCase()
    const dup = await db.prepare('SELECT id FROM clients WHERE client_code = ? AND id != ?').bind(wanted, id).first()
    if (dup) return c.json({ error: { code: 'conflict', message: 'Client code already in use by another client.' } }, 409)
    clientCodeset = wanted
  }

  const fields: Record<string, unknown> = { ...d }
  delete fields.client_code
  const sets: string[] = []
  const params: (string | number | null)[] = []
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue
    if (k === 'name') { sets.push('name = ?'); params.push(String(v)); continue }
    if (['overtime_enabled', 'leave_policy_enabled', 'arrears_enabled', 'advance_loan_enabled'].includes(k)) {
      sets.push(`${k} = ?`)
      params.push(v ? 1 : 0)
      continue
    }
    sets.push(`${k} = ?`)
    params.push((v as string) || null)
  }
  if (clientCodeset) { sets.push('client_code = ?'); params.push(clientCodeset) }
  if (!sets.length) return c.json({ error: { code: 'validation_error', message: 'Nothing to update.' } }, 400)
  sets.push('updated_at = datetime(\'now\')')
  params.push(id)
  const res = await db.prepare(`UPDATE clients SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run()
  if (!res.meta.changes) return c.json({ error: { code: 'not_found', message: 'Client not found.' } }, 404)
  const updated = await db.prepare(`SELECT ${CLIENT_COLUMNS} FROM clients WHERE id = ?`).bind(id).first()
  return c.json({ data: updated })
})

clientRoutes.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const db = getDb(c.env)
  const res = await db.prepare('DELETE FROM clients WHERE id = ?').bind(id).run()
  if (!res.meta.changes) return c.json({ error: { code: 'not_found', message: 'Client not found.' } }, 404)
  return c.json({ data: { ok: true } })
})