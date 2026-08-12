import { Hono } from 'hono'
import { z } from 'zod'
import type { Env } from '../types'
import { getDb } from '../utils/db'

const siteSchema = z.object({
  client_id: z.number().int().positive(),
  name: z.string().min(1).max(191),
  location: z.string().max(500).optional(),
  supervisor_name: z.string().max(191).optional(),
  shift_type: z.string().max(50).optional(),
  status: z.enum(['active', 'inactive']).optional(),
})

export const siteRoutes = new Hono<{ Bindings: Env }>()

siteRoutes.get('/', async (c) => {
  const clientId = c.req.query('client_id')
  const search = c.req.query('search')
  const where: string[] = []
  const params: (string | number)[] = []
  if (clientId && clientId !== '') { where.push('s.client_id = ?'); params.push(Number(clientId)) }
  if (search) { where.push('(s.name LIKE ? OR s.location LIKE ? OR s.supervisor_name LIKE ?)'); const t = `%${search}%`; params.push(t, t, t) }
  const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : ''
  const db = getDb(c.env)
  const rows = await db
    .prepare(
      `SELECT s.*, c.name AS client_name,
        (SELECT COUNT(*) FROM employees e WHERE e.site_id = s.id AND e.status = 'active') AS active_employees,
        (SELECT COUNT(*) FROM employees e WHERE e.site_id = s.id) AS total_employees
       FROM sites s LEFT JOIN clients c ON c.id = s.client_id${whereSql} ORDER BY c.name, s.name`
    )
    .bind(...params)
    .all()
  return c.json({ data: rows.results })
})

siteRoutes.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const db = getDb(c.env)
  const site = await db.prepare('SELECT s.*, c.name AS client_name FROM sites s LEFT JOIN clients c ON c.id = s.client_id WHERE s.id = ?').bind(id).first()
  if (!site) return c.json({ error: { code: 'not_found', message: 'Site not found.' } }, 404)
  const employees = await db.prepare(
    `SELECT e.id, e.employee_code, e.first_name, e.last_name, e.designation, e.status, e.shift_type, e.joining_date
     FROM employees e WHERE e.site_id = ? ORDER BY e.first_name`
  ).bind(id).all()
  return c.json({ data: { ...(site as object), employees: employees.results } })
})

siteRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = siteSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const client = await db.prepare('SELECT id FROM clients WHERE id = ?').bind(d.client_id).first()
  if (!client) return c.json({ error: { code: 'not_found', message: 'Client not found.' } }, 400)
  const info = await db
    .prepare('INSERT INTO sites (client_id, name, location, supervisor_name, shift_type, status) VALUES (?,?,?,?,?,?)')
    .bind(d.client_id, d.name, d.location ?? null, d.supervisor_name ?? null, d.shift_type ?? null, d.status ?? 'active')
    .run()
  const created = await db.prepare('SELECT s.*, c.name AS client_name FROM sites s LEFT JOIN clients c ON c.id = s.client_id WHERE s.id = ?').bind(Number(info.meta.last_row_id)).first()
  return c.json({ data: created }, 201)
})

siteRoutes.put('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => null)
  const parsed = siteSchema.partial().safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.' } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const fields = ['client_id', 'name', 'location', 'supervisor_name', 'shift_type', 'status'] as const
  const sets: string[] = []
  const params: (string | number | null)[] = []
  for (const f of fields) {
    if (f in d && d[f as keyof typeof d] !== undefined) {
      sets.push(`${f} = ?`)
      params.push(d[f as keyof typeof d] as string | number | null)
    }
  }
  if (!sets.length) return c.json({ error: { code: 'validation_error', message: 'Nothing to update.' } }, 400)
  sets.push('updated_at = datetime(\'now\')')
  params.push(id)
  const res = await db.prepare(`UPDATE sites SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run()
  if (!res.meta.changes) return c.json({ error: { code: 'not_found', message: 'Site not found.' } }, 404)
  const updated = await db.prepare('SELECT s.*, c.name AS client_name FROM sites s LEFT JOIN clients c ON c.id = s.client_id WHERE s.id = ?').bind(id).first()
  return c.json({ data: updated })
})

siteRoutes.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const db = getDb(c.env)
  const res = await db.prepare('DELETE FROM sites WHERE id = ?').bind(id).run()
  if (!res.meta.changes) return c.json({ error: { code: 'not_found', message: 'Site not found.' } }, 404)
  return c.json({ data: { ok: true } })
})
