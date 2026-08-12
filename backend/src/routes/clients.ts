import { Hono } from 'hono'
import { z } from 'zod'
import type { Env } from '../types'
import { getDb } from '../utils/db'

const clientSchema = z.object({
  name: z.string().min(1).max(191),
  contact_person: z.string().max(191).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().max(191).optional().or(z.literal('')),
  address: z.string().max(500).optional(),
  contract_start: z.string().optional(),
  contract_end: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
})

export const clientRoutes = new Hono<{ Bindings: Env }>()

clientRoutes.get('/', async (c) => {
  const search = c.req.query('search')
  const status = c.req.query('status')
  const where: string[] = []
  const params: string[] = []
  if (search) { where.push('(name LIKE ? OR contact_person LIKE ? OR email LIKE ?)'); const t = `%${search}%`; params.push(t, t, t) }
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
  const client = await db.prepare('SELECT * FROM clients WHERE id = ?').bind(id).first()
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
  const info = await db
    .prepare('INSERT INTO clients (name, contact_person, phone, email, address, contract_start, contract_end, status) VALUES (?,?,?,?,?,?,?,?)')
    .bind(d.name, d.contact_person ?? null, d.phone ?? null, d.email || null, d.address ?? null, d.contract_start ?? null, d.contract_end ?? null, d.status ?? 'active')
    .run()
  const created = await db.prepare('SELECT * FROM clients WHERE id = ?').bind(Number(info.meta.last_row_id)).first()
  return c.json({ data: created }, 201)
})

clientRoutes.put('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => null)
  const parsed = clientSchema.partial().safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.' } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const fields = ['name', 'contact_person', 'phone', 'email', 'address', 'contract_start', 'contract_end', 'status'] as const
  const sets: string[] = []
  const params: (string | number | null)[] = []
  for (const f of fields) {
    if (f in d && d[f as keyof typeof d] !== undefined) {
      sets.push(`${f} = ?`)
      params.push(d[f as keyof typeof d] as string | null)
    }
  }
  if (!sets.length) return c.json({ error: { code: 'validation_error', message: 'Nothing to update.' } }, 400)
  sets.push('updated_at = datetime(\'now\')')
  params.push(id)
  const res = await db.prepare(`UPDATE clients SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run()
  if (!res.meta.changes) return c.json({ error: { code: 'not_found', message: 'Client not found.' } }, 404)
  const updated = await db.prepare('SELECT * FROM clients WHERE id = ?').bind(id).first()
  return c.json({ data: updated })
})

clientRoutes.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const db = getDb(c.env)
  const res = await db.prepare('DELETE FROM clients WHERE id = ?').bind(id).run()
  if (!res.meta.changes) return c.json({ error: { code: 'not_found', message: 'Client not found.' } }, 404)
  return c.json({ data: { ok: true } })
})
