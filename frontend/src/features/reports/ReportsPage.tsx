import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportApi, clientApi, siteApi } from '@/services/api'
import { Table } from '@/components/ui/data'
import { PageHeader, LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { Button } from '@/components/ui/fields'
import { money, monthYear, dateShort } from '@/utils/format'
import { downloadCsv } from '@/utils/csv'
import { Download, BarChart3 } from 'lucide-react'

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

type ReportDef = {
  key: string
  label: string
  group: string
  needsMonth?: boolean
  needsYear?: boolean
  needsRange?: boolean
  clientFilter?: boolean
  siteFilter?: boolean
  statusFilter?: boolean
  periodFilter?: boolean
  assetTypeFilter?: boolean
  expenseCategory?: boolean
  monthRequiredYear?: number
  columns: { key: string; header: string; className?: string; hideSm?: boolean; render?: (r: any) => any }[]
}

const REPORTS: ReportDef[] = [
  // ---- Master ---
  { key: 'employee-master', label: 'Employee Master', group: 'Master', clientFilter: true, siteFilter: true, statusFilter: true, columns: [
    { key: 'employee_code', header: 'Code', className: 'font-mono text-[11px]' },
    { key: 'name', header: 'Name', render: (r: any) => <span className="text-[13px] font-medium text-ink">{r.first_name} {r.last_name}</span> },
    { key: 'designation', header: 'Designation' },
    { key: 'department', header: 'Department' },
    { key: 'employee_type', header: 'Type' },
    { key: 'shift_type', header: 'Shift' },
    { key: 'client_name', header: 'Client' },
    { key: 'site_name', header: 'Site', hideSm: true },
    { key: 'joining_date', header: 'Joined', render: (r: any) => dateShort(r.joining_date) },
    { key: 'status', header: 'Status' },
  ] },
  { key: 'employees', label: 'Employee', group: 'Master', clientFilter: true, siteFilter: true, statusFilter: true, columns: [
    { key: 'employee_code', header: 'Code', className: 'font-mono text-[11px]' },
    { key: 'name', header: 'Name', render: (r: any) => <span className="text-[13px] font-medium text-ink">{r.first_name} {r.last_name}</span> },
    { key: 'designation', header: 'Designation' },
    { key: 'client_name', header: 'Client' },
    { key: 'site_name', header: 'Site' },
    { key: 'basic', header: 'Basic', render: (r: any) => money(r.basic || 0) },
    { key: 'status', header: 'Status' },
  ] },

  // ---- Attendance & Time ---
  { key: 'attendance', label: 'Attendance', group: 'Attendance', needsMonth: true, clientFilter: true, siteFilter: true, columns: [
    { key: 'employee_code', header: 'Code', className: 'font-mono text-[11px]' },
    { key: 'name', header: 'Name', render: (r: any) => <span className="text-[13px] font-medium text-ink">{r.first_name} {r.last_name}</span> },
    { key: 'present_days', header: 'Present' },
    { key: 'absent_days', header: 'Absent' },
    { key: 'paid_leave', header: 'Paid Lv' },
    { key: 'unpaid_leave', header: 'Unpaid Lv' },
    { key: 'ot_hours', header: 'OT Hrs' },
    { key: 'attendance_percent', header: '%', render: (r: any) => `${r.attendance_percent}%` },
    { key: 'status', header: 'Status' },
  ] },
  { key: 'late-early', label: 'Late / Early', group: 'Attendance', needsMonth: true, clientFilter: true, siteFilter: true, columns: [
    { key: 'employee_code', header: 'Code', className: 'font-mono text-[11px]' },
    { key: 'name', header: 'Name', render: (r: any) => <span className="text-[13px] font-medium text-ink">{r.first_name} {r.last_name}</span> },
    { key: 'department', header: 'Department' },
    { key: 'present_days', header: 'Present' },
    { key: 'late_marks', header: 'Late Marks', render: (r: any) => <span className={r.late_marks > 2 ? 'text-error font-medium' : undefined}>{r.late_marks}</span> },
    { key: 'early_departures', header: 'Early Dep.', render: (r: any) => <span className={r.early_departures > 2 ? 'text-error font-medium' : undefined}>{r.early_departures}</span> },
    { key: 'site_name', header: 'Site', hideSm: true },
  ] },
  { key: 'leave', label: 'Leave', group: 'Attendance', needsRange: true, clientFilter: true, siteFilter: true, columns: [
    { key: 'employee_code', header: 'Code', className: 'font-mono text-[11px]' },
    { key: 'name', header: 'Name', render: (r: any) => <span className="text-[13px] font-medium text-ink">{r.first_name} {r.last_name}</span> },
    { key: 'leave_type', header: 'Leave Type' },
    { key: 'start_date', header: 'Start', render: (r: any) => dateShort(r.start_date) },
    { key: 'end_date', header: 'End', render: (r: any) => dateShort(r.end_date) },
    { key: 'days', header: 'Days' },
    { key: 'status', header: 'Status' },
  ] },
  { key: 'ot', label: 'Overtime', group: 'Attendance', needsMonth: true, clientFilter: true, siteFilter: true, columns: [
    { key: 'employee_code', header: 'Code', className: 'font-mono text-[11px]' },
    { key: 'name', header: 'Name', render: (r: any) => <span className="text-[13px] font-medium text-ink">{r.first_name} {r.last_name}</span> },
    { key: 'designation', header: 'Designation' },
    { key: 'client_name', header: 'Client' },
    { key: 'present_days', header: 'Present' },
    { key: 'ot_hours', header: 'OT Hrs' },
    { key: 'ot_amount', header: 'OT Amt', render: (r: any) => money(r.ot_amount) },
  ] },
  { key: 'shift', label: 'Shift', group: 'Attendance', clientFilter: true, siteFilter: true, columns: [
    { key: 'shift_name', header: 'Shift', render: (r: any) => <span className="text-[13px] font-medium text-ink">{r.shift_name}</span> },
    { key: 'employee_count', header: 'Employees' },
    { key: 'active_count', header: 'Active' },
    { key: 'site_count', header: 'Sites' },
  ] },

  // ---- Payroll & Statutory ---
  { key: 'payroll-register', label: 'Payroll Register', group: 'Payroll', needsMonth: true, clientFilter: true, siteFilter: true, columns: [
    { key: 'employee_code', header: 'Code', className: 'font-mono text-[11px]' },
    { key: 'name', header: 'Name', render: (r: any) => <span className="text-[13px] font-medium text-ink">{r.first_name} {r.last_name}</span> },
    { key: 'gross', header: 'Gross', render: (r: any) => money(r.gross) },
    { key: 'incentive', header: 'Incentive', hideSm: true, render: (r: any) => money(r.incentive || 0) },
    { key: 'bonus', header: 'Bonus', hideSm: true, render: (r: any) => money(r.bonus || 0) },
    { key: 'arrears', header: 'Arrears', hideSm: true, render: (r: any) => money(r.arrears || 0) },
    { key: 'pf', header: 'PF', render: (r: any) => money(r.pf) },
    { key: 'esic', header: 'ESIC', render: (r: any) => money(r.esic) },
    { key: 'professional_tax', header: 'PT', render: (r: any) => money(r.professional_tax) },
    { key: 'loan_deduction', header: 'Loan', hideSm: true, render: (r: any) => money(r.loan_deduction || 0) },
    { key: 'total_deductions', header: 'Deductions', render: (r: any) => money(r.total_deductions) },
    { key: 'net_salary', header: 'Net', render: (r: any) => <span className="font-medium">{money(r.net_salary)}</span> },
    { key: 'status', header: 'Status' },
  ] },
  { key: 'salary', label: 'Salary Register', group: 'Payroll', clientFilter: true, siteFilter: true, statusFilter: true, columns: [
    { key: 'employee_code', header: 'Code', className: 'font-mono text-[11px]' },
    { key: 'name', header: 'Name', render: (r: any) => <span className="text-[13px] font-medium text-ink">{r.first_name} {r.last_name}</span> },
    { key: 'designation', header: 'Designation' },
    { key: 'client_name', header: 'Client' },
    { key: 'monthly_salary', header: 'Monthly', render: (r: any) => money(r.monthly_salary) },
    { key: 'overtime_rate', header: 'OT Rate', render: (r: any) => `${r.overtime_rate}/hr` },
  ] },
  { key: 'bank-statement', label: 'Bank Statement', group: 'Payroll', needsMonth: true, clientFilter: true, siteFilter: true, columns: [
    { key: 'employee_code', header: 'Code', className: 'font-mono text-[11px]' },
    { key: 'name', header: 'Name', render: (r: any) => <span className="text-[13px] font-medium text-ink">{r.first_name} {r.last_name}</span> },
    { key: 'bank_name', header: 'Bank', render: (r: any) => r.bank_name || <span className="text-error text-[12px]">Missing</span> },
    { key: 'bank_account', header: 'Account No.', render: (r: any) => r.bank_account ? <span className="font-mono text-[12px]">{r.bank_account}</span> : <span className="text-error text-[12px]">Missing</span> },
    { key: 'bank_ifsc', header: 'IFSC', render: (r: any) => r.bank_ifsc ? <span className="font-mono text-[12px]">{r.bank_ifsc}</span> : <span className="text-error text-[12px]">Missing</span> },
    { key: 'net_salary', header: 'Net Salary', render: (r: any) => <span className="text-[13px] font-medium">{money(r.net_salary)}</span> },
    { key: 'payroll_status', header: 'Payroll' },
  ] },
  { key: 'pf', label: 'PF Report', group: 'Payroll', needsMonth: true, clientFilter: true, siteFilter: true, columns: [
    { key: 'employee_code', header: 'Code', className: 'font-mono text-[11px]' },
    { key: 'name', header: 'Name', render: (r: any) => <span className="text-[13px] font-medium text-ink">{r.first_name} {r.last_name}</span> },
    { key: 'uan', header: 'UAN', className: 'font-mono text-[11px]', render: (r: any) => r.uan || <span className="text-mute">—</span> },
    { key: 'epf_wages', header: 'PF Wages', render: (r: any) => money(r.epf_wages) },
    { key: 'employee_pf', header: 'Employee PF', render: (r: any) => money(r.employee_pf) },
    { key: 'employer_pf', header: 'Employer PF', render: (r: any) => money(r.employer_pf) },
    { key: 'eps_wages', header: 'EPS', render: (r: any) => money(r.eps_wages) },
  ] },
  { key: 'esi', label: 'ESI Report', group: 'Payroll', needsMonth: true, clientFilter: true, siteFilter: true, columns: [
    { key: 'employee_code', header: 'Code', className: 'font-mono text-[11px]' },
    { key: 'name', header: 'Name', render: (r: any) => <span className="text-[13px] font-medium text-ink">{r.first_name} {r.last_name}</span> },
    { key: 'gross', header: 'Gross', render: (r: any) => money(r.gross) },
    { key: 'employee_esi', header: 'Employee ESI', render: (r: any) => money(r.employee_esi) },
    { key: 'employer_esi', header: 'Employer ESI', render: (r: any) => money(r.employer_esi) },
    { key: 'total_esi', header: 'Total ESI', render: (r: any) => money(r.total_esi) },
  ] },
  { key: 'expense', label: 'Expense', group: 'Payroll', needsRange: true, clientFilter: true, siteFilter: true, expenseCategory: true, columns: [
    { key: 'expense_date', header: 'Date', render: (r: any) => dateShort(r.expense_date) },
    { key: 'category', header: 'Category', render: (r: any) => <span className="text-[13px] font-medium text-ink">{r.category}</span> },
    { key: 'description', header: 'Description' },
    { key: 'vendor', header: 'Vendor' },
    { key: 'site_name', header: 'Site', hideSm: true },
    { key: 'payment_method', header: 'Payment', hideSm: true },
    { key: 'amount', header: 'Amount', render: (r: any) => <span className="font-medium">{money(r.amount)}</span> },
  ] },

  // ---- Workforce / MIS ---
  { key: 'dept-manpower', label: 'Dept Manpower', group: 'Workforce', clientFilter: true, siteFilter: true, columns: [
    { key: 'department', header: 'Department', render: (r: any) => <span className="text-[13px] font-medium text-ink">{r.department || '—'}</span> },
    { key: 'total_count', header: 'Total' },
    { key: 'active_count', header: 'Active' },
    { key: 'inactive_count', header: 'Inactive', hideSm: true },
    { key: 'permanent_count', header: 'Permanent' },
    { key: 'contract_count', header: 'Contract' },
    { key: 'male_count', header: 'Male', hideSm: true },
    { key: 'female_count', header: 'Female', hideSm: true },
  ] },
  { key: 'joining', label: 'Joining', group: 'Workforce', needsRange: true, clientFilter: true, siteFilter: true, statusFilter: true, columns: [
    { key: 'employee_code', header: 'Code', className: 'font-mono text-[11px]' },
    { key: 'name', header: 'Name', render: (r: any) => <span className="text-[13px] font-medium text-ink">{r.first_name} {r.last_name}</span> },
    { key: 'designation', header: 'Designation' },
    { key: 'department', header: 'Department' },
    { key: 'joining_date', header: 'Joined', render: (r: any) => dateShort(r.joining_date) },
    { key: 'client_name', header: 'Client' },
    { key: 'status', header: 'Status' },
  ] },
  { key: 'exit', label: 'Exit', group: 'Workforce', needsRange: true, clientFilter: true, siteFilter: true, columns: [
    { key: 'employee_code', header: 'Code', className: 'font-mono text-[11px]' },
    { key: 'name', header: 'Name', render: (r: any) => <span className="text-[13px] font-medium text-ink">{r.first_name} {r.last_name}</span> },
    { key: 'separation_type', header: 'Type', render: (r: any) => <span className="capitalize">{r.separation_type}</span> },
    { key: 'resignation_date', header: 'Resigned', render: (r: any) => dateShort(r.resignation_date) },
    { key: 'last_working_date', header: 'Last Day', render: (r: any) => dateShort(r.last_working_date) },
    { key: 'reason', header: 'Reason' },
    { key: 'status', header: 'Status' },
  ] },
  { key: 'attrition', label: 'Attrition', group: 'Workforce', needsYear: true, clientFilter: true, siteFilter: true, columns: [
    { key: 'month', header: 'Month', render: (r: any) => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][r.month - 1] },
    { key: 'joinings', header: 'Joinings' },
    { key: 'exits', header: 'Exits' },
  ] },
  { key: 'by-client', label: 'By Client', group: 'Workforce', columns: [
    { key: 'client_name', header: 'Client', render: (r: any) => <span className="text-[13px] font-medium text-ink">{r.client_name}</span> },
    { key: 'employee_count', header: 'Employees' },
    { key: 'active_count', header: 'Active' },
    { key: 'site_count', header: 'Sites' },
    { key: 'contact_person', header: 'Contact' },
    { key: 'status', header: 'Status' },
  ] },
  { key: 'by-site', label: 'By Site', group: 'Workforce', clientFilter: true, columns: [
    { key: 'site_name', header: 'Site', render: (r: any) => <span className="text-[13px] font-medium text-ink">{r.site_name}</span> },
    { key: 'client_name', header: 'Client' },
    { key: 'employee_count', header: 'Employees' },
    { key: 'active_count', header: 'Active' },
    { key: 'shift_type', header: 'Shift' },
    { key: 'status', header: 'Status' },
  ] },
  { key: 'status', label: 'Status', group: 'Workforce', columns: [
    { key: 'status', header: 'Status', render: (r: any) => <span className={`text-[13px] font-medium ${r.status === 'active' ? 'text-success' : 'text-error'}`}>{r.status}</span> },
    { key: 'name', header: 'Name', render: (r: any) => <span>{r.first_name} {r.last_name}</span> },
    { key: 'employee_code', header: 'Code', className: 'font-mono text-[11px]' },
    { key: 'designation', header: 'Designation' },
    { key: 'client_name', header: 'Client' },
    { key: 'site_name', header: 'Site' },
  ] },

  // ---- Assets / Performance ---
  { key: 'asset', label: 'Asset', group: 'Assets & Performance', assetTypeFilter: true, statusFilter: true, columns: [
    { key: 'asset_code', header: 'Code', className: 'font-mono text-[11px]' },
    { key: 'asset_type', header: 'Type', render: (r: any) => <span className="text-[13px] font-medium text-ink">{r.asset_type}</span> },
    { key: 'brand', header: 'Brand' },
    { key: 'model', header: 'Model' },
    { key: 'purchase_price', header: 'Value', render: (r: any) => money(r.purchase_price || 0) },
    { key: 'assigned_employee', header: 'Assigned To', render: (r: any) => r.assigned_employee ? <span className="text-[13px]">{r.assigned_employee}</span> : <span className="text-mute text-[12px]">Available</span> },
    { key: 'status', header: 'Status' },
  ] },
  { key: 'performance', label: 'Performance', group: 'Assets & Performance', clientFilter: true, siteFilter: true, periodFilter: true, columns: [
    { key: 'employee_code', header: 'Code', className: 'font-mono text-[11px]' },
    { key: 'name', header: 'Name', render: (r: any) => <span className="text-[13px] font-medium text-ink">{r.first_name} {r.last_name}</span> },
    { key: 'designation', header: 'Designation' },
    { key: 'review_period', header: 'Period' },
    { key: 'review_type', header: 'Type' },
    { key: 'overall_rating', header: 'Rating', render: (r: any) => r.overall_rating ? <span className="font-medium">{r.overall_rating}</span> : <span className="text-mute">—</span> },
    { key: 'status', header: 'Status' },
  ] },
]

