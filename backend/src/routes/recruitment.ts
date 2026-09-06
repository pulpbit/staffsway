import { Hono } from 'hono'
import { z } from 'zod'
import type { Env } from '../types'
import { getDb } from '../utils/db'
import { nextEmployeeCode } from '../utils/employeeCode'

const openingBase = {
  title: z.string().min(1).max(150),
  department: z.string().max(100).optional().nullable(),
  site_id: z.number().int().positive().optional().nullable(),
  positions_required: z.number().int().min(1).max(500).optional(),
  status: z.enum(['open', 'on_hold', 'closed', 'fulfilled']).optional(),
  notes: z.string().max(1000).optional().nullable(),
}

const candidateBase = {
  full_name: z.string().min(1).max(150),
  mobile: z.string().max(20).optional().nullable(),
  email: z.string().email().max(191).optional().nullable().or(z.literal('')),
  opening_id: z.number().int().positive().optional().nullable(),
  source: z.enum(['walk_in', 'referral', 'job_portal', 'agency', 'other']).optional(),
  experience: z.string().max(50).optional().nullable(),
  expected_salary: z.number().min(0).optional().nullable(),
  remarks: z.string().max(1000).optional().nullable(),
  status: z.enum(['new', 'screening', 'shortlisted', 'selected', 'rejected', 'on_hold', 'joined']).optional(),
}

const interviewCreateSchema = z.object({
  round: z.number().int().min(1).max(10).optional(),
  scheduled_at: z.string().min(1),
  interviewer: z.string().max(100).optional().nullable(),
  mode: z.enum(['in_person', 'phone', 'video']).optional(),
  remarks: z.string().max(1000).optional().nullable(),
})

const interviewUpdateSchema = z.object({
  outcome: z.enum(['pending', 'passed', 'failed']),
  remarks: z.string().max(1000).optional().nullable(),
})

const joinSchema = z.object({
  joining_date: z.string().min(1),
  designation: z.string().max(100).optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  basic: z.number().min(0),
  hra: z.number().min(0).optional(),
  conveyance: z.number().min(0).optional(),
  other_allowance: z.number().min(0).optional(),
})

const ONBOARDING_CHECKLIST = [
  'Appointment letter issued & signed',
  'Joining form completed',
  'Aadhaar card collected',
  'PAN card collected',
  'Bank account details recorded',
  'Police verification / background check',
  'Uniform & ID card issued',
  'ESIC / UAN registration initiated',
]

const openingSelect = `SELECT o.*, s.name AS site_name, c.name AS client_name,
  (SELECT COUNT(*) FROM candidates cd WHERE cd.opening_id = o.id AND cd.status = 'joined') AS filled_count
  FROM job_openings o LEFT JOIN sites s ON s.id = o.site_id LEFT JOIN clients c ON c.id = s.client_id`

const candidateSelect = `SELECT cd.*, o.title AS opening_title, o.code AS opening_code, e.employee_code AS joined_code
  FROM candidates cd
  LEFT JOIN job_openings o ON o.id = cd.opening_id
  LEFT JOIN employees e ON e.id = cd.joined_employee_id`

export const recruitmentRoutes = new Hono<{ Bindings: Env }>()

// ---------- Job openings ----------
recruitmentRoutes.get('/openings', async (c) => {
  const db = getDb(c.env)
  const res = await db.prepare(`${openingSelect} ORDER BY o.created_at DESC`).all()
  return c.json({ data: res.results })
})

