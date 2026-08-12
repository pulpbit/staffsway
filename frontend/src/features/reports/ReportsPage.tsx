import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportApi, clientApi, siteApi } from '@/services/api'
import { Table, Tabs } from '@/components/ui/data'
import { PageHeader, LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { Button, Select } from '@/components/ui/fields'
import { money, monthYear, fullName } from '@/utils/format'
import { downloadCsv } from '@/utils/csv'
import { BarChart3, Download, FileSpreadsheet } from 'lucide-react'

const REPORT_TABS = [
  { key: 'employees', label: 'Employee' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'payroll-register', label: 'Payroll Register' },
  { key: 'salary', label: 'Salary' },
  { key: 'by-client', label: 'By Client' },
  { key: 'by-site', label: 'By Site' },
  { key: 'ot', label: 'OT Report' },
  { key: 'status', label: 'Status' },
]

export default function ReportsPage() {
  const [active, setActive] = useState('employees')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const params = { ...filters }
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['report', active, filters], queryFn: () => reportApi.get(active, params) })
  const { data: clients } = useQuery({ queryKey: ['clients-select'], queryFn: () => clientApi.list() })
  const rows = (data?.data || []) as any[]

  const needsMonth = ['attendance', 'payroll-register', 'ot'].includes(active)

  const cols: Record<string, any[]> = {
    employees: [
      { key: 'employee_code', header: 'Code', className: 'font-mono text-[11px]' },
      { key: 'name', header: 'Name', render: (r: any) => <span className="text-[13px] font-medium text-ink">{r.first_name} {r.last_name}</span> },
      { key: 'designation', header: 'Designation' },
      { key: 'client_name', header: 'Client' },
      { key: 'site_name', header: 'Site' },
      { key: 'basic', header: 'Basic', render: (r: any) => money(r.basic || 0) },
      { key: 'status', header: 'Status' },
    ],
    attendance: [
      { key: 'employee_code', header: 'Code', className: 'font-mono text-[11px]' },
      { key: 'name', header: 'Name', render: (r: any) => <span className="text-[13px] font-medium text-ink">{r.first_name} {r.last_name}</span> },
      { key: 'present_days', header: 'Present' },
      { key: 'absent_days', header: 'Absent' },
      { key: 'paid_leave', header: 'Paid Lv' },
      { key: 'unpaid_leave', header: 'Unpaid Lv' },
      { key: 'ot_hours', header: 'OT Hrs' },
      { key: 'attendance_percent', header: '%', render: (r: any) => `${r.attendance_percent}%` },
      { key: 'status', header: 'Status' },
    ],
    'payroll-register': [
      { key: 'employee_code', header: 'Code', className: 'font-mono text-[11px]' },
      { key: 'name', header: 'Name', render: (r: any) => <span className="text-[13px] font-medium text-ink">{r.first_name} {r.last_name}</span> },
      { key: 'gross', header: 'Gross', render: (r: any) => money(r.gross) },
      { key: 'pf', header: 'PF', render: (r: any) => money(r.pf) },
      { key: 'esic', header: 'ESIC', render: (r: any) => money(r.esic) },
      { key: 'professional_tax', header: 'PT', render: (r: any) => money(r.professional_tax) },
      { key: 'total_deductions', header: 'Deductions', render: (r: any) => money(r.total_deductions) },
      { key: 'net_salary', header: 'Net', render: (r: any) => <span className="font-medium">{money(r.net_salary)}</span> },
      { key: 'status', header: 'Status' },
    ],
    salary: [
      { key: 'employee_code', header: 'Code', className: 'font-mono text-[11px]' },
      { key: 'name', header: 'Name', render: (r: any) => <span className="text-[13px] font-medium text-ink">{r.first_name} {r.last_name}</span> },
      { key: 'designation', header: 'Designation' },
      { key: 'client_name', header: 'Client' },
      { key: 'monthly_salary', header: 'Monthly', render: (r: any) => money(r.monthly_salary) },
      { key: 'overtime_rate', header: 'OT Rate', render: (r: any) => `${r.overtime_rate}/hr` },
    ],
    'by-client': [
      { key: 'client_name', header: 'Client', render: (r: any) => <span className="text-[13px] font-medium text-ink">{r.client_name}</span> },
      { key: 'employee_count', header: 'Employees' },
      { key: 'active_count', header: 'Active' },
      { key: 'site_count', header: 'Sites' },
      { key: 'contact_person', header: 'Contact' },
      { key: 'status', header: 'Status' },
    ],
    'by-site': [
      { key: 'site_name', header: 'Site', render: (r: any) => <span className="text-[13px] font-medium text-ink">{r.site_name}</span> },
      { key: 'client_name', header: 'Client' },
      { key: 'employee_count', header: 'Employees' },
      { key: 'active_count', header: 'Active' },
      { key: 'shift_type', header: 'Shift' },
      { key: 'status', header: 'Status' },
    ],
    ot: [
      { key: 'employee_code', header: 'Code', className: 'font-mono text-[11px]' },
      { key: 'name', header: 'Name', render: (r: any) => <span className="text-[13px] font-medium text-ink">{r.first_name} {r.last_name}</span> },
      { key: 'designation', header: 'Designation' },
      { key: 'client_name', header: 'Client' },
      { key: 'present_days', header: 'Present' },
      { key: 'ot_hours', header: 'OT Hrs' },
      { key: 'ot_amount', header: 'OT Amt', render: (r: any) => money(r.ot_amount) },
    ],
    status: [
      { key: 'status', header: 'Status', render: (r: any) => <span className={`text-[13px] font-medium ${r.status === 'active' ? 'text-success' : 'text-error'}`}>{r.status}</span> },
      { key: 'name', header: 'Name', render: (r: any) => <span>{r.first_name} {r.last_name}</span> },
      { key: 'employee_code', header: 'Code', className: 'font-mono text-[11px]' },
      { key: 'designation', header: 'Designation' },
      { key: 'client_name', header: 'Client' },
      { key: 'site_name', header: 'Site' },
    ],
  }

  const meta: any = data?.meta

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle={REPORT_TABS.find(t => t.key === active)?.label + ' Report'}
        actions={rows.length > 0 ? <Button variant="secondary" onClick={() => downloadCsv(rows, `staffsway-${active}`)}><Download className="w-3.5 h-3.5" /> Export CSV</Button> : undefined}
      />

      <Tabs tabs={REPORT_TABS} active={active} onChange={setActive} />

      {needsMonth && (
        <div className="flex gap-2 mt-4 mb-4">
          <select value={filters.month || ''} onChange={e => setFilters(f => ({ ...f, month: e.target.value }))} className="h-9 px-2 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink">
            <option value="">All</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{new Date(2000, m - 1).toLocaleDateString('en-US', { month: 'long' })}</option>)}
          </select>
          <input type="number" value={filters.year || ''} onChange={e => setFilters(f => ({ ...f, year: e.target.value }))} placeholder="Year" className="w-20 h-9 px-2 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink" />
          <Select options={[{ value: '', label: 'All Clients' }, ...(clients?.data || []).map((c: any) => ({ value: String(c.id), label: c.name }))]} value={filters.client_id || ''} onChange={e => setFilters(f => ({ ...f, client_id: e.target.value }))} className="w-40" />
        </div>
      )}

      <div className="bg-white card-shadow rounded-md p-4 mt-4">
        {isLoading ? <LoadingState /> : error ? <PageError onRetry={() => refetch()} /> : rows.length === 0 ? <EmptyState icon={BarChart3} title="No data" description="No records found for the selected filter." /> : (
          <div>
            {meta?.summary && (
              <div className="flex gap-4 mb-3 text-[12px] text-body">
                {Object.entries(meta.summary).map(([k, v]: [string, any]) => <span key={k} className="capitalize">{k}: <span className="font-medium">{v}</span></span>)}
                {meta?.total_ot_hours !== undefined && <span>Total OT: <span className="font-medium">{meta.total_ot_hours} hrs</span></span>}
                {meta?.totals && <span>Gross: <span className="font-medium">{money(meta.totals.gross)}</span> | Deductions: <span className="font-medium">{money(meta.totals.deductions)}</span> | Net: <span className="font-medium">{money(meta.totals.net)}</span></span>}
              </div>
            )}
            <Table columns={cols[active] || []} data={rows} keyFn={(r) => r.id ? String(r.id) : `${active}-${Math.random()}`} />
          </div>
        )}
      </div>
    </div>
  )
}
