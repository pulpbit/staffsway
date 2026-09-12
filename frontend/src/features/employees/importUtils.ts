import Papa from 'papaparse'
import { downloadCsv } from '@/utils/csv'

export interface ImportColumn {
  key: string
  label: string
  type: 'text' | 'date' | 'number' | 'enum' | 'bool'
  required?: boolean
  options?: string[]
  hint?: string
}

export interface SiteRef {
  id: number
  name: string
}

export interface ParsedRow {
  rowNumber: number
  valid: boolean
  name: string
  employeeCode?: string
  email?: string
  error?: string
  payload?: Record<string, unknown>
}

export const IMPORT_COLUMNS: ImportColumn[] = [
  { key: 'full_name', label: 'full_name', type: 'text', required: true, hint: 'Required' },
  { key: 'first_name', label: 'first_name', type: 'text', hint: 'Legacy: used only when full_name is left blank' },
  { key: 'last_name', label: 'last_name', type: 'text', hint: 'Legacy: used only when full_name is left blank' },
  { key: 'employee_code', label: 'employee_code', type: 'text', hint: 'Leave blank to auto-generate. Provide an existing code to update that employee.' },
  { key: 'father_name', label: 'father_name', type: 'text', hint: 'Father / Husband name' },
  { key: 'gender', label: 'gender', type: 'enum', options: ['Male', 'Female', 'Other'] },
  { key: 'dob', label: 'dob', type: 'date', hint: 'YYYY-MM-DD' },
  { key: 'mobile', label: 'mobile', type: 'text' },
  { key: 'email', label: 'email', type: 'text', hint: 'Used to match an existing employee if no employee_code is given' },
  { key: 'aadhaar', label: 'aadhaar', type: 'text', hint: 'Aadhaar number (12 digits)' },
  { key: 'address', label: 'address', type: 'text' },
  { key: 'state', label: 'state', type: 'text' },
  { key: 'pincode', label: 'pincode', type: 'text' },
  { key: 'emergency_contact_name', label: 'emergency_contact_name', type: 'text' },
  { key: 'emergency_contact_phone', label: 'emergency_contact_phone', type: 'text' },
  { key: 'bank_name', label: 'bank_name', type: 'text' },
  { key: 'bank_account', label: 'bank_account', type: 'text' },
  { key: 'bank_ifsc', label: 'bank_ifsc', type: 'text' },
  { key: 'pan', label: 'pan', type: 'text' },
  { key: 'uan', label: 'uan', type: 'text' },
  { key: 'joining_date', label: 'joining_date', type: 'date', hint: 'YYYY-MM-DD' },
  { key: 'designation', label: 'designation', type: 'text' },
  { key: 'department', label: 'department', type: 'text' },
  { key: 'grade', label: 'grade', type: 'text' },
  { key: 'reporting_manager', label: 'reporting_manager', type: 'text' },
  { key: 'previous_employment', label: 'previous_employment', type: 'text' },
  { key: 'employee_type', label: 'employee_type', type: 'enum', options: ['permanent', 'contract', 'temporary', 'probation'] },
  { key: 'shift_type', label: 'shift_type', type: 'text', hint: 'e.g. General, Morning, Evening, Night, Rotational, Split' },
  { key: 'site_name', label: 'site_name', type: 'text', hint: 'Must match an existing site; leave blank if unassigned' },
  { key: 'status', label: 'status', type: 'enum', options: ['active', 'inactive', 'resigned', 'terminated'] },
  { key: 'basic', label: 'basic', type: 'number', hint: 'Basic salary (monthly)' },
  { key: 'hra', label: 'hra', type: 'number' },
  { key: 'conveyance', label: 'conveyance', type: 'number' },
  { key: 'other_allowance', label: 'other_allowance', type: 'number' },
  { key: 'overtime_rate', label: 'overtime_rate', type: 'number', hint: 'OT rate per hour' },
  { key: 'other_deduction', label: 'other_deduction', type: 'number' },
  { key: 'pf_applicable', label: 'pf_applicable', type: 'bool', options: ['Yes', 'No'] },
  { key: 'esic_applicable', label: 'esic_applicable', type: 'bool', options: ['Yes', 'No'] },
  { key: 'lwf_applicable', label: 'lwf_applicable', type: 'bool', options: ['Yes', 'No'] },
  { key: 'pt_applicable', label: 'pt_applicable', type: 'bool', options: ['Yes', 'No'] },
  { key: 'tds_applicable', label: 'tds_applicable', type: 'bool', options: ['Yes', 'No'] },
]

