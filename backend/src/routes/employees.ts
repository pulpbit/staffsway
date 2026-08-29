import { Hono } from 'hono'
import type { Context } from 'hono'
import { z } from 'zod'
import type { Env } from '../types'
import { getDb } from '../utils/db'
import { r2 } from '../utils/money'

const listSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'resigned', 'terminated', '']).optional(),
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
  father_name: z.string().max(100).optional().nullable(),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  dob: z.string().optional(),
  mobile: z.string().max(20).optional(),
  email: z.string().email().max(191).optional().or(z.literal('')),
  aadhaar: z.string().max(20).optional().nullable(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  pincode: z.string().max(10).optional(),
  emergency_contact_name: z.string().max(100).optional().nullable(),
  emergency_contact_phone: z.string().max(20).optional().nullable(),
  bank_name: z.string().max(100).optional(),
  bank_account: z.string().max(30).optional(),
  bank_ifsc: z.string().max(20).optional(),
  pan: z.string().max(20).optional(),
  uan: z.string().max(20).optional(),
  joining_date: z.string().optional(),
  designation: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  grade: z.string().max(50).optional().nullable(),
  reporting_manager: z.string().max(100).optional().nullable(),
  previous_employment: z.string().max(1000).optional().nullable(),
  employee_type: z.enum(['permanent', 'contract', 'temporary', 'probation']).optional(),
  shift_type: z.string().max(50).optional(),
  site_id: z.number().int().positive().optional().nullable(),
  status: z.enum(['active', 'inactive', 'resigned', 'terminated']).optional(),
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
  statutory: z
    .object({
      pf_applicable: z.boolean().optional(),
      esi_applicable: z.boolean().optional(),
      lwf_applicable: z.boolean().optional(),
      pt_applicable: z.boolean().optional(),
      tds_applicable: z.boolean().optional(),
    })
    .optional(),
}

const createSchema = z.object(employeeBase)
const updateSchema = z.object(employeeBase).partial()

const statutorySchema = z.object({
  pf_applicable: z.boolean(),
  esi_applicable: z.boolean(),
  lwf_applicable: z.boolean().optional(),
  pt_applicable: z.boolean().optional(),
  tds_applicable: z.boolean().optional(),
  lwf_state: z.string().max(100).optional().nullable(),
})

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
  const caller = c.get('user')
  if (caller.role === 'employee') {
    return c.json({ error: { code: 'forbidden', message: 'Employee logins can only view their own profile via My Space.' } }, 403)
  }
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
  const caller = c.get('user')
  if (caller.role === 'employee' && Number(caller.employee_id) !== id) {
    return c.json({ error: { code: 'forbidden', message: 'You can only view your own profile.' } }, 403)
  }
  const db = getDb(c.env)
  const employee = await db.prepare(`${employeeSelect} WHERE e.id = ?`).bind(id).first()
  if (!employee) return c.json({ error: { code: 'not_found', message: 'Employee not found.' } }, 404)
  const salary = await db.prepare('SELECT * FROM salary_structures WHERE employee_id = ? ORDER BY effective_from DESC LIMIT 1').bind(id).first()
  const statutory = await db.prepare('SELECT pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable, lwf_state FROM employee_statutory WHERE employee_id = ?').bind(id).first()
  const documents = await db.prepare('SELECT * FROM employee_documents WHERE employee_id = ? ORDER BY id').bind(id).all()
  const site = employee.site_id
    ? await db.prepare('SELECT s.*, c.name AS client_name FROM sites s LEFT JOIN clients c ON c.id = s.client_id WHERE s.id = ?').bind(employee.site_id).first()
    : null
  return c.json({ data: { ...(employee as object), salary: salary || null, statutory: statutory || null, documents: documents.results, site: site || null } })
})

