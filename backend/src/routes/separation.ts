import { Hono } from 'hono'
import { z } from 'zod'
import type { Env } from '../types'
import { getDb } from '../utils/db'

export const separationRoutes = new Hono<{ Bindings: Env }>()

const DEFAULT_CLEARANCE_ITEMS = [
  { item_name: 'ID Card', item_category: 'assets' },
  { item_name: 'Laptop', item_category: 'assets' },
  { item_name: 'Mobile Phone', item_category: 'assets' },
  { item_name: 'Access Cards / Keys', item_category: 'assets' },
  { item_name: 'Company Uniform', item_category: 'assets' },
  { item_name: 'Library Books', item_category: 'assets' },
  { item_name: 'Outstanding Advances', item_category: 'finance' },
  { item_name: 'Salary Dues', item_category: 'finance' },
  { item_name: 'Pending Leave Adjustment', item_category: 'hr' },
  { item_name: 'HR Documents', item_category: 'hr' },
  { item_name: 'IT Assets & Access', item_category: 'it' },
  { item_name: 'Email / System Access', item_category: 'it' },
  { item_name: 'Project Handover', item_category: 'manager' },
  { item_name: 'Client Handover', item_category: 'manager' },
]

// ---------- Resignation / Separation CRUD ----------

const separationSchema = z.object({
  employee_id: z.number().int().positive(),
  separation_type: z.enum(['resignation', 'termination', 'retirement', 'end_of_contract', 'other']).default('resignation'),
  resignation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  last_working_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notice_period_days: z.number().int().min(0).default(30),
  notice_served_days: z.number().int().min(0).default(0),
  notice_buyout: z.number().int().min(0).default(0),
  reason: z.string().max(1000).optional(),
})

separationRoutes.get('/', async (c) => {
  const status = c.req.query('status')
  const db = getDb(c.env)
  let sql = 'SELECT s.*, e.first_name, e.last_name, e.employee_code, e.designation, e.department FROM separations s JOIN employees e ON e.id = s.employee_id WHERE 1=1'
  const params: (string | number)[] = []
  if (status) { sql += ' AND s.status = ?'; params.push(status) }
  sql += ' ORDER BY s.created_at DESC'
  const rows = await db.prepare(sql).bind(...params).all()
  return c.json({ data: rows.results })
})

// ---------- Summary (must be before /:id) ----------

separationRoutes.get('/summary/stats', async (c) => {
  const db = getDb(c.env)
  const [total, pending, approved, rejected] = await Promise.all([
    db.prepare('SELECT COUNT(*) as c FROM separations').first(),
    db.prepare("SELECT COUNT(*) as c FROM separations WHERE status = 'pending'").first(),
    db.prepare("SELECT COUNT(*) as c FROM separations WHERE status = 'approved'").first(),
    db.prepare("SELECT COUNT(*) as c FROM separations WHERE status = 'rejected'").first(),
  ])
  const thisMonth = await db.prepare("SELECT COUNT(*) as c FROM separations WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')").first()
  return c.json({
    data: {
      total: Number(total?.c || 0),
      pending: Number(pending?.c || 0),
      approved: Number(approved?.c || 0),
      rejected: Number(rejected?.c || 0),
      this_month: Number(thisMonth?.c || 0),
    },
  })
})

separationRoutes.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) return c.json({ error: { code: 'not_found', message: 'Record not found.' } }, 404)
  const db = getDb(c.env)
  const sep = await db.prepare('SELECT s.*, e.first_name, e.last_name, e.employee_code, e.designation, e.department FROM separations s JOIN employees e ON e.id = s.employee_id WHERE s.id = ?').bind(id).first()
  if (!sep) return c.json({ error: { code: 'not_found', message: 'Record not found.' } }, 404)
  const [interview, clearance, assetRets, noDuesList, letters, settlement] = await Promise.all([
    db.prepare('SELECT * FROM exit_interviews WHERE separation_id = ?').bind(id).first(),
    db.prepare('SELECT * FROM clearance_checklist WHERE separation_id = ? ORDER BY item_category, item_name').bind(id).all(),
    db.prepare('SELECT ar.*, a.asset_code, a.asset_type, a.brand FROM asset_returns ar LEFT JOIN assets a ON a.id = ar.asset_id WHERE ar.separation_id = ?').bind(id).all(),
    db.prepare('SELECT * FROM no_dues WHERE separation_id = ? ORDER BY department').bind(id).all(),
    db.prepare('SELECT * FROM exit_letters WHERE separation_id = ? ORDER BY letter_type').bind(id).all(),
    db.prepare('SELECT * FROM settlements WHERE employee_id = ? ORDER BY id DESC LIMIT 1').bind((sep as any).employee_id).first(),
  ])
  return c.json({
    data: {
      ...(sep as object),
      interview: interview || null,
      clearance: clearance.results,
      asset_returns: assetRets.results,
      no_dues: noDuesList.results,
      letters: letters.results,
      settlement: settlement || null,
    },
  })
})

separationRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = separationSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const emp = await db.prepare('SELECT id, status FROM employees WHERE id = ?').bind(d.employee_id).first() as any
  if (!emp) return c.json({ error: { code: 'not_found', message: 'Employee not found.' } }, 404)
  if (emp.status === 'inactive') return c.json({ error: { code: 'conflict', message: 'Employee is already inactive.' } }, 409)
  const existing = await db.prepare('SELECT id FROM separations WHERE employee_id = ? AND status IN (\'pending\', \'approved\')').bind(d.employee_id).first()
  if (existing) return c.json({ error: { code: 'conflict', message: 'Employee already has an active separation request.' } }, 409)

  const info = await db
    .prepare('INSERT INTO separations (employee_id, separation_type, resignation_date, last_working_date, notice_period_days, notice_served_days, notice_buyout, reason) VALUES (?,?,?,?,?,?,?,?)')
    .bind(d.employee_id, d.separation_type, d.resignation_date, d.last_working_date ?? null, d.notice_period_days, d.notice_served_days, d.notice_buyout, d.reason ?? null)
    .run()

  // Create default clearance checklist
  const sepId = info.meta.last_row_id
  for (const item of DEFAULT_CLEARANCE_ITEMS) {
    await db.prepare('INSERT INTO clearance_checklist (separation_id, employee_id, item_name, item_category) VALUES (?,?,?,?)').bind(sepId, d.employee_id, item.item_name, item.item_category).run()
  }

  const row = await db.prepare('SELECT * FROM separations WHERE id = ?').bind(sepId).first()
  return c.json({ data: row }, 201)
})

separationRoutes.patch('/:id/approve', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => ({}))
  const parsed = z.object({ last_working_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), remarks: z.string().max(500).optional() }).safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Invalid data.' } }, 400)
  const db = getDb(c.env)
  const sep = await db.prepare('SELECT * FROM separations WHERE id = ?').bind(id).first() as any
  if (!sep) return c.json({ error: { code: 'not_found', message: 'Record not found.' } }, 404)
  if (sep.status !== 'pending') return c.json({ error: { code: 'conflict', message: 'Can only approve pending requests.' } }, 409)

  const lwd = parsed.data.last_working_date || sep.last_working_date || new Date().toISOString().slice(0, 10)
  await db.batch([
    db.prepare('UPDATE separations SET status = \'approved\', approved_by = ?, approved_at = datetime(\'now\'), last_working_date = ?, updated_at = datetime(\'now\') WHERE id = ?').bind(c.get('user')?.email ?? null, lwd, id),
    db.prepare('UPDATE employees SET status = \'resigned\', updated_at = datetime(\'now\') WHERE id = ?').bind(sep.employee_id),
  ])
  const updated = await db.prepare('SELECT * FROM separations WHERE id = ?').bind(id).first()
  return c.json({ data: updated })
})

separationRoutes.patch('/:id/reject', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => ({}))
  const parsed = z.object({ reason: z.string().max(500).optional() }).safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Invalid data.' } }, 400)
  const db = getDb(c.env)
  const sep = await db.prepare('SELECT * FROM separations WHERE id = ?').bind(id).first() as any
  if (!sep) return c.json({ error: { code: 'not_found', message: 'Record not found.' } }, 404)
  if (sep.status !== 'pending') return c.json({ error: { code: 'conflict', message: 'Can only reject pending requests.' } }, 409)
  await db.prepare('UPDATE separations SET status = \'rejected\', rejection_reason = ?, updated_at = datetime(\'now\') WHERE id = ?').bind(parsed.data.reason ?? null, id).run()
  const updated = await db.prepare('SELECT * FROM separations WHERE id = ?').bind(id).first()
  return c.json({ data: updated })
})