const SALARY_NUM_MAP: Record<string, string> = {
  basic: 'basic',
  hra: 'hra',
  conveyance: 'conveyance',
  other_allowance: 'other_allowance',
  overtime_rate: 'overtime_rate',
  other_deduction: 'other_deduction',
}
const SALARY_FLAG_MAP: Record<string, string> = { pf_applicable: 'pf_applicable', esic_applicable: 'esic_applicable' }
const STAT_FLAG_MAP: Record<string, string> = {
  pf_applicable: 'pf_applicable',
  esic_applicable: 'esi_applicable',
  lwf_applicable: 'lwf_applicable',
  pt_applicable: 'pt_applicable',
  tds_applicable: 'tds_applicable',
}

const HEADER_ALIASES: Record<string, string> = {
  first__name: 'first_name',
  last__name: 'last_name',
  employee__code: 'employee_code',
  father__husband__name: 'father_name',
  date__of__birth: 'dob',
  phone: 'mobile',
  aadhaar__number: 'aadhaar',
  pin__code: 'pincode',
  emergency__contact: 'emergency_contact_name',
  emergency__contact__phone: 'emergency_contact_phone',
  emergency__contact__phone__no: 'emergency_contact_phone',
  account__number: 'bank_account',
  bank__account__no: 'bank_account',
  ifsc: 'bank_ifsc',
  ifsc__code: 'bank_ifsc',
  pan__number: 'pan',
  date__of__joining: 'joining_date',
  employment__type: 'employee_type',
  shift: 'shift_type',
  site: 'site_name',
  basic__salary: 'basic',
  ot__rate: 'overtime_rate',
}

function normalizeHeader(h: string): string {
  return String(h)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
}

function mapHeader(h: string): string | undefined {
  const n = normalizeHeader(h)
  if (IMPORT_COLUMNS.some((c) => c.key === n)) return n
  return HEADER_ALIASES[n]
}

export interface ParsedFile {
  rows: Record<string, unknown>[]
  headerWarning?: string
  columnNames: string[]
  error?: string
}

export async function parseImportFile(file: File): Promise<ParsedFile> {
  const isExcel = /\.(xlsx|xls)$/i.test(file.name)
  let aoa: (string | number)[][] = []
  if (isExcel) {
    const XLSX = await import('xlsx')
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array', cellDates: false })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' }) as (string | number)[][]
  } else {
    const text = await file.text()
    const res = Papa.parse<string[]>(text, { skipEmptyLines: 'greedy' })
    if (res.errors.some((e) => e.code === 'MissingQuotes' || e.code === 'TooFewFields')) {
      return { rows: [], columnNames: [], error: 'Could not read this CSV file. Make sure it is a valid CSV.' }
    }
    aoa = res.data
  }

  let headerRow: (string | number)[]
  let start = 0
  while (start < aoa.length && aoa[start].every((v) => String(v ?? '').trim() === '')) start++
  if (start >= aoa.length) return { rows: [], columnNames: [], error: 'The file is empty. No header row was found.' }
  headerRow = aoa[start]

  const colIndex: { idx: number; key: string }[] = []
  const unknownCols: string[] = []
  headerRow.forEach((h, idx) => {
    const key = mapHeader(String(h ?? ''))
    if (key) colIndex.push({ idx, key })
    else if (String(h ?? '').trim()) unknownCols.push(String(h))
  })

  const rows: Record<string, unknown>[] = []
  for (let i = start + 1; i < aoa.length; i++) {
    const rr = aoa[i]
    if (!rr || rr.every((v) => String(v ?? '').trim() === '')) continue
    const obj: Record<string, unknown> = {}
    for (const { idx, key } of colIndex) {
      const v = rr[idx]
      obj[key] = v === null || v === undefined ? '' : v
    }
    rows.push(obj)
  }

  if (!rows.length) {
    return { rows: [], columnNames: colIndex.map((c) => c.key), error: 'No data rows found below the header.' }
  }
  return { rows, columnNames: colIndex.map((c) => c.key), headerWarning: unknownCols.length ? `Ignored unknown columns: ${unknownCols.join(', ')}` : undefined }
}

