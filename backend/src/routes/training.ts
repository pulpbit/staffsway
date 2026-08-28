import { Hono } from 'hono'
import { z } from 'zod'
import type { Env } from '../types'
import { getDb } from '../utils/db'

export const trainingRoutes = new Hono<{ Bindings: Env }>()

// ---------- Training Calendar CRUD ----------

const trainingSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  training_type: z.enum(['technical', 'soft_skills', 'compliance', 'safety', 'onboarding', 'leadership', 'other']).default('technical'),
  trainer_name: z.string().max(100).optional(),
  trainer_org: z.string().max(100).optional(),
  mode: z.enum(['in_person', 'virtual', 'hybrid', 'self_paced']).default('in_person'),
  location: z.string().max(200).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  start_time: z.string().max(10).optional(),
  end_time: z.string().max(10).optional(),
  duration_hours: z.number().min(0).optional(),
  max_participants: z.number().int().min(1).optional(),
  status: z.enum(['draft', 'scheduled', 'in_progress', 'completed', 'cancelled']).default('scheduled'),
})

trainingRoutes.get('/', async (c) => {
  const status = c.req.query('status')
  const training_type = c.req.query('training_type')
  const search = c.req.query('search')
  const db = getDb(c.env)
  let sql = 'SELECT * FROM trainings WHERE 1=1'
  const params: (string | number)[] = []
  if (status) { sql += ' AND status = ?'; params.push(status) }
  if (training_type) { sql += ' AND training_type = ?'; params.push(training_type) }
  if (search) {
    const term = `%${search}%`
    sql += ' AND (title LIKE ? OR trainer_name LIKE ? OR location LIKE ?)'
    params.push(term, term, term)
  }
  sql += ' ORDER BY start_date DESC'
  const rows = await db.prepare(sql).bind(...params).all()
  return c.json({ data: rows.results })
})

// ---------- Summary (must be before /:id) ----------

trainingRoutes.get('/summary', async (c) => {
  const db = getDb(c.env)
  const [total, scheduled, inProgress, completed, cancelled] = await Promise.all([
    db.prepare('SELECT COUNT(*) as c FROM trainings').first(),
    db.prepare("SELECT COUNT(*) as c FROM trainings WHERE status = 'scheduled'").first(),
    db.prepare("SELECT COUNT(*) as c FROM trainings WHERE status = 'in_progress'").first(),
    db.prepare("SELECT COUNT(*) as c FROM trainings WHERE status = 'completed'").first(),
    db.prepare("SELECT COUNT(*) as c FROM trainings WHERE status = 'cancelled'").first(),
  ])
  const totalAssigned = await db.prepare('SELECT COUNT(*) as c FROM training_assignments').first()
  const totalAttended = await db.prepare('SELECT COUNT(*) as c FROM training_attendance WHERE attended = 1').first()
  const totalCerts = await db.prepare("SELECT COUNT(*) as c FROM certifications WHERE status = 'active'").first()
  const totalSkills = await db.prepare('SELECT COUNT(DISTINCT skill_name) as c FROM skill_matrix').first()
  return c.json({
    data: {
      total: Number(total?.c || 0),
      scheduled: Number(scheduled?.c || 0),
      in_progress: Number(inProgress?.c || 0),
      completed: Number(completed?.c || 0),
      cancelled: Number(cancelled?.c || 0),
      total_assigned: Number(totalAssigned?.c || 0),
      total_attended: Number(totalAttended?.c || 0),
      active_certs: Number(totalCerts?.c || 0),
      unique_skills: Number(totalSkills?.c || 0),
    },
  })
})

// ---------- Certifications (must be before /:id) ----------

const certSchema = z.object({
  employee_id: z.number().int().positive(),
  name: z.string().min(1).max(200),
  issuing_org: z.string().max(100).optional(),
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  credential_id: z.string().max(100).optional(),
  status: z.enum(['active', 'expired', 'revoked']).default('active'),
  notes: z.string().max(500).optional(),
})

