import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { slipApi } from '@/services/api'
import { Table } from '@/components/ui/data'
import { PageHeader } from '@/components/ui/layout'
import { StatusBadge, statusTone, type Tone } from '@/components/ui/status'
import { SearchInput, NativeSelect } from '@/components/ui/actions'
import { LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { SalarySlipModal } from './SalarySlipView'
import { money, monthYear } from '@/utils/format'
import { FileText } from 'lucide-react'

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
    { key: 'slip_number', header: 'Slip No.', className: 'font-mono text-[12px] text-body' },
    { key: 'employee', header: 'Employee', render: (r: any) => (
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-ink truncate">{r.first_name} {r.last_name}</p>
        <p className="text-[11px] text-mute font-mono">{r.employee_code} — {r.designation}</p>
      </div>
    ) },
    { key: 'period', header: 'Period', render: (r: any) => <span className="text-[12px] text-body">{monthYear(r.month, r.year)}</span> },
    { key: 'gross', header: 'Gross', render: (r: any) => <span className="text-[12px] text-body tabular-nums">{money(r.gross)}</span> },
    { key: 'deductions', header: 'Deductions', render: (r: any) => <span className="text-[12px] text-body tabular-nums">{money(r.total_deductions)}</span> },
    { key: 'net', header: 'Net Pay', render: (r: any) => <span className="text-[13px] font-semibold text-ink tabular-nums">{money(r.net_salary)}</span> },
    { key: 'status', header: 'Status', render: (r: any) => <StatusBadge status={r.payroll_status} tone={slipTone(r.payroll_status)} /> },
    { key: 'actions', header: '', className: 'text-right', render: (r: any) => (
      <div className="flex justify-end">
        <button onClick={() => { setDetailId(r.id); setShowDetail(true) }} className="px-2 py-1 text-[11px] font-medium text-link hover:bg-link-soft rounded-xs cursor-pointer inline-flex items-center gap-1"><FileText className="w-3 h-3" />View</button>
      </div>
    ) },
  ]

  return (
    <div>
      <PageHeader
        title="Salary Slips"
        description="View and print employee salary slips per payroll run"
        actions={<span className="text-[13px] text-mute tabular-nums">{slips.length} slip{slips.length === 1 ? '' : 's'}</span>}
      />

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <SearchInput
          className="sm:flex-1"
          placeholder="Search by name, code or slip number..."
          value={search}
          onChange={setSearch}
        />
        <NativeSelect className="w-32 sm:w-28" value={month} onChange={(v) => setMonth(v)} options={[{ value: '', label: 'All Months' }, ...MONTHS.map(m => ({ value: String(m), label: monthShort(m) }))]} />
        <NativeSelect className="w-28" value={year} onChange={(v) => setYear(v)} options={[{ value: '', label: 'All Years' }, ...YEARS.map(y => ({ value: String(y), label: String(y) }))]} />
      </div>

      <div className="bg-white card-shadow rounded-md overflow-hidden">
        {isLoading ? (
          <div className="p-4"><LoadingState /></div>
        ) : error ? (
          <PageError onRetry={() => refetch()} />
        ) : slips.length === 0 ? (
          <EmptyState icon={FileText} title="No salary slips" description="Slips are generated when a payroll is finalized. They become available for viewing and printing." />
        ) : (
          <Table columns={cols} data={slips} keyFn={(r) => String(r.id)} minWidth="980px" />
        )}
      </div>

      <SalarySlipModal open={showDetail} onClose={() => { setShowDetail(false); setDetailId(null) }} slipId={detailId} />
    </div>
  )
}
