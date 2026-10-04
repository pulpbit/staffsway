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
  columns: { key: string; header: string; className?: string; hideSm?: boolean; render?: (r: any) => any }[]
}

const REPORTS: ReportDef[] = [
  // Master
  { key: 'employee-master', label: 'Employee Master', group: 'Master', clientFilter: true, siteFilter: true, statusFilter: true, columns: [
    { key: 'employee_code', header: 'Code', className: 'font-mono text-xs font-bold text-blue-700' },
    { key: 'name', header: 'Name', render: (r: any) => <span className="text-xs font-bold text-slate-900">{r.first_name} {r.last_name}</span> },
    { key: 'designation', header: 'Designation' },
    { key: 'department', header: 'Department' },
    { key: 'employee_type', header: 'Type' },
    { key: 'shift_type', header: 'Shift' },
    { key: 'client_name', header: 'Client' },
    { key: 'site_name', header: 'Site', hideSm: true },
    { key: 'joining_date', header: 'Joined', render: (r: any) => dateShort(r.joining_date) },
    { key: 'status', header: 'Status' },
  ] },
  { key: 'employees', label: 'Workforce Roster', group: 'Master', clientFilter: true, siteFilter: true, statusFilter: true, columns: [
    { key: 'employee_code', header: 'Code', className: 'font-mono text-xs font-bold text-blue-700' },
    { key: 'name', header: 'Name', render: (r: any) => <span className="text-xs font-bold text-slate-900">{r.first_name} {r.last_name}</span> },
    { key: 'designation', header: 'Designation' },
    { key: 'client_name', header: 'Client' },
    { key: 'site_name', header: 'Site' },
    { key: 'basic', header: 'Basic Pay', render: (r: any) => `₹${money(r.basic || 0)}` },
    { key: 'status', header: 'Status' },
  ] },

  // Attendance
  { key: 'attendance', label: 'Monthly Attendance Roster', group: 'Attendance', needsMonth: true, clientFilter: true, siteFilter: true, columns: [
    { key: 'employee_code', header: 'Code', className: 'font-mono text-xs font-bold text-blue-700' },
    { key: 'name', header: 'Name', render: (r: any) => <span className="text-xs font-bold text-slate-900">{r.first_name} {r.last_name}</span> },
    { key: 'present_days', header: 'Present', render: (r: any) => <strong className="text-emerald-700">{r.present_days}</strong> },
    { key: 'absent_days', header: 'Absent', render: (r: any) => <strong className="text-rose-600">{r.absent_days}</strong> },
    { key: 'paid_leave', header: 'Paid Leave' },
    { key: 'unpaid_leave', header: 'Unpaid Leave' },
    { key: 'ot_hours', header: 'OT Hours' },
    { key: 'attendance_percent', header: 'Rate %', render: (r: any) => <strong className="text-blue-700">{r.attendance_percent}%</strong> },
    { key: 'status', header: 'Status' },
  ] },
  { key: 'late-early', label: 'Late Arrival & Early Exit', group: 'Attendance', needsMonth: true, clientFilter: true, siteFilter: true, columns: [
    { key: 'employee_code', header: 'Code', className: 'font-mono text-xs font-bold text-blue-700' },
    { key: 'name', header: 'Name', render: (r: any) => <span className="text-xs font-bold text-slate-900">{r.first_name} {r.last_name}</span> },
    { key: 'department', header: 'Department' },
    { key: 'present_days', header: 'Present' },
    { key: 'late_marks', header: 'Late Marks', render: (r: any) => <span className={r.late_marks > 2 ? 'text-rose-600 font-bold' : undefined}>{r.late_marks}</span> },
    { key: 'early_departures', header: 'Early Exits', render: (r: any) => <span className={r.early_departures > 2 ? 'text-rose-600 font-bold' : undefined}>{r.early_departures}</span> },
    { key: 'site_name', header: 'Site', hideSm: true },
  ] },
  { key: 'leave', label: 'Leave Applications MIS', group: 'Attendance', needsRange: true, clientFilter: true, siteFilter: true, columns: [
    { key: 'employee_code', header: 'Code', className: 'font-mono text-xs font-bold text-blue-700' },
    { key: 'name', header: 'Name', render: (r: any) => <span className="text-xs font-bold text-slate-900">{r.first_name} {r.last_name}</span> },
    { key: 'leave_type', header: 'Leave Category' },
    { key: 'start_date', header: 'Start Date', render: (r: any) => dateShort(r.start_date) },
    { key: 'end_date', header: 'End Date', render: (r: any) => dateShort(r.end_date) },
    { key: 'days', header: 'Days' },
    { key: 'status', header: 'Status' },
  ] },
  { key: 'ot', label: 'Overtime Register', group: 'Attendance', needsMonth: true, clientFilter: true, siteFilter: true, columns: [
    { key: 'employee_code', header: 'Code', className: 'font-mono text-xs font-bold text-blue-700' },
    { key: 'name', header: 'Name', render: (r: any) => <span className="text-xs font-bold text-slate-900">{r.first_name} {r.last_name}</span> },
    { key: 'designation', header: 'Designation' },
    { key: 'client_name', header: 'Client' },
    { key: 'present_days', header: 'Present' },
    { key: 'ot_hours', header: 'OT Hours', render: (r: any) => <strong className="text-amber-700">{r.ot_hours} hrs</strong> },
    { key: 'hourly_rate', header: 'Rate / Hr', render: (r: any) => `₹${money(r.hourly_rate || 0)}` },
    { key: 'ot_amount', header: 'OT Payout', render: (r: any) => <strong className="text-emerald-700 font-mono">₹${money(r.ot_amount)}</strong> },
  ] },

  // Payroll
  { key: 'payroll-register', label: 'Monthly Payroll Register', group: 'Payroll', needsMonth: true, clientFilter: true, siteFilter: true, columns: [
    { key: 'employee_code', header: 'Code', className: 'font-mono text-xs font-bold text-blue-700' },
    { key: 'name', header: 'Name', render: (r: any) => <span className="text-xs font-bold text-slate-900">{r.first_name} {r.last_name}</span> },
    { key: 'gross', header: 'Gross Earnings', render: (r: any) => `₹${money(r.gross)}` },
    { key: 'pf', header: 'PF', render: (r: any) => `₹${money(r.pf)}` },
    { key: 'esic', header: 'ESIC', render: (r: any) => `₹${money(r.esic)}` },
    { key: 'professional_tax', header: 'PT', render: (r: any) => `₹${money(r.professional_tax)}` },
    { key: 'total_deductions', header: 'Total Deductions', render: (r: any) => <strong className="text-rose-600 font-mono">₹${money(r.total_deductions)}</strong> },
    { key: 'net_salary', header: 'Net Payout', render: (r: any) => <strong className="text-emerald-700 font-black font-mono">₹${money(r.net_salary)}</strong> },
    { key: 'status', header: 'Status' },
  ] },
  { key: 'bank-statement', label: 'Bank Disbursement File', group: 'Payroll', needsMonth: true, clientFilter: true, siteFilter: true, columns: [
    { key: 'employee_code', header: 'Code', className: 'font-mono text-xs font-bold text-blue-700' },
    { key: 'name', header: 'Name', render: (r: any) => <span className="text-xs font-bold text-slate-900">{r.first_name} {r.last_name}</span> },
    { key: 'bank_name', header: 'Bank Name', render: (r: any) => r.bank_name || <span className="text-rose-600 text-xs">Missing</span> },
    { key: 'bank_account', header: 'A/C Number', render: (r: any) => r.bank_account ? <span className="font-mono text-xs">{r.bank_account}</span> : <span className="text-rose-600 text-xs">Missing</span> },
    { key: 'bank_ifsc', header: 'IFSC Code', render: (r: any) => r.bank_ifsc ? <span className="font-mono text-xs">{r.bank_ifsc}</span> : <span className="text-rose-600 text-xs">Missing</span> },
    { key: 'net_salary', header: 'Disbursement Amount', render: (r: any) => <strong className="text-emerald-700 font-black font-mono">₹${money(r.net_salary)}</strong> },
    { key: 'payroll_status', header: 'Status' },
  ] },
  { key: 'pf', label: 'EPF Statutory Report', group: 'Payroll', needsMonth: true, clientFilter: true, siteFilter: true, columns: [
    { key: 'employee_code', header: 'Code', className: 'font-mono text-xs font-bold text-blue-700' },
    { key: 'name', header: 'Name', render: (r: any) => <span className="text-xs font-bold text-slate-900">{r.first_name} {r.last_name}</span> },
    { key: 'uan', header: 'UAN No.', className: 'font-mono text-xs', render: (r: any) => r.uan || <span className="text-slate-400">—</span> },
    { key: 'epf_wages', header: 'PF Wages', render: (r: any) => `₹${money(r.epf_wages)}` },
    { key: 'employee_pf', header: 'Employee PF (12%)', render: (r: any) => <strong className="text-blue-700">₹${money(r.employee_pf)}</strong> },
    { key: 'employer_pf', header: 'Employer PF (3.67%)', render: (r: any) => `₹${money(r.employer_pf)}` },
    { key: 'eps_wages', header: 'EPS (8.33%)', render: (r: any) => <strong className="text-purple-700">₹${money(r.eps_wages)}</strong> },
  ] },
  { key: 'esi', label: 'ESIC Statutory Report', group: 'Payroll', needsMonth: true, clientFilter: true, siteFilter: true, columns: [
    { key: 'employee_code', header: 'Code', className: 'font-mono text-xs font-bold text-blue-700' },
    { key: 'name', header: 'Name', render: (r: any) => <span className="text-xs font-bold text-slate-900">{r.first_name} {r.last_name}</span> },
    { key: 'gross', header: 'Gross Wage', render: (r: any) => `₹${money(r.gross)}` },
    { key: 'employee_esi', header: 'Employee ESI (0.75%)', render: (r: any) => <strong className="text-emerald-700">₹${money(r.employee_esi)}</strong> },
    { key: 'employer_esi', header: 'Employer ESI (3.25%)', render: (r: any) => `₹${money(r.employer_esi)}` },
    { key: 'total_esi', header: 'Total ESI Remittance', render: (r: any) => <strong className="text-slate-900 font-black">₹${money(r.total_esi)}</strong> },
  ] },

  // Workforce
  { key: 'dept-manpower', label: 'Department Headcount MIS', group: 'Workforce', clientFilter: true, siteFilter: true, columns: [
    { key: 'department', header: 'Department', render: (r: any) => <span className="text-xs font-bold text-slate-900">{r.department || '—'}</span> },
    { key: 'total_count', header: 'Total Deployed', render: (r: any) => <strong className="text-blue-700">{r.total_count}</strong> },
    { key: 'active_count', header: 'Active Staff' },
    { key: 'permanent_count', header: 'Permanent' },
    { key: 'contract_count', header: 'Contractual' },
  ] },
  { key: 'attrition', label: 'Annual Attrition & Retention', group: 'Workforce', needsYear: true, clientFilter: true, siteFilter: true, columns: [
    { key: 'month', header: 'Month', render: (r: any) => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][r.month - 1] },
    { key: 'joinings', header: 'New Joiners', render: (r: any) => <strong className="text-emerald-700">+{r.joinings}</strong> },
    { key: 'exits', header: 'Exits / Resignations', render: (r: any) => <strong className="text-rose-600">-{r.exits}</strong> },
  ] },
  { key: 'by-client', label: 'Client Deployment MIS', group: 'Workforce', columns: [
    { key: 'client_name', header: 'Client Enterprise', render: (r: any) => <span className="text-xs font-bold text-slate-900">{r.client_name}</span> },
    { key: 'employee_count', header: 'Headcount', render: (r: any) => <strong className="text-blue-700">{r.employee_count}</strong> },
    { key: 'site_count', header: 'Active Sites', render: (r: any) => `${r.site_count} Sites` },
    { key: 'contact_person', header: 'Primary POC' },
    { key: 'status', header: 'Status' },
  ] },

  // Assets & Performance
  { key: 'asset', label: 'Assets Assignment Report', group: 'Assets & Performance', columns: [
    { key: 'asset_code', header: 'Asset ID', className: 'font-mono text-xs font-bold text-blue-700' },
    { key: 'name', header: 'Asset Description' },
    { key: 'type', header: 'Category' },
    { key: 'employee_name', header: 'Assigned To' },
    { key: 'status', header: 'Status' },
  ] },
  { key: 'performance', label: 'Appraisal Reviews Report', group: 'Assets & Performance', columns: [
    { key: 'employee_name', header: 'Employee' },
    { key: 'cycle_name', header: 'Appraisal Cycle' },
    { key: 'rating', header: 'Final Rating', render: (r: any) => <strong className="text-amber-600 font-bold">{r.rating} / 5.0</strong> },
    { key: 'status', header: 'Review Status' },
  ] },
]

