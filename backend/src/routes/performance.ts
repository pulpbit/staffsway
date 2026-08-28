import { Hono } from 'hono'
import { z } from 'zod'
import type { Env } from '../types'
import { getDb } from '../utils/db'

export const performanceRoutes = new Hono<{ Bindings: Env }>()

// ---------- KPI/KRA ----------

const kpiSchema = z.object({
  employee_id: z.number().int().positive(),
  fiscal_year: z.number().int().min(2020).max(2099),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  category: z.enum(['quality', 'productivity', 'teamwork', 'leadership', 'communication', 'initiative', 'attendance', 'other']).default('quality'),
  weight: z.number().min(0).max(100).default(0),
  target: z.string().max(500).optional(),
})

performanceRoutes.get('/kpis', async (c) => {
  const employee_id = c.req.query('employee_id')
  const fiscal_year = c.req.query('fiscal_year')
  const db = getDb(c.env)
  let sql = 'SELECT k.*, e.first_name, e.last_name, e.employee_code FROM performance_kpis k JOIN employees e ON e.id = k.employee_id WHERE 1=1'
  const params: (string | number)[] = []
  if (employee_id) { sql += ' AND k.employee_id = ?'; params.push(Number(employee_id)) }
  if (fiscal_year) { sql += ' AND k.fiscal_year = ?'; params.push(Number(fiscal_year)) }
  sql += ' ORDER BY k.fiscal_year DESC, e.first_name, k.title'
  const rows = await db.prepare(sql).bind(...params).all()
  return c.json({ data: rows.results })
})

performanceRoutes.post('/kpis', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = kpiSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const emp = await db.prepare('SELECT id FROM employees WHERE id = ?').bind(d.employee_id).first()
  if (!emp) return c.json({ error: { code: 'not_found', message: 'Employee not found.' } }, 404)
  const info = await db
    .prepare('INSERT INTO performance_kpis (employee_id, fiscal_year, title, description, category, weight, target, created_by) VALUES (?,?,?,?,?,?,?,?)')
    .bind(d.employee_id, d.fiscal_year, d.title, d.description ?? null, d.category, d.weight, d.target ?? null, c.get('user')?.email ?? null)
    .run()
  const row = await db.prepare('SELECT * FROM performance_kpis WHERE id = ?').bind(info.meta.last_row_id).first()
  await db.prepare('INSERT INTO performance_history (employee_id, action, details, performed_by) VALUES (?,?,?,?)').bind(d.employee_id, 'kpi_created', `KPI "${d.title}" created`, c.get('user')?.email ?? null).run()
  return c.json({ data: row }, 201)
})

performanceRoutes.delete('/kpis/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const db = getDb(c.env)
  const row = await db.prepare('SELECT * FROM performance_kpis WHERE id = ?').bind(id).first()
  if (!row) return c.json({ error: { code: 'not_found', message: 'KPI not found.' } }, 404)
  await db.prepare('DELETE FROM performance_kpis WHERE id = ?').bind(id).run()
  await db.prepare('INSERT INTO performance_history (employee_id, action, details, performed_by) VALUES (?,?,?,?)').bind((row as any).employee_id, 'kpi_deleted', `KPI "${(row as any).title}" deleted`, c.get('user')?.email ?? null).run()
  return c.json({ data: { ok: true } })
})

// ---------- Performance Goals ----------

const goalSchema = z.object({
  employee_id: z.number().int().positive(),
  fiscal_year: z.number().int().min(2020).max(2099),
  quarter: z.number().int().min(1).max(4).optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  target_value: z.string().max(500).optional(),
  actual_value: z.string().max(500).optional(),
  weight: z.number().min(0).max(100).default(0),
  status: z.enum(['not_started', 'in_progress', 'completed', 'not_achieved']).default('not_started'),
})

performanceRoutes.get('/goals', async (c) => {
  const employee_id = c.req.query('employee_id')
  const fiscal_year = c.req.query('fiscal_year')
  const db = getDb(c.env)
  let sql = 'SELECT g.*, e.first_name, e.last_name, e.employee_code FROM performance_goals g JOIN employees e ON e.id = g.employee_id WHERE 1=1'
  const params: (string | number)[] = []
  if (employee_id) { sql += ' AND g.employee_id = ?'; params.push(Number(employee_id)) }
  if (fiscal_year) { sql += ' AND g.fiscal_year = ?'; params.push(Number(fiscal_year)) }
  sql += ' ORDER BY g.fiscal_year DESC, g.quarter, g.title'
  const rows = await db.prepare(sql).bind(...params).all()
  return c.json({ data: rows.results })
})

