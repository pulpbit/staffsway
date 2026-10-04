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
  site?: string
  designation?: string
  status?: string
  error?: string
  payload?: Record<string, unknown>
}

// The import sheet is deliberately short. Only Employee Name is required;
// every other field is optional and falls back to a sensible default (active
// status, permanent type, 8 working hours, PF/ESIC/PT on, LWF/TDS off, zero
// salary components). Labels are what the user sees in the downloaded
// template, so they are written out in full rather than as column keys.
export const IMPORT_COLUMNS: ImportColumn[] = [
  { key: 'full_name', label: 'Employee Name', type: 'text', required: true, hint: 'Required. Split into first and last name automatically.' },
  { key: 'father_name', label: "Father's / Spouse Name", type: 'text', hint: 'One field for either; put the spouse name where it applies' },
  { key: 'gender', label: 'Gender', type: 'enum', options: ['Male', 'Female', 'Other'] },
  { key: 'dob', label: 'DOB', type: 'date', hint: 'YYYY-MM-DD' },
  { key: 'aadhaar', label: 'Aadhar No.', type: 'text', hint: '12 digits' },
  { key: 'mobile', label: 'Mobile', type: 'text' },
  { key: 'basic', label: 'Basic', type: 'number', hint: 'Basic salary, monthly' },
  { key: 'hra', label: 'HRA', type: 'number' },
  { key: 'conveyance', label: 'Conveyance', type: 'number' },
  { key: 'other_allowance', label: 'Other Allowances', type: 'number' },
  { key: 'joining_date', label: 'Joining Date', type: 'date', hint: 'YYYY-MM-DD' },
  { key: 'bank_name', label: 'Bank Name', type: 'text' },
  { key: 'bank_account', label: 'A/C No.', type: 'text' },
  { key: 'bank_ifsc', label: 'IFSC No.', type: 'text' },
  { key: 'esi_number', label: 'ESIC IP No.', type: 'text' },
  { key: 'designation', label: 'Designation', type: 'text' },
  { key: 'department', label: 'Department', type: 'text' },
  { key: 'reporting_manager', label: 'Reporting Manager', type: 'text' },
  { key: 'shift_type', label: 'Shift Type', type: 'text', hint: 'General, Morning, Evening, Night, Rotational or Split' },
  { key: 'site_name', label: 'Site Name', type: 'text', hint: 'Must match an existing site exactly, or leave blank' },
  { key: 'status', label: 'Status', type: 'enum', options: ['active', 'inactive'] },
  { key: 'working_hours', label: 'Working Hours', type: 'number', hint: 'Per day, e.g. 8. Defaults to 8 when blank.' },
  { key: 'pf_applicable', label: 'PF Applicable', type: 'bool', options: ['Yes', 'No'] },
  { key: 'esic_applicable', label: 'ESIC Applicable', type: 'bool', options: ['Yes', 'No'] },
  { key: 'lwf_applicable', label: 'LWF Applicable', type: 'bool', options: ['Yes', 'No'] },
  { key: 'pt_applicable', label: 'PT Applicable', type: 'bool', options: ['Yes', 'No'] },
  { key: 'tds_applicable', label: 'TDS Applicable', type: 'bool', options: ['Yes', 'No'] },
]