function toStr(v: unknown): string {
  return v === null || v === undefined ? '' : String(v).trim()
}
function toNum(v: unknown): number | undefined {
  const s = toStr(v)
  if (!s) return undefined
  const n = Number(s)
  return Number.isFinite(n) ? n : undefined
}
function toBool(v: unknown): boolean | undefined {
  const s = toStr(v).toLowerCase()
  if (!s) return undefined
  if (['true', 'yes', 'y', '1'].includes(s)) return true
  if (['false', 'no', 'n', '0'].includes(s)) return false
  return undefined
}
function normalizeDate(s: string): string | undefined {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const d = new Date(s)
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return undefined
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function buildImportPreview(rows: Record<string, unknown>[], sites: SiteRef[]): ParsedRow[] {
  const siteByName = new Map(sites.map((s) => [s.name.toLowerCase(), s.id]))
  const parsed: ParsedRow[] = []
  const hasFullNameCol = rows.length > 0 && Object.prototype.hasOwnProperty.call(rows[0], 'full_name')

  rows.forEach((row, i) => {
    const rowNumber = i + 2
    const errors: string[] = []
    const top: Record<string, unknown> = {}
    const salaryInput: Record<string, number | boolean | undefined> = {}
    const statInput: Record<string, boolean | undefined> = {}
    let siteId: number | undefined
    let email: string | undefined

    for (const col of IMPORT_COLUMNS) {
      const raw = row[col.key]
      const s = toStr(raw)
      if (!s) {
        if (col.required && !(col.key === 'full_name' && !hasFullNameCol)) errors.push(`${col.label} is required.`)
        continue
      }

      let v: string | number | boolean
      switch (col.type) {
        case 'number': {
          const n = toNum(raw)
          if (n === undefined) { errors.push(`${col.label} must be a number.`); continue }
          v = n
          break
        }
        case 'bool': {
          const b = toBool(raw)
          if (b === undefined) { errors.push(`${col.label} must be Yes/No.`); continue }
          v = b
          break
        }
        case 'date': {
          const dv = normalizeDate(s)
          if (!dv) { errors.push(`${col.label} must be a date in YYYY-MM-DD format.`); continue }
          v = dv
          break
        }
        default: {
          if (col.key === 'email' && !EMAIL_RE.test(s)) { errors.push('Email is not valid.'); continue }
          v = s
        }
      }

      if (col.key === 'site_name' || col.key === 'site_id') {
        const id = siteByName.get(s.toLowerCase())
        if (id === undefined) { errors.push(`Site "${s}" not found — use an existing site name or leave blank.`); continue }
        siteId = id
        continue
      }
      if (SALARY_NUM_MAP[col.key]) { salaryInput[SALARY_NUM_MAP[col.key]] = v as number; continue }
      if (col.key === 'pf_applicable' || col.key === 'esic_applicable') {
        salaryInput[SALARY_FLAG_MAP[col.key]] = v as boolean
        statInput[STAT_FLAG_MAP[col.key]] = v as boolean
        continue
      }
      if (STAT_FLAG_MAP[col.key]) { statInput[STAT_FLAG_MAP[col.key]] = v as boolean; continue }
      if (col.key === 'employee_code') top.employee_code = s.toUpperCase()
      else if (col.key === 'email') { email = s.toLowerCase(); top.email = s }
      else top[col.key] = v
    }

    if (Object.keys(salaryInput).length) {
      top.salary = {
        basic: typeof salaryInput.basic === 'number' ? salaryInput.basic : 0,
        hra: typeof salaryInput.hra === 'number' ? salaryInput.hra : 0,
        conveyance: typeof salaryInput.conveyance === 'number' ? salaryInput.conveyance : 0,
        other_allowance: typeof salaryInput.other_allowance === 'number' ? salaryInput.other_allowance : 0,
        overtime_rate: typeof salaryInput.overtime_rate === 'number' ? salaryInput.overtime_rate : 0,
        pf_applicable: salaryInput.pf_applicable ?? true,
        esic_applicable: salaryInput.esic_applicable ?? true,
        other_deduction: typeof salaryInput.other_deduction === 'number' ? salaryInput.other_deduction : 0,
      }
    }
    if (Object.keys(statInput).length) {
      top.statutory = {
        pf_applicable: statInput.pf_applicable ?? true,
        esi_applicable: statInput.esi_applicable ?? true,
        lwf_applicable: statInput.lwf_applicable ?? false,
        pt_applicable: statInput.pt_applicable ?? true,
        tds_applicable: statInput.tds_applicable ?? false,
      }
    }
    if (siteId !== undefined) top.site_id = siteId

    if (!toStr(top.full_name)) {
      const legacyName = [toStr(top.first_name), toStr(top.last_name)].filter(Boolean).join(' ')
      if (legacyName) top.full_name = legacyName
    }
    delete top.first_name
    delete top.last_name

    const name = toStr(top.full_name)
    if (errors.length) {
      parsed.push({ rowNumber, valid: false, name: name || `Row ${rowNumber}`, email, employeeCode: toStr(top.employee_code) || undefined, error: errors.join(' ') })
    } else {
      parsed.push({ rowNumber, valid: true, name, email, employeeCode: toStr(top.employee_code) || undefined, payload: top })
    }
  })

  return parsed
}

function templateExampleRow(): Record<string, unknown> {
  return {
    full_name: 'Ravi Kumar',
    employee_code: '',
    father_name: 'Suresh Kumar',
    gender: 'Male',
    dob: '1995-06-15',
    mobile: '9876543210',
    email: 'ravi.kumar@example.com',
    aadhaar: '123456789012',
    address: '12 MG Road',
    state: 'Karnataka',
    pincode: '560001',
    emergency_contact_name: 'Suresh Kumar',
    emergency_contact_phone: '9876500000',
    bank_name: 'HDFC Bank',
    bank_account: '50100123456789',
    bank_ifsc: 'HDFC0000001',
    pan: 'ABCDE1234F',
    uan: '',
    joining_date: '2024-04-01',
    designation: 'Security Guard',
    department: 'Security Services',
    grade: 'A2',
    reporting_manager: '',
    previous_employment: '',
    employee_type: 'permanent',
    shift_type: 'General',
    site_name: '',
    status: 'active',
    basic: 12000,
    hra: 2400,
    conveyance: 800,
    other_allowance: 600,
    overtime_rate: 80,
    other_deduction: 0,
    pf_applicable: 'Yes',
    esic_applicable: 'Yes',
    lwf_applicable: 'No',
    pt_applicable: 'Yes',
    tds_applicable: 'No',
  }
}

export function downloadCsvTemplate() {
  downloadCsv([templateExampleRow()], 'employee_import_template')
}

export async function downloadExcelTemplate() {
  const XLSX = await import('xlsx')
  const sample = templateExampleRow()
  const header = IMPORT_COLUMNS.map((c) => c.label)
  const data = IMPORT_COLUMNS.map((c) => sample[c.key] ?? '')

  const ws = XLSX.utils.aoa_to_sheet([header, data])

  const instructions: (string | number)[][] = [
    ['Bulk Employee Import — Instructions'],
    [],
    ['Employee Code is optional. Leave blank to auto-generate (SW####), or type an existing code to update that employee.'],
    ['If a row has no employee code but the email matches an existing employee, that employee is updated.'],
    ['Rows that match neither are created as new employees.'],
    ['Dates must be in YYYY-MM-DD format.'],
    ['Yes/No columns accept Yes/No, true/false, 1/0.'],
    ['site_name must exactly match an existing site or be left blank.'],
    [''],
    ['Field', 'Required', 'Description / Allowed values'],
    ...IMPORT_COLUMNS.map((c) => [c.label, c.required ? 'Yes' : 'No', [c.hint, c.options ? `Allowed: ${c.options.join(' / ')}` : ''].filter(Boolean).join('. ') ?? '']),
  ]
  const wsInstr = XLSX.utils.aoa_to_sheet(instructions)
  wsInstr['!cols'] = [{ wch: 22 }, { wch: 10 }, { wch: 80 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Employees')
  XLSX.utils.book_append_sheet(wb, wsInstr, 'Instructions')
  XLSX.writeFile(wb, 'employee_import_template.xlsx')
}