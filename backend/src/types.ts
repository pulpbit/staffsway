export interface Env {
  DB: D1Database
  SESSION_SECRET?: string
  AUTH_SECRET?: string
}

export interface AuthUser {
  id: number
  name: string
  email: string
  role: string
  employee_id?: number | null
}

export interface Settings {
  id: number
  company_name: string
  company_tagline: string
  address: string | null
  state: string | null
  pincode: string | null
  phone: string | null
  email: string | null
  website: string | null
  gstin: string | null
  pan: string | null
  cin: string | null
  currency: string
  financial_year_start: number
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

export interface EmployeeRow {
  id: number
  employee_code: string
  first_name: string
  last_name: string
  gender: string | null
  dob: string | null
  mobile: string | null
  email: string | null
  address: string | null
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
  created_at: string
  updated_at: string
}

export interface SalaryRow {
  id: number
  employee_id: number
  effective_from: string
  basic: number
  hra: number
  conveyance: number
  other_allowance: number
  overtime_rate: number
  working_hours: number
  pf_applicable: number
  esic_applicable: number
  other_deduction: number
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
  total_days: number | null
  rest_days: number | null
  holiday_days: number | null
  half_days: number | null
  leave_days: number | null
  ot_days: number | null
  payable_days: number | null
  actual_salary: number | null
}

export interface PayrollSettings {
  salary_basis_days: number
  default_ot_rate: number
  pf_rate: number
  pf_cap: number
  pf_eligibility: number
  esic_rate: number
  esic_eligibility: number
  professional_tax_amount: number
  professional_tax_min_gross: number
  lwf_employee_amount: number
  tds_percent: number
}