employeeRoutes.get('/:id/statutory', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) return c.json({ error: { code: 'not_found', message: 'Employee not found.' } }, 404)
  const db = getDb(c.env)
  const row = await db.prepare('SELECT * FROM employee_statutory WHERE employee_id = ?').bind(id).first()
  if (!row) {
    // Sensible defaults when never configured: PT on (threshold-gated), everything else off
    return c.json({ data: { employee_id: id, pf_applicable: 0, esi_applicable: 0, lwf_applicable: 0, pt_applicable: 1, tds_applicable: 0, lwf_state: null } })
  }
  return c.json({ data: row })
})

employeeRoutes.put('/:id/statutory', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) return c.json({ error: { code: 'not_found', message: 'Employee not found.' } }, 404)
  const body = await c.req.json().catch(() => null)
  const parsed = statutorySchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const existing = await db.prepare('SELECT id FROM employees WHERE id = ?').bind(id).first()
  if (!existing) return c.json({ error: { code: 'not_found', message: 'Employee not found.' } }, 404)
  const b = (v: boolean | undefined, fallback = false) => (v === undefined ? (fallback ? 1 : 0) : v ? 1 : 0)
  await db
    .prepare(
      `INSERT INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable, lwf_state)
       VALUES (?,?,?,?,?,?,?)
       ON CONFLICT(employee_id) DO UPDATE SET
         pf_applicable = excluded.pf_applicable,
         esi_applicable = excluded.esi_applicable,
         lwf_applicable = excluded.lwf_applicable,
         pt_applicable = excluded.pt_applicable,
         tds_applicable = excluded.tds_applicable,
         lwf_state = excluded.lwf_state,
         updated_at = datetime('now')`
    )
    .bind(id, b(d.pf_applicable), b(d.esi_applicable), b(d.lwf_applicable), b(d.pt_applicable, true), b(d.tds_applicable), d.lwf_state ?? null)
    .run()
  const row = await db.prepare('SELECT pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable, lwf_state FROM employee_statutory WHERE employee_id = ?').bind(id).first()
  return c.json({ data: row, message: 'Statutory settings saved.' })
})

async function nextEmployeeCode(db: D1Database): Promise<string> {
  const row = await db.prepare('SELECT MAX(id) AS m FROM employees').first()
  return `SW${String((Number(row?.m) || 0) + 1).padStart(4, '0')}`
}

const documentCreateSchema = z.object({
  document_type: z.string().min(1).max(100),
  document_name: z.string().max(191).optional().nullable(),
  document_number: z.string().max(100).optional().nullable(),
})

employeeRoutes.post('/:id/documents', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) return c.json({ error: { code: 'not_found', message: 'Employee not found.' } }, 404)
  const body = await c.req.json().catch(() => null)
  const parsed = documentCreateSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const emp = await db.prepare('SELECT id FROM employees WHERE id = ?').bind(id).first()
  if (!emp) return c.json({ error: { code: 'not_found', message: 'Employee not found.' } }, 404)
  await db
    .prepare('INSERT INTO employee_documents (employee_id, document_type, document_name, document_number) VALUES (?,?,?,?)')
    .bind(id, d.document_type, d.document_name ?? null, d.document_number ?? null)
    .run()
  const documents = await db.prepare('SELECT * FROM employee_documents WHERE employee_id = ? ORDER BY id').bind(id).all()
  return c.json({ data: documents.results, message: 'Document added.' })
})

employeeRoutes.patch('/:id/documents/:docId/verify', async (c) => {
  const id = Number(c.req.param('id'))
  const docId = Number(c.req.param('docId'))
  const body = await c.req.json().catch(() => null)
  const parsed = z.object({ verified: z.boolean() }).safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Invalid input.' } }, 400)
  const db = getDb(c.env)
  const res = await db.prepare('UPDATE employee_documents SET verified = ? WHERE id = ? AND employee_id = ?').bind(parsed.data.verified ? 1 : 0, docId, id).run()
  if (!res.meta.changes) return c.json({ error: { code: 'not_found', message: 'Document not found.' } }, 404)
  const documents = await db.prepare('SELECT * FROM employee_documents WHERE employee_id = ? ORDER BY id').bind(id).all()
  return c.json({ data: documents.results, message: parsed.data.verified ? 'Document verified.' : 'Verification removed.' })
})

