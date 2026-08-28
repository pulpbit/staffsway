import { Hono } from 'hono'
import { z } from 'zod'
import type { Env } from '../types'
import { getDb } from '../utils/db'

export const assetRoutes = new Hono<{ Bindings: Env }>()

const ASSET_TYPES = ['Laptop', 'Mobile', 'ID Card', 'Uniform', 'Tools', 'Vehicle', 'Other']

async function nextAssetCode(db: D1Database, type: string): Promise<string> {
  const prefix = type.slice(0, 3).toUpperCase()
  const row = await db.prepare('SELECT MAX(CAST(SUBSTR(asset_code, 5) AS INTEGER)) AS m FROM assets WHERE asset_code LIKE ?').bind(`${prefix}-%`).first()
  const num = (Number(row?.m) || 0) + 1
  return `${prefix}-${String(num).padStart(4, '0')}`
}

// ---------- Asset CRUD ----------

const assetSchema = z.object({
  asset_type: z.enum(['Laptop', 'Mobile', 'ID Card', 'Uniform', 'Tools', 'Vehicle', 'Other']),
  brand: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  serial_number: z.string().max(100).optional(),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  purchase_price: z.number().min(0).optional(),
  warranty_expiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  condition_notes: z.string().max(500).optional(),
  status: z.enum(['available', 'assigned', 'maintenance', 'retired']).default('available'),
})

assetRoutes.get('/', async (c) => {
  const asset_type = c.req.query('asset_type')
  const status = c.req.query('status')
  const search = c.req.query('search')
  const db = getDb(c.env)
  let sql = 'SELECT a.* FROM assets a WHERE 1=1'
  const params: (string | number)[] = []
  if (asset_type) { sql += ' AND a.asset_type = ?'; params.push(asset_type) }
  if (status) { sql += ' AND a.status = ?'; params.push(status) }
  if (search) {
    const term = `%${search}%`
    sql += ' AND (a.asset_code LIKE ? OR a.brand LIKE ? OR a.model LIKE ? OR a.serial_number LIKE ?)'
    params.push(term, term, term, term)
  }
  sql += ' ORDER BY a.created_at DESC'
  const rows = await db.prepare(sql).bind(...params).all()
  return c.json({ data: rows.results })
})

// ---------- Dashboard Summary (must be before /:id) ----------

assetRoutes.get('/summary', async (c) => {
  const db = getDb(c.env)
  const [total, available, assigned, maintenance, retired] = await Promise.all([
    db.prepare('SELECT COUNT(*) as c FROM assets').first(),
    db.prepare("SELECT COUNT(*) as c FROM assets WHERE status = 'available'").first(),
    db.prepare("SELECT COUNT(*) as c FROM assets WHERE status = 'assigned'").first(),
    db.prepare("SELECT COUNT(*) as c FROM assets WHERE status = 'maintenance'").first(),
    db.prepare("SELECT COUNT(*) as c FROM assets WHERE status = 'retired'").first(),
  ])
  const byType = await db.prepare('SELECT asset_type, COUNT(*) as count FROM assets GROUP BY asset_type ORDER BY count DESC').all()
  return c.json({
    data: {
      total: Number(total?.c || 0),
      available: Number(available?.c || 0),
      assigned: Number(assigned?.c || 0),
      maintenance: Number(maintenance?.c || 0),
      retired: Number(retired?.c || 0),
      by_type: byType.results,
    },
  })
})

// ---------- Assignment History (must be before /:id) ----------

assetRoutes.get('/assignments/all', async (c) => {
  const employee_id = c.req.query('employee_id')
  const db = getDb(c.env)
  let sql = `
    SELECT aa.*, a.asset_code, a.asset_type, a.brand, a.model,
           e.first_name, e.last_name, e.employee_code
    FROM asset_assignments aa
    JOIN assets a ON a.id = aa.asset_id
    JOIN employees e ON e.id = aa.employee_id
    WHERE 1=1`
  const params: (string | number)[] = []
  if (employee_id) { sql += ' AND aa.employee_id = ?'; params.push(Number(employee_id)) }
  sql += ' ORDER BY aa.created_at DESC'
  const rows = await db.prepare(sql).bind(...params).all()
  return c.json({ data: rows.results })
})

