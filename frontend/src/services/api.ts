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
  login: (email: string, password: string) => api.post<{ token: string; user: { id: number; name: string; email: string; role: string } }>('/auth/login', { email, password }),
  me: () => api.get<{ user: { id: number; name: string; email: string; role: string } }>('/auth/me'),
}

// Dashboard
export const dashboardApi = {
  get: (month?: number, year?: number) => api.get<import('@/types/api').DashboardData>(`/dashboard?month=${month || new Date().getMonth() + 1}&year=${year || new Date().getFullYear()}`),
}

// Employees
export const employeeApi = {
  list: (params: Record<string, string>) => {
    const q = new URLSearchParams(params).toString()
    return api.get<unknown[] & { meta: PaginationMeta }>(`/employees?${q}`)
  },
  get: (id: number) => api.get<import('@/types/api').Employee>(`/employees/${id}`),
  create: (data: unknown) => api.post<import('@/types/api').Employee>('/employees', data),
  update: (id: number, data: unknown) => api.put<import('@/types/api').Employee>(`/employees/${id}`, data),
  setStatus: (id: number, status: string) => api.patch<import('@/types/api').Employee>(`/employees/${id}/status`, { status }),
  delete: (id: number) => api.delete(`/employees/${id}`),
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
}

// Salary Slips
export const slipApi = {
  list: (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params).toString()}` : ''
    return api.get<import('@/types/api').SalarySlip[]>(`/slips${q}`)
  },
  get: (id: number) => api.get<import('@/types/api').SalarySlipDetail>(`/slips/${id}`),
}

// Reports
export const reportApi = {
  get: (name: string, params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params).toString()}` : ''
    return api.get<unknown[]>(`/reports/${name}${q}`)
  },
}

// Settings
export const settingsApi = {
  get: () => api.get<{ settings: import('@/types/api').Settings; leave_types: import('@/types/api').LeaveType[]; shift_types: import('@/types/api').ShiftType[]; users: unknown[] }>('/settings'),
  update: (data: unknown) => api.put<import('@/types/api').Settings>('/settings', data),
  addUser: (data: unknown) => api.post<unknown[]>('/settings/users', data),
  changePassword: (current: string, newPwd: string) => api.post('/settings/password', { current_password: current, new_password: newPwd }),
}