performanceRoutes.post('/goals', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = goalSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const emp = await db.prepare('SELECT id FROM employees WHERE id = ?').bind(d.employee_id).first()
  if (!emp) return c.json({ error: { code: 'not_found', message: 'Employee not found.' } }, 404)
  const info = await db
    .prepare('INSERT INTO performance_goals (employee_id, fiscal_year, quarter, title, description, target_value, actual_value, weight, status, created_by) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .bind(d.employee_id, d.fiscal_year, d.quarter ?? null, d.title, d.description ?? null, d.target_value ?? null, d.actual_value ?? null, d.weight, d.status, c.get('user')?.email ?? null)
    .run()
  const row = await db.prepare('SELECT * FROM performance_goals WHERE id = ?').bind(info.meta.last_row_id).first()
  await db.prepare('INSERT INTO performance_history (employee_id, action, details, performed_by) VALUES (?,?,?,?)').bind(d.employee_id, 'goal_created', `Goal "${d.title}" created`, c.get('user')?.email ?? null).run()
  return c.json({ data: row }, 201)
})

performanceRoutes.patch('/goals/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => null)
  const parsed = goalSchema.partial().safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const existing = await db.prepare('SELECT * FROM performance_goals WHERE id = ?').bind(id).first()
  if (!existing) return c.json({ error: { code: 'not_found', message: 'Goal not found.' } }, 404)
  const sets: string[] = []
  const params: (string | number | null)[] = []
  for (const [k, v] of Object.entries(d)) {
    if (v !== undefined) { sets.push(`${k} = ?`); params.push(v as string | number | null) }
  }
  if (sets.length === 0) return c.json({ data: existing })
  params.push(id)
  await db.prepare(`UPDATE performance_goals SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run()
  const row = await db.prepare('SELECT * FROM performance_goals WHERE id = ?').bind(id).first()
  return c.json({ data: row })
})

performanceRoutes.delete('/goals/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const db = getDb(c.env)
  const row = await db.prepare('SELECT * FROM performance_goals WHERE id = ?').bind(id).first()
  if (!row) return c.json({ error: { code: 'not_found', message: 'Goal not found.' } }, 404)
  await db.prepare('DELETE FROM performance_goals WHERE id = ?').bind(id).run()
  return c.json({ data: { ok: true } })
})

// ---------- Performance Reviews ----------

const reviewSchema = z.object({
  employee_id: z.number().int().positive(),
  review_period: z.string().min(1).max(50),
  review_type: z.enum(['monthly', 'quarterly', 'annual']).default('quarterly'),
  reviewer_name: z.string().max(100).optional(),
  overall_rating: z.number().min(1).max(5).optional(),
  strengths: z.string().max(2000).optional(),
  improvements: z.string().max(2000).optional(),
  comments: z.string().max(2000).optional(),
  status: z.enum(['draft', 'submitted', 'finalized']).default('draft'),
})

performanceRoutes.get('/reviews', async (c) => {
  const employee_id = c.req.query('employee_id')
  const review_type = c.req.query('review_type')
  const db = getDb(c.env)
  let sql = 'SELECT r.*, e.first_name, e.last_name, e.employee_code FROM performance_reviews r JOIN employees e ON e.id = r.employee_id WHERE 1=1'
  const params: (string | number)[] = []
  if (employee_id) { sql += ' AND r.employee_id = ?'; params.push(Number(employee_id)) }
  if (review_type) { sql += ' AND r.review_type = ?'; params.push(review_type) }
  sql += ' ORDER BY r.created_at DESC'
  const rows = await db.prepare(sql).bind(...params).all()
  return c.json({ data: rows.results })
})

performanceRoutes.post('/reviews', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = reviewSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const emp = await db.prepare('SELECT id FROM employees WHERE id = ?').bind(d.employee_id).first()
  if (!emp) return c.json({ error: { code: 'not_found', message: 'Employee not found.' } }, 404)
  const info = await db
    .prepare('INSERT INTO performance_reviews (employee_id, review_period, review_type, reviewer_name, overall_rating, strengths, improvements, comments, status, created_by) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .bind(d.employee_id, d.review_period, d.review_type, d.reviewer_name ?? null, d.overall_rating ?? null, d.strengths ?? null, d.improvements ?? null, d.comments ?? null, d.status, c.get('user')?.email ?? null)
    .run()
  const row = await db.prepare('SELECT * FROM performance_reviews WHERE id = ?').bind(info.meta.last_row_id).first()
  await db.prepare('INSERT INTO performance_history (employee_id, action, details, performed_by) VALUES (?,?,?,?)').bind(d.employee_id, 'review_created', `Review for ${d.review_period} created`, c.get('user')?.email ?? null).run()
  return c.json({ data: row }, 201)
})

performanceRoutes.patch('/reviews/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => null)
  const parsed = reviewSchema.partial().safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const existing = await db.prepare('SELECT * FROM performance_reviews WHERE id = ?').bind(id).first()
  if (!existing) return c.json({ error: { code: 'not_found', message: 'Review not found.' } }, 404)
  const sets: string[] = []
  const params: (string | number | null)[] = []
  for (const [k, v] of Object.entries(d)) {
    if (v !== undefined) { sets.push(`${k} = ?`); params.push(v as string | number | null) }
  }
  if (sets.length === 0) return c.json({ data: existing })
  params.push(id)
  await db.prepare(`UPDATE performance_reviews SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run()
  const row = await db.prepare('SELECT * FROM performance_reviews WHERE id = ?').bind(id).first()
  return c.json({ data: row })
})

