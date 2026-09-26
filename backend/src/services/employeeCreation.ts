import { nextEmployeeCode } from '../utils/employeeCode'
import { normalizeAadhaar } from '../utils/aadhaar'

/**
 * Single writer for the `employees` record and everything that hangs off it.
 *
 * WHY: employee creation used to be duplicated in two places with very
 * different results.
 *   - routes/employees.ts  POST /            -> 44 columns, documents, real
 *                                                 statutory flags
 *   - routes/recruitment.ts POST /:id/join   -> 12 columns, no documents,
 *                                                 hard-coded
 *                                                 employee_type='permanent'
 *                                                 and pf/esi/pt=1
 * Any referrer intake that creates people must produce the SAME record as the
 * Employee Master form, so all three paths now call this module.
 *
 * Validation deliberately does NOT live here: each caller has a different
 * Zod schema (admin form, public application, recruitment join). This module
 * accepts an already-validated payload and owns the invariants that must hold
 * no matter who is calling.
 */

export class EmployeeConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EmployeeConflictError'
  }
}

export interface SalaryInput {
  basic: number
  hra?: number
  conveyance?: number
  other_allowance?: number
  other_allowance_label?: string | null
  overtime_rate?: number
  working_hours?: number
  pf_applicable?: boolean
  esic_applicable?: boolean
  other_deduction?: number
}

export interface StatutoryInput {
  pf_applicable?: boolean
  // Named esi_* here, not esic_*, to match the employee_statutory column and
  // the existing employeeBase statutory schema. The salary_structures block
  // uses esic_applicable; the two spellings are inherited from the schema and
  // are deliberately not unified here.
  esi_applicable?: boolean
  lwf_applicable?: boolean
  pt_applicable?: boolean
  tds_applicable?: boolean
}

export interface NomineeInput {
  name?: string
  relation?: string | null
  share?: number
  contact?: string | null
}

export interface EmployeeCreateInput {
  full_name: string
  father_name?: string | null
  spouse_name?: string | null
  gender?: 'Male' | 'Female' | 'Other' | null
  dob?: string | null
  marital_status?: 'Single' | 'Married' | 'Divorced' | 'Widowed' | null
  nationality?: string | null
  mobile?: string | null
  alternate_mobile?: string | null
  email?: string | null
  aadhaar?: string | null
  address?: string | null
  state?: string | null
  district?: string | null
  pincode?: string | null
  permanent_same_as_present?: boolean
  permanent_address?: string | null
  permanent_state?: string | null
  permanent_district?: string | null
  permanent_pincode?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  emergency_contact_relation?: string | null
  bank_name?: string | null
  bank_holder_name?: string | null
  bank_account?: string | null
  bank_ifsc?: string | null
  pan?: string | null
  uan?: string | null
  esi_number?: string | null
  ctc?: number | null
  joining_date?: string | null
  designation?: string | null
  department?: string | null
  grade?: string | null
  reporting_manager?: string | null
  previous_employment?: string | null
  employee_type?: 'permanent' | 'contract' | 'daily_wages' | null
  shift_type?: string | null
  working_days_week?: number | null
  notice_period_days?: number | null
  site_id?: number | null
  status?: 'active' | 'inactive' | null
  salary?: SalaryInput
  statutory?: StatutoryInput
  nominee?: NomineeInput | null
  // Provenance. 'referrer' is set when the record came from a public referrer
  // registration; the FKs keep the trail back to the referrer and the reviewed
  // application.
  source?: 'direct' | 'recruitment' | 'referrer' | null
  referrer_id?: number | null
  referrer_application_id?: number | null
  // Escape hatch for the onboarding checklist: a direct hire and a
  // referrer-registered worker need different paperwork.
  onboarding_tasks?: string[] | null
  employee_code?: string
}

export function splitName(full: string): { first: string; last: string } {
  const parts = (full || '').trim().split(/\s+/).filter(Boolean)
  return { first: parts[0] || '', last: parts.slice(1).join(' ') }
}

const DIRECT_HIRE_CHECKLIST = [
  'Appointment letter issued & signed',
  'Joining form completed',
  'Aadhaar card collected',
  'PAN card collected',
  'Bank account details recorded',
  'Police verification / background check',
  'Uniform & ID card issued',
  'ESIC / UAN registration initiated',
]

