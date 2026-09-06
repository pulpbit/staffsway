import type { ApiError, ApiResponse, PaginationMeta } from '@/types/api'

const API = import.meta.env.VITE_API_URL || '/api'

let token: string | null = localStorage.getItem('staffsway_token')

export function setToken(t: string | null) {
  token = t
  if (t) localStorage.setItem('staffsway_token', t)
  else localStorage.removeItem('staffsway_token')
}

export function getToken(): string | null {
  return token
}

async function request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API}${path}`, { ...options, headers })
  const json = await res.json().catch(() => ({ error: { code: 'network_error', message: 'Could not connect to the server.' } }))

  if (!res.ok) {
    const err = json as ApiError
    if (err.error?.code === 'unauthorized') setToken(null)
    throw err
  }
  return json as ApiResponse<T>
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

// Auth
export const authApi = {
  login: (email: string, password: string) => api.post<{ token: string; user: import('@/types/api').AuthUser }>('/auth/login', { email, password }),
  loginEmployee: (username: string, password: string) => api.post<{ token: string; user: import('@/types/api').AuthUser }>('/auth/employee-login', { username, password }),
  me: () => api.get<{ user: import('@/types/api').AuthUser }>('/auth/me'),
}

// Dashboard
export const dashboardApi = {
  get: (month?: number, year?: number) => api.get<import('@/types/api').DashboardData>(`/dashboard?month=${month || new Date().getMonth() + 1}&year=${year || new Date().getFullYear()}`),
  management: (month?: number, year?: number) => api.get<import('@/types/api').ManagementDashboard>(`/dashboard/management?month=${month || new Date().getMonth() + 1}&year=${year || new Date().getFullYear()}`),
}

// Employees
export interface EmployeeImportResult {
  total: number
  created: number
  updated: number
  skipped: number
  errors: { row: number; message: string; fields?: Record<string, string[]> }[]
}

export const employeeApi = {
  list: (params: Record<string, string>) => {
    const q = new URLSearchParams(params).toString()
    return api.get<unknown[] & { meta: PaginationMeta }>(`/employees?${q}`)
  },
  get: (id: number) => api.get<import('@/types/api').Employee>(`/employees/${id}`),
  checkAadhaar: (aadhaar: string) => api.get<{ exists: boolean; employee: import('@/types/api').Employee | null }>(`/employees/check-aadhaar?aadhaar=${encodeURIComponent(aadhaar)}`),
  nextCode: () => api.get<{ code: string }>('/employees/next-code'),
  create: (data: unknown) => api.post<import('@/types/api').Employee>('/employees', data),
  update: (id: number, data: unknown) => api.put<import('@/types/api').Employee>(`/employees/${id}`, data),
  getStatutory: (id: number) => api.get<import('@/types/api').EmployeeStatutory>(`/employees/${id}/statutory`),
  updateStatutory: (id: number, data: unknown) => api.put<import('@/types/api').EmployeeStatutory>(`/employees/${id}/statutory`, data),
  addDocument: (id: number, data: unknown) => api.post<unknown[]>(`/employees/${id}/documents`, data),
  deleteDocument: (id: number, docId: number) => api.delete<unknown[]>(`/employees/${id}/documents/${docId}`),
  verifyDocument: (id: number, docId: number, verified: boolean) => api.patch<unknown[]>(`/employees/${id}/documents/${docId}/verify`, { verified }),
  setStatus: (id: number, status: string) => api.patch<import('@/types/api').Employee>(`/employees/${id}/status`, { status }),
  revisions: (id: number) => api.get<unknown[]>(`/employees/${id}/revisions`),
  createRevision: (id: number, data: { effective_from: string; reason: 'increment' | 'promotion' | 'revision' | 'correction'; basic: number; hra?: number; conveyance?: number; other_allowance?: number; overtime_rate?: number; designation?: string; remarks?: string }) =>
    api.post<import('@/types/api').Employee>(`/employees/${id}/revision`, data),
  delete: (id: number) => api.delete(`/employees/${id}`),
  importEmployees: (rows: unknown[]) => api.post<EmployeeImportResult>('/employees/import', { rows }),
  filters: () => api.get<{ designations: string[]; departments: string[]; employee_types: string[]; shift_types: string[] }>('/employees/filters'),
}

// Clients
export const clientApi = {
  list: (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params).toString()}` : ''
    return api.get<import('@/types/api').Client[]>(`/clients${q}`)
  },
  get: (id: number) => api.get<import('@/types/api').Client>(`/clients/${id}`),
  create: (data: unknown) => api.post<import('@/types/api').Client>('/clients', data),
  update: (id: number, data: unknown) => api.put<import('@/types/api').Client>(`/clients/${id}`, data),
  delete: (id: number) => api.delete(`/clients/${id}`),
  generateCode: (name: string, excludeId?: number) => {
    const q = new URLSearchParams({ name })
    if (excludeId) q.set('exclude_id', String(excludeId))
    return api.get<{ code: string }>(`/clients/generate-code?${q.toString()}`)
  },
}