employeeRoutes.delete('/:id/documents/:docId', async (c) => {
  const id = Number(c.req.param('id'))
  const docId = Number(c.req.param('docId'))
  if (!Number.isInteger(id) || !Number.isInteger(docId)) return c.json({ error: { code: 'not_found', message: 'Document not found.' } }, 404)
  const db = getDb(c.env)
  const res = await db.prepare('DELETE FROM employee_documents WHERE id = ? AND employee_id = ?').bind(docId, id).run()
  if (!res.meta.changes) return c.json({ error: { code: 'not_found', message: 'Document not found.' } }, 404)
  const documents = await db.prepare('SELECT * FROM employee_documents WHERE employee_id = ? ORDER BY id').bind(id).all()
  return c.json({ data: documents.results, message: 'Document removed.' })
})

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
      `INSERT INTO employees (employee_code, first_name, last_name, father_name, gender, dob, mobile, email, aadhaar, address, city, state, pincode, emergency_contact_name, emergency_contact_phone, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, grade, reporting_manager, previous_employment, employee_type, shift_type, site_id, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(
      code, d.first_name, d.last_name, d.father_name ?? null, d.gender ?? null, d.dob ?? null, d.mobile ?? null, d.email || null,
      d.aadhaar ?? null,
      d.address ?? null, d.city ?? null, d.state ?? null, d.pincode ?? null,
      d.emergency_contact_name ?? null, d.emergency_contact_phone ?? null,
      d.bank_name ?? null, d.bank_account ?? null, d.bank_ifsc ?? null, d.pan ?? null, d.uan ?? null,
      d.joining_date ?? null, d.designation ?? null, d.department ?? null,
      d.grade ?? null, d.reporting_manager ?? null, d.previous_employment ?? null,
      d.employee_type ?? 'permanent',
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

  // Statutory applicability: per-employee, never assumed. Falls back to the
  // salary-structure PF/ESI flags for backwards compatibility with the demo UI.
  const st = d.statutory
  await db
    .prepare(
      `INSERT INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable)
       VALUES (?,?,?,?,?,?)`
    )
    .bind(
      employeeId,
      st?.pf_applicable === undefined ? (salary.pf_applicable === false ? 0 : 1) : st.pf_applicable ? 1 : 0,
      st?.esi_applicable === undefined ? (salary.esic_applicable === false ? 0 : 1) : st.esi_applicable ? 1 : 0,
      st?.lwf_applicable ? 1 : 0,
      st?.pt_applicable === false ? 0 : 1,
      st?.tds_applicable ? 1 : 0
    )
    .run()

  const created = await db.prepare(`${employeeSelect} WHERE e.id = ?`).bind(employeeId).first()
  return c.json({ data: created }, 201)
})

// ---------- Bulk import / upload (create or update employees from a file) ----------
const importRowSchema = z.object({ ...employeeBase, employee_code: z.string().max(20).optional() })

const importSchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())).min(1).max(2000),
})

const strVal = (v: unknown): string | undefined => {
  if (v === null || v === undefined) return undefined
  const s = String(v).trim()
  return s === '' ? undefined : s
}
const numVal = (v: unknown): number | undefined => {
  const s = strVal(v)
  if (s === undefined) return undefined
  const n = Number(s)
  return Number.isFinite(n) ? n : undefined
}
const boolVal = (v: unknown): boolean | undefined => {
  if (v === null || v === undefined || v === '') return undefined
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v === 1
  const s = String(v).trim().toLowerCase()
  if (['true', 'yes', 'y', '1'].includes(s)) return true
  if (['false', 'no', 'n', '0'].includes(s)) return false
  return undefined
}
const genderVal = (v: unknown): string | undefined => {
  const s = strVal(v)
  if (!s) return undefined
  const g = s.toLowerCase()
  if (g === 'male' || g === 'm') return 'Male'
  if (g === 'female' || g === 'f') return 'Female'
  if (g === 'other' || g === 'o') return 'Other'
  return s
}
const optionVal = (v: unknown, allowed: string[]): string | undefined => {
  const s = strVal(v)
  if (!s) return undefined
  return allowed.find((a) => a.toLowerCase() === s.toLowerCase()) ?? undefined
}

const IMPORT_STR_FIELDS = [
  'first_name', 'last_name', 'employee_code', 'father_name', 'dob', 'mobile', 'email', 'aadhaar',
  'address', 'city', 'state', 'pincode', 'emergency_contact_name', 'emergency_contact_phone',
  'bank_name', 'bank_account', 'bank_ifsc', 'pan', 'uan', 'joining_date', 'designation', 'department',
  'grade', 'reporting_manager', 'previous_employment', 'shift_type',
]
const IMPORT_SALARY_KEYS = ['basic', 'hra', 'conveyance', 'other_allowance', 'overtime_rate', 'other_deduction'] as const

function coerceImportRow(raw: Record<string, unknown>): Record<string, unknown> {
  const r: Record<string, unknown> = {}
  for (const k of IMPORT_STR_FIELDS) {
    const v = strVal(raw[k])
    if (v !== undefined) r[k] = v
  }
  const gender = genderVal(raw.gender)
  if (gender !== undefined) r.gender = gender
  const empType = optionVal(raw.employee_type, ['permanent', 'contract', 'temporary', 'probation'])
  if (empType !== undefined) r.employee_type = empType
  const status = optionVal(raw.status, ['active', 'inactive', 'resigned', 'terminated'])
  if (status !== undefined) r.status = status
  if ('site_id' in raw && raw.site_id !== null && raw.site_id !== undefined && raw.site_id !== '') {
    const n = numVal(raw.site_id)
    if (n !== undefined) r.site_id = n
  }

  const salarySrc = raw.salary && typeof raw.salary === 'object' ? (raw.salary as Record<string, unknown>) : raw
  const pfFlat = boolVal(salarySrc.pf_applicable)
  const esicFlat = boolVal(salarySrc.esic_applicable)
  const hasSalary =
    IMPORT_SALARY_KEYS.some((k) => numVal(salarySrc[k]) !== undefined) || pfFlat !== undefined || esicFlat !== undefined
  if (hasSalary) {
    r.salary = {
      basic: numVal(salarySrc.basic) ?? 0,
      hra: numVal(salarySrc.hra) ?? 0,
      conveyance: numVal(salarySrc.conveyance) ?? 0,
      other_allowance: numVal(salarySrc.other_allowance) ?? 0,
      overtime_rate: numVal(salarySrc.overtime_rate) ?? 0,
      pf_applicable: pfFlat,
      esic_applicable: esicFlat,
      other_deduction: numVal(salarySrc.other_deduction) ?? 0,
    }
  }

  const stSrc = raw.statutory && typeof raw.statutory === 'object' ? (raw.statutory as Record<string, unknown>) : raw
  const lwf = boolVal(stSrc.lwf_applicable)
  const pt = boolVal(stSrc.pt_applicable)
  const tds = boolVal(stSrc.tds_applicable)
  const hasStat = pfFlat !== undefined || esicFlat !== undefined || lwf !== undefined || pt !== undefined || tds !== undefined
  if (hasStat) {
    r.statutory = {
      pf_applicable: pfFlat,
      esi_applicable: esicFlat,
      lwf_applicable: lwf,
      pt_applicable: pt,
      tds_applicable: tds,
    }
  }
  return r
}

employeeRoutes.post('/import', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = importSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: { code: 'validation_error', message: 'Upload must contain at least one employee row.' } }, 400)
  }
  const db = getDb(c.env)
  const rowsIn = parsed.data.rows

  const existing = await db.prepare('SELECT id, employee_code, email FROM employees').all()
  const statutoryRows = await db
    .prepare('SELECT employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable, lwf_state FROM employee_statutory')
    .all()

  const codeIndex = new Map<string, { id: number }>()
  const emailIndex = new Map<string, { id: number }>()
  const takenCodes = new Set<string>()
  for (const e of existing.results as any[]) {
    if (e.employee_code) {
      const code = String(e.employee_code).toUpperCase()
      takenCodes.add(code)
      codeIndex.set(code, { id: Number(e.id) })
    }
    if (e.email) emailIndex.set(String(e.email).toLowerCase(), { id: Number(e.id) })
  }
  const statMap = new Map<number, any>()
  for (const s of statutoryRows.results as any[]) statMap.set(Number(s.employee_id), s)

  const seenEmpIds = new Set<number>()
  const seenCodes = new Set<string>()
  const seenEmails = new Set<string>()
  const errors: { row: number; message: string; fields?: Record<string, string[]> }[] = []
  let created = 0
  let updated = 0
  let skipped = 0
  let seq = Number((await db.prepare('SELECT MAX(id) AS m FROM employees').first())?.m || 0)

  const ops: D1PreparedStatement[] = []
  const MAX_BATCH = 60
  const flush = async () => {
    if (!ops.length) return
    await db.batch(ops.splice(0, Math.min(MAX_BATCH, ops.length)))
  }

  const today = new Date().toISOString().slice(0, 10)

  for (let i = 0; i < rowsIn.length; i++) {
    const rowNumber = i + 2
    const parsedRow = importRowSchema.safeParse(coerceImportRow((rowsIn[i] ?? {}) as Record<string, unknown>))
    if (!parsedRow.success) {
      skipped++
      errors.push({ row: rowNumber, message: 'Invalid data.', fields: parsedRow.error.flatten().fieldErrors })
      continue
    }
    const d = parsedRow.data

    const code = d.employee_code ? d.employee_code.toUpperCase() : undefined
    const email = d.email ? d.email.toLowerCase() : undefined

    if ((code && seenCodes.has(code)) || (email && seenEmails.has(email))) {
      skipped++
      errors.push({
        row: rowNumber,
        message: code && seenCodes.has(code) ? `Employee code "${code}" already used by an earlier row in the file.` : `Email "${d.email}" already used by an earlier row in the file.`,
      })
      continue
    }

    let target: { id: number } | undefined
    if (code) target = codeIndex.get(code)
    if (!target && email) target = emailIndex.get(email)

    if (target && seenEmpIds.has(target.id)) {
      skipped++
      errors.push({ row: rowNumber, message: 'This employee is already updated by an earlier row in the file.' })
      continue
    }
    if (target) seenEmpIds.add(target.id)
    if (code) seenCodes.add(code)
    if (email) seenEmails.add(email)

    const siteId = d.site_id ?? null

    if (!target) {
      seq += 1
      let newId = seq
      let newCode = code
      if (!newCode) {
        do { newCode = `SW${String(newId).padStart(4, '0')}`; newId += 1 } while (takenCodes.has(newCode) || seenCodes.has(newCode))
        seq = newId - 1
      }
      takenCodes.add(newCode)
      seenCodes.add(newCode)

      ops.push(
        db
          .prepare(
            `INSERT INTO employees (id, employee_code, first_name, last_name, father_name, gender, dob, mobile, email, aadhaar, address, city, state, pincode, emergency_contact_name, emergency_contact_phone, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, grade, reporting_manager, previous_employment, employee_type, shift_type, site_id, status)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
          )
          .bind(
            seq, newCode, d.first_name, d.last_name, d.father_name ?? null, d.gender ?? null, d.dob ?? null, d.mobile ?? null, d.email || null,
            d.aadhaar ?? null,
            d.address ?? null, d.city ?? null, d.state ?? null, d.pincode ?? null,
            d.emergency_contact_name ?? null, d.emergency_contact_phone ?? null,
            d.bank_name ?? null, d.bank_account ?? null, d.bank_ifsc ?? null, d.pan ?? null, d.uan ?? null,
            d.joining_date ?? null, d.designation ?? null, d.department ?? null,
            d.grade ?? null, d.reporting_manager ?? null, d.previous_employment ?? null,
            d.employee_type ?? 'permanent', d.shift_type ?? null, siteId, d.status ?? 'active'
          )
      )

      const sal = d.salary || { basic: 0 }
      ops.push(
        db
          .prepare(
            `INSERT INTO salary_structures (employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
             VALUES (?,?,?,?,?,?,?,?,?,?)`
          )
          .bind(
            seq, d.joining_date || today,
            sal.basic || 0, sal.hra || 0, sal.conveyance || 0, sal.other_allowance || 0,
            sal.overtime_rate || 0, sal.pf_applicable === false ? 0 : 1, sal.esic_applicable === false ? 0 : 1,
            sal.other_deduction || 0
          )
      )

      const st = d.statutory
      ops.push(
        db
          .prepare(
            `INSERT INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable)
             VALUES (?,?,?,?,?,?)`
          )
          .bind(
            seq,
            st?.pf_applicable === undefined ? (sal.pf_applicable === false ? 0 : 1) : st.pf_applicable ? 1 : 0,
            st?.esi_applicable === undefined ? (sal.esic_applicable === false ? 0 : 1) : st.esi_applicable ? 1 : 0,
            st?.lwf_applicable ? 1 : 0,
            st?.pt_applicable === false ? 0 : 1,
            st?.tds_applicable ? 1 : 0
          )
      )
      created++
    } else {
      const fields = [
        'first_name', 'last_name', 'father_name', 'gender', 'dob', 'mobile', 'email', 'aadhaar',
        'address', 'city', 'state', 'pincode', 'emergency_contact_name', 'emergency_contact_phone',
        'bank_name', 'bank_account', 'bank_ifsc', 'pan', 'uan', 'joining_date', 'designation', 'department',
        'grade', 'reporting_manager', 'previous_employment', 'employee_type', 'shift_type', 'status',
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
        params.push(siteId)
      }
      if (sets.length) {
        sets.push('updated_at = datetime(\'now\')')
        params.push(target.id)
        ops.push(db.prepare(`UPDATE employees SET ${sets.join(', ')} WHERE id = ?`).bind(...params))
      }

      if (d.salary) {
        const s = d.salary
        ops.push(
          db
            .prepare(
              `INSERT INTO salary_structures (employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
               VALUES (?,?,?,?,?,?,?,?,?,?)`
            )
            .bind(
              target.id, d.joining_date || today,
              s.basic || 0, s.hra || 0, s.conveyance || 0, s.other_allowance || 0,
              s.overtime_rate || 0, s.pf_applicable === false ? 0 : 1, s.esic_applicable === false ? 0 : 1,
              s.other_deduction || 0
            )
        )
      }

      if (d.statutory) {
        const st = d.statutory
        const cur = statMap.get(target.id)
        const curV = (k: string, fallback: number) => (cur && cur[k] !== undefined && cur[k] !== null ? Number(cur[k]) : fallback)
        ops.push(
          db
            .prepare(
              `INSERT INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable, lwf_state)
               VALUES (?,?,?,?,?,?,?)
               ON CONFLICT(employee_id) DO UPDATE SET
                 pf_applicable = excluded.pf_applicable,
                 esi_applicable = excluded.esi_applicable,
                 lwf_applicable = excluded.lwf_applicable,
                 pt_applicable = excluded.pt_applicable,
                 tds_applicable = excluded.tds_applicable,
                 updated_at = datetime('now')`
            )
            .bind(
              target.id,
              st.pf_applicable !== undefined ? (st.pf_applicable ? 1 : 0) : curV('pf_applicable', 0),
              st.esi_applicable !== undefined ? (st.esi_applicable ? 1 : 0) : curV('esi_applicable', 0),
              st.lwf_applicable !== undefined ? (st.lwf_applicable ? 1 : 0) : curV('lwf_applicable', 0),
              st.pt_applicable !== undefined ? (st.pt_applicable ? 1 : 0) : curV('pt_applicable', 1),
              st.tds_applicable !== undefined ? (st.tds_applicable ? 1 : 0) : curV('tds_applicable', 0),
              cur?.lwf_state ?? null
            )
        )
      }
      updated++
    }

    if (ops.length >= MAX_BATCH) await flush()
  }

  await flush()

  return c.json({
    data: { total: rowsIn.length, created, updated, skipped, errors },
    message: `Imported ${created} employee${created === 1 ? '' : 's'} and updated ${updated} record${updated === 1 ? '' : 's'}.`,
  })
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
    'first_name', 'last_name', 'father_name', 'gender', 'dob', 'mobile', 'email', 'aadhaar',
    'address', 'city', 'state', 'pincode', 'emergency_contact_name', 'emergency_contact_phone',
    'bank_name', 'bank_account', 'bank_ifsc', 'pan', 'uan', 'joining_date', 'designation', 'department',
    'grade', 'reporting_manager', 'previous_employment',
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