const SALARY_NUM_MAP: Record<string, string> = {
  basic: 'basic',
  hra: 'hra',
  conveyance: 'conveyance',
  other_allowance: 'other_allowance',
  overtime_rate: 'overtime_rate',
  working_hours: 'working_hours',
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
  employee__name: 'full_name',
  name: 'full_name',
  father__spouse__name: 'father_name',
  father__husband__name: 'father_name',
  father_spouse_name: 'father_name',
  // Sheets that split the combined column into two still map cleanly.
  fathers_name: 'father_name',
  spouse_name: 'father_name',
  date__of__birth: 'dob',
  phone: 'mobile',
  mobile__no: 'mobile',
  aadhaar__number: 'aadhaar',
  // Both spellings are common; the template ships "Aadhar No." but people also
  // write it with the doubled 'a'.
  aadhaar_no: 'aadhaar',
  aadhaar_number: 'aadhaar',
  aadhar_no: 'aadhaar',
  aadhar_number: 'aadhaar',
  aadhar: 'aadhaar',
  aadhar__no: 'aadhaar',
  aadhar__number: 'aadhaar',
  other__allowances: 'other_allowance',
  other_allowances: 'other_allowance',
  bank__name: 'bank_name',
  a_c__no: 'bank_account',
  a_c_no: 'bank_account',
  a_c_number: 'bank_account',
  account__number: 'bank_account',
  bank__account__no: 'bank_account',
  bank_ac_no: 'bank_account',
  account_no: 'bank_account',
  ifsc: 'bank_ifsc',
  ifsc__code: 'bank_ifsc',
  ifsc__no: 'bank_ifsc',
  esic__ip__no: 'esi_number',
  esic_no: 'esi_number',
  esic__number: 'esi_number',
  job__title: 'designation',
  designation: 'designation',
  date__of__joining: 'joining_date',
  reporting__manager: 'reporting_manager',
  shift: 'shift_type',
  site: 'site_name',
  basic__salary: 'basic',
  ot__rate: 'overtime_rate',
  working__hours: 'working_hours',
  working__days: 'working_hours',
  hours: 'working_hours',
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
  // The template ships friendly labels, but accept the internal keys too so a
  // sheet exported from an older template still lines up.
  const byKey = IMPORT_COLUMNS.find((c) => c.key === n)
  if (byKey) return byKey.key
  const byLabel = IMPORT_COLUMNS.find((c) => normalizeHeader(c.label) === n)
  if (byLabel) return byLabel.key
  const alias = HEADER_ALIASES[n]
  if (alias) return alias
  // Fall back to a punctuation-insensitive comparison. Hand-written sheets
  // spell headers as "Aadhar No.", "A/C No.", "Father's Name" and friends, and
  // the collapsed form matches those without needing an alias for each variant.
  const collapsed = (s: string) => normalizeHeader(s).replace(/_/g, '')
  const target = collapsed(h)
  const match = IMPORT_COLUMNS.find((c) => collapsed(c.label) === target || collapsed(c.key) === target)
  if (match) return match.key
  for (const [aliasKey, canonical] of Object.entries(HEADER_ALIASES)) {
    if (collapsed(aliasKey) === target) return canonical
  }
  return undefined
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

  // Every row needs a name, so a sheet with no recognisable name column is
  // rejected outright rather than failing once per row.
  if (!colIndex.some((c) => c.key === 'full_name')) {
    return {
      rows: [],
      columnNames: colIndex.map((c) => c.key),
      error: `No "Employee Name" column found. Expected one of: Employee Name, full_name. Found: ${headerRow.map((h) => String(h ?? '').trim()).filter(Boolean).join(', ') || '(empty file)'}`,
    }
  }

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

export function buildImportPreview(rows: Record<string, unknown>[], sites: SiteRef[]): ParsedRow[] {
  const siteByName = new Map(sites.map((s) => [s.name.toLowerCase(), s.id]))
  const parsed: ParsedRow[] = []

  rows.forEach((row, i) => {
    const rowNumber = i + 2
    const errors: string[] = []
    const top: Record<string, unknown> = {}
    const salaryInput: Record<string, number | boolean | undefined> = {}
    const statInput: Record<string, boolean | undefined> = {}
    let siteId: number | undefined
    let siteName: string | undefined

    for (const col of IMPORT_COLUMNS) {
      const raw = row[col.key]
      const s = toStr(raw)
      if (!s) {
        if (col.required) errors.push(`${col.label} is required.`)
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
          v = s
        }
      }

      if (col.key === 'site_name') {
        const id = siteByName.get(s.toLowerCase())
        if (id === undefined) { errors.push(`Site "${s}" not found — use an existing site name or leave blank.`); continue }
        siteId = id
        siteName = s
        continue
      }
      if (SALARY_NUM_MAP[col.key]) { salaryInput[SALARY_NUM_MAP[col.key]] = v as number; continue }
      if (col.key === 'pf_applicable' || col.key === 'esic_applicable') {
        salaryInput[SALARY_FLAG_MAP[col.key]] = v as boolean
        statInput[STAT_FLAG_MAP[col.key]] = v as boolean
        continue
      }
      if (STAT_FLAG_MAP[col.key]) { statInput[STAT_FLAG_MAP[col.key]] = v as boolean; continue }
      top[col.key] = v
    }

    // Only attach a salary block when the sheet actually carries salary data, so
    // a name-only row stays a plain employee record with no salary row.
    if (Object.keys(salaryInput).length) {
      top.salary = {
        basic: typeof salaryInput.basic === 'number' ? salaryInput.basic : 0,
        hra: typeof salaryInput.hra === 'number' ? salaryInput.hra : 0,
        conveyance: typeof salaryInput.conveyance === 'number' ? salaryInput.conveyance : 0,
        other_allowance: typeof salaryInput.other_allowance === 'number' ? salaryInput.other_allowance : 0,
        overtime_rate: typeof salaryInput.overtime_rate === 'number' ? salaryInput.overtime_rate : 0,
        working_hours: typeof salaryInput.working_hours === 'number' ? salaryInput.working_hours : undefined,
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

    const name = toStr(top.full_name)
    const common = { rowNumber, name: name || `Row ${rowNumber}`, site: siteName, designation: toStr(top.designation) || undefined, status: toStr(top.status) || undefined }
    if (errors.length) parsed.push({ ...common, valid: false, error: errors.join(' ') })
    else parsed.push({ ...common, valid: true, payload: top })
  })

  return parsed
}

function templateExampleRow(): Record<string, unknown> {
  return {
    full_name: 'Ravi Kumar',
    father_name: 'Suresh Kumar',
    gender: 'Male',
    dob: '1995-06-15',
    aadhaar: '123456789012',
    mobile: '9876543210',
    basic: 12000,
    hra: 2400,
    conveyance: 800,
    other_allowance: 600,
    joining_date: '2024-04-01',
    bank_name: 'HDFC Bank',
    bank_account: '50100123456789',
    bank_ifsc: 'HDFC0000001',
    esi_number: '',
    designation: 'Security Guard',
    department: 'Security Services',
    reporting_manager: '',
    shift_type: 'General',
    site_name: '',
    status: 'active',
    working_hours: 8,
    pf_applicable: 'Yes',
    esic_applicable: 'Yes',
    lwf_applicable: 'No',
    pt_applicable: 'Yes',
    tds_applicable: 'No',
  }
}

export function downloadCsvTemplate() {
  const sample = templateExampleRow()
  // Key the row by label so the CSV header matches the template the user sees.
  const row: Record<string, unknown> = {}
  for (const c of IMPORT_COLUMNS) row[c.label] = sample[c.key] ?? ''
  downloadCsv([row], 'employee_import_template')
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
    ['Only "Employee Name" is required. Every other column may be left blank and will fall back to a default.'],
    ['Each row is created as a NEW employee. Employee codes are auto-generated (SW####, or the client prefix when a Site Name is given).'],
    ['Anything not supplied is left blank on the employee record: address, PAN, UAN, grade, previous employment and emergency contact.'],
    ['Salary defaults: PF, ESIC and PT applicable; LWF and TDS not applicable.'],
    ['Dates must be in YYYY-MM-DD format.'],
    ['Yes/No columns accept Yes/No, true/false, 1/0.'],
    ['Site Name must exactly match an existing site, or be left blank to leave the employee unassigned.'],
    [''],
    ['Field', 'Required', 'Description / Allowed values'],
    ...IMPORT_COLUMNS.map((c) => [c.label, c.required ? 'Yes' : 'No', [c.hint, c.options ? `Allowed: ${c.options.join(' / ')}` : ''].filter(Boolean).join('. ')]),
  ]
  const wsInstr = XLSX.utils.aoa_to_sheet(instructions)
  wsInstr['!cols'] = [{ wch: 22 }, { wch: 10 }, { wch: 80 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Employees')
  XLSX.utils.book_append_sheet(wb, wsInstr, 'Instructions')
  XLSX.writeFile(wb, 'employee_import_template.xlsx')
}