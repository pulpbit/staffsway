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
  employee_id?: number | null
}

export interface Employee {
  id: number
  employee_code: string
  first_name: string
  last_name: string
  father_name?: string | null
  spouse_name?: string | null
  gender: string | null
  dob: string | null
  marital_status?: string | null
  nationality?: string | null
  mobile: string | null
  alternate_mobile?: string | null
  email: string | null
  aadhaar?: string | null
  address: string | null
  city: string | null
  state: string | null
  district?: string | null
  pincode: string | null
  permanent_same_as_present?: number | null
  permanent_address?: string | null
  permanent_city?: string | null
  permanent_state?: string | null
  permanent_district?: string | null
  permanent_pincode?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  emergency_contact_relation?: string | null
  bank_name: string | null
  bank_holder_name?: string | null
  bank_account: string | null
  bank_ifsc: string | null
  pan: string | null
  uan: string | null
  esi_number?: string | null
  ctc?: number | null
  joining_date: string | null
  designation: string | null
  department: string | null
  grade?: string | null
  reporting_manager?: string | null
  previous_employment?: string | null
  employee_type: string
  shift_type: string | null
  working_days_week?: number | null
  notice_period_days?: number | null
  site_id: number | null
  status: string
  client_name?: string
  site_name?: string
  salary?: SalaryStructure | null
  statutory?: EmployeeStatutory | null
  documents?: EmployeeDocument[]
  nominees?: EmployeeNominee[]
  site?: Site | null
}

export interface EmployeeNominee {
  id: number
  employee_id: number
  name: string
  relation?: string | null
  share: number
  contact?: string | null
}

export interface EmployeeStatutory {
  employee_id: number
  pf_applicable: number
  esi_applicable: number
  lwf_applicable: number
  pt_applicable: number
  tds_applicable: number
  lwf_state?: string | null
}

export interface SalaryStructure {
  id: number
  employee_id: number
  basic: number
  hra: number
  conveyance: number
  other_allowance: number
  other_allowance_label?: string | null
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
  client_code: string
  name: string
  primary_contact_person: string | null
  hr_contact_person: string | null
  company_email: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  district: string | null
  pincode: string | null
  gst_no: string | null
  company_pan: string | null
  payroll_cycle: string | null
  salary_calculation: string | null
  overtime_enabled: boolean | number
  leave_policy_enabled: boolean | number
  arrears_enabled: boolean | number
  advance_loan_enabled: boolean | number
  bank_name: string | null
  bank_account: string | null
  bank_ifsc: string | null
  bank_account_holder: string | null
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
  status: string
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  district: string | null
  pincode: string | null
  site_incharge: string | null
  site_incharge_designation: string | null
  site_incharge_contact: string | null
  site_incharge_email: string | null
  shift_type: string | null
  overtime_enabled: boolean | number
  payroll_applicable: boolean | number
  leave_policy_enabled: boolean | number
  arrears_enabled: boolean | number
  pf_applicable: boolean | number
  pf_percent: number
  esic_applicable: boolean | number
  esic_percent: number
  lwf_applicable: boolean | number
  lwf_percent: number
  pt_applicable: boolean | number
  pt_amount: number
  tds_applicable: boolean | number
  tds_percent: number
  gratuity_applicable: boolean | number
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
  incentive: number
  bonus: number
  arrears: number
  loan_deduction: number
  gross: number
  pf: number
  esic: number
  professional_tax: number
  lwf: number
  tds: number
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
    joining_date?: string
    department?: string
    gender?: string
    site_name?: string
    client_name?: string
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
  financial_year_start: number
  lwf_employee_amount: number
  lwf_employer_amount: number
  tds_percent: number
  state_name: string
  bonus_percent: number
  bonus_max_percent: number
  bonus_wage_ceiling: number
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
  recent_employees: Record<string, unknown>[]
  recent_payroll: Record<string, unknown>[]
  charts: Record<string, unknown[]>
}

