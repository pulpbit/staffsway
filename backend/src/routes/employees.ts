import { Hono } from 'hono'
import type { Context } from 'hono'
import { z } from 'zod'
import type { Env } from '../types'
import { getDb } from '../utils/db'

const listSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', '']).optional(),
  client_id: z.string().optional(),
  site_id: z.string().optional(),
  designation: z.string().optional(),
  department: z.string().optional(),
  employee_type: z.string().optional(),
  shift_type: z.string().optional(),
  sort: z.enum(['name', 'code', 'joining', 'status']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  page: z.string().regex(/^\d+$/).optional(),
  page_size: z.string().regex(/^\d+$/).optional(),
})

const employeeBase = {
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  dob: z.string().optional(),
  mobile: z.string().max(20).optional(),
  email: z.string().email().max(191).optional().or(z.literal('')),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  pincode: z.string().max(10).optional(),
  bank_name: z.string().max(100).optional(),
  bank_account: z.string().max(30).optional(),
  bank_ifsc: z.string().max(20).optional(),
  pan: z.string().max(20).optional(),
  uan: z.string().max(20).optional(),
  joining_date: z.string().optional(),
  designation: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  employee_type: z.enum(['permanent', 'contract', 'temporary', 'probation']).optional(),
  shift_type: z.string().max(50).optional(),
  site_id: z.number().int().positive().optional().nullable(),
  status: z.enum(['active', 'inactive']).optional(),
  salary: z
    .object({
      basic: z.number().min(0),
      hra: z.number().min(0).optional(),
      conveyance: z.number().min(0).optional(),
      other_allowance: z.number().min(0).optional(),
      overtime_rate: z.number().min(0).optional(),
      pf_applicable: z.boolean().optional(),
      esic_applicable: z.boolean().optional(),
      other_deduction: z.number().min(0).optional(),
    })
    .optional(),
}

const createSchema = z.object(employeeBase)
const updateSchema = z.object(employeeBase).partial()

export const employeeRoutes = new Hono<{ Bindings: Env }>()

const employeeSelect = `
  SELECT e.*,
    s.name AS site_name, s.location AS site_location, s.client_id AS client_id,
    c.name AS client_name
  FROM employees e
  LEFT JOIN sites s ON s.id = e.site_id
  LEFT JOIN clients c ON c.id = s.client_id`

async function buildWhere(c: Context<{ Bindings: Env }>) {
  const query = c.req.query()
  const parsed = listSchema.safeParse(query)
  const conditions: string[] = []
  const params: (string | number)[] = []
  if (!parsed.success) return { ok: false as const, error: parsed.error }
  const f = parsed.data
  if (f.search) {
    const term = `%${f.search}%`
    conditions.push('(e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_code LIKE ? OR e.email LIKE ? OR e.mobile LIKE ?)')
    params.push(term, term, term, term, term)
  }
  if (f.status) { conditions.push('e.status = ?'); params.push(f.status) }
  if (f.client_id && f.client_id !== '') { conditions.push('c.id = ?'); params.push(Number(f.client_id)) }
  if (f.site_id && f.site_id !== '') { conditions.push('e.site_id = ?'); params.push(Number(f.site_id)) }
  if (f.designation && f.designation !== '') { conditions.push('e.designation = ?'); params.push(f.designation) }
  if (f.department && f.department !== '') { conditions.push('e.department = ?'); params.push(f.department) }
  if (f.employee_type && f.employee_type !== '') { conditions.push('e.employee_type = ?'); params.push(f.employee_type) }
  if (f.shift_type && f.shift_type !== '') { conditions.push('e.shift_type = ?'); params.push(f.shift_type) }
  return { ok: true as const, conditions, params, filters: f }
}