// Sites
export const siteApi = {
  list: (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params).toString()}` : ''
    return api.get<import('@/types/api').Site[]>(`/sites${q}`)
  },
  get: (id: number) => api.get<import('@/types/api').Site>(`/sites/${id}`),
  create: (data: unknown) => api.post<import('@/types/api').Site>('/sites', data),
  update: (id: number, data: unknown) => api.put<import('@/types/api').Site>(`/sites/${id}`, data),
  delete: (id: number) => api.delete(`/sites/${id}`),
}

// Attendance
export const attendanceApi = {
  sheet: (month: number, year: number, params?: Record<string, string>) => {
    const q = new URLSearchParams({ month: String(month), year: String(year), ...params }).toString()
    return api.get<{ month: number; year: number; rows: import('@/types/api').AttendanceSheetRow[]; finalized_count: number }>(`/attendance/sheet?${q}`)
  },
  list: (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params).toString()}` : ''
    return api.get<import('@/types/api').AttendanceRow[]>(`/attendance${q}`)
  },
  bulk: (month: number, year: number, items: unknown[]) => api.post<{ saved: number; employees: number }>('/attendance/bulk', { month, year, items }),
  update: (id: number, data: unknown) => api.put<import('@/types/api').AttendanceRow>(`/attendance/${id}`, data),
  finalize: (month: number, year: number, locked?: boolean) => api.post<{ updated: number; status: string }>('/attendance/finalize', { month, year, locked }),
  months: () => api.get<unknown[]>('/attendance/months'),
}

// Payroll
export const payrollApi = {
  list: () => api.get<import('@/types/api').Payroll[]>('/payroll'),
  months: () => api.get<unknown[]>('/payroll/months'),
  get: (id: number) => api.get<import('@/types/api').Payroll>(`/payroll/${id}`),
  generate: (data: { month: number; year: number; client_id?: number; site_id?: number; employee_ids?: number[] }) => api.post<import('@/types/api').Payroll>('/payroll/generate', data),
  preview: (data: { month: number; year: number; client_id?: number; site_id?: number }) => api.post<import('@/types/api').PayrollPreview>('/payroll/preview', data),
  finalize: (id: number) => api.post<{ slips: number }>(`/payroll/${id}/finalize`),
  setStatus: (id: number, status: string) => api.post(`/payroll/${id}/status`, { status }),
  updateItem: (payrollId: number, itemId: number, data: { incentive?: number; bonus?: number; arrears?: number; other_deduction?: number }) =>
    api.patch<unknown>(`/payroll/${payrollId}/items/${itemId}`, data),
}

export interface LoanRow {
  id: number; employee_id: number; principal: number; emi_amount: number; outstanding: number
  start_month: number; start_year: number; status: string; remarks?: string | null
  recovered?: number; employee_code: string; first_name: string; last_name: string
}

export interface SettlementRow {
  id: number; employee_id: number; exit_date: string; unpaid_days: number; unpaid_amount: number
  encash_days: number; encashment_amount: number; notice_recovery: number; other_recovery: number
  loan_outstanding: number; net_payable: number; status: string; remarks?: string | null
  employee_code: string; first_name: string; last_name: string; designation?: string | null
}

export const loanApi = {
  list: () => api.get<LoanRow[]>('/payroll/loans'),
  create: (data: { employee_id: number; principal: number; emi_amount: number; start_month: number; start_year: number; remarks?: string }) => api.post<LoanRow>('/payroll/loans', data),
  cancel: (id: number) => api.patch<LoanRow>(`/payroll/loans/${id}/cancel`, {}),
  close: (id: number) => api.patch<LoanRow>(`/payroll/loans/${id}/close`, {}),
}