export interface ManagementDashboard {
  month: number
  year: number
  employees: number
  enrolled: number
  present_subtotal: number
  absent_subtotal: number
  late_marks: number
  on_leave: number
  new_joinings: number
  resignations: number
  salary_cost: number
  overtime_hours: number
  attrition_rate: number
  department_manpower: { name: string; value: number }[]
  attendance_trend: { month: number; year: number; present: number; absent: number; ot: number; paid_leave: number }[]
  salary_cost_trend: { month: number; year: number; net_total: number }[]
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

// ---------- Performance Management ----------

export interface PerformanceKpi {
  id: number
  employee_id: number
  fiscal_year: number
  title: string
  description: string | null
  category: string
  weight: number
  target: string | null
  status: string
  created_by: string | null
  created_at: string
  first_name?: string
  last_name?: string
  employee_code?: string
}

export interface PerformanceGoal {
  id: number
  employee_id: number
  fiscal_year: number
  quarter: number | null
  title: string
  description: string | null
  target_value: string | null
  actual_value: string | null
  weight: number
  status: string
  created_by: string | null
  created_at: string
  first_name?: string
  last_name?: string
  employee_code?: string
}

export interface PerformanceReview {
  id: number
  employee_id: number
  review_period: string
  review_type: string
  reviewer_name: string | null
  overall_rating: number | null
  strengths: string | null
  improvements: string | null
  comments: string | null
  status: string
  created_by: string | null
  created_at: string
  first_name?: string
  last_name?: string
  employee_code?: string
}

export interface PerformanceFeedback {
  id: number
  employee_id: number
  review_id: number | null
  feedback_type: string
  from_name: string | null
  rating: number | null
  strengths: string | null
  areas_improvement: string | null
  comments: string | null
  is_anonymous: number
  created_at: string
  first_name?: string
  last_name?: string
  employee_code?: string
}

export interface SelfAppraisal {
  id: number
  employee_id: number
  fiscal_year: number
  quarter: number | null
  achievements: string | null
  challenges: string | null
  goals_next_period: string | null
  training_needs: string | null
  overall_comments: string | null
  status: string
  submitted_at: string | null
  created_at: string
  first_name?: string
  last_name?: string
  employee_code?: string
}

export interface PerformanceHistory {
  id: number
  employee_id: number
  action: string
  details: string | null
  performed_by: string | null
  created_at: string
  first_name?: string
  last_name?: string
  employee_code?: string
}

export interface IncrementRecommendation {
  id: number
  employee_id: number
  fiscal_year: number
  recommended_by: string | null
  current_salary: number | null
  recommended_increment: number | null
  increment_percent: number | null
  justification: string | null
  performance_score: number | null
  status: string
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  first_name?: string
  last_name?: string
  employee_code?: string
}

export interface PromotionRecommendation {
  id: number
  employee_id: number
  fiscal_year: number
  recommended_by: string | null
  current_designation: string | null
  recommended_designation: string | null
  justification: string | null
  performance_score: number | null
  status: string
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  first_name?: string
  last_name?: string
  employee_code?: string
}

export interface PerformancePip {
  id: number
  employee_id: number
  title: string
  description: string | null
  start_date: string
  end_date: string
  goals: string | null
  status: string
  outcome: string | null
  manager_comments: string | null
  created_by: string | null
  created_at: string
  first_name?: string
  last_name?: string
  employee_code?: string
}

export interface PerformanceSummary {
  kpi_count: number
  goals: { total: number; not_started?: number; in_progress?: number; completed?: number; not_achieved?: number }
  avg_rating: number | null
  total_reviews: number
  total_feedback: number
  active_pips: number
}

// ---------- Asset Management ----------

export interface Asset {
  id: number
  asset_code: string
  asset_type: string
  brand: string | null
  model: string | null
  serial_number: string | null
  purchase_date: string | null
  purchase_price: number | null
  warranty_expiry: string | null
  condition_notes: string | null
  status: string
  created_at: string
  updated_at: string
  assignments?: AssetAssignment[]
}

export interface AssetAssignment {
  id: number
  asset_id: number
  employee_id: number
  action: string
  issue_date: string
  return_date: string | null
  replacement_id: number | null
  reason: string | null
  performed_by: string | null
  created_at: string
  first_name?: string
  last_name?: string
  employee_code?: string
  asset_code?: string
  asset_type?: string
  brand?: string
  model?: string
}

export interface AssetSummary {
  total: number
  available: number
  assigned: number
  maintenance: number
  retired: number
  by_type: { asset_type: string; count: number }[]
}

// ---------- Training Management ----------

export interface Training {
  id: number
  title: string
  description: string | null
  training_type: string
  trainer_name: string | null
  trainer_org: string | null
  mode: string
  location: string | null
  start_date: string
  end_date: string | null
  start_time: string | null
  end_time: string | null
  duration_hours: number | null
  max_participants: number | null
  status: string
  created_by: string | null
  created_at: string
  updated_at: string
  assignments?: TrainingAssignment[]
  attendance?: TrainingAttendance[]
  materials?: TrainingMaterial[]
  feedbacks?: TrainingFeedback[]
}

export interface TrainingAssignment {
  id: number
  training_id: number
  employee_id: number
  status: string
  assigned_by: string | null
  created_at: string
  first_name?: string
  last_name?: string
  employee_code?: string
}

export interface TrainingAttendance {
  id: number
  training_id: number
  employee_id: number
  attended: number
  notes: string | null
  marked_by: string | null
  created_at: string
  first_name?: string
  last_name?: string
  employee_code?: string
}

export interface TrainingMaterial {
  id: number
  training_id: number
  title: string
  description: string | null
  material_type: string
  url: string | null
  uploaded_by: string | null
  created_at: string
}

export interface Certification {
  id: number
  employee_id: number
  name: string
  issuing_org: string | null
  issue_date: string | null
  expiry_date: string | null
  credential_id: string | null
  status: string
  notes: string | null
  created_at: string
  first_name?: string
  last_name?: string
  employee_code?: string
}

export interface SkillMatrix {
  id: number
  employee_id: number
  skill_name: string
  category: string
  proficiency: string
  last_assessed: string | null
  assessed_by: string | null
  notes: string | null
  created_at: string
  first_name?: string
  last_name?: string
  employee_code?: string
}

export interface TrainingFeedback {
  id: number
  training_id: number
  employee_id: number
  rating: number | null
  content_rating: number | null
  trainer_rating: number | null
  comments: string | null
  suggestions: string | null
  created_at: string
  first_name?: string
  last_name?: string
  employee_code?: string
}

export interface TrainingSummary {
  total: number
  scheduled: number
  in_progress: number
  completed: number
  cancelled: number
  total_assigned: number
  total_attended: number
  active_certs: number
  unique_skills: number
}

// ---------- Separation / Exit Management ----------

export interface Separation {
  id: number
  employee_id: number
  separation_type: string
  resignation_date: string
  last_working_date: string | null
  notice_period_days: number
  notice_served_days: number
  notice_buyout: number
  reason: string | null
  status: string
  approved_by: string | null
  approved_at: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
  first_name?: string
  last_name?: string
  employee_code?: string
  designation?: string
  department?: string
  interview?: ExitInterview | null
  clearance?: ClearanceItem[]
  asset_returns?: AssetReturnItem[]
  no_dues?: NoDuesItem[]
  letters?: ExitLetter[]
  settlement?: any
}

export interface ExitInterview {
  id: number
  separation_id: number
  employee_id: number
  reason_for_leaving: string | null
  job_satisfaction: number | null
  work_environment: number | null
  management_rating: number | null
  growth_opportunity: number | null
  would_recommend: number | null
  feedback_text: string | null
  suggestions: string | null
  conducted_by: string | null
  conducted_at: string | null
}

export interface ClearanceItem {
  id: number
  separation_id: number
  employee_id: number
  item_name: string
  item_category: string
  is_cleared: number
  cleared_by: string | null
  cleared_at: string | null
  remarks: string | null
}

export interface AssetReturnItem {
  id: number
  separation_id: number
  employee_id: number
  asset_id: number | null
  asset_description: string
  returned: number
  returned_date: string | null
  condition_notes: string | null
  received_by: string | null
  asset_code?: string
  asset_type?: string
  brand?: string
}

export interface NoDuesItem {
  id: number
  separation_id: number
  employee_id: number
  department: string
  amount: number
  is_cleared: number
  remarks: string | null
  cleared_by: string | null
  cleared_at: string | null
}

export interface ExitLetter {
  id: number
  separation_id: number
  employee_id: number
  letter_type: string
  letter_date: string
  issued_by: string | null
  letter_body: string | null
}

export interface SeparationSummary {
  total: number
  pending: number
  approved: number
  rejected: number
  this_month: number
}

// ---------- HR Helpdesk ----------

export interface HelpdeskRequest {
  id: number
  employee_id: number
  subject: string
  message: string | null
  category: string
  priority: string
  status: string
  assigned_to: string | null
  manager_status: string
  manager_by: string | null
  manager_remarks: string | null
  manager_at: string | null
  hr_status: string
  hr_by: string | null
  hr_remarks: string | null
  hr_at: string | null
  reply: string | null
  action_notes: string | null
  action_by: string | null
  action_at: string | null
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
  first_name?: string
  last_name?: string
  employee_code?: string
  designation?: string
  department?: string
  comments?: HelpdeskComment[]
}

export interface HelpdeskComment {
  id: number
  request_id: number
  employee_id: number | null
  comment_by: string
  comment: string
  is_internal: number
  created_at: string
}

export interface HelpdeskSummary {
  total: number
  open: number
  in_progress: number
  resolved: number
  closed: number
  urgent: number
  this_week: number
  by_category: { category: string; count: number }[]
}
