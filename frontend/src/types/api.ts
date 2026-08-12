export interface ApiError {
  error: { code: string; message: string; fields?: Record<string, string[]> }
}

export interface ApiResponse<T> {
  data: T
  meta?: PaginationMeta
  message?: string
}

export interface PaginationMeta {
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface AuthUser {
  id: number
  name: string
  email: string
  role: string
}

export interface Employee {
  id: number
  employee_code: string
  first_name: string
  last_name: string
  gender: string | null
  dob: string | null
  mobile: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  bank_name: string | null
  bank_account: string | null
  bank_ifsc: string | null
  pan: string | null
  uan: string | null
  joining_date: string | null
  designation: string | null
  department: string | null
  employee_type: string
  shift_type: string | null
  site_id: number | null
  status: string
  client_name?: string
  site_name?: string
  salary?: SalaryStructure | null
  documents?: EmployeeDocument[]
  site?: Site | null
}

export interface SalaryStructure {
  id: number
  employee_id: number
  basic: number
  hra: number
  conveyance: number
  other_allowance: number
  overtime_rate: number
  pf_applicable: number
  esic_applicable: number
  other_deduction: number
}

export interface EmployeeDocument {
  id: number
  employee_id: number
  document_type: string
  document_name: string
  document_number: string | null
}

export interface Client {
  id: number
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
  contract_start: string | null
  contract_end: string | null
  status: string
  site_count?: number
  active_employees?: number
  total_employees?: number
  sites?: Site[]
  employees?: Employee[]
}

export interface Site {
  id: number
  client_id: number
  name: string
  location: string | null
  supervisor_name: string | null
  shift_type: string | null
  status: string
  client_name?: string
  active_employees?: number
  total_employees?: number
  employees?: Employee[]
}

export interface AttendanceRow {
  id: number
  employee_id: number
  month: number
  year: number
  present_days: number
  absent_days: number
  paid_leave: number
  unpaid_leave: number
  ot_hours: number
  remarks: string | null
  status: string
  employee_code?: string
  first_name?: string
  last_name?: string
  designation?: string
  site_name?: string
  client_name?: string
}

export interface AttendanceSheetRow {
  employee_id: number
  employee_code: string
  first_name: string
  last_name: string
  designation: string
  status: string
  site_id: number | null
  site_name: string | null
  client_id: number | null
  client_name: string | null
  attendance_id: number | null
  present_days: number | null
  absent_days: number | null
  paid_leave: number | null
  unpaid_leave: number | null
  ot_hours: number | null
  remarks: string | null
  attendance_status: string | null
}

export interface Payroll {
  id: number
  month: number
  year: number
  status: string
  total_employees: number
  gross_total: number
  deduction_total: number
  net_total: number
  created_at: string
  finalized_at: string | null
  paid_at: string | null
  item_count?: number
  slip_count?: number
  items?: PayrollItem[]
}

export interface PayrollItem {
  id: number
  payroll_id: number
  employee_id: number
  present_days: number
  absent_days: number
  paid_leave: number
  unpaid_leave: number
  ot_hours: number
  basic: number
  hra: number
  conveyance: number
  other_allowance: number
  overtime_earnings: number
  attendance_deduction: number
  gross: number
  pf: number
  esic: number
  professional_tax: number
  advance_deduction: number
  other_deduction: number
  total_deductions: number
  net_salary: number
  status: string
  employee_code?: string
  first_name?: string
  last_name?: string
  designation?: string
  site_name?: string
  client_name?: string
}

export interface SalarySlip {
  id: number
  payroll_item_id: number
  employee_id: number
  slip_number: string
  month: number
  year: number
  generated_at: string
  employee_code?: string
  first_name?: string
  last_name?: string
  designation?: string
  net_salary?: number
  gross?: number
  total_deductions?: number
  payroll_status?: string
}

export interface SalarySlipDetail {
  slip: SalarySlip
  item: PayrollItem & {
    att_present?: number
    att_absent?: number
    att_paid?: number
    att_unpaid?: number
    att_ot?: number
    bank_name?: string
    bank_account?: string
    bank_ifsc?: string
    uan?: string
    pan?: string
  }
  payroll: { status: string; finalized_at: string | null; paid_at: string | null }
  company: Settings
}

export interface Settings {
  id: number
  company_name: string
  company_tagline: string
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  phone: string | null
  email: string | null
  website: string | null
  gstin: string | null
  pan: string | null
  cin: string | null
  currency: string
  salary_basis_days: number
  pf_rate: number
  pf_cap: number
  pf_eligibility: number
  esic_rate: number
  esic_eligibility: number
  professional_tax_amount: number
  professional_tax_min_gross: number
  default_ot_rate: number
  attendance_lock_enabled: number
}

export interface LeaveType {
  id: number
  name: string
  code: string
  paid_default: number
  max_days: number | null
}

export interface ShiftType {
  id: number
  name: string
  start_time: string | null
  end_time: string | null
}

export interface DashboardData {
  month: number
  year: number
  kpi: Record<string, unknown>
  totals: Record<string, unknown>
  recent_employees: Employee[]
  recent_payroll: Payroll[]
  charts: Record<string, unknown[]>
}

export interface PayrollPreview {
  month: number
  year: number
  items: (PayrollItem & {
    name: string
    employee_code: string
    earnings: number
    overtimeEarnings: number
    perDay: number
    has_attendance_draft: boolean
  })[]
  totals: { gross: number; net: number; deductions: number }
}
