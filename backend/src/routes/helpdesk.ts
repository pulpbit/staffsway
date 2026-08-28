import { Hono } from 'hono'
import { z } from 'zod'
import type { Env } from '../types'
import { getDb } from '../utils/db'

export const helpdeskRoutes = new Hono<{ Bindings: Env }>()

const CATEGORIES = ['salary_issue', 'attendance_issue', 'pf_esi_issue', 'leave_issue', 'document_request', 'id_card_request', 'other']
const CATEGORY_LABELS: Record<string, string> = {
  salary_issue: 'Salary Issue', attendance_issue: 'Attendance Issue', pf_esi_issue: 'PF/ESI Issue',
  leave_issue: 'Leave Issue', document_request: 'Document Request', id_card_request: 'ID Card Request', other: 'Other HR Query',
}

// ---------- List (Admin/HR view) ----------

helpdeskRoutes.get('/', async (c) => {
  const status = c.req.query('status')
  const category = c.req.query('category')
  const priority = c.req.query('priority')
  const search = c.req.query('search')
  const db = getDb(c.env)
  let sql = 'SELECT r.*, e.first_name, e.last_name, e.employee_code, e.designation, e.department FROM hr_requests r JOIN employees e ON e.id = r.employee_id WHERE 1=1'
  const params: (string | number)[] = []
  if (status) { sql += ' AND r.status = ?'; params.push(status) }
  if (category) { sql += ' AND r.category = ?'; params.push(category) }
  if (priority) { sql += ' AND r.priority = ?'; params.push(priority) }
  if (search) {
    const term = `%${search}%`
    sql += ' AND (r.subject LIKE ? OR r.message LIKE ? OR e.first_name LIKE ? OR e.employee_code LIKE ?)'
    params.push(term, term, term, term)
  }
  sql += ' ORDER BY CASE r.priority WHEN \'urgent\' THEN 1 WHEN \'high\' THEN 2 WHEN \'medium\' THEN 3 ELSE 4 END, r.created_at DESC'
  const rows = await db.prepare(sql).bind(...params).all()
  return c.json({ data: rows.results })
})

// ---------- Summary (must be before /:id) ----------

helpdeskRoutes.get('/summary/stats', async (c) => {
  const db = getDb(c.env)
  const [total, open, inProgress, resolved, closed, urgent] = await Promise.all([
    db.prepare('SELECT COUNT(*) as c FROM hr_requests').first(),
    db.prepare("SELECT COUNT(*) as c FROM hr_requests WHERE status = 'open'").first(),
    db.prepare("SELECT COUNT(*) as c FROM hr_requests WHERE status = 'in_progress'").first(),
    db.prepare("SELECT COUNT(*) as c FROM hr_requests WHERE status = 'resolved'").first(),
    db.prepare("SELECT COUNT(*) as c FROM hr_requests WHERE status = 'closed'").first(),
    db.prepare("SELECT COUNT(*) as c FROM hr_requests WHERE priority = 'urgent' AND status NOT IN ('resolved','closed')").first(),
  ])
  const byCategory = await db.prepare("SELECT category, COUNT(*) as count FROM hr_requests WHERE status NOT IN ('resolved','closed') GROUP BY category ORDER BY count DESC").all()
  const thisWeek = await db.prepare("SELECT COUNT(*) as c FROM hr_requests WHERE created_at >= datetime('now', '-7 days')").first()
  return c.json({
    data: {
      total: Number(total?.c || 0),
      open: Number(open?.c || 0),
      in_progress: Number(inProgress?.c || 0),
      resolved: Number(resolved?.c || 0),
      closed: Number(closed?.c || 0),
      urgent: Number(urgent?.c || 0),
      this_week: Number(thisWeek?.c || 0),
      by_category: byCategory.results,
    },
  })
})

// Categories (must be before /:id)
helpdeskRoutes.get('/categories', async (c) => {
  return c.json({ data: Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label })) })
})

// ---------- My Requests (Employee view) ----------

