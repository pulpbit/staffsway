import { Hono } from 'hono'
import { z } from 'zod'
import type { Env } from '../types'
import { getDb } from '../utils/db'

const siteSchema = z.object({
  client_id: z.number().int().positive(),
  name: z.string().min(1).max(191),
  status: z.enum(['active', 'inactive']).optional(),
  address_line1: z.string().max(191).optional().or(z.literal('')),
  address_line2: z.string().max(191).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(100).optional().or(z.literal('')),
  district: z.string().max(100).optional().or(z.literal('')),
  pincode: z.string().max(10).optional().or(z.literal('')),
  site_incharge: z.string().max(191).optional().or(z.literal('')),
  site_incharge_designation: z.string().max(100).optional().or(z.literal('')),
  site_incharge_contact: z.string().max(20).optional().or(z.literal('')),
  site_incharge_email: z.string().email().max(191).optional().or(z.literal('')),
  shift_type: z.string().max(50).optional(),
  overtime_enabled: z.boolean().optional(),
  payroll_applicable: z.boolean().optional(),
  leave_policy_enabled: z.boolean().optional(),
  arrears_enabled: z.boolean().optional(),
  pf_applicable: z.boolean().optional(),
  pf_percent: z.number().min(0).max(100).optional(),
  esic_applicable: z.boolean().optional(),
  esic_percent: z.number().min(0).max(100).optional(),
  lwf_applicable: z.boolean().optional(),
  lwf_percent: z.number().min(0).max(100).optional(),
  pt_applicable: z.boolean().optional(),
  pt_amount: z.number().min(0).optional(),
  tds_applicable: z.boolean().optional(),
  tds_percent: z.number().min(0).max(100).optional(),
  gratuity_applicable: z.boolean().optional(),
})

const SITE_COLUMNS = `s.id, s.client_id, s.name, s.status,
  s.address_line1, s.address_line2, s.city, s.state, s.district, s.pincode,
  s.site_incharge, s.site_incharge_designation, s.site_incharge_contact, s.site_incharge_email,
  s.shift_type, s.overtime_enabled,
  s.payroll_applicable, s.leave_policy_enabled, s.arrears_enabled,
  s.pf_applicable, s.pf_percent, s.esic_applicable, s.esic_percent,
  s.lwf_applicable, s.lwf_percent, s.pt_applicable, s.pt_amount,
  s.tds_applicable, s.tds_percent, s.gratuity_applicable,
  s.created_at, s.updated_at`

export const siteRoutes = new Hono<{ Bindings: Env }>()