export const settlementApi = {
  list: () => api.get<SettlementRow[]>('/payroll/settlements'),
  create: (data: { employee_id: number; exit_date: string; unpaid_days: number; encash_days: number; notice_recovery: number; other_recovery: number; remarks?: string }) => api.post<SettlementRow>('/payroll/settlements', data),
  markPaid: (id: number) => api.patch<SettlementRow>(`/payroll/settlements/${id}/paid`, {}),
}

// Salary Slips
export const slipApi = {
  list: (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params).toString()}` : ''
    return api.get<import('@/types/api').SalarySlip[]>(`/slips${q}`)
  },
  get: (id: number) => api.get<import('@/types/api').SalarySlipDetail>(`/slips/${id}`),
}

// Advances
export const advanceApi = {
  list: (month?: number, year?: number) => {
    const q = new URLSearchParams({ ...(month ? { month: String(month) } : {}), ...(year ? { year: String(year) } : {}) }).toString()
    return api.get<unknown[]>(`/advances${q ? `?${q}` : ''}`)
  },
  create: (data: { employee_id: number; amount: number; month: number; year: number; remarks?: string }) => api.post<unknown>('/advances', data),
  delete: (id: number) => api.delete(`/advances/${id}`),
}

// Recruitment & Joining
export interface JobOpening { id: number; code: string; title: string; department?: string | null; site_id?: number | null; site_name?: string | null; client_name?: string | null; positions_required: number; filled_count?: number; status: string; notes?: string | null }
export interface InterviewRow { id: number; candidate_id: number; round: number; scheduled_at: string | null; interviewer?: string | null; mode?: string | null; outcome: string; remarks?: string | null }
export interface CandidateRow { id: number; full_name: string; mobile?: string | null; email?: string | null; opening_id?: number | null; opening_title?: string | null; opening_code?: string | null; source?: string | null; experience?: string | null; expected_salary?: number | null; remarks?: string | null; status: string; joined_code?: string | null; interviews: InterviewRow[] }

export const recruitmentApi = {  openings: () => api.get<JobOpening[]>('/recruitment/openings'),
  createOpening: (data: Partial<JobOpening>) => api.post<JobOpening>('/recruitment/openings', data),
  updateOpening: (id: number, data: Partial<JobOpening>) => api.patch<JobOpening>(`/recruitment/openings/${id}`, data),
  deleteOpening: (id: number) => api.delete(`/recruitment/openings/${id}`),
  candidates: (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params).toString()}` : ''
    return api.get<CandidateRow[]>(`/recruitment/candidates${q}`)
  },
  createCandidate: (data: Record<string, unknown>) => api.post<CandidateRow>('/recruitment/candidates', data),
  updateCandidate: (id: number, data: Record<string, unknown>) => api.patch<CandidateRow>(`/recruitment/candidates/${id}`, data),
  deleteCandidate: (id: number) => api.delete(`/recruitment/candidates/${id}`),
  scheduleInterview: (candidateId: number, data: { scheduled_at: string; interviewer?: string; mode?: string; remarks?: string }) => api.post<InterviewRow>(`/recruitment/candidates/${candidateId}/interviews`, data),
  updateInterview: (id: number, data: { outcome: 'pending' | 'passed' | 'failed'; remarks?: string }) => api.patch<InterviewRow>(`/recruitment/interviews/${id}`, data),
  join: (candidateId: number, data: { joining_date: string; designation?: string; department?: string; basic: number; hra?: number; conveyance?: number; other_allowance?: number }) => api.post<{ employee: { employee_code: string } }>(`/recruitment/candidates/${candidateId}/join`, data),
  onboarding: (employeeId: number) => api.get<unknown[]>(`/recruitment/employees/${employeeId}/onboarding`),
  toggleOnboardingTask: (taskId: number, done: boolean) => api.patch<unknown>(`/recruitment/onboarding/${taskId}`, { done }),
}

// Leave Management
export interface LeaveRequestRow {
  id: number; employee_id: number; leave_type_id?: number | null
  start_date: string; end_date: string; days: number; reason?: string | null
  status: string; manager_status: string; manager_by?: string | null; manager_remarks?: string | null
  hr_status: string; hr_by?: string | null; hr_remarks?: string | null
  type_name?: string | null; type_code?: string | null
  first_name: string; last_name: string; employee_code: string
}
export interface BalanceRow {
  leave_type_id: number; name: string; code: string; paid: boolean
  accrual_monthly: boolean; is_comp_off: boolean
  entitled: number; accrued: number; comp_off_extra: number; encashed: number
  used: number; pending: number; available: number
}