helpdeskRoutes.get('/my', async (c) => {
  const caller = c.get('user')
  const db = getDb(c.env)
  const empId = caller?.employee_id
  if (!empId) return c.json({ data: [] })
  const rows = await db.prepare('SELECT * FROM hr_requests WHERE employee_id = ? ORDER BY created_at DESC').bind(empId).all()
  return c.json({ data: rows.results })
})

// ---------- Detail ----------

helpdeskRoutes.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) return c.json({ error: { code: 'not_found', message: 'Request not found.' } }, 404)
  const db = getDb(c.env)
  const req = await db.prepare('SELECT r.*, e.first_name, e.last_name, e.employee_code, e.designation, e.department FROM hr_requests r JOIN employees e ON e.id = r.employee_id WHERE r.id = ?').bind(id).first()
  if (!req) return c.json({ error: { code: 'not_found', message: 'Request not found.' } }, 404)
  const comments = await db.prepare('SELECT * FROM helpdesk_comments WHERE request_id = ? ORDER BY created_at ASC').bind(id).all()
  return c.json({ data: { ...(req as object), comments: comments.results } })
})

// ---------- Create Request ----------

const createSchema = z.object({
  employee_id: z.number().int().positive(),
  subject: z.string().min(1).max(200),
  message: z.string().max(3000).optional(),
  category: z.enum(['salary_issue', 'attendance_issue', 'pf_esi_issue', 'leave_issue', 'document_request', 'id_card_request', 'other']).default('other'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
})

helpdeskRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const emp = await db.prepare('SELECT id FROM employees WHERE id = ?').bind(d.employee_id).first()
  if (!emp) return c.json({ error: { code: 'not_found', message: 'Employee not found.' } }, 404)
  const info = await db.prepare('INSERT INTO hr_requests (employee_id, subject, message, category, priority, status, manager_status, hr_status) VALUES (?,?,?,?,?,\'open\',\'pending\',\'pending\')').bind(d.employee_id, d.subject, d.message ?? null, d.category, d.priority).run()
  const row = await db.prepare('SELECT * FROM hr_requests WHERE id = ?').bind(info.meta.last_row_id).first()
  return c.json({ data: row }, 201)
})

// ---------- Employee self-create (from My Space) ----------

helpdeskRoutes.post('/self', async (c) => {
  const caller = c.get('user')
  const body = await c.req.json().catch(() => null)
  const parsed = z.object({ subject: z.string().min(1).max(200), message: z.string().max(3000).optional(), category: z.enum(['salary_issue', 'attendance_issue', 'pf_esi_issue', 'leave_issue', 'document_request', 'id_card_request', 'other']).default('other'), priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium') }).safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const empId = caller?.employee_id
  if (!empId) return c.json({ error: { code: 'forbidden', message: 'No employee linked to this account.' } }, 403)
  const info = await db.prepare('INSERT INTO hr_requests (employee_id, subject, message, category, priority, status, manager_status, hr_status) VALUES (?,?,?,?,?,\'open\',\'pending\',\'pending\')').bind(empId, d.subject, d.message ?? null, d.category, d.priority).run()
  const row = await db.prepare('SELECT * FROM hr_requests WHERE id = ?').bind(info.meta.last_row_id).first()
  return c.json({ data: row }, 201)
})

// ---------- Manager Review ----------

helpdeskRoutes.patch('/:id/manager', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => null)
  const parsed = z.object({ action: z.enum(['approve', 'reject']), remarks: z.string().max(500).optional() }).safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Invalid data.' } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const req = await db.prepare('SELECT * FROM hr_requests WHERE id = ?').bind(id).first() as any
  if (!req) return c.json({ error: { code: 'not_found', message: 'Request not found.' } }, 404)
  if (req.manager_status !== 'pending') return c.json({ error: { code: 'conflict', message: 'Manager already reviewed this request.' } }, 409)
  await db.prepare('UPDATE hr_requests SET manager_status = ?, manager_by = ?, manager_remarks = ?, manager_at = datetime(\'now\'), updated_at = datetime(\'now\') WHERE id = ?').bind(d.action === 'approve' ? 'approved' : 'rejected', c.get('user')?.email ?? null, d.remarks ?? null, id).run()
  if (d.action === 'reject') {
    await db.prepare('UPDATE hr_requests SET status = \'rejected\', resolved_by = ?, resolved_at = datetime(\'now\'), updated_at = datetime(\'now\') WHERE id = ?').bind(c.get('user')?.email ?? null, id).run()
  }
  const row = await db.prepare('SELECT * FROM hr_requests WHERE id = ?').bind(id).first()
  return c.json({ data: row })
})