employeeRoutes.get('/', async (c) => {
  const w = await buildWhere(c)
  if (!w.ok) return c.json({ error: { code: 'validation_error', message: 'Invalid query parameters.' } }, 400)
  const { conditions, params, filters } = w

  const sortCol = { name: 'e.first_name', code: 'e.employee_code', joining: 'e.joining_date', status: 'e.status' }[filters.sort || 'name']
  const order = filters.order === 'desc' ? 'DESC' : 'ASC'
  const page = Math.max(1, Number(filters.page || 1))
  const pageSize = Math.min(100, Math.max(1, Number(filters.page_size || 10)))

  const whereSql = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : ''
  const countRow = await getDb(c.env)
    .prepare(`SELECT COUNT(*) AS total FROM employees e LEFT JOIN sites s ON s.id = e.site_id LEFT JOIN clients c ON c.id = s.client_id${whereSql}`)
    .bind(...params)
    .first()
  const total = Number(countRow?.total || 0)

  const rows = await getDb(c.env)
    .prepare(`${employeeSelect}${whereSql} ORDER BY ${sortCol} ${order}, e.id ASC LIMIT ? OFFSET ?`)
    .bind(...params, pageSize, (page - 1) * pageSize)
    .all()

  return c.json({
    data: rows.results,
    meta: { total, page, page_size: pageSize, total_pages: Math.ceil(total / pageSize) },
  })
})

employeeRoutes.get('/filters', async (c) => {
  const db = getDb(c.env)
  const designations = await db.prepare('SELECT DISTINCT designation FROM employees WHERE designation IS NOT NULL ORDER BY designation').all()
  const departments = await db.prepare('SELECT DISTINCT department FROM employees WHERE department IS NOT NULL ORDER BY department').all()
  const employeeTypes = await db.prepare('SELECT DISTINCT employee_type FROM employees ORDER BY employee_type').all()
  const shiftTypes = await db.prepare('SELECT DISTINCT shift_type FROM employees WHERE shift_type IS NOT NULL ORDER BY shift_type').all()
  return c.json({
    data: {
      designations: designations.results.map((r: any) => r.designation),
      departments: departments.results.map((r: any) => r.department),
      employee_types: employeeTypes.results.map((r: any) => r.employee_type),
      shift_types: shiftTypes.results.map((r: any) => r.shift_type),
    },
  })
})

employeeRoutes.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) return c.json({ error: { code: 'not_found', message: 'Employee not found.' } }, 404)
  const db = getDb(c.env)
  const employee = await db.prepare(`${employeeSelect} WHERE e.id = ?`).bind(id).first()
  if (!employee) return c.json({ error: { code: 'not_found', message: 'Employee not found.' } }, 404)
  const salary = await db.prepare('SELECT * FROM salary_structures WHERE employee_id = ? ORDER BY effective_from DESC LIMIT 1').bind(id).first()
  const documents = await db.prepare('SELECT * FROM employee_documents WHERE employee_id = ? ORDER BY id').bind(id).all()
  const site = employee.site_id
    ? await db.prepare('SELECT s.*, c.name AS client_name FROM sites s LEFT JOIN clients c ON c.id = s.client_id WHERE s.id = ?').bind(employee.site_id).first()
    : null
  return c.json({ data: { ...(employee as object), salary: salary || null, documents: documents.results, site: site || null } })
})

async function nextEmployeeCode(db: D1Database): Promise<string> {
  const row = await db.prepare('SELECT MAX(id) AS m FROM employees').first()
  return `PWS${String((Number(row?.m) || 0) + 1).padStart(4, '0')}`
}

employeeRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  }
  const d = parsed.data
  const db = getDb(c.env)
  const code = await nextEmployeeCode(db)

  // Reject duplicate email
  if (d.email) {
    const dup = await db.prepare('SELECT id FROM employees WHERE email = ?').bind(d.email).first()
    if (dup) return c.json({ error: { code: 'conflict', message: 'An employee with this email already exists.' } }, 409)
  }

  const siteId = d.site_id ?? null
  const info = await db
    .prepare(
      `INSERT INTO employees (employee_code, first_name, last_name, gender, dob, mobile, email, address, city, state, pincode, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, employee_type, shift_type, site_id, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .bind(
      code, d.first_name, d.last_name, d.gender ?? null, d.dob ?? null, d.mobile ?? null, d.email || null,
      d.address ?? null, d.city ?? null, d.state ?? null, d.pincode ?? null,
      d.bank_name ?? null, d.bank_account ?? null, d.bank_ifsc ?? null, d.pan ?? null, d.uan ?? null,
      d.joining_date ?? null, d.designation ?? null, d.department ?? null, d.employee_type ?? 'permanent',
      d.shift_type ?? null, siteId, d.status ?? 'active'
    )
    .run()

  const employeeId = Number(info.meta.last_row_id)
  const salary = d.salary || { basic: 0 }
  await db
    .prepare(
      `INSERT INTO salary_structures (employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
       VALUES (?,?,?,?,?,?,?,?,?,?)`
    )
    .bind(
      employeeId, d.joining_date || new Date().toISOString().slice(0, 10),
      salary.basic || 0, salary.hra || 0, salary.conveyance || 0, salary.other_allowance || 0,
      salary.overtime_rate || 0, salary.pf_applicable === false ? 0 : 1, salary.esic_applicable === false ? 0 : 1,
      salary.other_deduction || 0
    )
    .run()

  const created = await db.prepare(`${employeeSelect} WHERE e.id = ?`).bind(employeeId).first()
  return c.json({ data: created }, 201)
})

employeeRoutes.put('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) return c.json({ error: { code: 'not_found', message: 'Employee not found.' } }, 404)
  const body = await c.req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  }
  const d = parsed.data
  const db = getDb(c.env)

  const existing = await db.prepare('SELECT id FROM employees WHERE id = ?').bind(id).first()
  if (!existing) return c.json({ error: { code: 'not_found', message: 'Employee not found.' } }, 404)

  if (d.email) {
    const dup = await db.prepare('SELECT id FROM employees WHERE email = ? AND id != ?').bind(d.email, id).first()
    if (dup) return c.json({ error: { code: 'conflict', message: 'An employee with this email already exists.' } }, 409)
  }

  const fields = [
    'first_name', 'last_name', 'gender', 'dob', 'mobile', 'email', 'address', 'city', 'state', 'pincode',
    'bank_name', 'bank_account', 'bank_ifsc', 'pan', 'uan', 'joining_date', 'designation', 'department',
    'employee_type', 'shift_type', 'status',
  ] as const
  const sets: string[] = []
  const params: (string | number | null)[] = []
  for (const f of fields) {
    if (f in d && d[f as keyof typeof d] !== undefined) {
      sets.push(`${f} = ?`)
      params.push(d[f as keyof typeof d] as string | number | null)
    }
  }
  if ('site_id' in d && d.site_id !== undefined) {
    sets.push('site_id = ?')
    params.push(d.site_id ?? null)
  }
  sets.push('updated_at = datetime(\'now\')')
  params.push(id)
  if (sets.length) {
    await db.prepare(`UPDATE employees SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run()
  }

  if (d.salary) {
    const s = d.salary
    await db
      .prepare(
        `INSERT INTO salary_structures (employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
         VALUES (?,?,?,?,?,?,?,?,?,?)`
      )
      .bind(
        id, d.joining_date || new Date().toISOString().slice(0, 10),
        s.basic || 0, s.hra || 0, s.conveyance || 0, s.other_allowance || 0,
        s.overtime_rate || 0, s.pf_applicable === false ? 0 : 1, s.esic_applicable === false ? 0 : 1, s.other_deduction || 0
      )
      .run()
  }

  const updated = await db.prepare(`${employeeSelect} WHERE e.id = ?`).bind(id).first()
  return c.json({ data: updated })
})

employeeRoutes.patch('/:id/status', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => null)
  const parsed = z.object({ status: z.enum(['active', 'inactive']) }).safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Invalid status.' } }, 400)
  const db = getDb(c.env)
  const res = await db.prepare('UPDATE employees SET status = ?, updated_at = datetime(\'now\') WHERE id = ?').bind(parsed.data.status, id).run()
  if (!res.meta.changes) return c.json({ error: { code: 'not_found', message: 'Employee not found.' } }, 404)
  const updated = await db.prepare(`${employeeSelect} WHERE e.id = ?`).bind(id).first()
  return c.json({ data: updated })
})

employeeRoutes.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const db = getDb(c.env)
  const res = await db.prepare('DELETE FROM employees WHERE id = ?').bind(id).run()
  if (!res.meta.changes) return c.json({ error: { code: 'not_found', message: 'Employee not found.' } }, 404)
  return c.json({ data: { ok: true } })
})