export const leaveApi = {
  types: () => api.get<unknown[]>('/leaves/types'),
  requests: (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params).toString()}` : ''
    return api.get<LeaveRequestRow[]>(`/leaves/requests${q}`)
  },
  apply: (data: { employee_id: number; leave_type_id?: number | null; start_date: string; end_date: string; reason?: string }) => api.post<LeaveRequestRow>('/leaves/requests', data),
  approve: (id: number, data: { level: 'manager' | 'hr'; action: 'approve' | 'reject'; remarks?: string }) => api.patch<LeaveRequestRow>(`/leaves/requests/${id}/approval`, data),
  cancel: (id: number) => api.patch<LeaveRequestRow>(`/leaves/requests/${id}/cancel`, {}),
  balances: (year: string) => api.get<unknown[]>(`/leaves/balances?year=${year}`),
  employeeBalances: (employeeId: number, year: string) => api.get<BalanceRow[]>(`/leaves/balances?employee_id=${employeeId}&year=${year}`),
  compoff: (data: { employee_id: number; leave_type_id: number; days: number; remarks?: string }) => api.post<BalanceRow>('/leaves/compoff', data),
  encashments: (year: string) => api.get<unknown[]>(`/leaves/encashments?year=${year}`),
  encash: (data: { employee_id: number; leave_type_id: number; days: number }) => api.post<unknown>('/leaves/encashments', data),
  holidays: (year: string) => api.get<unknown[]>(`/leaves/holidays?year=${year}`),
  addHoliday: (data: { date: string; name: string }) => api.post<unknown>('/leaves/holidays', data),
  deleteHoliday: (id: number) => api.delete(`/leaves/holidays/${id}`),
}

// Reports
export const reportApi = {
  get: (name: string, params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params).toString()}` : ''
    return api.get<unknown[]>(`/reports/${name}${q}`)
  },
}

// Statutory Compliance (Item 6)
export interface StatutoryRegisterRow {
  employee_id: number; employee_code: string; name: string; uan?: string | null; pan?: string | null
  gross: number; epf_wages: number; pf_ee: number; pf_er: number
  esi_gross: number; esi_ee: number; esi_er: number; pt: number; lwf: number; tds: number
}
export interface EcrRow {
  uan: string; member_name: string; gross: number; epf_wages: number
  ee_share: number; er_share: number; eps: number; edli: number; ncp_days: number
}
export interface ChallanData {
  pf: { epf_wages: number; a_c_01_ee: number; a_c_02_er: number; a_c_10_eps: number; a_c_21_edli: number; a_c_22_admin: number; total_pf: number }
  esi: { applicable_gross: number; ee_share: number; er_share: number; total_esi: number }
  pt: number; lwf: number; lwf_employee: number; lwf_employer: number; tds: number; grand_total: number
}
export interface GratuityRow {
  employee_id: number; employee_code: string; name: string; joining_date: string; service_years: number
  latest_basic: number; status: string; eligible: boolean; gratuity_amount: number
}
export interface BonusRow {
  employee_id: number; employee_code: string; name: string; status: string; monthly_basic: number
  eligible: boolean; applied_percent: number | null; max_percent_allowed: number
  annual_basic: number; bonus_amount: number
}
export interface MinWageRow { id: number; state: string; category: string; basic_monthly: number; va_monthly: number; effective_from: string }
export interface WageCheckRow {
  employee_id: number; employee_code: string; name: string; skill_category: string | null
  paid_fixed: number; state_min_total: number | null; compliant: boolean | null; shortfall: number | null
}
export interface OtComplianceRow {
  employee_id: number; employee_code: string; name: string; ot_hours: number; actual_rate: number
  required_double_rate: number; compliant: boolean; short_per_hour: number
  payable_at_required: number; payable_recorded: number; gap: number
}
export interface ComplianceRecordRow {
  id: number; obligation: string; label?: string; year: number; month: number | null
  due_date: string; status: string; remarks?: string | null; done_by?: string | null; done_at?: string | null
}