assetRoutes.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) return c.json({ error: { code: 'not_found', message: 'Asset not found.' } }, 404)
  const db = getDb(c.env)
  const asset = await db.prepare('SELECT * FROM assets WHERE id = ?').bind(id).first()
  if (!asset) return c.json({ error: { code: 'not_found', message: 'Asset not found.' } }, 404)
  const assignments = await db
    .prepare(`
      SELECT aa.*, e.first_name, e.last_name, e.employee_code
      FROM asset_assignments aa
      JOIN employees e ON e.id = aa.employee_id
      WHERE aa.asset_id = ?
      ORDER BY aa.created_at DESC
    `)
    .bind(id)
    .all()
  return c.json({ data: { ...(asset as object), assignments: assignments.results } })
})

assetRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = assetSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const asset_code = await nextAssetCode(db, d.asset_type)
  await db
    .prepare('INSERT INTO assets (asset_code, asset_type, brand, model, serial_number, purchase_date, purchase_price, warranty_expiry, condition_notes, status) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .bind(asset_code, d.asset_type, d.brand ?? null, d.model ?? null, d.serial_number ?? null, d.purchase_date ?? null, d.purchase_price ?? null, d.warranty_expiry ?? null, d.condition_notes ?? null, d.status)
    .run()
  const row = await db.prepare('SELECT * FROM assets WHERE asset_code = ?').bind(asset_code).first()
  return c.json({ data: row }, 201)
})