const GROUPS = ['Master', 'Attendance', 'Payroll', 'Workforce', 'Assets & Performance']
const now = new Date()

export default function ReportsPage() {
  const [active, setActive] = useState('employee-master')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [siteOptions, setSiteOptions] = useState<any[]>([])

  const def = REPORTS.find(r => r.key === active) || REPORTS[0]

  const params: Record<string, string> = { ...filters }
  if (def.needsMonth && !params.month) params.month = String(now.getMonth() + 1)
  if (def.needsMonth && !params.year) params.year = String(now.getFullYear())
  if (def.needsYear && !params.year) params.year = String(now.getFullYear())

  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['report', active, params], queryFn: () => reportApi.get(active, params) })
  const { data: clients } = useQuery({ queryKey: ['reports-clients'], queryFn: () => clientApi.list() })
  useQuery({ queryKey: ['reports-sites'], queryFn: async () => { const r = await siteApi.list(); setSiteOptions((r.data || []) as any[]); return r } })

  const rows = (data?.data || []) as any[]
  const meta: any = data?.meta
  const group = def.group

  return (
    <div className="space-y-5">
      <PageHeader
        title="Enterprise Reports &amp; Analytics Hub"
        description={`${REPORTS.length} operational, statutory &amp; workforce reports across 5 major HRMS departments`}
        actions={
          rows.length > 0 && (
            <button
              type="button"
              onClick={() => downloadCsv(rows, `staffsway-${active}`)}
              className="h-10 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-2 shadow-2xs transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-blue-600" />
              <span>Export CSV</span>
            </button>
          )
        }
      />

      {/* Category Pills */}
      <div className="flex gap-2.5 overflow-x-auto scrollbar-thin pb-1">
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
              className={`flex items-center gap-2.5 px-4 h-12 rounded-2xl border transition-all cursor-pointer shrink-0 ${
                activeGroup
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                  : 'bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                activeGroup ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'
              }`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex flex-col text-left leading-tight">
                <span className="text-xs font-bold">{g}</span>
                <span className={`text-[10px] ${activeGroup ? 'text-blue-100' : 'text-slate-400'}`}>{gm.desc}</span>
              </div>
              <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeGroup ? 'bg-white text-blue-700' : 'bg-slate-100 text-slate-600'
              }`}>{gCount}</span>
            </button>
          )
        })}
      </div>

      {/* Report Switcher Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
        {REPORTS.filter(r => r.group === group).map(r => {
          const rm = REPORT_META[r.key]
          const Icon = rm?.icon || BarChart3
          const selected = r.key === active
          return (
            <button
              key={r.key}
              onClick={() => setActive(r.key)}
              className={`text-left bg-white rounded-2xl p-4 border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                selected
                  ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                  : 'border-slate-200/80 hover:border-blue-300 hover:bg-slate-50/60'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <h4 className={`text-xs sm:text-[13px] font-bold truncate ${selected ? 'text-blue-900' : 'text-slate-900'}`}>
                    {r.label}
                  </h4>
                  <p className="text-[11px] text-slate-500 truncate">{rm?.desc}</p>
                </div>
              </div>
              {selected ? (
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3" />
                </span>
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              )}
            </button>
          )
        })}
      </div>

      {/* Main Report Table & Content */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">{def.label}</h3>
            <span className="text-xs text-slate-500 font-medium">({rows.length} records generated)</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {def.needsMonth && (
              <>
                <NativeSelect className="w-36" value={String(filters.month || now.getMonth() + 1)} onChange={(v) => setFilters(f => ({ ...f, month: v }))} options={MONTHS.map(m => ({ value: String(m), label: new Date(2000, m - 1).toLocaleDateString('en-US', { month: 'long' }) }))} />
                <NativeSelect className="w-24" value={String(filters.year || now.getFullYear())} onChange={(v) => setFilters(f => ({ ...f, year: v }))} options={[2024, 2025, 2026, 2027].map(y => ({ value: String(y), label: String(y) }))} />
              </>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="p-8"><LoadingState /></div>
        ) : error ? (
          <PageError onRetry={() => refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState icon={BarChart3} title="No records match this report filter" description="Adjust the period or client filters above to load report results." />
        ) : (
          <Table columns={def.columns} data={rows} keyFn={(r: any) => r.id ?? r.employee_code ?? r[def.columns[0]?.key] ?? JSON.stringify(r)} minWidth="1000px" />
        )}
      </div>
    </div>
  )
}
