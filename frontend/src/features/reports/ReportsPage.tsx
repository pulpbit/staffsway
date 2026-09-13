import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportApi, clientApi, siteApi } from '@/services/api'
import { Table, StatCard } from '@/components/ui/data'
import { PageHeader } from '@/components/ui/layout'
import { type Tone } from '@/components/ui/status'
import { LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { NativeSelect } from '@/components/ui/actions'
import { Button } from '@/components/ui/fields'
import { money, monthYear, dateShort } from '@/utils/format'
import { downloadCsv } from '@/utils/csv'
import {
  Download, BarChart3, Users, UserRound, CalendarCheck, AlarmClock, CalendarDays, Timer, Workflow,
  IndianRupee, Wallet, Landmark, PiggyBank, HeartPulse, Receipt, Building2, UserPlus, UserMinus,
  TrendingDown, Building, MapPin, Activity, Package, Star, UsersRound, CalendarClock, Database, Check,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

const GROUP_META: Record<string, { icon: LucideIcon; desc: string }> = {
  Master: { icon: Database, desc: 'Core employee directories' },
  Attendance: { icon: CalendarClock, desc: 'Marking, late/early, leave and OT' },
  Payroll: { icon: IndianRupee, desc: 'Registers, statutory and bank payouts' },
  Workforce: { icon: UsersRound, desc: 'Deployment, joinings and attrition MIS' },
  'Assets & Performance': { icon: Package, desc: 'Asset tracking and performance reviews' },
}

const REPORT_META: Record<string, { icon: LucideIcon; desc: string }> = {
  'employee-master': { icon: UserRound, desc: 'Full employment records with salary and statutory flags' },
  employees: { icon: Users, desc: 'Active headcount with client, site and basic pay' },
  attendance: { icon: CalendarCheck, desc: 'Present, absent, leave and OT with attendance %' },
  'late-early': { icon: AlarmClock, desc: 'Late arrivals and early departures flagged per employee' },
  leave: { icon: CalendarDays, desc: 'Leave applications within a date range' },
  ot: { icon: Timer, desc: 'Overtime hours with OT earnings' },
  shift: { icon: Workflow, desc: 'Shift-wise deployment and occupancy' },
  'payroll-register': { icon: IndianRupee, desc: 'Full monthly pay computation with statutory deductions' },
  salary: { icon: Wallet, desc: 'Fixed monthly CTC components by employee' },
  'bank-statement': { icon: Landmark, desc: 'Net pay with bank details ready for disbursal' },
  pf: { icon: PiggyBank, desc: 'UAN-wise PF wages and employee/employer contributions' },
  esi: { icon: HeartPulse, desc: 'ESI gross and employee/employer contributions' },
  expense: { icon: Receipt, desc: 'Operational expenses with category totals' },
  'dept-manpower': { icon: Building2, desc: 'Department-wise deployment mix' },
  joining: { icon: UserPlus, desc: 'Employees joined within a date range' },
  exit: { icon: UserMinus, desc: 'Separations with reason and last working day' },
  attrition: { icon: TrendingDown, desc: 'Monthly joinings, exits and attrition rate' },
  'by-client': { icon: Building, desc: 'Headcount and site coverage per client' },
  'by-site': { icon: MapPin, desc: 'Deployment snapshot per site' },
  status: { icon: Activity, desc: 'Current employment status register' },
  asset: { icon: Package, desc: 'Asset inventory with assignment and value' },
  performance: { icon: Star, desc: 'Performance reviews with ratings' },
}

const cadence = (d: ReportDef) => (d.needsMonth ? 'Monthly' : d.needsRange ? 'Date range' : d.needsYear ? 'Yearly' : 'Snapshot')

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

  const group = def.group
  const hasFilters = showMonth || showYear || showRange || showClient || showSite || def.statusFilter || def.periodFilter || !!assetsTypes || def.expenseCategory
  const period = monthYear(Number(filters.month || now.getMonth() + 1), Number(filters.year || now.getFullYear()))

  const metaCards: () => { label: string; value: string | number; sub?: string; tone?: Tone; icon?: LucideIcon }[] = () => {
    const cards: any[] = []
    if (meta) {
      if (active === 'attendance' || active === 'payroll-register' || active === 'bank-statement' || active === 'pf' || active === 'esi') {
        cards.push({ label: 'Period', value: period, icon: CalendarClock, tone: 'primary' })
      }
      if (meta.totals) {
        cards.push({ label: 'Gross', value: money(meta.totals.gross), icon: IndianRupee, tone: 'primary' })
        cards.push({ label: 'Deductions', value: money(meta.totals.deductions), icon: Landmark, tone: 'neutral' })
        cards.push({ label: 'Net Payable', value: money(meta.totals.net), icon: Wallet, tone: 'success' })
      }
      if (meta.total_ot_hours !== undefined) {
        cards.push({ label: 'Total OT', value: `${meta.total_ot_hours} hrs`, icon: Timer, tone: 'info' })
      }
      if (active === 'attrition') {
        cards.push({ label: 'Year', value: meta.year, icon: CalendarDays, tone: 'primary' })
        cards.push({ label: 'Joinings', value: meta.total_joinings ?? 0, icon: UserPlus, tone: 'success' })
        cards.push({ label: 'Exits', value: meta.total_exits ?? 0, icon: UserMinus, tone: 'danger' })
        cards.push({ label: 'Attrition', value: `${meta.attrition_rate}%`, sub: Number(meta.attrition_rate) > 20 ? 'High churn' : 'Healthy range', icon: TrendingDown, tone: Number(meta.attrition_rate) > 20 ? 'danger' : 'success' })
      }
      if (active === 'bank-statement') {
        cards.push({ label: 'Employees', value: meta.employee_count ?? 0, icon: Users, tone: 'neutral' })
        cards.push({ label: 'Total Net Payable', value: money(meta.total_net || 0), icon: Landmark, tone: 'primary' })
        meta.missing_bank_details > 0
          ? cards.push({ label: 'Missing Bank', value: `${meta.missing_bank_details} employees`, sub: 'Blocked for disbursal', icon: UserRound, tone: 'danger' })
          : cards.push({ label: 'Bank Details', value: 'All present', icon: Check, tone: 'success' })
      }
      if (active === 'pf' && meta) {
        cards.push({ label: 'Employee PF', value: money(meta.total_employee_pf), icon: PiggyBank, tone: 'neutral' })
        cards.push({ label: 'Employer PF', value: money(meta.total_employer_pf), icon: Building, tone: 'primary' })
        cards.push({ label: 'Total PF', value: money(meta.total_pf), icon: Wallet, tone: 'success' })
      }
      if (active === 'esi' && meta) {
        cards.push({ label: 'Employee ESI', value: money(meta.total_employee_esi), icon: HeartPulse, tone: 'neutral' })
        cards.push({ label: 'Employer ESI', value: money(meta.total_employer_esi), icon: Building, tone: 'primary' })
        cards.push({ label: 'Total ESI', value: money(meta.total_esi), icon: Wallet, tone: 'success' })
      }
      if (active === 'expense' && meta) {
        cards.push({ label: 'Expenses', value: meta.expense_count ?? 0, icon: Receipt, tone: 'neutral' })
        cards.push({ label: 'Total Spent', value: money(meta.total_expense), sub: Object.entries(meta.by_category || {}).map(([k, v]: [string, any]) => `${k} ${money(v)}`).join(' · '), icon: IndianRupee, tone: 'danger' })
      }
      if (active === 'asset' && meta) {
        cards.push({ label: 'Assets', value: meta.total ?? 0, icon: Package, tone: 'neutral' })
        cards.push({ label: 'Total Value', value: money(meta.total_value), icon: IndianRupee, tone: 'primary' })
        Object.entries(meta.by_status || {}).slice(0, 3).forEach(([k, v]: [string, any]) => {
          const ok = ['available', 'active'].includes(k)
          cards.push({ label: k.replace(/_/g, ' '), value: v, icon: k === 'assigned' ? UserRound : Package, tone: ok ? 'success' : 'warning' })
        })
      }
      if (active === 'performance' && meta) {
        cards.push({ label: 'Reviews', value: meta.total ?? 0, icon: Star, tone: 'neutral' })
        if (meta.avg_rating != null) cards.push({ label: 'Avg Rating', value: meta.avg_rating, icon: Star, tone: Number(meta.avg_rating) >= 3.5 ? 'success' : 'warning' })
        Object.entries(meta.by_status || {}).slice(0, 2).forEach(([k, v]: [string, any]) => {
          cards.push({ label: k.replace(/_/g, ' '), value: v, icon: BarChart3, tone: k === 'completed' ? 'success' : 'warning' })
        })
      }
      if (active === 'leave' && Array.isArray(meta.summary)) {
        cards.push({ label: 'Leave Rows', value: meta.summary.length, icon: CalendarDays, tone: 'neutral' })
      }
      if (meta.summary && !Array.isArray(meta.summary)) {
        Object.entries(meta.summary).forEach(([k, v]: [string, any], i) => {
          cards.push({ label: k.replace(/_/g, ' '), value: v, icon: i % 2 ? CalendarClock : BarChart3, tone: 'info' })
        })
      }
    }
    cards.push({ label: 'Records', value: rows.length, icon: BarChart3, tone: 'primary' })
    return cards.slice(0, 5)
  }

  return (
    <div>
      <PageHeader
        title="Reports & MIS"
        description={`${REPORTS.length} operational and statutory reports across ${GROUPS.length} categories`}
        actions={rows.length > 0 ? <Button variant="secondary" onClick={() => downloadCsv(rows, `staffsway-${active}`)}><Download className="w-3.5 h-3.5" /> Export CSV</Button> : undefined}
      />

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1 mb-4">
        {GROUPS.map(g => {
          const gm = GROUP_META[g]
          const Icon = gm.icon
          const gCount = REPORTS.filter(r => r.group === g).length
          const activeGroup = g === group
          const firstKey = REPORTS.find(r => r.group === g)!.key
          return (
            <button
              key={g}
              onClick={() => setActive(firstKey)}
              className={`group/tab flex items-center gap-2.5 px-3.5 h-11 rounded-md border transition-all cursor-pointer shrink-0 ${activeGroup ? 'bg-navy text-white border-navy shadow-md' : 'bg-white text-body border-hairline hover:border-navy-mid/40 hover:text-ink'}`}
            >
              <span className={`inline-flex w-7 h-7 rounded-xs items-center justify-center shrink-0 ${activeGroup ? 'bg-white/10 text-gold' : 'bg-navy-soft text-navy-mid'}`}>
                <Icon className="w-3.5 h-3.5" />
              </span>
              <span className="flex flex-col items-start leading-tight">
                <span className="text-[12px] font-semibold whitespace-nowrap">{g}</span>
                <span className={`text-[10px] whitespace-nowrap ${activeGroup ? 'text-white/60' : 'text-mute'}`}>{gm.desc}</span>
              </span>
              <span className={`ml-1 inline-flex items-center h-4.5 px-1.5 rounded-full text-[10px] font-semibold ${activeGroup ? 'bg-gold text-navy' : 'bg-canvas-soft-2 text-mute'}`}>{gCount}</span>
            </button>
          )
        })}
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mb-5">
        {REPORTS.filter(r => r.group === group).map(r => {
          const rm = REPORT_META[r.key]
          const Icon = rm?.icon || BarChart3
          const selected = r.key === active
          return (
            <button
              key={r.key}
              onClick={() => setActive(r.key)}
              className={`group/rep relative text-left bg-white card-shadow rounded-md p-4 border-2 transition-all cursor-pointer overflow-hidden ${selected ? 'border-navy-mid' : 'border-transparent hover:border-hairline hover:-translate-y-0.5'}`}
            >
              {selected && <span className="absolute left-0 top-0 bottom-0 w-1 bg-gold" aria-hidden />}
              <div className="flex items-start justify-between gap-2">
                <span className={`inline-flex w-9 h-9 rounded-sm items-center justify-center shrink-0 transition-colors ${selected ? 'bg-navy text-gold' : 'bg-navy-soft text-navy-mid'}`}>
                  <Icon className="w-4 h-4" />
                </span>
                {selected ? (
                  <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded-full bg-gold-soft text-gold-deep text-[10px] font-semibold"><Check className="w-3 h-3" /> Selected</span>
                ) : (
                  <ChevronRight className="w-4 h-4 text-mute/40 group-hover/rep:text-navy-mid transition-colors" />
                )}
              </div>
              <p className="mt-2.5 text-[13px] font-semibold text-ink leading-snug">{r.label}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-mute line-clamp-2">{rm?.desc || '…'}</p>
              <span className={`mt-2 inline-flex items-center h-5 px-2 rounded-full text-[10px] font-medium ${selected ? 'bg-navy-soft text-navy-mid' : 'bg-canvas-soft-2 text-mute'}`}>{cadence(r)}</span>
            </button>
          )
        })}
      </div>

      {hasFilters && (
        <div className="bg-white card-shadow rounded-md p-3 mb-4">
          <div className="flex flex-wrap gap-2 items-end">
            {showMonth && (
              <NativeSelect className="w-40" value={filters.month || ''} onChange={v => set('month', v)} options={[{ value: '', label: 'All Months' }, ...MONTHS.map(m => ({ value: String(m), label: new Date(2000, m - 1).toLocaleDateString('en-US', { month: 'long' }) }))]} />
            )}
            {showYear && (
              <NativeSelect className="w-28" value={filters.year || ''} onChange={v => set('year', v)} options={[{ value: '', label: 'Year' }, ...['2024', '2025', '2026', '2027'].map(y => ({ value: y, label: y }))]} />
            )}
            {showRange && (
              <>
                <input type="date" value={filters.from || ''} onChange={e => set('from', e.target.value)} className="h-9 px-2.5 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-navy-mid" />
                <input type="date" value={filters.to || ''} onChange={e => set('to', e.target.value)} className="h-9 px-2.5 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-navy-mid" />
              </>
            )}
            {showClient && (
              <NativeSelect className="w-44" value={filters.client_id || ''} onChange={v => set('client_id', v)} options={[{ value: '', label: 'All Clients' }, ...clientPills.map((c: any) => ({ value: String(c.id), label: c.name }))]} />
            )}
            {showSite && (
              <NativeSelect className="w-40" value={filters.site_id || ''} onChange={v => set('site_id', v)} options={[{ value: '', label: 'All Sites' }, ...siteOptions.map((s: any) => ({ value: String(s.id), label: s.name }))]} />
            )}
            {def.statusFilter && (
              <NativeSelect className="w-36" value={filters.status || ''} onChange={v => set('status', v)} options={[{ value: '', label: 'All Status' }, ...['active', 'inactive', 'resigned', 'terminated'].map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))]} />
            )}
            {def.periodFilter && (
              <input value={filters.period || ''} onChange={e => set('period', e.target.value)} placeholder="Period e.g. Q1 2026" className="h-9 w-40 px-2.5 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-navy-mid placeholder:text-mute" />
            )}
            {assetsTypes && (
              <NativeSelect className="w-36" value={filters.asset_type || ''} onChange={v => set('asset_type', v)} options={[{ value: '', label: 'All Types' }, ...assetsTypes.map(t => ({ value: t, label: t }))]} />
            )}
            {def.expenseCategory && (
              <NativeSelect className="w-40" value={filters.category || ''} onChange={v => set('category', v)} options={[{ value: '', label: 'All Categories' }, ...['Salaries', 'Transport', 'Uniforms', 'Training', 'Equipment', 'Utilities', 'Marketing'].map(c => ({ value: c, label: c }))]} />
            )}
            {(showMonth || showRange || showYear || filters.client_id || filters.site_id) && (
              <Button variant="secondary" size="sm" onClick={reset}>Reset</Button>
            )}
          </div>
        </div>
      )}

      <div className="bg-white card-shadow rounded-md p-4">
        {isLoading ? (
          <div className="py-2"><LoadingState /></div>
        ) : error ? (
          <PageError onRetry={() => refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState icon={BarChart3} title="No data" description="No records found for the selected report and filters." />
        ) : (
          <div>
            {meta && metaCards().length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-4">
                {metaCards().map(c => <StatCard key={c.label} label={c.label} value={c.value} sub={c.sub} tone={c.tone} icon={c.icon} />)}
              </div>
            )}
            <Table columns={def.columns} data={rows} keyFn={(r) => (r as any).id ? String((r as any).id) : `${active}-${(r as any).employee_code || Math.random()}`} />
          </div>
        )}
      </div>
    </div>
  )
}