assetRoutes.put('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) return c.json({ error: { code: 'not_found', message: 'Asset not found.' } }, 404)
  const body = await c.req.json().catch(() => null)
  const parsed = assetSchema.partial().safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const existing = await db.prepare('SELECT id FROM assets WHERE id = ?').bind(id).first()
  if (!existing) return c.json({ error: { code: 'not_found', message: 'Asset not found.' } }, 404)
  const sets: string[] = []
  const params: (string | number | null)[] = []
  for (const [k, v] of Object.entries(d)) {
    if (v !== undefined) { sets.push(`${k} = ?`); params.push(v as string | number | null) }
  }
  if (sets.length === 0) return c.json({ data: existing })
  sets.push('updated_at = datetime(\'now\')')
  params.push(id)
  await db.prepare(`UPDATE assets SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run()
  const row = await db.prepare('SELECT * FROM assets WHERE id = ?').bind(id).first()
  return c.json({ data: row })
})

assetRoutes.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const db = getDb(c.env)
  const res = await db.prepare('DELETE FROM assets WHERE id = ?').bind(id).run()
  if (!res.meta.changes) return c.json({ error: { code: 'not_found', message: 'Asset not found.' } }, 404)
  return c.json({ data: { ok: true } })
})

const assignmentSchema = z.object({
  employee_id: z.number().int().positive(),
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().max(500).optional(),
})

assetRoutes.post('/:id/assign', async (c) => {
  const assetId = Number(c.req.param('id'))
  if (!Number.isInteger(assetId) || assetId <= 0) return c.json({ error: { code: 'not_found', message: 'Asset not found.' } }, 404)
  const body = await c.req.json().catch(() => null)
  const parsed = assignmentSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const asset = await db.prepare('SELECT * FROM assets WHERE id = ?').bind(assetId).first() as any
  if (!asset) return c.json({ error: { code: 'not_found', message: 'Asset not found.' } }, 404)
  if (asset.status === 'assigned') return c.json({ error: { code: 'conflict', message: 'Asset is already assigned. Return it first.' } }, 409)
  const emp = await db.prepare('SELECT id FROM employees WHERE id = ?').bind(d.employee_id).first()
  if (!emp) return c.json({ error: { code: 'not_found', message: 'Employee not found.' } }, 404)

  await db.batch([
    db.prepare('INSERT INTO asset_assignments (asset_id, employee_id, action, issue_date, reason, performed_by) VALUES (?,?,?,?,?,?)').bind(assetId, d.employee_id, 'issued', d.issue_date, d.reason ?? null, c.get('user')?.email ?? null),
    db.prepare('UPDATE assets SET status = \'assigned\', updated_at = datetime(\'now\') WHERE id = ?').bind(assetId),
  ])

  const assignment = await db.prepare('SELECT * FROM asset_assignments WHERE asset_id = ? ORDER BY id DESC LIMIT 1').bind(assetId).first()
  return c.json({ data: assignment }, 201)
})

const returnSchema = z.object({
  return_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  condition_notes: z.string().max(500).optional(),
  reason: z.string().max(500).optional(),
})

assetRoutes.post('/:id/return', async (c) => {
  const assetId = Number(c.req.param('id'))
  if (!Number.isInteger(assetId) || assetId <= 0) return c.json({ error: { code: 'not_found', message: 'Asset not found.' } }, 404)
  const body = await c.req.json().catch(() => null)
  const parsed = returnSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const asset = await db.prepare('SELECT * FROM assets WHERE id = ?').bind(assetId).first() as any
  if (!asset) return c.json({ error: { code: 'not_found', message: 'Asset not found.' } }, 404)
  if (asset.status !== 'assigned') return c.json({ error: { code: 'conflict', message: 'Asset is not currently assigned.' } }, 409)

  const lastAssignment = await db.prepare('SELECT * FROM asset_assignments WHERE asset_id = ? AND action = \'issued\' AND return_date IS NULL ORDER BY id DESC LIMIT 1').bind(assetId).first() as any
  if (!lastAssignment) return c.json({ error: { code: 'not_found', message: 'No active assignment found.' } }, 404)

  await db.batch([
    db.prepare('UPDATE asset_assignments SET return_date = ?, reason = COALESCE(?, reason) WHERE id = ?').bind(d.return_date, d.reason ?? null, lastAssignment.id),
    db.prepare('UPDATE assets SET condition_notes = COALESCE(?, condition_notes), status = \'available\', updated_at = datetime(\'now\') WHERE id = ?').bind(d.condition_notes ?? null, assetId),
  ])

  const updated = await db.prepare('SELECT * FROM asset_assignments WHERE id = ?').bind(lastAssignment.id).first()
  return c.json({ data: updated })
})

const replacementSchema = z.object({
  employee_id: z.number().int().positive(),
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  replacement_asset_id: z.number().int().positive(),
  reason: z.string().max(500).optional(),
})

assetRoutes.post('/:id/replace', async (c) => {
  const oldAssetId = Number(c.req.param('id'))
  if (!Number.isInteger(oldAssetId) || oldAssetId <= 0) return c.json({ error: { code: 'not_found', message: 'Asset not found.' } }, 404)
  const body = await c.req.json().catch(() => null)
  const parsed = replacementSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)

  const oldAsset = await db.prepare('SELECT * FROM assets WHERE id = ?').bind(oldAssetId).first() as any
  if (!oldAsset) return c.json({ error: { code: 'not_found', message: 'Old asset not found.' } }, 404)
  const newAsset = await db.prepare('SELECT * FROM assets WHERE id = ?').bind(d.replacement_asset_id).first() as any
  if (!newAsset) return c.json({ error: { code: 'not_found', message: 'Replacement asset not found.' } }, 404)
  if (newAsset.status === 'assigned') return c.json({ error: { code: 'conflict', message: 'Replacement asset is already assigned.' } }, 409)
  if (d.replacement_asset_id === oldAssetId) return c.json({ error: { code: 'validation_error', message: 'Replacement asset must be different from the current asset.' } }, 400)

  // Close old assignment
  const lastAssignment = await db.prepare('SELECT * FROM asset_assignments WHERE asset_id = ? AND action = \'issued\' AND return_date IS NULL ORDER BY id DESC LIMIT 1').bind(oldAssetId).first() as any

  const ops: D1PreparedStatement[] = []

  if (lastAssignment) {
    ops.push(db.prepare('UPDATE asset_assignments SET return_date = ?, reason = COALESCE(?, reason) WHERE id = ?').bind(d.issue_date, `Replaced with ${newAsset.asset_code}`, lastAssignment.id))
  }
  ops.push(db.prepare('UPDATE assets SET status = \'available\', updated_at = datetime(\'now\') WHERE id = ?').bind(oldAssetId))
  ops.push(db.prepare('INSERT INTO asset_assignments (asset_id, employee_id, action, issue_date, replacement_id, reason, performed_by) VALUES (?,?,?,?,?,?,?)').bind(d.replacement_asset_id, d.employee_id, 'replaced', d.issue_date, oldAssetId, d.reason ?? `Replacement for ${oldAsset.asset_code}`, c.get('user')?.email ?? null))
  ops.push(db.prepare('UPDATE assets SET status = \'assigned\', updated_at = datetime(\'now\') WHERE id = ?').bind(d.replacement_asset_id))

  await db.batch(ops)

  const assignment = await db.prepare('SELECT * FROM asset_assignments WHERE asset_id = ? ORDER BY id DESC LIMIT 1').bind(d.replacement_asset_id).first()
  return c.json({ data: assignment }, 201)
})