// ---------- HR Review ----------

helpdeskRoutes.patch('/:id/hr', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => null)
  const parsed = z.object({ action: z.enum(['approve', 'reject']), remarks: z.string().max(500).optional() }).safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Invalid data.' } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const req = await db.prepare('SELECT * FROM hr_requests WHERE id = ?').bind(id).first() as any
  if (!req) return c.json({ error: { code: 'not_found', message: 'Request not found.' } }, 404)
  if (req.hr_status !== 'pending') return c.json({ error: { code: 'conflict', message: 'HR already reviewed this request.' } }, 409)
  await db.prepare('UPDATE hr_requests SET hr_status = ?, hr_by = ?, hr_remarks = ?, hr_at = datetime(\'now\'), updated_at = datetime(\'now\') WHERE id = ?').bind(d.action === 'approve' ? 'approved' : 'rejected', c.get('user')?.email ?? null, d.remarks ?? null, id).run()
  if (d.action === 'reject') {
    await db.prepare('UPDATE hr_requests SET status = \'rejected\', resolved_by = ?, resolved_at = datetime(\'now\'), updated_at = datetime(\'now\') WHERE id = ?').bind(c.get('user')?.email ?? null, id).run()
  }
  const row = await db.prepare('SELECT * FROM hr_requests WHERE id = ?').bind(id).first()
  return c.json({ data: row })
})

// ---------- Assign ----------

helpdeskRoutes.patch('/:id/assign', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => null)
  const parsed = z.object({ assigned_to: z.string().max(100) }).safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Invalid data.' } }, 400)
  const db = getDb(c.env)
  await db.prepare('UPDATE hr_requests SET assigned_to = ?, updated_at = datetime(\'now\') WHERE id = ?').bind(parsed.data.assigned_to, id).run()
  const row = await db.prepare('SELECT * FROM hr_requests WHERE id = ?').bind(id).first()
  return c.json({ data: row })
})

// ---------- Take Action / Close ----------

helpdeskRoutes.patch('/:id/action', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => null)
  const parsed = z.object({ action_notes: z.string().min(1).max(2000), status: z.enum(['resolved', 'closed']).default('resolved') }).safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please provide action notes.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const req = await db.prepare('SELECT * FROM hr_requests WHERE id = ?').bind(id).first() as any
  if (!req) return c.json({ error: { code: 'not_found', message: 'Request not found.' } }, 404)
  await db.prepare('UPDATE hr_requests SET status = ?, action_notes = ?, action_by = ?, action_at = datetime(\'now\'), resolved_by = ?, resolved_at = datetime(\'now\'), reply = ?, updated_at = datetime(\'now\') WHERE id = ?').bind(d.status, d.action_notes, c.get('user')?.email ?? null, c.get('user')?.email ?? null, d.action_notes, id).run()
  const row = await db.prepare('SELECT * FROM hr_requests WHERE id = ?').bind(id).first()
  return c.json({ data: row })
})

// ---------- Add Comment ----------

helpdeskRoutes.post('/:id/comments', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => null)
  const parsed = z.object({ comment: z.string().min(1).max(2000), is_internal: z.boolean().default(false) }).safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please enter a comment.' } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const caller = c.get('user')
  const info = await db.prepare('INSERT INTO helpdesk_comments (request_id, employee_id, comment_by, comment, is_internal) VALUES (?,?,?,?,?)').bind(id, caller?.employee_id ?? null, caller?.name || caller?.email || 'Staff', d.comment, d.is_internal ? 1 : 0).run()
  await db.prepare('UPDATE hr_requests SET updated_at = datetime(\'now\') WHERE id = ?').bind(id).run()
  const row = await db.prepare('SELECT * FROM helpdesk_comments WHERE id = ?').bind(info.meta.last_row_id).first()
  return c.json({ data: row }, 201)
})