// A worker registered through a referrer has no appointment letter from us. The
// paperwork that actually applies is confirmation from the referrer that they
// brought this person in, plus the statutory registration for the worker.
const REFERRER_CHECKLIST = [
  'Referrer confirmation collected',
  'Aadhaar card collected',
  'PAN card collected',
  'Bank account details recorded',
  'Police verification / background check',
  'Uniform & ID card issued',
  'ESIC / UAN registration initiated',
  'Referrer contact details on file',
]

export function onboardingChecklistFor(source?: string | null): string[] {
  return source === 'referrer' ? [...REFERRER_CHECKLIST] : [...DIRECT_HIRE_CHECKLIST]
}

/**
 * Keeps employee_documents in step with the aadhaar/pan on the employee row.
 * Present value -> create/update; explicit null -> remove; absent -> untouched.
 */
export async function syncIdentityDocuments(
  db: D1Database,
  employeeId: number,
  aadhaar?: string | null,
  pan?: string | null
): Promise<void> {
  const syncOne = async (type: string, value?: string | null) => {
    const num = value ? String(value).trim() : ''
    if (num) {
      const existing = await db
        .prepare('SELECT id FROM employee_documents WHERE employee_id = ? AND document_type = ? LIMIT 1')
        .bind(employeeId, type)
        .first()
      if (existing) {
        await db
          .prepare("UPDATE employee_documents SET document_number = ?, updated_at = datetime('now') WHERE id = ? AND employee_id = ?")
          .bind(num, Number(existing.id), employeeId)
          .run()
      } else {
        await db
          .prepare('INSERT INTO employee_documents (employee_id, document_type, document_number) VALUES (?,?,?)')
          .bind(employeeId, type, num)
          .run()
      }
    } else if (value === null) {
      await db
        .prepare('DELETE FROM employee_documents WHERE employee_id = ? AND document_type = ?')
        .bind(employeeId, type)
        .run()
    }
  }
  await syncOne('Aadhaar Card', aadhaar)
  await syncOne('PAN Card', pan)
}

/**
 * Creates the employee plus its salary structure, statutory row, nominee and
 * identity documents. Returns the new employee id.
 *
 * Throws EmployeeConflictError for a duplicate email or Aadhaar so callers can
 * map it to a 409 without repeating the lookup.
 *
 * PARTIAL-TRANSACTION NOTE: D1's batch() cannot be used for the whole unit
 * because every dependent row needs the id produced by the INSERT. The INSERT
 * therefore runs alone; everything that depends on the id is then committed in
 * a single batch, so a failure cannot leave an employee with a salary row but
 * no statutory row. An orphaned employee (insert succeeded, batch failed) is
 * still theoretically possible and is logged loudly.
 */