performanceRoutes.delete('/reviews/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const db = getDb(c.env)
  const row = await db.prepare('SELECT * FROM performance_reviews WHERE id = ?').bind(id).first()
  if (!row) return c.json({ error: { code: 'not_found', message: 'Review not found.' } }, 404)
  await db.prepare('DELETE FROM performance_reviews WHERE id = ?').bind(id).run()
  return c.json({ data: { ok: true } })
})

// ---------- Manager/Peer Feedback ----------

const feedbackSchema = z.object({
  employee_id: z.number().int().positive(),
  review_id: z.number().int().positive().optional(),
  feedback_type: z.enum(['manager', 'peer', 'self', '360']).default('manager'),
  from_name: z.string().max(100).optional(),
  rating: z.number().min(1).max(5).optional(),
  strengths: z.string().max(2000).optional(),
  areas_improvement: z.string().max(2000).optional(),
  comments: z.string().max(2000).optional(),
  is_anonymous: z.boolean().default(false),
})

performanceRoutes.get('/feedback', async (c) => {
  const employee_id = c.req.query('employee_id')
  const db = getDb(c.env)
  let sql = 'SELECT f.*, e.first_name, e.last_name, e.employee_code FROM performance_feedback f JOIN employees e ON e.id = f.employee_id WHERE 1=1'
  const params: (string | number)[] = []
  if (employee_id) { sql += ' AND f.employee_id = ?'; params.push(Number(employee_id)) }
  sql += ' ORDER BY f.created_at DESC'
  const rows = await db.prepare(sql).bind(...params).all()
  return c.json({ data: rows.results })
})

performanceRoutes.post('/feedback', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = feedbackSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const emp = await db.prepare('SELECT id FROM employees WHERE id = ?').bind(d.employee_id).first()
  if (!emp) return c.json({ error: { code: 'not_found', message: 'Employee not found.' } }, 404)
  const info = await db
    .prepare('INSERT INTO performance_feedback (employee_id, review_id, feedback_type, from_name, rating, strengths, areas_improvement, comments, is_anonymous) VALUES (?,?,?,?,?,?,?,?,?)')
    .bind(d.employee_id, d.review_id ?? null, d.feedback_type, d.from_name ?? null, d.rating ?? null, d.strengths ?? null, d.areas_improvement ?? null, d.comments ?? null, d.is_anonymous ? 1 : 0)
    .run()
  const row = await db.prepare('SELECT * FROM performance_feedback WHERE id = ?').bind(info.meta.last_row_id).first()
  return c.json({ data: row }, 201)
})