separationRoutes.patch('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => null)
  const parsed = separationSchema.partial().safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const existing = await db.prepare('SELECT id FROM separations WHERE id = ?').bind(id).first()
  if (!existing) return c.json({ error: { code: 'not_found', message: 'Record not found.' } }, 404)
  const sets: string[] = []
  const params: (string | number | null)[] = []
  for (const [k, v] of Object.entries(d)) {
    if (v !== undefined) { sets.push(`${k} = ?`); params.push(v as string | number | null) }
  }
  if (sets.length === 0) return c.json({ data: existing })
  sets.push('updated_at = datetime(\'now\')')
  params.push(id)
  await db.prepare(`UPDATE separations SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run()
  const row = await db.prepare('SELECT * FROM separations WHERE id = ?').bind(id).first()
  return c.json({ data: row })
})

// ---------- Exit Interview ----------

const interviewSchema = z.object({
  reason_for_leaving: z.string().max(1000).optional(),
  job_satisfaction: z.number().int().min(1).max(5).optional(),
  work_environment: z.number().int().min(1).max(5).optional(),
  management_rating: z.number().int().min(1).max(5).optional(),
  growth_opportunity: z.number().int().min(1).max(5).optional(),
  would_recommend: z.number().int().min(1).max(5).optional(),
  feedback_text: z.string().max(3000).optional(),
  suggestions: z.string().max(2000).optional(),
  conducted_by: z.string().max(100).optional(),
})

separationRoutes.post('/:id/interview', async (c) => {
  const sepId = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => null)
  const parsed = interviewSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const sep = await db.prepare('SELECT * FROM separations WHERE id = ?').bind(sepId).first() as any
  if (!sep) return c.json({ error: { code: 'not_found', message: 'Separation not found.' } }, 404)
  const existing = await db.prepare('SELECT id FROM exit_interviews WHERE separation_id = ?').bind(sepId).first()
  if (existing) {
    const sets: string[] = []; const params: (string | number | null)[] = []
    for (const [k, v] of Object.entries(d)) { if (v !== undefined) { sets.push(`${k} = ?`); params.push(v as string | number | null) } }
    if (sets.length) { params.push((existing as any).id); await db.prepare(`UPDATE exit_interviews SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run() }
  } else {
    await db.prepare('INSERT INTO exit_interviews (separation_id, employee_id, reason_for_leaving, job_satisfaction, work_environment, management_rating, growth_opportunity, would_recommend, feedback_text, suggestions, conducted_by, conducted_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,datetime(\'now\'))').bind(sepId, sep.employee_id, d.reason_for_leaving ?? null, d.job_satisfaction ?? null, d.work_environment ?? null, d.management_rating ?? null, d.growth_opportunity ?? null, d.would_recommend ?? null, d.feedback_text ?? null, d.suggestions ?? null, d.conducted_by ?? null).run()
  }
  const row = await db.prepare('SELECT * FROM exit_interviews WHERE separation_id = ?').bind(sepId).first()
  return c.json({ data: row }, 201)
})

// ---------- Clearance ----------

const clearanceItemSchema = z.object({ item_name: z.string().min(1).max(200), item_category: z.string().max(50).default('general') })

separationRoutes.post('/:id/clearance', async (c) => {
  const sepId = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => null)
  const parsed = clearanceItemSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Invalid data.' } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const sep = await db.prepare('SELECT * FROM separations WHERE id = ?').bind(sepId).first() as any
  if (!sep) return c.json({ error: { code: 'not_found', message: 'Separation not found.' } }, 404)
  const info = await db.prepare('INSERT INTO clearance_checklist (separation_id, employee_id, item_name, item_category) VALUES (?,?,?,?)').bind(sepId, sep.employee_id, d.item_name, d.item_category).run()
  const row = await db.prepare('SELECT * FROM clearance_checklist WHERE id = ?').bind(info.meta.last_row_id).first()
  return c.json({ data: row }, 201)
})