export const statutoryApi = {
  register: (month: number, year: number) => api.get<StatutoryRegisterRow[] & { meta: { month: number; year: number; count: number; totals: Record<string, number> } }>(`/statutory/register?month=${month}&year=${year}`),
  pfEcr: (month: number, year: number) => api.get<EcrRow[]>(`/statutory/pf-ecr?month=${month}&year=${year}`),
  challan: (month: number, year: number) => api.get<{ data: ChallanData; meta: Record<string, unknown> }>(`/statutory/challan?month=${month}&year=${year}`),
  gratuity: () => api.get<GratuityRow[]>('/statutory/gratuity'),
  bonusRegister: (year: number) => api.get<BonusRow[]>(`/statutory/bonus-register?year=${year}`),
  minWages: (state?: string) => api.get<MinWageRow[]>(`/statutory/min-wages${state ? `?state=${encodeURIComponent(state)}` : ''}`),
  saveMinWage: (data: { state?: string; category: string; basic_monthly: number; va_monthly: number; effective_from: string }) => api.post<MinWageRow[]>('/statutory/min-wages', data),
  deleteMinWage: (id: number) => api.delete(`/statutory/min-wages/${id}`),
  wageCheck: (month: number, year: number) => api.get<WageCheckRow[]>(`/statutory/wage-check?month=${month}&year=${year}`),
  otCompliance: (month: number, year: number) => api.get<OtComplianceRow[]>(`/statutory/ot-compliance?month=${month}&year=${year}`),
  calendar: (year: number) => api.get<ComplianceRecordRow[]>(`/statutory/calendar?year=${year}`),
  setCalendarStatus: (id: number, status: 'pending' | 'done', remarks?: string) => api.patch<ComplianceRecordRow>(`/statutory/calendar/${id}`, { status, remarks }),
}

// Employee Self Service (Item 7)
export interface EssProfile {
  id: number; employee_code: string; first_name: string; last_name: string; email?: string | null; mobile?: string | null
  designation?: string | null; department?: string | null; joining_date: string; status: string
  employee_type?: string | null; shift_type?: string | null; site_name?: string | null; client_name?: string | null
  basic: number; hra: number; conveyance: number; other_allowance: number; overtime_rate: number
  salary_effective_from?: string | null
  pf_applicable?: number; esi_applicable?: number; lwf_applicable?: number; pt_applicable?: number; tds_applicable?: number
}
export interface AttendanceMonthRow {
  id: number; employee_id: number; month: number; year: number
  present_days: number; absent_days: number; paid_leave: number; unpaid_leave: number
  ot_hours: number; remarks?: string | null; status: string
}
export interface RegularizationRow {
  id: number; employee_id: number; month: number; year: number
  present_days: number; absent_days: number; paid_leave: number; unpaid_leave: number
  reason: string; status: string; reviewed_by?: string | null; reviewed_at?: string | null
  reply?: string | null; created_at?: string
  first_name?: string; last_name?: string; employee_code?: string
  recorded_present?: number | null; recorded_absent?: number | null
  attendance_status?: string | null
}
export interface HrRequestRow {
  id: number; employee_id: number; subject: string; message?: string | null; status: string
  reply?: string | null; resolved_by?: string | null; resolved_at?: string | null; created_at?: string
  first_name?: string; last_name?: string; employee_code?: string
}

export const essApi = {
  me: () => api.get<EssProfile>('/ess/me'),
  attendance: (year: number) => api.get<AttendanceMonthRow[]>(`/ess/attendance?year=${year}`),
  regularizations: () => api.get<RegularizationRow[]>('/ess/regularizations'),
  createRegularization: (data: { month: number; year: number; present_days: number; absent_days: number; paid_leave: number; unpaid_leave: number; reason: string }) =>
    api.post<RegularizationRow>('/ess/regularizations', data),
  createRequest: (data: { subject: string; message?: string }) => api.post<HrRequestRow>('/ess/requests', data),
  myRequests: () => api.get<HrRequestRow[]>('/ess/requests'),
  adminRegularizations: (status: string) => api.get<RegularizationRow[]>(`/ess/admin/regularizations?status=${status}`),
  reviewRegularization: (id: number, action: 'approve' | 'reject', reply?: string) =>
    api.patch<unknown>(`/ess/admin/regularizations/${id}`, { action, reply }),
  adminRequests: (status: string) => api.get<HrRequestRow[]>(`/ess/admin/requests?status=${status}`),
  resolveRequest: (id: number, reply?: string) => api.patch<HrRequestRow>(`/ess/admin/requests/${id}/resolve`, { reply }),
}