trainingRoutes.get('/certifications', async (c) => {
  const employee_id = c.req.query('employee_id')
  const db = getDb(c.env)
  let sql = 'SELECT c.*, e.first_name, e.last_name, e.employee_code FROM certifications c JOIN employees e ON e.id = c.employee_id WHERE 1=1'
  const params: (string | number)[] = []
  if (employee_id) { sql += ' AND c.employee_id = ?'; params.push(Number(employee_id)) }
  sql += ' ORDER BY c.issue_date DESC'
  const rows = await db.prepare(sql).bind(...params).all()
  return c.json({ data: rows.results })
})

trainingRoutes.post('/certifications', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = certSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const emp = await db.prepare('SELECT id FROM employees WHERE id = ?').bind(d.employee_id).first()
  if (!emp) return c.json({ error: { code: 'not_found', message: 'Employee not found.' } }, 404)
  const info = await db.prepare('INSERT INTO certifications (employee_id, name, issuing_org, issue_date, expiry_date, credential_id, status, notes) VALUES (?,?,?,?,?,?,?,?)').bind(d.employee_id, d.name, d.issuing_org ?? null, d.issue_date ?? null, d.expiry_date ?? null, d.credential_id ?? null, d.status, d.notes ?? null).run()
  const row = await db.prepare('SELECT * FROM certifications WHERE id = ?').bind(info.meta.last_row_id).first()
  return c.json({ data: row }, 201)
})

trainingRoutes.delete('/certifications/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const db = getDb(c.env)
  const res = await db.prepare('DELETE FROM certifications WHERE id = ?').bind(id).run()
  if (!res.meta.changes) return c.json({ error: { code: 'not_found', message: 'Certification not found.' } }, 404)
  return c.json({ data: { ok: true } })
})

// ---------- Skill Matrix (must be before /:id) ----------

const skillSchema = z.object({
  employee_id: z.number().int().positive(),
  skill_name: z.string().min(1).max(100),
  category: z.enum(['technical', 'soft_skill', 'domain', 'tool', 'language', 'other']).default('technical'),
  proficiency: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).default('beginner'),
  last_assessed: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  assessed_by: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
})

trainingRoutes.get('/skills/matrix', async (c) => {
  const db = getDb(c.env)
  const rows = await db.prepare(`
    SELECT s.*, e.first_name, e.last_name, e.employee_code
    FROM skill_matrix s JOIN employees e ON e.id = s.employee_id
    ORDER BY s.skill_name, e.first_name
  `).all()
  return c.json({ data: rows.results })
})

trainingRoutes.get('/skills', async (c) => {
  const employee_id = c.req.query('employee_id')
  const skill_name = c.req.query('skill_name')
  const db = getDb(c.env)
  let sql = 'SELECT s.*, e.first_name, e.last_name, e.employee_code FROM skill_matrix s JOIN employees e ON e.id = s.employee_id WHERE 1=1'
  const params: (string | number)[] = []
  if (employee_id) { sql += ' AND s.employee_id = ?'; params.push(Number(employee_id)) }
  if (skill_name) { sql += ' AND s.skill_name = ?'; params.push(skill_name) }
  sql += ' ORDER BY s.skill_name, e.first_name'
  const rows = await db.prepare(sql).bind(...params).all()
  return c.json({ data: rows.results })
})

trainingRoutes.post('/skills', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = skillSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const emp = await db.prepare('SELECT id FROM employees WHERE id = ?').bind(d.employee_id).first()
  if (!emp) return c.json({ error: { code: 'not_found', message: 'Employee not found.' } }, 404)
  const existing = await db.prepare('SELECT id FROM skill_matrix WHERE employee_id = ? AND skill_name = ?').bind(d.employee_id, d.skill_name).first()
  if (existing) {
    await db.prepare('UPDATE skill_matrix SET category = ?, proficiency = ?, last_assessed = ?, assessed_by = ?, notes = ? WHERE id = ?').bind(d.category, d.proficiency, d.last_assessed ?? null, d.assessed_by ?? null, d.notes ?? null, (existing as any).id).run()
    const row = await db.prepare('SELECT * FROM skill_matrix WHERE id = ?').bind((existing as any).id).first()
    return c.json({ data: row })
  }
  const info = await db.prepare('INSERT INTO skill_matrix (employee_id, skill_name, category, proficiency, last_assessed, assessed_by, notes) VALUES (?,?,?,?,?,?,?)').bind(d.employee_id, d.skill_name, d.category, d.proficiency, d.last_assessed ?? null, d.assessed_by ?? null, d.notes ?? null).run()
  const row = await db.prepare('SELECT * FROM skill_matrix WHERE id = ?').bind(info.meta.last_row_id).first()
  return c.json({ data: row }, 201)
})