performanceRoutes.delete('/feedback/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const db = getDb(c.env)
  const res = await db.prepare('DELETE FROM performance_feedback WHERE id = ?').bind(id).run()
  if (!res.meta.changes) return c.json({ error: { code: 'not_found', message: 'Feedback not found.' } }, 404)
  return c.json({ data: { ok: true } })
})

// ---------- Self-Appraisal ----------

const appraisalSchema = z.object({
  employee_id: z.number().int().positive(),
  fiscal_year: z.number().int().min(2020).max(2099),
  quarter: z.number().int().min(1).max(4).optional(),
  achievements: z.string().max(3000).optional(),
  challenges: z.string().max(3000).optional(),
  goals_next_period: z.string().max(3000).optional(),
  training_needs: z.string().max(2000).optional(),
  overall_comments: z.string().max(2000).optional(),
  status: z.enum(['draft', 'submitted']).default('draft'),
})

performanceRoutes.get('/self-appraisals', async (c) => {
  const employee_id = c.req.query('employee_id')
  const db = getDb(c.env)
  let sql = 'SELECT s.*, e.first_name, e.last_name, e.employee_code FROM self_appraisals s JOIN employees e ON e.id = s.employee_id WHERE 1=1'
  const params: (string | number)[] = []
  if (employee_id) { sql += ' AND s.employee_id = ?'; params.push(Number(employee_id)) }
  sql += ' ORDER BY s.fiscal_year DESC, s.quarter DESC'
  const rows = await db.prepare(sql).bind(...params).all()
  return c.json({ data: rows.results })
})

performanceRoutes.post('/self-appraisals', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = appraisalSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const emp = await db.prepare('SELECT id FROM employees WHERE id = ?').bind(d.employee_id).first()
  if (!emp) return c.json({ error: { code: 'not_found', message: 'Employee not found.' } }, 404)
  const submitted_at = d.status === 'submitted' ? new Date().toISOString() : null
  const info = await db
    .prepare('INSERT INTO self_appraisals (employee_id, fiscal_year, quarter, achievements, challenges, goals_next_period, training_needs, overall_comments, status, submitted_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .bind(d.employee_id, d.fiscal_year, d.quarter ?? null, d.achievements ?? null, d.challenges ?? null, d.goals_next_period ?? null, d.training_needs ?? null, d.overall_comments ?? null, d.status, submitted_at)
    .run()
  const row = await db.prepare('SELECT * FROM self_appraisals WHERE id = ?').bind(info.meta.last_row_id).first()
  return c.json({ data: row }, 201)
})