// Settings
export const settingsApi = {
  get: () => api.get<{ settings: import('@/types/api').Settings; leave_types: import('@/types/api').LeaveType[]; shift_types: import('@/types/api').ShiftType[]; users: unknown[] }>('/settings'),
  update: (data: unknown) => api.put<import('@/types/api').Settings>('/settings', data),
  addUser: (data: unknown) => api.post<unknown[]>('/settings/users', data),
  updateUser: (id: number, data: unknown) => api.patch<unknown[]>(`/settings/users/${id}`, data),
  changePassword: (current: string, newPwd: string) => api.post('/settings/password', { current_password: current, new_password: newPwd }),
}

// Performance Management (Item 8)
export const performanceApi = {
  summary: (employeeId?: number, fiscalYear?: number) => {
    const params = new URLSearchParams()
    if (employeeId) params.set('employee_id', String(employeeId))
    if (fiscalYear) params.set('fiscal_year', String(fiscalYear))
    const q = params.toString()
    return api.get<import('@/types/api').PerformanceSummary>(`/performance/summary${q ? `?${q}` : ''}`)
  },
  // KPIs
  kpis: (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params).toString()}` : ''
    return api.get<import('@/types/api').PerformanceKpi[]>(`/performance/kpis${q}`)
  },
  createKpi: (data: unknown) => api.post<import('@/types/api').PerformanceKpi>('/performance/kpis', data),
  deleteKpi: (id: number) => api.delete(`/performance/kpis/${id}`),
  // Goals
  goals: (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params).toString()}` : ''
    return api.get<import('@/types/api').PerformanceGoal[]>(`/performance/goals${q}`)
  },
  createGoal: (data: unknown) => api.post<import('@/types/api').PerformanceGoal>('/performance/goals', data),
  updateGoal: (id: number, data: unknown) => api.patch<import('@/types/api').PerformanceGoal>(`/performance/goals/${id}`, data),
  deleteGoal: (id: number) => api.delete(`/performance/goals/${id}`),
  // Reviews
  reviews: (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params).toString()}` : ''
    return api.get<import('@/types/api').PerformanceReview[]>(`/performance/reviews${q}`)
  },
  createReview: (data: unknown) => api.post<import('@/types/api').PerformanceReview>('/performance/reviews', data),
  updateReview: (id: number, data: unknown) => api.patch<import('@/types/api').PerformanceReview>(`/performance/reviews/${id}`, data),
  deleteReview: (id: number) => api.delete(`/performance/reviews/${id}`),
  // Feedback
  feedback: (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params).toString()}` : ''
    return api.get<import('@/types/api').PerformanceFeedback[]>(`/performance/feedback${q}`)
  },
  createFeedback: (data: unknown) => api.post<import('@/types/api').PerformanceFeedback>('/performance/feedback', data),
  deleteFeedback: (id: number) => api.delete(`/performance/feedback/${id}`),
  // Self-Appraisals
  selfAppraisals: (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params).toString()}` : ''
    return api.get<import('@/types/api').SelfAppraisal[]>(`/performance/self-appraisals${q}`)
  },
  createSelfAppraisal: (data: unknown) => api.post<import('@/types/api').SelfAppraisal>('/performance/self-appraisals', data),
  updateSelfAppraisal: (id: number, data: unknown) => api.patch<import('@/types/api').SelfAppraisal>(`/performance/self-appraisals/${id}`, data),
  // History
  history: (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params).toString()}` : ''
    return api.get<import('@/types/api').PerformanceHistory[]>(`/performance/history${q}`)
  },
  // Increments
  increments: (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params).toString()}` : ''
    return api.get<import('@/types/api').IncrementRecommendation[]>(`/performance/increments${q}`)
  },
  createIncrement: (data: unknown) => api.post<import('@/types/api').IncrementRecommendation>('/performance/increments', data),
  updateIncrement: (id: number, data: unknown) => api.patch<import('@/types/api').IncrementRecommendation>(`/performance/increments/${id}`, data),
  // Promotions
  promotions: (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params).toString()}` : ''
    return api.get<import('@/types/api').PromotionRecommendation[]>(`/performance/promotions${q}`)
  },
  createPromotion: (data: unknown) => api.post<import('@/types/api').PromotionRecommendation>('/performance/promotions', data),
  updatePromotion: (id: number, data: unknown) => api.patch<import('@/types/api').PromotionRecommendation>(`/performance/promotions/${id}`, data),
  // PIPs
  pips: (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params).toString()}` : ''
    return api.get<import('@/types/api').PerformancePip[]>(`/performance/pips${q}`)
  },
  createPip: (data: unknown) => api.post<import('@/types/api').PerformancePip>('/performance/pips', data),
  updatePip: (id: number, data: unknown) => api.patch<import('@/types/api').PerformancePip>(`/performance/pips/${id}`, data),
  deletePip: (id: number) => api.delete(`/performance/pips/${id}`),
}

// Asset Management (Item 11)
export const assetApi = {
  summary: () => api.get<import('@/types/api').AssetSummary>('/assets/summary'),
  list: (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params).toString()}` : ''
    return api.get<import('@/types/api').Asset[]>(`/assets${q}`)
  },
  get: (id: number) => api.get<import('@/types/api').Asset>(`/assets/${id}`),
  create: (data: unknown) => api.post<import('@/types/api').Asset>('/assets', data),
  update: (id: number, data: unknown) => api.put<import('@/types/api').Asset>(`/assets/${id}`, data),
  delete: (id: number) => api.delete(`/assets/${id}`),
  assign: (id: number, data: { employee_id: number; issue_date: string; reason?: string }) => api.post<import('@/types/api').AssetAssignment>(`/assets/${id}/assign`, data),
  return: (id: number, data: { return_date: string; condition_notes?: string; reason?: string }) => api.post<import('@/types/api').AssetAssignment>(`/assets/${id}/return`, data),
  replace: (id: number, data: { employee_id: number; issue_date: string; replacement_asset_id: number; reason?: string }) => api.post<import('@/types/api').AssetAssignment>(`/assets/${id}/replace`, data),
  allAssignments: (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params).toString()}` : ''
    return api.get<import('@/types/api').AssetAssignment[]>(`/assets/assignments/all${q}`)
  },
}

// Training Management (Item 12)
export const trainingApi = {
  summary: () => api.get<import('@/types/api').TrainingSummary>('/training/summary'),
  list: (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params).toString()}` : ''
    return api.get<import('@/types/api').Training[]>(`/training${q}`)
  },
  get: (id: number) => api.get<import('@/types/api').Training>(`/training/${id}`),
  create: (data: unknown) => api.post<import('@/types/api').Training>('/training', data),
  update: (id: number, data: unknown) => api.put<import('@/types/api').Training>(`/training/${id}`, data),
  delete: (id: number) => api.delete(`/training/${id}`),
  assign: (id: number, employeeIds: number[]) => api.post<{ assigned: number }>(`/training/${id}/assign`, { employee_ids: employeeIds }),
  unassign: (id: number, empId: number) => api.delete(`/training/${id}/assign/${empId}`),
  markAttendance: (id: number, data: { employee_id: number; attended: boolean; notes?: string }) => api.post<unknown>(`/training/${id}/attendance`, data),
  bulkAttendance: (id: number, items: { employee_id: number; attended: boolean; notes?: string }[]) => api.post<unknown>(`/training/${id}/attendance/bulk`, { items }),
  addMaterial: (id: number, data: unknown) => api.post<import('@/types/api').TrainingMaterial>(`/training/${id}/materials`, data),
  deleteMaterial: (id: number, matId: number) => api.delete(`/training/${id}/materials/${matId}`),
  addFeedback: (id: number, data: unknown) => api.post<unknown>(`/training/${id}/feedback`, data),
  // Certifications
  certifications: (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params).toString()}` : ''
    return api.get<import('@/types/api').Certification[]>(`/training/certifications${q}`)
  },
  createCertification: (data: unknown) => api.post<import('@/types/api').Certification>('/training/certifications', data),
  deleteCertification: (id: number) => api.delete(`/training/certifications/${id}`),
  // Skills
  skills: (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params).toString()}` : ''
    return api.get<import('@/types/api').SkillMatrix[]>(`/training/skills${q}`)
  },
  skillMatrix: () => api.get<import('@/types/api').SkillMatrix[]>('/training/skills/matrix'),
  upsertSkill: (data: unknown) => api.post<import('@/types/api').SkillMatrix>('/training/skills', data),
  deleteSkill: (id: number) => api.delete(`/training/skills/${id}`),
  // History
  history: (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params).toString()}` : ''
    return api.get<unknown[]>(`/training/history${q}`)
  },
}

// Separation / Exit Management (Item 13)
export const separationApi = {
  summary: () => api.get<import('@/types/api').SeparationSummary>('/separation/summary/stats'),
  list: (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params).toString()}` : ''
    return api.get<import('@/types/api').Separation[]>(`/separation${q}`)
  },
  get: (id: number) => api.get<import('@/types/api').Separation>(`/separation/${id}`),
  create: (data: unknown) => api.post<import('@/types/api').Separation>('/separation', data),
  update: (id: number, data: unknown) => api.patch<import('@/types/api').Separation>(`/separation/${id}`, data),
  approve: (id: number, data?: { last_working_date?: string; remarks?: string }) => api.patch<import('@/types/api').Separation>(`/separation/${id}/approve`, data || {}),
  reject: (id: number, reason?: string) => api.patch<import('@/types/api').Separation>(`/separation/${id}/reject`, { reason }),
  // Exit Interview
  saveInterview: (sepId: number, data: unknown) => api.post<import('@/types/api').ExitInterview>(`/separation/${sepId}/interview`, data),
  // Clearance
  addClearanceItem: (sepId: number, data: { item_name: string; item_category?: string }) => api.post<import('@/types/api').ClearanceItem>(`/separation/${sepId}/clearance`, data),
  toggleClearance: (sepId: number, itemId: number, data: { is_cleared: boolean; remarks?: string }) => api.patch<import('@/types/api').ClearanceItem>(`/separation/${sepId}/clearance/${itemId}`, data),
  deleteClearanceItem: (sepId: number, itemId: number) => api.delete(`/separation/${sepId}/clearance/${itemId}`),
  // Asset Return
  addAssetReturn: (sepId: number, data: unknown) => api.post<import('@/types/api').AssetReturnItem>(`/separation/${sepId}/assets`, data),
  updateAssetReturn: (sepId: number, retId: number, data: unknown) => api.patch<import('@/types/api').AssetReturnItem>(`/separation/${sepId}/assets/${retId}`, data),
  // No-Dues
  addNoDues: (sepId: number, data: unknown) => api.post<import('@/types/api').NoDuesItem>(`/separation/${sepId}/no-dues`, data),
  toggleNoDues: (sepId: number, duesId: number, data: { is_cleared: boolean; amount?: number; remarks?: string }) => api.patch<import('@/types/api').NoDuesItem>(`/separation/${sepId}/no-dues/${duesId}`, data),
  // Letters
  createLetter: (sepId: number, data: unknown) => api.post<import('@/types/api').ExitLetter>(`/separation/${sepId}/letters`, data),
  deleteLetter: (sepId: number, letterId: number) => api.delete(`/separation/${sepId}/letters/${letterId}`),
}