separationRoutes.patch('/:id/clearance/:itemId', async (c) => {
  const itemId = Number(c.req.param('itemId'))
  const body = await c.req.json().catch(() => null)
  const parsed = z.object({ is_cleared: z.boolean(), remarks: z.string().max(500).optional() }).safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Invalid data.' } }, 400)
  const db = getDb(c.env)
  const d = parsed.data
  await db.prepare('UPDATE clearance_checklist SET is_cleared = ?, cleared_by = ?, cleared_at = CASE WHEN ? = 1 THEN datetime(\'now\') ELSE NULL END, remarks = ? WHERE id = ?').bind(d.is_cleared ? 1 : 0, d.is_cleared ? (c.get('user')?.email ?? null) : null, d.is_cleared ? 1 : 0, d.remarks ?? null, itemId).run()
  const row = await db.prepare('SELECT * FROM clearance_checklist WHERE id = ?').bind(itemId).first()
  return c.json({ data: row })
})

separationRoutes.delete('/:id/clearance/:itemId', async (c) => {
  const itemId = Number(c.req.param('itemId'))
  const db = getDb(c.env)
  await db.prepare('DELETE FROM clearance_checklist WHERE id = ?').bind(itemId).run()
  return c.json({ data: { ok: true } })
})

// ---------- Asset Return ----------

const assetReturnSchema = z.object({
  asset_id: z.number().int().positive().optional(),
  asset_description: z.string().min(1).max(200),
  returned: z.boolean().default(false),
  returned_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  condition_notes: z.string().max(500).optional(),
})

separationRoutes.post('/:id/assets', async (c) => {
  const sepId = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => null)
  const parsed = assetReturnSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const sep = await db.prepare('SELECT * FROM separations WHERE id = ?').bind(sepId).first() as any
  if (!sep) return c.json({ error: { code: 'not_found', message: 'Separation not found.' } }, 404)
  const info = await db.prepare('INSERT INTO asset_returns (separation_id, employee_id, asset_id, asset_description, returned, returned_date, condition_notes, received_by) VALUES (?,?,?,?,?,?,?,?)').bind(sepId, sep.employee_id, d.asset_id ?? null, d.asset_description, d.returned ? 1 : 0, d.returned_date ?? null, d.condition_notes ?? null, d.returned ? (c.get('user')?.email ?? null) : null).run()
  if (d.returned && d.asset_id) {
    await db.prepare('UPDATE assets SET status = \'available\', updated_at = datetime(\'now\') WHERE id = ?').bind(d.asset_id).run()
    await db.prepare('UPDATE asset_assignments SET return_date = ? WHERE asset_id = ? AND action = \'issued\' AND return_date IS NULL ORDER BY id DESC LIMIT 1').bind(d.returned_date || new Date().toISOString().slice(0, 10), d.asset_id).run().catch(() => {})
  }
  const row = await db.prepare('SELECT * FROM asset_returns WHERE id = ?').bind(info.meta.last_row_id).first()
  return c.json({ data: row }, 201)
})