// ---------- Salary revision / increment / promotion ----------
const revisionSchema = z.object({
  effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.enum(['increment', 'promotion', 'revision', 'correction']),
  basic: z.number().min(0),
  hra: z.number().min(0).default(0),
  conveyance: z.number().min(0).default(0),
  other_allowance: z.number().min(0).default(0),
  overtime_rate: z.number().min(0).default(0),
  designation: z.string().max(100).optional(),
  remarks: z.string().max(500).optional(),
})

employeeRoutes.get('/:id/revisions', async (c) => {
  const id = Number(c.req.param('id'))
  const db = getDb(c.env)
  const rows = await db
    .prepare(`SELECT * FROM salary_revisions WHERE employee_id = ? ORDER BY effective_from DESC, id DESC`)
    .bind(id)
    .all()
  return c.json({ data: rows.results })
})

employeeRoutes.post('/:id/revision', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => null)
  const parsed = revisionSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const emp = await db.prepare('SELECT id FROM employees WHERE id = ?').bind(id).first()
  if (!emp) return c.json({ error: { code: 'not_found', message: 'Employee not found.' } }, 404)

  const oldStruct: any = await db
    .prepare(`SELECT * FROM salary_structures WHERE employee_id = ? ORDER BY effective_from DESC, id DESC LIMIT 1`)
    .bind(id)
    .first()
  if (!oldStruct) return c.json({ error: { code: 'not_found', message: 'Employee has no salary structure yet.' } }, 404)

  const oldGross = Number(oldStruct.basic || 0) + Number(oldStruct.hra || 0) + Number(oldStruct.conveyance || 0) + Number(oldStruct.other_allowance || 0)
  const newGross = r2(d.basic + d.hra + d.conveyance + d.other_allowance)

  const ops: D1PreparedStatement[] = [
    db
      .prepare(
        `INSERT INTO salary_structures (employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
         VALUES (?,?,?,?,?,?,?,?,?,?)`
      )
      .bind(id, d.effective_from, r2(d.basic), r2(d.hra), r2(d.conveyance), r2(d.other_allowance), r2(d.overtime_rate), Number(oldStruct.pf_applicable ?? 1), Number(oldStruct.esic_applicable ?? 1), Number(oldStruct.other_deduction || 0)),
    db
      .prepare(
        `INSERT INTO salary_revisions (employee_id, effective_from, reason, old_basic, new_basic, old_gross, new_gross, designation, remarks, created_by)
         VALUES (?,?,?,?,?,?,?,?,?,?)`
      )
      .bind(
        id,
        d.effective_from,
        d.reason,
        Number(oldStruct.basic || 0),
        r2(d.basic),
        oldGross,
        newGross,
        d.designation ?? null,
        d.remarks ?? null,
        c.get('user')?.email ?? null
      ),
  ]
  if (d.designation) {
    ops.push(db.prepare(`UPDATE employees SET designation = ?, updated_at = datetime('now') WHERE id = ?`).bind(d.designation, id))
  }
  await db.batch(ops)

  const updated = await db.prepare(`${employeeSelect} WHERE e.id = ?`).bind(id).first()
  return c.json({ data: updated, message: `Salary revised (${d.reason}) from ${d.effective_from}.` }, 201)
})

employeeRoutes.patch('/:id/status', async (c) => {  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => null)
  const parsed = z.object({ status: z.enum(['active', 'inactive', 'resigned', 'terminated']) }).safeParse(body)
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