// HR Helpdesk (Item 14)
export const helpdeskApi = {
  summary: () => api.get<import('@/types/api').HelpdeskSummary>('/helpdesk/summary/stats'),
  categories: () => api.get<{ value: string; label: string }[]>('/helpdesk/categories'),
  list: (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params).toString()}` : ''
    return api.get<import('@/types/api').HelpdeskRequest[]>(`/helpdesk${q}`)
  },
  myRequests: () => api.get<import('@/types/api').HelpdeskRequest[]>('/helpdesk/my'),
  get: (id: number) => api.get<import('@/types/api').HelpdeskRequest>(`/helpdesk/${id}`),
  create: (data: unknown) => api.post<import('@/types/api').HelpdeskRequest>('/helpdesk', data),
  createSelf: (data: unknown) => api.post<import('@/types/api').HelpdeskRequest>('/helpdesk/self', data),
  managerReview: (id: number, data: { action: 'approve' | 'reject'; remarks?: string }) => api.patch<import('@/types/api').HelpdeskRequest>(`/helpdesk/${id}/manager`, data),
  hrReview: (id: number, data: { action: 'approve' | 'reject'; remarks?: string }) => api.patch<import('@/types/api').HelpdeskRequest>(`/helpdesk/${id}/hr`, data),
  assign: (id: number, assignedTo: string) => api.patch<import('@/types/api').HelpdeskRequest>(`/helpdesk/${id}/assign`, { assigned_to: assignedTo }),
  takeAction: (id: number, data: { action_notes: string; status?: 'resolved' | 'closed' }) => api.patch<import('@/types/api').HelpdeskRequest>(`/helpdesk/${id}/action`, data),
  addComment: (id: number, data: { comment: string; is_internal?: boolean }) => api.post<import('@/types/api').HelpdeskComment>(`/helpdesk/${id}/comments`, data),
}