recruitmentRoutes.post('/openings', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = z.object(openingBase).safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  let code = ''
  let n = (await db.prepare('SELECT COUNT(*) AS n FROM job_openings').first<{ n: number }>())?.n || 0
  // Count-based sequence with collision retry keeps codes tidy even after deletes.
  do { n += 1; code = `JOB${String(n).padStart(4, '0')}` } while (await db.prepare('SELECT id FROM job_openings WHERE code = ?').bind(code).first())
  const info = await db
    .prepare('INSERT INTO job_openings (code, title, department, site_id, positions_required, notes) VALUES (?,?,?,?,?,?)')
    .bind(code, d.title, d.department ?? null, d.site_id ?? null, d.positions_required ?? 1, d.notes ?? null)
    .run()
  const created = await db.prepare(`${openingSelect} WHERE o.id = ?`).bind(Number(info.meta.last_row_id)).first()
  return c.json({ data: created, message: 'Position created.' }, 201)
})

recruitmentRoutes.patch('/openings/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => null)
  const parsed = z.object(openingBase).partial().safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Invalid input.' } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const sets: string[] = []
  const params: (string | number | null)[] = []
  for (const f of ['title', 'department', 'positions_required', 'status', 'notes'] as const) {
    if (d[f] !== undefined) { sets.push(`${f} = ?`); params.push(d[f] as string | number | null) }
  }
  if ('site_id' in d && d.site_id !== undefined) { sets.push('site_id = ?'); params.push(d.site_id ?? null) }
  sets.push("updated_at = datetime('now')")
  params.push(id)
  const res = await db.prepare(`UPDATE job_openings SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run()
  if (!res.meta.changes) return c.json({ error: { code: 'not_found', message: 'Position not found.' } }, 404)
  const updated = await db.prepare(`${openingSelect} WHERE o.id = ?`).bind(id).first()
  return c.json({ data: updated, message: 'Position updated.' })
})

recruitmentRoutes.delete('/openings/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const db = getDb(c.env)
  const used = await db.prepare('SELECT id FROM candidates WHERE opening_id = ?').bind(id).first()
  if (used) return c.json({ error: { code: 'conflict', message: 'Cannot delete a position with linked candidates. Close it instead.' } }, 409)
  const res = await db.prepare('DELETE FROM job_openings WHERE id = ?').bind(id).run()
  if (!res.meta.changes) return c.json({ error: { code: 'not_found', message: 'Position not found.' } }, 404)
  return c.json({ data: { id }, message: 'Position deleted.' })
})

// ---------- Candidates ----------
recruitmentRoutes.get('/candidates', async (c) => {
  const db = getDb(c.env)
  const openingId = Number(c.req.query('opening_id') || 0)
  const search = (c.req.query('search') || '').trim()
  let sql = candidateSelect
  const where: string[] = []
  const params: (string | number)[] = []
  if (Number.isInteger(openingId) && openingId > 0) { where.push('cd.opening_id = ?'); params.push(openingId) }
  if (search) { where.push('(cd.full_name LIKE ? OR cd.mobile LIKE ?)'); params.push(`%${search}%`, `%${search}%`) }
  if (where.length) sql += ` WHERE ${where.join(' AND ')}`
  sql += ' ORDER BY cd.created_at DESC'
  const res = await db.prepare(sql).bind(...params).all()
  const interviews = await db.prepare('SELECT * FROM interviews ORDER BY round').all()
  const byCandidate = new Map<number, any[]>()
  for (const iv of (interviews.results as any[])) {
    const list = byCandidate.get(iv.candidate_id) || []
    list.push(iv)
    byCandidate.set(iv.candidate_id, list)
  }
  const data = (res.results as any[]).map((r) => ({ ...r, interviews: byCandidate.get(r.id) || [] }))
  return c.json({ data })
})

recruitmentRoutes.post('/candidates', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = z.object(candidateBase).safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const info = await db
    .prepare('INSERT INTO candidates (full_name, mobile, email, opening_id, source, experience, expected_salary, remarks, status) VALUES (?,?,?,?,?,?,?,?,?)')
    .bind(d.full_name, d.mobile ?? null, d.email || null, d.opening_id ?? null, d.source ?? null, d.experience ?? null, d.expected_salary ?? null, d.remarks ?? null, d.status ?? 'new')
    .run()
  const created = await db.prepare(`${candidateSelect} WHERE cd.id = ?`).bind(Number(info.meta.last_row_id)).first()
  return c.json({ data: created, message: 'Candidate added.' }, 201)
})

recruitmentRoutes.patch('/candidates/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => null)
  const parsed = z.object(candidateBase).partial().safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Invalid input.' } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const sets: string[] = []
  const params: (string | number | null)[] = []
  for (const f of ['full_name', 'mobile', 'email', 'source', 'experience', 'expected_salary', 'remarks', 'status'] as const) {
    if (d[f] !== undefined) { sets.push(`${f} = ?`); params.push(f === 'email' ? (d[f] || null) : (d[f] as string | number | null)) }
  }
  if ('opening_id' in d && d.opening_id !== undefined) { sets.push('opening_id = ?'); params.push(d.opening_id ?? null) }
  if (!sets.length) return c.json({ error: { code: 'validation_error', message: 'Nothing to update.' } }, 400)
  sets.push("updated_at = datetime('now')")
  params.push(id)
  const res = await db.prepare(`UPDATE candidates SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run()
  if (!res.meta.changes) return c.json({ error: { code: 'not_found', message: 'Candidate not found.' } }, 404)
  const updated = await db.prepare(`${candidateSelect} WHERE cd.id = ?`).bind(id).first()
  return c.json({ data: updated, message: 'Candidate updated.' })
})