performanceRoutes.patch('/self-appraisals/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => null)
  const parsed = appraisalSchema.partial().safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const existing = await db.prepare('SELECT * FROM self_appraisals WHERE id = ?').bind(id).first()
  if (!existing) return c.json({ error: { code: 'not_found', message: 'Self-appraisal not found.' } }, 404)
  const sets: string[] = []
  const params: (string | number | null)[] = []
  for (const [k, v] of Object.entries(d)) {
    if (v !== undefined) { sets.push(`${k} = ?`); params.push(v as string | number | null) }
  }
  if (d.status === 'submitted') { sets.push('submitted_at = datetime(\'now\')') }
  if (sets.length === 0) return c.json({ data: existing })
  params.push(id)
  await db.prepare(`UPDATE self_appraisals SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run()
  const row = await db.prepare('SELECT * FROM self_appraisals WHERE id = ?').bind(id).first()
  return c.json({ data: row })
})

// ---------- Performance History ----------

performanceRoutes.get('/history', async (c) => {
  const employee_id = c.req.query('employee_id')
  const db = getDb(c.env)
  let sql = 'SELECT h.*, e.first_name, e.last_name, e.employee_code FROM performance_history h JOIN employees e ON e.id = h.employee_id WHERE 1=1'
  const params: (string | number)[] = []
  if (employee_id) { sql += ' AND h.employee_id = ?'; params.push(Number(employee_id)) }
  sql += ' ORDER BY h.created_at DESC LIMIT 200'
  const rows = await db.prepare(sql).bind(...params).all()
  return c.json({ data: rows.results })
})

// ---------- Increment Recommendation ----------

const incrementSchema = z.object({
  employee_id: z.number().int().positive(),
  fiscal_year: z.number().int().min(2020).max(2099),
  current_salary: z.number().min(0).optional(),
  recommended_increment: z.number().min(0).optional(),
  increment_percent: z.number().min(0).max(100).optional(),
  justification: z.string().max(2000).optional(),
  performance_score: z.number().min(0).max(5).optional(),
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
})

performanceRoutes.get('/increments', async (c) => {
  const employee_id = c.req.query('employee_id')
  const fiscal_year = c.req.query('fiscal_year')
  const db = getDb(c.env)
  let sql = 'SELECT i.*, e.first_name, e.last_name, e.employee_code FROM increment_recommendations i JOIN employees e ON e.id = i.employee_id WHERE 1=1'
  const params: (string | number)[] = []
  if (employee_id) { sql += ' AND i.employee_id = ?'; params.push(Number(employee_id)) }
  if (fiscal_year) { sql += ' AND i.fiscal_year = ?'; params.push(Number(fiscal_year)) }
  sql += ' ORDER BY i.created_at DESC'
  const rows = await db.prepare(sql).bind(...params).all()
  return c.json({ data: rows.results })
})

performanceRoutes.post('/increments', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = incrementSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const emp = await db.prepare('SELECT id FROM employees WHERE id = ?').bind(d.employee_id).first()
  if (!emp) return c.json({ error: { code: 'not_found', message: 'Employee not found.' } }, 404)
  const info = await db
    .prepare('INSERT INTO increment_recommendations (employee_id, fiscal_year, recommended_by, current_salary, recommended_increment, increment_percent, justification, performance_score, status) VALUES (?,?,?,?,?,?,?,?,?)')
    .bind(d.employee_id, d.fiscal_year, c.get('user')?.email ?? null, d.current_salary ?? null, d.recommended_increment ?? null, d.increment_percent ?? null, d.justification ?? null, d.performance_score ?? null, d.status)
    .run()
  const row = await db.prepare('SELECT * FROM increment_recommendations WHERE id = ?').bind(info.meta.last_row_id).first()
  await db.prepare('INSERT INTO performance_history (employee_id, action, details, performed_by) VALUES (?,?,?,?)').bind(d.employee_id, 'increment_recommended', `Increment recommendation created`, c.get('user')?.email ?? null).run()
  return c.json({ data: row }, 201)
})

performanceRoutes.patch('/increments/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => null)
  const parsed = incrementSchema.partial().safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const existing = await db.prepare('SELECT * FROM increment_recommendations WHERE id = ?').bind(id).first()
  if (!existing) return c.json({ error: { code: 'not_found', message: 'Recommendation not found.' } }, 404)
  const sets: string[] = []
  const params: (string | number | null)[] = []
  for (const [k, v] of Object.entries(d)) {
    if (v !== undefined) { sets.push(`${k} = ?`); params.push(v as string | number | null) }
  }
  if (d.status && d.status !== 'pending') { sets.push('reviewed_by = ?'); params.push(c.get('user')?.email ?? null); sets.push('reviewed_at = datetime(\'now\')') }
  if (sets.length === 0) return c.json({ data: existing })
  params.push(id)
  await db.prepare(`UPDATE increment_recommendations SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run()
  const row = await db.prepare('SELECT * FROM increment_recommendations WHERE id = ?').bind(id).first()
  return c.json({ data: row })
})

// ---------- Promotion Recommendation ----------

const promotionSchema = z.object({
  employee_id: z.number().int().positive(),
  fiscal_year: z.number().int().min(2020).max(2099),
  current_designation: z.string().max(100).optional(),
  recommended_designation: z.string().min(1).max(100),
  justification: z.string().max(2000).optional(),
  performance_score: z.number().min(0).max(5).optional(),
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
})

performanceRoutes.get('/promotions', async (c) => {
  const employee_id = c.req.query('employee_id')
  const fiscal_year = c.req.query('fiscal_year')
  const db = getDb(c.env)
  let sql = 'SELECT p.*, e.first_name, e.last_name, e.employee_code FROM promotion_recommendations p JOIN employees e ON e.id = p.employee_id WHERE 1=1'
  const params: (string | number)[] = []
  if (employee_id) { sql += ' AND p.employee_id = ?'; params.push(Number(employee_id)) }
  if (fiscal_year) { sql += ' AND p.fiscal_year = ?'; params.push(Number(fiscal_year)) }
  sql += ' ORDER BY p.created_at DESC'
  const rows = await db.prepare(sql).bind(...params).all()
  return c.json({ data: rows.results })
})