trainingRoutes.delete('/skills/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const db = getDb(c.env)
  const res = await db.prepare('DELETE FROM skill_matrix WHERE id = ?').bind(id).run()
  if (!res.meta.changes) return c.json({ error: { code: 'not_found', message: 'Skill not found.' } }, 404)
  return c.json({ data: { ok: true } })
})

// ---------- Training History (must be before /:id) ----------

trainingRoutes.get('/history', async (c) => {
  const employee_id = c.req.query('employee_id')
  const db = getDb(c.env)
  let sql = `
    SELECT t.id as training_id, t.title, t.training_type, t.start_date, t.end_date, t.mode,
           ta.employee_id, ta.status as assignment_status,
           e.first_name, e.last_name, e.employee_code,
           CASE WHEN att.attended = 1 THEN 'Yes' ELSE 'No' END as attended
    FROM trainings t
    JOIN training_assignments ta ON ta.training_id = t.id
    JOIN employees e ON e.id = ta.employee_id
    LEFT JOIN training_attendance att ON att.training_id = t.id AND att.employee_id = ta.employee_id
    WHERE t.status = 'completed'
  `
  const params: (string | number)[] = []
  if (employee_id) { sql += ' AND ta.employee_id = ?'; params.push(Number(employee_id)) }
  sql += ' ORDER BY t.start_date DESC'
  const rows = await db.prepare(sql).bind(...params).all()
  return c.json({ data: rows.results })
})

trainingRoutes.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) return c.json({ error: { code: 'not_found', message: 'Training not found.' } }, 404)
  const db = getDb(c.env)
  const training = await db.prepare('SELECT * FROM trainings WHERE id = ?').bind(id).first()
  if (!training) return c.json({ error: { code: 'not_found', message: 'Training not found.' } }, 404)
  const assignments = await db.prepare(`
    SELECT ta.*, e.first_name, e.last_name, e.employee_code
    FROM training_assignments ta JOIN employees e ON e.id = ta.employee_id
    WHERE ta.training_id = ? ORDER BY e.first_name
  `).bind(id).all()
  const attendance = await db.prepare(`
    SELECT ta.*, e.first_name, e.last_name, e.employee_code
    FROM training_attendance ta JOIN employees e ON e.id = ta.employee_id
    WHERE ta.training_id = ? ORDER BY e.first_name
  `).bind(id).all()
  const materials = await db.prepare('SELECT * FROM training_materials WHERE training_id = ? ORDER BY id').bind(id).all()
  const feedbacks = await db.prepare(`
    SELECT tf.*, e.first_name, e.last_name, e.employee_code
    FROM training_feedback tf JOIN employees e ON e.id = tf.employee_id
    WHERE tf.training_id = ? ORDER BY tf.created_at DESC
  `).bind(id).all()
  return c.json({ data: { ...(training as object), assignments: assignments.results, attendance: attendance.results, materials: materials.results, feedbacks: feedbacks.results } })
})

trainingRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = trainingSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const info = await db
    .prepare('INSERT INTO trainings (title, description, training_type, trainer_name, trainer_org, mode, location, start_date, end_date, start_time, end_time, duration_hours, max_participants, status, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(d.title, d.description ?? null, d.training_type, d.trainer_name ?? null, d.trainer_org ?? null, d.mode, d.location ?? null, d.start_date, d.end_date ?? null, d.start_time ?? null, d.end_time ?? null, d.duration_hours ?? null, d.max_participants ?? null, d.status, c.get('user')?.email ?? null)
    .run()
  const row = await db.prepare('SELECT * FROM trainings WHERE id = ?').bind(info.meta.last_row_id).first()
  return c.json({ data: row }, 201)
})