siteRoutes.get('/', async (c) => {
  const clientId = c.req.query('client_id')
  const search = c.req.query('search')
  const where: string[] = []
  const params: (string | number)[] = []
  if (clientId && clientId !== '') { where.push('s.client_id = ?'); params.push(Number(clientId)) }
  if (search) { where.push('(s.name LIKE ? OR s.city LIKE ? OR s.site_incharge LIKE ?)'); const t = `%${search}%`; params.push(t, t, t) }
  const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : ''
  const db = getDb(c.env)
  const rows = await db
    .prepare(
      `SELECT ${SITE_COLUMNS}, c.name AS client_name,
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
  const site = await db.prepare(`SELECT ${SITE_COLUMNS}, c.name AS client_name FROM sites s LEFT JOIN clients c ON c.id = s.client_id WHERE s.id = ?`).bind(id).first()
  if (!site) return c.json({ error: { code: 'not_found', message: 'Site not found.' } }, 404)
  const employees = await db.prepare(
    `SELECT e.id, e.employee_code, e.first_name, e.last_name, e.designation, e.status, e.shift_type, e.joining_date
     FROM employees e WHERE e.site_id = ? ORDER BY e.first_name`
  ).bind(id).all()
  return c.json({ data: { ...(site as object), employees: employees.results } })
})

const INSERT_COLUMNS = `client_id, name, status,
  address_line1, address_line2, city, state, district, pincode,
  site_incharge, site_incharge_designation, site_incharge_contact, site_incharge_email,
  shift_type, overtime_enabled, payroll_applicable, leave_policy_enabled, arrears_enabled,
  pf_applicable, pf_percent, esic_applicable, esic_percent, lwf_applicable, lwf_percent,
  pt_applicable, pt_amount, tds_applicable, tds_percent, gratuity_applicable`

const VALUE_FIELDS = ['address_line1', 'address_line2', 'city', 'state', 'district', 'pincode',
  'site_incharge', 'site_incharge_designation', 'site_incharge_contact', 'site_incharge_email',
  'shift_type'] as const
const BOOL_FIELDS = ['overtime_enabled', 'payroll_applicable', 'leave_policy_enabled', 'arrears_enabled',
  'pf_applicable', 'esic_applicable', 'lwf_applicable', 'pt_applicable', 'tds_applicable', 'gratuity_applicable'] as const
const NUM_FIELDS = ['pf_percent', 'esic_percent', 'lwf_percent', 'pt_amount', 'tds_percent'] as const

siteRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = siteSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const client = await db.prepare('SELECT id FROM clients WHERE id = ?').bind(d.client_id).first()
  if (!client) return c.json({ error: { code: 'not_found', message: 'Client not found.' } }, 400)
  const bool = (v?: boolean, def = 1) => (v === undefined ? def : v ? 1 : 0)
  const info = await db
    .prepare(
      `INSERT INTO sites (${INSERT_COLUMNS.replaceAll(', ', ',')})
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .bind(
      d.client_id, d.name, d.status ?? 'active',
      d.address_line1 || null, d.address_line2 || null, d.city || null, d.state || null,
      d.district || null, d.pincode || null,
      d.site_incharge || null, d.site_incharge_designation || null,
      d.site_incharge_contact || null, d.site_incharge_email || null,
      d.shift_type || null,
      bool(d.overtime_enabled), bool(d.payroll_applicable), bool(d.leave_policy_enabled), bool(d.arrears_enabled, 0),
      bool(d.pf_applicable), d.pf_percent ?? 12,
      bool(d.esic_applicable), d.esic_percent ?? 0.75,
      bool(d.lwf_applicable, 0), d.lwf_percent ?? 0.5,
      bool(d.pt_applicable), d.pt_amount ?? 200,
      bool(d.tds_applicable), d.tds_percent ?? 2,
      bool(d.gratuity_applicable)
    )
    .run()
  const created = await db.prepare(`SELECT ${SITE_COLUMNS}, c.name AS client_name FROM sites s LEFT JOIN clients c ON c.id = s.client_id WHERE s.id = ?`).bind(Number(info.meta.last_row_id)).first()
  return c.json({ data: created }, 201)
})

siteRoutes.put('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => null)
  const parsed = siteSchema.partial().safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.' } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const sets: string[] = []
  const params: (string | number | null)[] = []
  for (const [key] of Object.entries(d)) {
    if (BOOL_FIELDS.includes(key as never)) {
      sets.push(`${key} = ?`)
      params.push(d[key as keyof typeof d] ? 1 : 0)
    } else if (NUM_FIELDS.includes(key as never)) {
      sets.push(`${key} = ?`)
      params.push(d[key as keyof typeof d] as number)
    } else {
      sets.push(`${key} = ?`)
      params.push((d[key as keyof typeof d] as string) || null)
    }
  }
  if (!sets.length) return c.json({ error: { code: 'validation_error', message: 'Nothing to update.' } }, 400)
  sets.push('updated_at = datetime(\'now\')')
  params.push(id)
  const res = await db.prepare(`UPDATE sites SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run()
  if (!res.meta.changes) return c.json({ error: { code: 'not_found', message: 'Site not found.' } }, 404)
  const updated = await db.prepare(`SELECT ${SITE_COLUMNS}, c.name AS client_name FROM sites s LEFT JOIN clients c ON c.id = s.client_id WHERE s.id = ?`).bind(id).first()
  return c.json({ data: updated })
})

siteRoutes.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const db = getDb(c.env)
  const res = await db.prepare('DELETE FROM sites WHERE id = ?').bind(id).run()
  if (!res.meta.changes) return c.json({ error: { code: 'not_found', message: 'Site not found.' } }, 404)
  return c.json({ data: { ok: true } })
})