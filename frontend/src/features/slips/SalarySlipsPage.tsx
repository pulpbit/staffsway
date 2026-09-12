import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { slipApi } from '@/services/api'
import { Table } from '@/components/ui/data'
import { PageHeader } from '@/components/ui/layout'
import { StatusBadge, statusTone, type Tone } from '@/components/ui/status'
import { SearchInput, NativeSelect } from '@/components/ui/actions'
import { LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { Modal } from '@/components/ui/overlay'
import { money, monthYear, dateShort } from '@/utils/format'
import { FileText, Printer, Building2 } from 'lucide-react'
import type { SalarySlipDetail } from '@/types/api'

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
  const { data: slipDetail } = useQuery({ queryKey: ['slip', detailId], queryFn: () => slipApi.get(detailId!), enabled: !!detailId })

  const slips = (data?.data || []) as any[]
  const detail = (slipDetail?.data as SalarySlipDetail | undefined)

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

  const labelRow = (label: string, value?: ReactNode, mono = false) => (
    <div className="flex">
      <span className="text-mute w-24 shrink-0">{label}</span>
      <span className={`text-ink ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
    </div>
  )

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

      {/* Salary Slip Detail — PRINT VIEW */}
      <Modal open={showDetail} onClose={() => { setShowDetail(false); setDetailId(null) }} title="Salary Slip" size="lg">
        {detail ? (
          <div className="print-slip bg-white text-[12px] leading-relaxed">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-hairline pb-3 mb-3">
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-sm bg-ink text-white flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-[16px] font-semibold text-ink">{detail.company?.company_name}</h2>
                  <p className="text-[11px] text-mute">{detail.company?.company_tagline}</p>
                  <p className="text-[11px] text-mute">{detail.company?.address},{detail.company?.state} {detail.company?.pincode}</p>
                </div>
              </div>
              <div className="text-right">
                <h3 className="text-[14px] font-semibold text-ink">Salary Slip</h3>
                <p className="text-[11px] text-mute">{monthYear(detail.slip?.month, detail.slip?.year)}</p>
                <p className="text-[11px] text-mute font-mono">{detail.slip?.slip_number}</p>
                <div className="mt-1 flex justify-end"><StatusBadge status={detail.payroll?.status || ''} tone={slipTone(detail.payroll?.status || '')} /></div>
              </div>
            </div>

            {/* Employee Info */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 mb-3">
              {labelRow('Employee', `${detail.item?.first_name} ${detail.item?.last_name}`)}
              {labelRow('Code', detail.item?.employee_code, true)}
              {labelRow('Designation', detail.item?.designation)}
              {labelRow('Site', `${detail.item?.site_name || '—'} — ${detail.item?.client_name || '—'}`)}
              {labelRow('Bank', detail.item?.bank_name || '—')}
              {labelRow('Account', detail.item?.bank_account, true)}
              {labelRow('IFSC', detail.item?.bank_ifsc, true)}
              {labelRow('DOJ', detail.item?.joining_date ? dateShort(String(detail.item.joining_date)) : '—')}
              {labelRow('UAN', detail.item?.uan, true)}
              {labelRow('PAN', detail.item?.pan, true)}
            </div>

            {/* Attendance */}
            <div className="bg-canvas-soft rounded-sm p-2.5 mb-3">
              <h4 className="text-[11px] font-mono text-mute uppercase tracking-[0.04em] mb-1.5">Attendance Summary</h4>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12px]">
                <span><span className="text-mute">Present:</span> <span className="font-medium tabular-nums">{detail.item?.att_present || detail.item?.present_days || 0}</span></span>
                <span><span className="text-mute">Absent:</span> <span className="font-medium tabular-nums">{detail.item?.att_absent || detail.item?.absent_days || 0}</span></span>
                <span><span className="text-mute">Paid Leave:</span> <span className="font-medium tabular-nums">{detail.item?.att_paid || detail.item?.paid_leave || 0}</span></span>
                <span><span className="text-mute">Unpaid Leave:</span> <span className="font-medium tabular-nums">{detail.item?.att_unpaid || detail.item?.unpaid_leave || 0}</span></span>
                <span><span className="text-mute">OT Hours:</span> <span className="font-medium tabular-nums">{detail.item?.att_ot || detail.item?.ot_hours || 0}</span></span>
              </div>
            </div>

            {/* Earnings & Deductions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div>
                <h4 className="text-[11px] font-mono text-mute uppercase tracking-[0.04em] mb-2 border-b border-hairline pb-1.5">Earnings</h4>
                <div className="space-y-1 text-[12px]">
                  <div className="flex justify-between"><span className="text-body">Basic</span><span className="text-ink font-medium tabular-nums">{money(detail.item?.basic || 0)}</span></div>
                  <div className="flex justify-between"><span className="text-body">HRA</span><span className="text-ink tabular-nums">{money(detail.item?.hra || 0)}</span></div>
                  <div className="flex justify-between"><span className="text-body">Conveyance</span><span className="text-ink tabular-nums">{money(detail.item?.conveyance || 0)}</span></div>
                  <div className="flex justify-between"><span className="text-body">Other Allowance</span><span className="text-ink tabular-nums">{money(detail.item?.other_allowance || 0)}</span></div>
                  <div className="flex justify-between"><span className="text-body">OT Earnings</span><span className="text-ink tabular-nums">{money(detail.item?.overtime_earnings || 0)}</span></div>
                  <div className="flex justify-between"><span className="text-error">Attendance Deduction</span><span className="text-error tabular-nums">-{money(detail.item?.attendance_deduction || 0)}</span></div>
                  <div className="flex justify-between border-t border-hairline pt-1 font-semibold"><span className="text-ink">Gross Pay</span><span className="text-ink tabular-nums">{money(detail.item?.gross || 0)}</span></div>
                </div>
              </div>
              <div>
                <h4 className="text-[11px] font-mono text-mute uppercase tracking-[0.04em] mb-2 border-b border-hairline pb-1.5">Deductions</h4>
                <div className="space-y-1 text-[12px]">
                  <div className="flex justify-between"><span className="text-body">Provident Fund (PF)</span><span className="text-ink tabular-nums">{money(detail.item?.pf || 0)}</span></div>
                  <div className="flex justify-between"><span className="text-body">ESIC</span><span className="text-ink tabular-nums">{money(detail.item?.esic || 0)}</span></div>
                  <div className="flex justify-between"><span className="text-body">Professional Tax</span><span className="text-ink tabular-nums">{money(detail.item?.professional_tax || 0)}</span></div>
                  <div className="flex justify-between"><span className="text-body">LWF</span><span className="text-ink tabular-nums">{money(detail.item?.lwf || 0)}</span></div>
                  <div className="flex justify-between"><span className="text-body">TDS</span><span className="text-ink tabular-nums">{money(detail.item?.tds || 0)}</span></div>
                  <div className="flex justify-between"><span className="text-body">Advance</span><span className="text-ink tabular-nums">{money(detail.item?.advance_deduction || 0)}</span></div>
                  <div className="flex justify-between"><span className="text-body">Other Deduction</span><span className="text-ink tabular-nums">{money(detail.item?.other_deduction || 0)}</span></div>
                  <div className="flex justify-between border-t border-hairline pt-1 font-semibold"><span className="text-ink">Total Deductions</span><span className="text-ink tabular-nums">{money(detail.item?.total_deductions || 0)}</span></div>
                </div>
              </div>
            </div>

            {/* Net */}
            <div className="mt-4 p-3 bg-ink text-white rounded-md flex items-center justify-between">
              <span className="text-[14px] font-semibold">Net Salary</span>
              <span className="text-[18px] font-semibold tracking-[-0.03em] tabular-nums">{money(detail.item?.net_salary || 0)}</span>
            </div>

            <div className="flex justify-end mt-4">
              <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3 h-8 bg-ink text-white text-[13px] font-medium rounded-sm hover:bg-ink/90 cursor-pointer"><Printer className="w-3.5 h-3.5" /> Print Slip</button>
            </div>
          </div>
        ) : <LoadingState />}
      </Modal>
    </div>
  )
}