const GROUPS = ['Master', 'Attendance', 'Payroll', 'Workforce', 'Assets & Performance'] as const

export default function ReportsPage() {
  const [active, setActive] = useState('employee-master')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [siteOptions, setSiteOptions] = useState<any[]>([])

  const def = REPORTS.find(r => r.key === active)!

  const now = new Date()
  const params = { ...filters }
  if (def.needsMonth) {
    if (!params.month) params.month = String(now.getMonth() + 1)
    if (!params.year) params.year = String(now.getFullYear())
  }
  if (def.needsYear && !params.year) params.year = String(now.getFullYear())
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['report', active, params], queryFn: () => reportApi.get(active, params) })
  const { data: clients } = useQuery({ queryKey: ['reports-clients'], queryFn: () => clientApi.list() })
  useQuery({ queryKey: ['reports-sites'], queryFn: async () => { const r = await siteApi.list(); setSiteOptions((r.data || []) as any[]); return r } })

  const rows = (data?.data || []) as any[]
  const meta: any = data?.meta

  const set = (k: string, v: string) => setFilters(f => ({ ...f, [k]: v }))
  const reset = () => setFilters({})

  const clientPills = (clients?.data || [])
  const currentClientId = filters.client_id

  const showMonth = def.needsMonth
  const showYear = def.needsYear
  const showRange = def.needsRange
  const showClient = (def.clientFilter && !['by-site'].includes(active)) || (active === 'by-site')
  const showSite = def.siteFilter
  const assetsTypes = def.assetTypeFilter ? ['Laptop', 'Mobile', 'ID Card', 'Uniform', 'Tools', 'Vehicle'] : null

  return (
    <div>
      <PageHeader
        title="Reports & MIS"
        subtitle={def.label + ' Report'}
        actions={rows.length > 0 ? <Button variant="secondary" onClick={() => downloadCsv(rows, `staffsway-${active}`)}><Download className="w-3.5 h-3.5" /> Export CSV</Button> : undefined}
      />

      {/* Grouped report picker */}
      <div className="flex flex-wrap gap-6 mt-2 mb-4">
        {GROUPS.map(g => (
          <div key={g} className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.08em] font-mono text-mute font-medium">{g}</span>
            <div className="flex flex-wrap gap-1.5">
              {REPORTS.filter(r => r.group === g).map(r => (
                <button
                  key={r.key}
                  onClick={() => setActive(r.key)}
                  className={`px-3 h-7 text-[12px] font-medium rounded-xs transition-colors ${active === r.key ? 'bg-ink text-white' : 'bg-white text-body border border-hairline hover:border-ink/40 hover:text-ink'}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-end mt-2">
        {showMonth && (
          <select value={filters.month || ''} onChange={e => set('month', e.target.value)} className="h-9 px-2 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink">
            <option value="">All Months</option>
            {MONTHS.map(m => <option key={m} value={m}>{new Date(2000, m - 1).toLocaleDateString('en-US', { month: 'long' })}</option>)}
          </select>
        )}
        {showYear && (
          <select value={filters.year || ''} onChange={e => set('year', e.target.value)} className="h-9 px-2 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink">
            <option value="">Year</option>
            {['2024', '2025', '2026', '2027'].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
        {showRange && (
          <>
            <input type="date" value={filters.from || ''} onChange={e => set('from', e.target.value)} className="h-9 px-2 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink" />
            <input type="date" value={filters.to || ''} onChange={e => set('to', e.target.value)} className="h-9 px-2 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink" />
          </>
        )}
        <select value={filters.client_id || ''} onChange={e => set('client_id', e.target.value)} className="h-9 px-2 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink">
          <option value="">All Clients</option>
          {clientPills.map((c: any) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
        </select>
        {showSite && (
          <select value={filters.site_id || ''} onChange={e => set('site_id', e.target.value)} className="h-9 px-2 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink">
            <option value="">All Sites</option>
            {siteOptions.map((s: any) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
          </select>
        )}
        {def.statusFilter && (
          <select value={filters.status || ''} onChange={e => set('status', e.target.value)} className="h-9 px-2 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink">
            <option value="">All Status</option>
            {['active', 'inactive', 'resigned', 'terminated'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        )}
        {def.periodFilter && (
          <input value={filters.period || ''} onChange={e => set('period', e.target.value)} placeholder="Period e.g. Q1 2026" className="h-9 w-36 px-2 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink" />
        )}
        {assetsTypes && (
          <select value={filters.asset_type || ''} onChange={e => set('asset_type', e.target.value)} className="h-9 px-2 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink">
            <option value="">All Types</option>
            {assetsTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        {def.expenseCategory && (
          <select value={filters.category || ''} onChange={e => set('category', e.target.value)} className="h-9 px-2 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink">
            <option value="">All Categories</option>
            {['Salaries', 'Transport', 'Uniforms', 'Training', 'Equipment', 'Utilities', 'Marketing'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {(showMonth || showRange || showYear || filters.client_id || filters.site_id) && (
          <button onClick={reset} className="h-9 px-3 text-[12px] font-medium text-mute hover:text-ink rounded-sm border border-hairline bg-white">Reset</button>
        )}
      </div>

      <div className="bg-white card-shadow rounded-md p-4 mt-4">
        {isLoading ? <LoadingState /> : error ? <PageError onRetry={() => refetch()} /> : rows.length === 0 ? <EmptyState icon={BarChart3} title="No data" description="No records found for the selected filter." /> : (
          <div>
            {meta && (
              <div className="flex flex-wrap gap-x-5 gap-y-1 mb-3 text-[12px] text-body">
                {active === 'attendance' || active === 'payroll-register' || active === 'bank-statement' || active === 'pf' || active === 'esi' ? (
                  <span>Period: <span className="font-medium">{monthYear(Number(filters.month || 8), Number(filters.year || 2026))}</span></span>
                ) : null}
                {meta?.summary && Object.entries(meta.summary).map(([k, v]: [string, any]) => (
                  <span key={k} className="capitalize">{k.replace(/_/g, ' ')}: <span className="font-medium">{v}</span></span>
                ))}
                {active === 'attrition' && (
                  <>
                    <span>Year: <span className="font-medium">{meta.year}</span></span>
                    <span>Joinings: <span className="font-medium">{meta.total_joinings}</span></span>
                    <span>Exits: <span className="font-medium">{meta.total_exits}</span></span>
                    <span>Attrition: <span className="font-medium text-error">{meta.attrition_rate}%</span></span>
                  </>
                )}
                {meta?.total_ot_hours !== undefined && <span>Total OT: <span className="font-medium">{meta.total_ot_hours} hrs</span></span>}
                {meta?.totals && <span>Gross: <span className="font-medium">{money(meta.totals.gross)}</span> | Deductions: <span className="font-medium">{money(meta.totals.deductions)}</span> | Net: <span className="font-medium">{money(meta.totals.net)}</span></span>}
                {active === 'bank-statement' && meta && (
                  <>
                    <span>Employees: <span className="font-medium">{meta.employee_count}</span></span>
                    <span>Total Net Payable: <span className="font-medium">{money(meta.total_net || 0)}</span></span>
                    {meta.missing_bank_details > 0 ? <span className="text-error">⚠ {meta.missing_bank_details} missing bank details</span> : <span className="text-success">All bank details present</span>}
                  </>
                )}
                {active === 'pf' && meta && (
                  <>
                    <span>Employee PF: <span className="font-medium">{money(meta.total_employee_pf)}</span></span>
                    <span>Employer PF: <span className="font-medium">{money(meta.total_employer_pf)}</span></span>
                    <span>Total: <span className="font-medium">{money(meta.total_pf)}</span></span>
                  </>
                )}
                {active === 'esi' && meta && (
                  <>
                    <span>Employee ESI: <span className="font-medium">{money(meta.total_employee_esi)}</span></span>
                    <span>Employer ESI: <span className="font-medium">{money(meta.total_employer_esi)}</span></span>
                    <span>Total: <span className="font-medium">{money(meta.total_esi)}</span></span>
                  </>
                )}
                {active === 'expense' && meta && (
                  <>
                    <span>Expenses: <span className="font-medium">{meta.expense_count}</span></span>
                    <span>Total: <span className="font-medium text-error">{money(meta.total_expense)}</span></span>
                    <span>By Category: <span className="font-medium">{Object.entries(meta.by_category || {}).map(([k, v]: [string, any]) => `${k} (${money(v)})`).join(', ')}</span></span>
                  </>
                )}
                {active === 'asset' && meta && (
                  <>
                    <span>Assets: <span className="font-medium">{meta.total}</span></span>
                    <span>Total Value: <span className="font-medium">{money(meta.total_value)}</span></span>
                    {Object.entries(meta.by_status || {}).map(([k, v]: [string, any]) => <span key={k} className="capitalize">{k}: <span className="font-medium">{v}</span></span>)}
                  </>
                )}
                {active === 'performance' && meta && (
                  <>
                    <span>Reviews: <span className="font-medium">{meta.total}</span></span>
                    {meta.avg_rating != null && <span>Avg Rating: <span className="font-medium">{meta.avg_rating}</span></span>}
                    {Object.entries(meta.by_status || {}).map(([k, v]: [string, any]) => <span key={k} className="capitalize">{k}: <span className="font-medium">{v}</span></span>)}
                  </>
                )}
                {active === 'leave' && meta?.summary && meta.summary.length > 0 && (
                  <span>Emails/Summary: <span className="font-medium">{meta.summary.length} employee-leave rows</span></span>
                )}
              </div>
            )}
            <Table columns={def.columns} data={rows} keyFn={(r) => (r as any).id ? String((r as any).id) : `${active}-${(r as any).employee_code || Math.random()}`} />
          </div>
        )}
      </div>
    </div>
  )
}