export async function createEmployee(db: D1Database, input: EmployeeCreateInput): Promise<number> {
  const d = input
  const siteId = d.site_id ?? null
  const aadhaar = d.aadhaar ? normalizeAadhaar(d.aadhaar) || null : null
  const email = d.email ? String(d.email).trim() : ''

  if (email) {
    const dup = await db.prepare('SELECT id FROM employees WHERE email = ?').bind(email).first()
    if (dup) throw new EmployeeConflictError('An employee with this email already exists.')
  }
  if (aadhaar) {
    const dup = await db.prepare('SELECT id FROM employees WHERE aadhaar = ?').bind(aadhaar).first()
    if (dup) throw new EmployeeConflictError('An employee with this Aadhaar already exists.')
  }

  const code = d.employee_code || (await nextEmployeeCode(db, siteId))
  const { first, last } = splitName(d.full_name)
  const source = d.source ?? 'direct'

  // Column order here IS the bind order below. The placeholder list is derived
  // from this array rather than hand-written, because a hand-written VALUES
  // clause silently drifts when a column is added and only fails at runtime
  // with "N values for M columns".
  const EMPLOYEE_COLUMNS = [
    'employee_code', 'first_name', 'last_name', 'father_name', 'spouse_name', 'gender', 'dob',
    'marital_status', 'nationality', 'mobile', 'alternate_mobile', 'email', 'aadhaar', 'address',
    'state', 'district', 'pincode', 'permanent_same_as_present', 'permanent_address',
    'permanent_state', 'permanent_district', 'permanent_pincode', 'emergency_contact_name',
    'emergency_contact_phone', 'emergency_contact_relation', 'bank_name', 'bank_holder_name',
    'bank_account', 'bank_ifsc', 'pan', 'uan', 'esi_number', 'ctc', 'joining_date', 'designation',
    'department', 'grade', 'reporting_manager', 'previous_employment', 'employee_type', 'shift_type',
    'working_days_week', 'notice_period_days', 'site_id', 'status', 'source', 'referrer_id',
    'referrer_application_id',
  ] as const

  // Same order as EMPLOYEE_COLUMNS. Keep the two lists aligned.
  const values = [
    code, first, last, d.father_name ?? null, d.spouse_name ?? null, d.gender ?? null, d.dob ?? null,
    d.marital_status ?? null, d.nationality ?? 'Indian',
    d.mobile ?? null, d.alternate_mobile ?? null, email || null,
    aadhaar,
    d.address ?? null, d.state ?? null, d.district ?? null, d.pincode ?? null,
    d.permanent_same_as_present ? 1 : 0,
    d.permanent_address ?? null, d.permanent_state ?? null, d.permanent_district ?? null, d.permanent_pincode ?? null,
    d.emergency_contact_name ?? null, d.emergency_contact_phone ?? null, d.emergency_contact_relation ?? null,
    d.bank_name ?? null, d.bank_holder_name ?? null, d.bank_account ?? null, d.bank_ifsc ?? null,
    d.pan ?? null, d.uan ?? null, d.esi_number ?? null, d.ctc ?? null,
    d.joining_date ?? null, d.designation ?? null, d.department ?? null,
    d.grade ?? null, d.reporting_manager ?? null, d.previous_employment ?? null,
    d.employee_type ?? 'permanent',
    d.shift_type ?? 'General', d.working_days_week ?? 6, d.notice_period_days ?? null,
    siteId, d.status ?? 'active',
    source, d.referrer_id ?? null, d.referrer_application_id ?? null,
  ]

  if (values.length !== EMPLOYEE_COLUMNS.length) {
    throw new Error(
      `employeeCreation: ${values.length} values for ${EMPLOYEE_COLUMNS.length} columns — the lists above are out of sync.`
    )
  }

  const info = await db
    .prepare(
      `INSERT INTO employees (${EMPLOYEE_COLUMNS.join(', ')}) VALUES (${EMPLOYEE_COLUMNS.map(() => '?').join(',')})`
    )
    .bind(...values)
    .run()

  const employeeId = Number(info.meta.last_row_id)
  const salary = d.salary || { basic: 0 }
  const st = d.statutory
  const tasks = d.onboarding_tasks ?? (source === 'referrer' ? onboardingChecklistFor(source) : null)

  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        `INSERT INTO salary_structures (employee_id, effective_from, basic, hra, conveyance, other_allowance, other_allowance_label, overtime_rate, working_hours, pf_applicable, esic_applicable, other_deduction)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
      )
      .bind(
        employeeId,
        d.joining_date || new Date().toISOString().slice(0, 10),
        salary.basic || 0, salary.hra || 0, salary.conveyance || 0, salary.other_allowance || 0,
        salary.other_allowance_label ?? null,
        salary.overtime_rate || 0, salary.working_hours || 8,
        salary.pf_applicable === false ? 0 : 1, salary.esic_applicable === false ? 0 : 1,
        salary.other_deduction || 0
      ),
    // Statutory applicability is per-employee and never assumed. Falls back to
    // the salary-structure flags for callers that do not supply the block.
    db
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
      ),
  ]

  if (d.nominee?.name) {
    statements.push(
      db
        .prepare('INSERT INTO employee_nominees (employee_id, name, relation, share, contact) VALUES (?,?,?,?,?)')
        .bind(employeeId, d.nominee.name, d.nominee.relation ?? null, d.nominee.share ?? 0, d.nominee.contact ?? null)
    )
  }

  if (aadhaar) {
    statements.push(
      db
        .prepare('INSERT INTO employee_documents (employee_id, document_type, document_number) VALUES (?,?,?)')
        .bind(employeeId, 'Aadhaar Card', aadhaar)
    )
  }
  if (d.pan && String(d.pan).trim()) {
    statements.push(
      db
        .prepare('INSERT INTO employee_documents (employee_id, document_type, document_number) VALUES (?,?,?)')
        .bind(employeeId, 'PAN Card', String(d.pan).trim())
    )
  }

  for (const task of tasks ?? []) {
    statements.push(
      db
        .prepare('INSERT INTO onboarding_tasks (employee_id, task) VALUES (?,?)')
        .bind(employeeId, task)
    )
  }

  try {
    await db.batch(statements)
  } catch (err) {
    console.error(`[createEmployee] dependent rows failed for employee ${employeeId} (${code})`, err)
    throw err
  }

  return employeeId
}