performanceRoutes.post('/promotions', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = promotionSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const emp = await db.prepare('SELECT id, designation FROM employees WHERE id = ?').bind(d.employee_id).first()
  if (!emp) return c.json({ error: { code: 'not_found', message: 'Employee not found.' } }, 404)
  const info = await db
    .prepare('INSERT INTO promotion_recommendations (employee_id, fiscal_year, recommended_by, current_designation, recommended_designation, justification, performance_score, status) VALUES (?,?,?,?,?,?,?,?)')
    .bind(d.employee_id, d.fiscal_year, c.get('user')?.email ?? null, d.current_designation ?? (emp as any).designation ?? null, d.recommended_designation, d.justification ?? null, d.performance_score ?? null, d.status)
    .run()
  const row = await db.prepare('SELECT * FROM promotion_recommendations WHERE id = ?').bind(info.meta.last_row_id).first()
  await db.prepare('INSERT INTO performance_history (employee_id, action, details, performed_by) VALUES (?,?,?,?)').bind(d.employee_id, 'promotion_recommended', `Promotion to "${d.recommended_designation}" recommended`, c.get('user')?.email ?? null).run()
  return c.json({ data: row }, 201)
})

performanceRoutes.patch('/promotions/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => null)
  const parsed = promotionSchema.partial().safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const existing = await db.prepare('SELECT * FROM promotion_recommendations WHERE id = ?').bind(id).first()
  if (!existing) return c.json({ error: { code: 'not_found', message: 'Recommendation not found.' } }, 404)
  const sets: string[] = []
  const params: (string | number | null)[] = []
  for (const [k, v] of Object.entries(d)) {
    if (v !== undefined) { sets.push(`${k} = ?`); params.push(v as string | number | null) }
  }
  if (d.status && d.status !== 'pending') { sets.push('reviewed_by = ?'); params.push(c.get('user')?.email ?? null); sets.push('reviewed_at = datetime(\'now\')') }
  if (sets.length === 0) return c.json({ data: existing })
  params.push(id)
  await db.prepare(`UPDATE promotion_recommendations SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run()
  const row = await db.prepare('SELECT * FROM promotion_recommendations WHERE id = ?').bind(id).first()
  return c.json({ data: row })
})

// ---------- Performance Improvement Plan (PIP) ----------

const pipSchema = z.object({
  employee_id: z.number().int().positive(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  goals: z.string().max(5000).optional(),
  status: z.enum(['active', 'completed', 'extended', 'cancelled']).default('active'),
  outcome: z.enum(['successful', 'unsuccessful', 'extended']).optional(),
  manager_comments: z.string().max(2000).optional(),
})

performanceRoutes.get('/pips', async (c) => {
  const employee_id = c.req.query('employee_id')
  const status = c.req.query('status')
  const db = getDb(c.env)
  let sql = 'SELECT p.*, e.first_name, e.last_name, e.employee_code FROM performance_pips p JOIN employees e ON e.id = p.employee_id WHERE 1=1'
  const params: (string | number)[] = []
  if (employee_id) { sql += ' AND p.employee_id = ?'; params.push(Number(employee_id)) }
  if (status) { sql += ' AND p.status = ?'; params.push(status) }
  sql += ' ORDER BY p.created_at DESC'
  const rows = await db.prepare(sql).bind(...params).all()
  return c.json({ data: rows.results })
})

performanceRoutes.post('/pips', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = pipSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const emp = await db.prepare('SELECT id FROM employees WHERE id = ?').bind(d.employee_id).first()
  if (!emp) return c.json({ error: { code: 'not_found', message: 'Employee not found.' } }, 404)
  const info = await db
    .prepare('INSERT INTO performance_pips (employee_id, title, description, start_date, end_date, goals, status, outcome, manager_comments, created_by) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .bind(d.employee_id, d.title, d.description ?? null, d.start_date, d.end_date, d.goals ?? null, d.status, d.outcome ?? null, d.manager_comments ?? null, c.get('user')?.email ?? null)
    .run()
  const row = await db.prepare('SELECT * FROM performance_pips WHERE id = ?').bind(info.meta.last_row_id).first()
  await db.prepare('INSERT INTO performance_history (employee_id, action, details, performed_by) VALUES (?,?,?,?)').bind(d.employee_id, 'pip_started', `PIP "${d.title}" started`, c.get('user')?.email ?? null).run()
  return c.json({ data: row }, 201)
})

performanceRoutes.patch('/pips/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => null)
  const parsed = pipSchema.partial().safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const existing = await db.prepare('SELECT * FROM performance_pips WHERE id = ?').bind(id).first()
  if (!existing) return c.json({ error: { code: 'not_found', message: 'PIP not found.' } }, 404)
  const sets: string[] = []
  const params: (string | number | null)[] = []
  for (const [k, v] of Object.entries(d)) {
    if (v !== undefined) { sets.push(`${k} = ?`); params.push(v as string | number | null) }
  }
  if (sets.length === 0) return c.json({ data: existing })
  params.push(id)
  await db.prepare(`UPDATE performance_pips SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run()
  const row = await db.prepare('SELECT * FROM performance_pips WHERE id = ?').bind(id).first()
  if (d.status === 'completed' || d.status === 'cancelled') {
    await db.prepare('INSERT INTO performance_history (employee_id, action, details, performed_by) VALUES (?,?,?,?)').bind((existing as any).employee_id, 'pip_ended', `PIP "${(existing as any).title}" ${d.status}`, c.get('user')?.email ?? null).run()
  }
  return c.json({ data: row })
})