separationRoutes.patch('/:id/assets/:retId', async (c) => {
  const retId = Number(c.req.param('retId'))
  const body = await c.req.json().catch(() => null)
  const parsed = assetReturnSchema.partial().safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Invalid data.' } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const sets: string[] = []; const params: (string | number | null)[] = []
  for (const [k, v] of Object.entries(d)) { if (v !== undefined) { sets.push(`${k} = ?`); params.push(v as string | number | null) } }
  if (d.returned) { sets.push('received_by = ?'); params.push(c.get('user')?.email ?? null) }
  if (sets.length === 0) return c.json({ data: { ok: true } })
  params.push(retId)
  await db.prepare(`UPDATE asset_returns SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run()
  const row = await db.prepare('SELECT * FROM asset_returns WHERE id = ?').bind(retId).first()
  return c.json({ data: row })
})

// ---------- No-Dues ----------

const noDuesSchema = z.object({ department: z.string().min(1).max(100), amount: z.number().min(0).default(0), remarks: z.string().max(500).optional() })

separationRoutes.post('/:id/no-dues', async (c) => {
  const sepId = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => null)
  const parsed = noDuesSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Invalid data.' } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const sep = await db.prepare('SELECT * FROM separations WHERE id = ?').bind(sepId).first() as any
  if (!sep) return c.json({ error: { code: 'not_found', message: 'Separation not found.' } }, 404)
  const info = await db.prepare('INSERT INTO no_dues (separation_id, employee_id, department, amount, remarks) VALUES (?,?,?,?,?)').bind(sepId, sep.employee_id, d.department, d.amount, d.remarks ?? null).run()
  const row = await db.prepare('SELECT * FROM no_dues WHERE id = ?').bind(info.meta.last_row_id).first()
  return c.json({ data: row }, 201)
})

separationRoutes.patch('/:id/no-dues/:duesId', async (c) => {
  const duesId = Number(c.req.param('duesId'))
  const body = await c.req.json().catch(() => null)
  const parsed = z.object({ is_cleared: z.boolean(), amount: z.number().min(0).optional(), remarks: z.string().max(500).optional() }).safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Invalid data.' } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  await db.prepare('UPDATE no_dues SET is_cleared = ?, cleared_by = ?, cleared_at = CASE WHEN ? = 1 THEN datetime(\'now\') ELSE NULL END, amount = COALESCE(?, amount), remarks = COALESCE(?, remarks) WHERE id = ?').bind(d.is_cleared ? 1 : 0, d.is_cleared ? (c.get('user')?.email ?? null) : null, d.is_cleared ? 1 : 0, d.amount ?? null, d.remarks ?? null, duesId).run()
  const row = await db.prepare('SELECT * FROM no_dues WHERE id = ?').bind(duesId).first()
  return c.json({ data: row })
})

// ---------- Exit Letters ----------

const letterSchema = z.object({
  letter_type: z.enum(['experience', 'relieving', 'other']),
  letter_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  letter_body: z.string().max(5000).optional(),
})

separationRoutes.post('/:id/letters', async (c) => {
  const sepId = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => null)
  const parsed = letterSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const sep = await db.prepare('SELECT s.*, e.first_name, e.last_name, e.employee_code, e.designation, e.joining_date FROM separations s JOIN employees e ON e.id = s.employee_id WHERE s.id = ?').bind(sepId).first() as any
  if (!sep) return c.json({ error: { code: 'not_found', message: 'Separation not found.' } }, 404)
  const letterBody = d.letter_body || generateLetterBody(d.letter_type, sep)
  const info = await db.prepare('INSERT INTO exit_letters (separation_id, employee_id, letter_type, letter_date, issued_by, letter_body) VALUES (?,?,?,?,?,?)').bind(sepId, sep.employee_id, d.letter_type, d.letter_date, c.get('user')?.email ?? null, letterBody).run()
  const row = await db.prepare('SELECT * FROM exit_letters WHERE id = ?').bind(info.meta.last_row_id).first()
  return c.json({ data: row }, 201)
})

separationRoutes.delete('/:id/letters/:letterId', async (c) => {
  const letterId = Number(c.req.param('letterId'))
  const db = getDb(c.env)
  await db.prepare('DELETE FROM exit_letters WHERE id = ?').bind(letterId).run()
  return c.json({ data: { ok: true } })
})

function generateLetterBody(type: string, sep: any): string {
  const name = `${sep.first_name} ${sep.last_name}`
  const lwd = sep.last_working_date || 'N/A'
  const joining = sep.joining_date || 'N/A'
  if (type === 'experience') {
    return `TO WHOM IT MAY CONCERN\n\nThis is to certify that ${name} (${sep.employee_code}) was employed with our organization as ${sep.designation || 'Employee'} from ${joining} to ${lwd}.\n\nDuring their tenure, they have demonstrated good skills and professionalism.\n\nWe wish them all the best in their future endeavors.\n\nDate: ${new Date().toISOString().slice(0, 10)}\nAuthorized Signatory`
  }
  if (type === 'relieving') {
    return `TO WHOM IT MAY CONCERN\n\nThis is to certify that ${name} (${sep.employee_code}), who was working as ${sep.designation || 'Employee'} in our organization, has been relieved of their duties effective ${lwd}.\n\nThey have completed all formalities and have been relieved from the services of the company.\n\nWe thank them for their contributions and wish them success in their future career.\n\nDate: ${new Date().toISOString().slice(0, 10)}\nAuthorized Signatory`
  }
  return ''
}