recruitmentRoutes.delete('/candidates/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const db = getDb(c.env)
  const res = await db.prepare('DELETE FROM candidates WHERE id = ?').bind(id).run()
  if (!res.meta.changes) return c.json({ error: { code: 'not_found', message: 'Candidate not found.' } }, 404)
  return c.json({ data: { id }, message: 'Candidate deleted.' })
})

// ---------- Interviews ----------
recruitmentRoutes.post('/candidates/:id/interviews', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => null)
  const parsed = interviewCreateSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const cand = await db.prepare('SELECT id FROM candidates WHERE id = ?').bind(id).first()
  if (!cand) return c.json({ error: { code: 'not_found', message: 'Candidate not found.' } }, 404)
  const maxRow = await db.prepare('SELECT MAX(round) AS m FROM interviews WHERE candidate_id = ?').bind(id).first()
  const round = d.round ?? (Number(maxRow?.m) || 0) + 1
  const info = await db
    .prepare('INSERT INTO interviews (candidate_id, round, scheduled_at, interviewer, mode, remarks) VALUES (?,?,?,?,?,?)')
    .bind(id, round, d.scheduled_at, d.interviewer ?? null, d.mode ?? null, d.remarks ?? null)
    .run()
  const created = await db.prepare('SELECT * FROM interviews WHERE id = ?').bind(Number(info.meta.last_row_id)).first()
  await db.prepare("UPDATE candidates SET status = CASE WHEN status IN ('new','screening') THEN 'screening' ELSE status END, updated_at = datetime('now') WHERE id = ?").bind(id).run()
  return c.json({ data: created, message: 'Interview scheduled.' }, 201)
})

recruitmentRoutes.patch('/interviews/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => null)
  const parsed = interviewUpdateSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Invalid input.' } }, 400)
  const db = getDb(c.env)
  const res = await db
    .prepare('UPDATE interviews SET outcome = ?, remarks = COALESCE(?, remarks) WHERE id = ?')
    .bind(parsed.data.outcome, parsed.data.remarks ?? null, id)
    .run()
  if (!res.meta.changes) return c.json({ error: { code: 'not_found', message: 'Interview not found.' } }, 404)
  const updated = await db.prepare('SELECT * FROM interviews WHERE id = ?').bind(id).first()
  return c.json({ data: updated, message: 'Interview updated.' })
})