performanceRoutes.delete('/pips/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const db = getDb(c.env)
  const row = await db.prepare('SELECT * FROM performance_pips WHERE id = ?').bind(id).first()
  if (!row) return c.json({ error: { code: 'not_found', message: 'PIP not found.' } }, 404)
  await db.prepare('DELETE FROM performance_pips WHERE id = ?').bind(id).run()
  return c.json({ data: { ok: true } })
})

// ---------- Performance Summary (Dashboard) ----------

performanceRoutes.get('/summary', async (c) => {
  const employee_id = c.req.query('employee_id')
  const fiscal_year = c.req.query('fiscal_year') || String(new Date().getFullYear())
  const db = getDb(c.env)
  const where = employee_id ? 'AND employee_id = ?' : ''
  const params = employee_id ? [Number(employee_id), Number(fiscal_year)] : [Number(fiscal_year)]

  const [kpiCount, goalStats, reviewAvg, feedbackCount, activePips] = await Promise.all([
    db.prepare(`SELECT COUNT(*) as total FROM performance_kpis WHERE fiscal_year = ? ${where}`).bind(...params).first(),
    db.prepare(`SELECT status, COUNT(*) as count FROM performance_goals WHERE fiscal_year = ? ${where} GROUP BY status`).bind(...params).all(),
    db.prepare(`SELECT AVG(overall_rating) as avg_rating, COUNT(*) as total FROM performance_reviews WHERE 1=1 ${employee_id ? 'AND employee_id = ?' : ''}`).bind(...(employee_id ? [Number(employee_id)] : [])).first(),
    db.prepare(`SELECT COUNT(*) as total FROM performance_feedback WHERE 1=1 ${employee_id ? 'AND employee_id = ?' : ''}`).bind(...(employee_id ? [Number(employee_id)] : [])).first(),
    db.prepare(`SELECT COUNT(*) as total FROM performance_pips WHERE status = 'active' ${where.replace('AND', 'AND')}`).bind(...params).first(),
  ])

  const goalsByStatus: Record<string, number> = {}
  for (const r of (goalStats?.results || []) as any[]) { goalsByStatus[r.status] = r.count }

  return c.json({
    data: {
      kpi_count: Number(kpiCount?.total || 0),
      goals: { total: Object.values(goalsByStatus).reduce((a, b) => a + b, 0), ...goalsByStatus },
      avg_rating: reviewAvg?.avg_rating ? Number(Number(reviewAvg.avg_rating).toFixed(1)) : null,
      total_reviews: Number(reviewAvg?.total || 0),
      total_feedback: Number(feedbackCount?.total || 0),
      active_pips: Number(activePips?.total || 0),
    },
  })
})
