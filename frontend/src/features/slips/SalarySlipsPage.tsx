import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { slipApi } from '@/services/api'
import { Table } from '@/components/ui/data'
import { PageHeader } from '@/components/ui/layout'
import { StatusBadge, StatusDot, statusTone, type Tone } from '@/components/ui/status'
import { SearchInput, NativeSelect } from '@/components/ui/actions'
import { LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { SalarySlipModal } from './SalarySlipView'
import { money, monthYear } from '@/utils/format'
import { FileText, Eye, Printer, Download } from 'lucide-react'

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
const monthShort = (m: number) => new Date(2000, m - 1, 1).toLocaleDateString('en-US', { month: 'short' })
const YEARS = [2025, 2026, 2027]

const slipTone = (s: string) => ({ finalized: 'warning', paid: 'success', draft: 'neutral', processing: 'info' } as Record<string, Tone>)[s] || statusTone(s)

export default function SalarySlipsPage() {
  const [search, setSearch] = useState('')
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const [detailId, setDetailId] = useState<number | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  const params: Record<string, string> = {}
  if (search) params.search = search
  if (month) { params.month = month; params.year = year || '2026' }
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['slips', params], queryFn: () => slipApi.list(params) })

  const slips = (data?.data || []) as any[]

  const cols: any[] = [
    { key: 'slip_number', header: 'Slip Voucher', className: 'font-mono text-xs font-bold text-blue-700' },
    { key: 'employee', header: 'Employee', render: (r: any) => (
      <div className="min-w-0">
        <p className="text-xs sm:text-[13px] font-bold text-slate-900 truncate">{r.first_name} {r.last_name}</p>
        <p className="text-[11px] text-slate-500 font-mono">{r.employee_code} &bull; {r.designation}</p>
      </div>
    ) },
    { key: 'period', header: 'Payroll Period', render: (r: any) => <span className="text-xs text-slate-700 font-semibold">{monthYear(r.month, r.year)}</span> },
    { key: 'gross', header: 'Gross Earnings', render: (r: any) => <span className="text-xs font-bold text-slate-800 tabular-nums font-mono">₹{money(r.gross)}</span> },
    { key: 'deductions', header: 'Total Deductions', render: (r: any) => <span className="text-xs font-bold text-rose-600 tabular-nums font-mono">₹{money(r.total_deductions)}</span> },
    { key: 'net', header: 'Net Payout', render: (r: any) => <span className="text-xs font-black text-emerald-700 tabular-nums font-mono">₹{money(r.net_salary)}</span> },
    { key: 'status', header: 'Status', className: 'w-9', render: (r: any) => <StatusDot status={r.payroll_status} tone={slipTone(r.payroll_status)} /> },
    { key: 'actions', header: 'Action', className: 'text-right', render: (r: any) => (
      <div className="flex justify-end">
        <button onClick={() => { setDetailId(r.id); setShowDetail(true) }} className="px-3 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs">
          <Printer className="w-3.5 h-3.5" />
          <span>Print Slip</span>
        </button>
      </div>
    ) },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Salary Slips & Vouchers"
        description="Official salary vouchers, printable payslip certificates, and bank disbursement receipts"
        actions={<span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">{slips.length} slip{slips.length === 1 ? '' : 's'} on record</span>}
      />

      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <SearchInput
          className="sm:flex-1"
          placeholder="Search by name, employee ID, slip number..."
          value={search}
          onChange={setSearch}
        />
        <NativeSelect className="w-full sm:w-36" value={month} onChange={(v) => setMonth(v)} options={[{ value: '', label: 'All Months' }, ...MONTHS.map(m => ({ value: String(m), label: monthShort(m) }))]} />
        <NativeSelect className="w-full sm:w-32" value={year} onChange={(v) => setYear(v)} options={[{ value: '', label: 'All Years' }, ...YEARS.map(y => ({ value: String(y), label: String(y) }))]} />
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-8"><LoadingState /></div>
        ) : error ? (
          <PageError onRetry={() => refetch()} />
        ) : slips.length === 0 ? (
          <EmptyState icon={FileText} title="No salary slips generated yet" description="Slips are automatically prepared once a payroll run is finalized." />
        ) : (
          <Table columns={cols} data={slips} keyFn={(r) => String(r.id)} minWidth="980px" />
        )}
      </div>

      <SalarySlipModal open={showDetail} onClose={() => { setShowDetail(false); setDetailId(null) }} slipId={detailId} />
    </div>
  )
}