trainingRoutes.put('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) return c.json({ error: { code: 'not_found', message: 'Training not found.' } }, 404)
  const body = await c.req.json().catch(() => null)
  const parsed = trainingSchema.partial().safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const existing = await db.prepare('SELECT id FROM trainings WHERE id = ?').bind(id).first()
  if (!existing) return c.json({ error: { code: 'not_found', message: 'Training not found.' } }, 404)
  const sets: string[] = []
  const params: (string | number | null)[] = []
  for (const [k, v] of Object.entries(d)) {
    if (v !== undefined) { sets.push(`${k} = ?`); params.push(v as string | number | null) }
  }
  if (sets.length === 0) return c.json({ data: existing })
  sets.push('updated_at = datetime(\'now\')')
  params.push(id)
  await db.prepare(`UPDATE trainings SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run()
  const row = await db.prepare('SELECT * FROM trainings WHERE id = ?').bind(id).first()
  return c.json({ data: row })
})

trainingRoutes.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const db = getDb(c.env)
  const res = await db.prepare('DELETE FROM trainings WHERE id = ?').bind(id).run()
  if (!res.meta.changes) return c.json({ error: { code: 'not_found', message: 'Training not found.' } }, 404)
  return c.json({ data: { ok: true } })
})

// ---------- Training Assignments ----------

const assignSchema = z.object({
  employee_ids: z.array(z.number().int().positive()).min(1),
})

trainingRoutes.post('/:id/assign', async (c) => {
  const trainingId = Number(c.req.param('id'))
  if (!Number.isInteger(trainingId) || trainingId <= 0) return c.json({ error: { code: 'not_found', message: 'Training not found.' } }, 404)
  const body = await c.req.json().catch(() => null)
  const parsed = assignSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please select at least one employee.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const db = getDb(c.env)
  const training = await db.prepare('SELECT id, max_participants FROM trainings WHERE id = ?').bind(trainingId).first() as any
  if (!training) return c.json({ error: { code: 'not_found', message: 'Training not found.' } }, 404)

  let count = 0
  for (const empId of parsed.data.employee_ids) {
    const emp = await db.prepare('SELECT id FROM employees WHERE id = ?').bind(empId).first()
    if (!emp) continue
    try {
      await db.prepare('INSERT INTO training_assignments (training_id, employee_id, assigned_by) VALUES (?,?,?)').bind(trainingId, empId, c.get('user')?.email ?? null).run()
      count++
    } catch { /* duplicate assignment ignored */ }
  }
  return c.json({ data: { assigned: count } }, 201)
})

trainingRoutes.delete('/:id/assign/:empId', async (c) => {
  const trainingId = Number(c.req.param('id'))
  const empId = Number(c.req.param('empId'))
  const db = getDb(c.env)
  await db.prepare('DELETE FROM training_assignments WHERE training_id = ? AND employee_id = ?').bind(trainingId, empId).run()
  return c.json({ data: { ok: true } })
})

// ---------- Training Attendance ----------

const attendanceSchema = z.object({
  employee_id: z.number().int().positive(),
  attended: z.boolean(),
  notes: z.string().max(500).optional(),
})

trainingRoutes.post('/:id/attendance', async (c) => {
  const trainingId = Number(c.req.param('id'))
  if (!Number.isInteger(trainingId) || trainingId <= 0) return c.json({ error: { code: 'not_found', message: 'Training not found.' } }, 404)
  const body = await c.req.json().catch(() => null)
  const parsed = attendanceSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  await db.prepare(`
    INSERT INTO training_attendance (training_id, employee_id, attended, notes, marked_by)
    VALUES (?,?,?,?,?)
    ON CONFLICT(training_id, employee_id) DO UPDATE SET attended = excluded.attended, notes = excluded.notes, marked_by = excluded.marked_by
  `).bind(trainingId, d.employee_id, d.attended ? 1 : 0, d.notes ?? null, c.get('user')?.email ?? null).run()
  return c.json({ data: { ok: true } }, 201)
})

trainingRoutes.post('/:id/attendance/bulk', async (c) => {
  const trainingId = Number(c.req.param('id'))
  if (!Number.isInteger(trainingId) || trainingId <= 0) return c.json({ error: { code: 'not_found', message: 'Training not found.' } }, 404)
  const body = await c.req.json().catch(() => null)
  const parsed = z.object({ items: z.array(z.object({ employee_id: z.number().int().positive(), attended: z.boolean(), notes: z.string().max(500).optional() })) }).safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Invalid data.' } }, 400)
  const db = getDb(c.env)
  for (const item of parsed.data.items) {
    await db.prepare(`
      INSERT INTO training_attendance (training_id, employee_id, attended, notes, marked_by)
      VALUES (?,?,?,?,?)
      ON CONFLICT(training_id, employee_id) DO UPDATE SET attended = excluded.attended, notes = excluded.notes, marked_by = excluded.marked_by
    `).bind(trainingId, item.employee_id, item.attended ? 1 : 0, item.notes ?? null, c.get('user')?.email ?? null).run()
  }
  return c.json({ data: { ok: true } }, 201)
})

// ---------- Training Materials ----------

const materialSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  material_type: z.enum(['document', 'video', 'link', 'presentation', 'other']).default('document'),
  url: z.string().max(500).optional(),
})

trainingRoutes.post('/:id/materials', async (c) => {
  const trainingId = Number(c.req.param('id'))
  if (!Number.isInteger(trainingId) || trainingId <= 0) return c.json({ error: { code: 'not_found', message: 'Training not found.' } }, 404)
  const body = await c.req.json().catch(() => null)
  const parsed = materialSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const info = await db.prepare('INSERT INTO training_materials (training_id, title, description, material_type, url, uploaded_by) VALUES (?,?,?,?,?,?)').bind(trainingId, d.title, d.description ?? null, d.material_type, d.url ?? null, c.get('user')?.email ?? null).run()
  const row = await db.prepare('SELECT * FROM training_materials WHERE id = ?').bind(info.meta.last_row_id).first()
  return c.json({ data: row }, 201)
})

trainingRoutes.delete('/:id/materials/:matId', async (c) => {
  const matId = Number(c.req.param('matId'))
  const db = getDb(c.env)
  await db.prepare('DELETE FROM training_materials WHERE id = ?').bind(matId).run()
  return c.json({ data: { ok: true } })
})

// ---------- Training Feedback ----------

const feedbackSchema = z.object({
  employee_id: z.number().int().positive(),
  rating: z.number().int().min(1).max(5).optional(),
  content_rating: z.number().int().min(1).max(5).optional(),
  trainer_rating: z.number().int().min(1).max(5).optional(),
  comments: z.string().max(2000).optional(),
  suggestions: z.string().max(2000).optional(),
})

trainingRoutes.post('/:id/feedback', async (c) => {
  const trainingId = Number(c.req.param('id'))
  if (!Number.isInteger(trainingId) || trainingId <= 0) return c.json({ error: { code: 'not_found', message: 'Training not found.' } }, 404)
  const body = await c.req.json().catch(() => null)
  const parsed = feedbackSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const emp = await db.prepare('SELECT id FROM employees WHERE id = ?').bind(d.employee_id).first()
  if (!emp) return c.json({ error: { code: 'not_found', message: 'Employee not found.' } }, 404)
  await db.prepare(`
    INSERT INTO training_feedback (training_id, employee_id, rating, content_rating, trainer_rating, comments, suggestions)
    VALUES (?,?,?,?,?,?,?)
    ON CONFLICT(training_id, employee_id) DO UPDATE SET rating = excluded.rating, content_rating = excluded.content_rating, trainer_rating = excluded.trainer_rating, comments = excluded.comments, suggestions = excluded.suggestions
  `).bind(trainingId, d.employee_id, d.rating ?? null, d.content_rating ?? null, d.trainer_rating ?? null, d.comments ?? null, d.suggestions ?? null).run()
  return c.json({ data: { ok: true } }, 201)
})