// ---------- Joining: candidate -> employee + onboarding checklist ----------
recruitmentRoutes.post('/candidates/:id/join', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => null)
  const parsed = joinSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const cand: any = await db.prepare('SELECT * FROM candidates WHERE id = ?').bind(id).first()
  if (!cand) return c.json({ error: { code: 'not_found', message: 'Candidate not found.' } }, 404)
  if (cand.status === 'joined' && cand.joined_employee_id) return c.json({ error: { code: 'conflict', message: 'Candidate already joined.' } }, 409)

  const opening: any = cand.opening_id ? await db.prepare('SELECT * FROM job_openings WHERE id = ?').bind(cand.opening_id).first() : null
  const code = await nextEmployeeCode(db, opening?.site_id ?? null)
  const [firstName, ...rest] = cand.full_name.split(' ')
  const lastName = rest.join(' ') || '-'

  const info = await db
    .prepare(`INSERT INTO employees (employee_code, first_name, last_name, mobile, email, joining_date, designation, department, employee_type, shift_type, site_id, status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,'active')`)
    .bind(code, firstName, lastName, cand.mobile ?? null, cand.email ?? null,
      d.joining_date, d.designation ?? opening?.title ?? null, d.department ?? opening?.department ?? null,
      'permanent', 'General', opening?.site_id ?? null)
    .run()
  const employeeId = Number(info.meta.last_row_id)

  await db.prepare('INSERT INTO salary_structures (employee_id, effective_from, basic, hra, conveyance, other_allowance) VALUES (?,?,?,?,?,?)')
    .bind(employeeId, d.joining_date, d.basic, d.hra ?? 0, d.conveyance ?? 0, d.other_allowance ?? 0).run()
  await db.prepare('INSERT OR IGNORE INTO employee_statutory (employee_id, pf_applicable, esi_applicable, pt_applicable) VALUES (?,1,1,1)').bind(employeeId).run()

  for (const task of ONBOARDING_CHECKLIST) {
    await db.prepare('INSERT INTO onboarding_tasks (employee_id, task) VALUES (?,?)').bind(employeeId, task).run()
  }
  await db.prepare("UPDATE candidates SET status = 'joined', joined_employee_id = ?, updated_at = datetime('now') WHERE id = ?").bind(employeeId, id).run()
  if (opening) {
    await db.prepare("UPDATE job_openings SET status = CASE WHEN (SELECT COUNT(*) FROM candidates WHERE opening_id = ? AND status = 'joined') >= positions_required THEN 'fulfilled' ELSE status END, updated_at = datetime('now') WHERE id = ?").bind(opening.id, opening.id).run()
  }

  const employee = await db.prepare('SELECT * FROM employees WHERE id = ?').bind(employeeId).first()
  return c.json({ data: { employee, employee_id: employeeId }, message: `Joined as ${code}. Onboarding checklist created.` }, 201)
})

// ---------- Onboarding checklist ----------
recruitmentRoutes.get('/employees/:id/onboarding', async (c) => {
  const id = Number(c.req.param('id'))
  const db = getDb(c.env)
  const res = await db.prepare('SELECT * FROM onboarding_tasks WHERE employee_id = ? ORDER BY id').bind(id).all()
  return c.json({ data: res.results })
})

recruitmentRoutes.patch('/onboarding/:taskId', async (c) => {
  const taskId = Number(c.req.param('taskId'))
  const body = await c.req.json().catch(() => null)
  const parsed = z.object({ done: z.boolean() }).safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Invalid input.' } }, 400)
  const db = getDb(c.env)
  const doneVal = parsed.data.done
  const res = await db
    .prepare(`UPDATE onboarding_tasks SET done = ?, done_at = ${doneVal ? "datetime('now')" : 'NULL'} WHERE id = ?`)
    .bind(doneVal ? 1 : 0, taskId)
    .run()
  if (!res.meta.changes) return c.json({ error: { code: 'not_found', message: 'Task not found.' } }, 404)
  const updated = await db.prepare('SELECT * FROM onboarding_tasks WHERE id = ?').bind(taskId).first()
  return c.json({ data: updated, message: 'Checklist updated.' })
})
