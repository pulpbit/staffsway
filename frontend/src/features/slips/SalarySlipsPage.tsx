import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { slipApi } from '@/services/api'
import { Table, Badge } from '@/components/ui/data'
import { PageHeader, LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { Modal } from '@/components/ui/overlay'
import { money, monthYear, fullName, statusColor, statusLabel, dateShort } from '@/utils/format'
import { FileText, Printer, Search } from 'lucide-react'
import type { SalarySlipDetail } from '@/types/api'

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
      <div>
        <p className="text-[13px] font-medium text-ink">{r.first_name} {r.last_name}</p>
        <p className="text-[11px] text-mute">{r.employee_code} — {r.designation}</p>
      </div>
    ) },
    { key: 'period', header: 'Period', render: (r: any) => <span className="text-[12px] text-body">{monthYear(r.month, r.year)}</span> },
    { key: 'gross', header: 'Gross', render: (r: any) => <span className="text-[12px] text-body">{money(r.gross)}</span> },
    { key: 'deductions', header: 'Deductions', render: (r: any) => <span className="text-[12px] text-body">{money(r.total_deductions)}</span> },
    { key: 'net', header: 'Net Pay', render: (r: any) => <span className="text-[13px] font-medium text-ink">{money(r.net_salary)}</span> },
    { key: 'status', header: 'Status', render: (r: any) => <Badge className={statusColor(r.payroll_status)}>{statusLabel(r.payroll_status)}</Badge> },
    { key: 'actions', header: '', render: (r: any) => (
      <button onClick={() => { setDetailId(r.id); setShowDetail(true) }} className="px-1.5 py-0.5 text-[11px] text-link hover:bg-link-soft rounded-xs"><FileText className="w-3 h-3 inline mr-0.5" />View</button>
    ) },
  ]

  return (
    <div>
      <PageHeader title="Salary Slips" subtitle={`${slips.length}`} />
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-mute" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, code or slip number..." className="w-full h-9 pl-8 pr-3 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink" />
        </div>
        <select value={month} onChange={e => setMonth(e.target.value)} className="h-9 px-2 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink w-28">
          <option value="">All</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{new Date(2000, m - 1).toLocaleDateString('en-US', { month: 'short' })}</option>)}
        </select>
      </div>

      <div className="bg-white card-shadow rounded-md p-4">
        {isLoading ? <LoadingState /> : error ? <PageError onRetry={() => refetch()} /> : slips.length === 0 ? <EmptyState icon={FileText} title="No salary slips" description="Slips are generated when payroll is finalized." /> : (
          <Table columns={cols} data={slips} keyFn={(r) => String(r.id)} />
        )}
      </div>

      {/* Salary Slip Detail — PRINT VIEW */}
      <Modal open={showDetail} onClose={() => { setShowDetail(false); setDetailId(null) }} title="Salary Slip" size="lg">
        {detail ? (
          <div className="print-slip bg-white p-6 text-[12px] leading-relaxed">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-hairline pb-3 mb-3">
              <div>
                <img src="/images/logo.png" alt="Logo" className="w-12 h-12 mb-1" />
                <h2 className="text-[16px] font-semibold text-ink">{detail.company?.company_name}</h2>
                <p className="text-[11px] text-mute">{detail.company?.company_tagline}</p>
                <p className="text-[11px] text-mute">{detail.company?.address}, {detail.company?.city}, {detail.company?.state} {detail.company?.pincode}</p>
              </div>
              <div className="text-right">
                <h3 className="text-[14px] font-semibold text-ink">Salary Slip</h3>
                <p className="text-[11px] text-mute">{monthYear(detail.slip?.month, detail.slip?.year)}</p>
                <p className="text-[11px] text-mute font-mono">{detail.slip?.slip_number}</p>
                <Badge className={statusColor(detail.payroll?.status || '')}>{statusLabel(detail.payroll?.status || '')}</Badge>
              </div>
            </div>

            {/* Employee Info */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 mb-3">
              <div><span className="text-mute">Employee:</span> <span className="font-medium text-ink">{detail.item?.first_name} {detail.item?.last_name}</span></div>
              <div><span className="text-mute">Code:</span> <span className="font-mono text-ink">{detail.item?.employee_code}</span></div>
              <div><span className="text-mute">Designation:</span> <span className="text-ink">{detail.item?.designation}</span></div>
              <div><span className="text-mute">Site:</span> <span className="text-ink">{detail.item?.site_name || '—'} — {detail.item?.client_name || '—'}</span></div>
              <div><span className="text-mute">Bank:</span> <span className="text-ink">{detail.item?.bank_name || '—'}</span></div>
              <div><span className="text-mute">Account:</span> <span className="font-mono text-ink">{detail.item?.bank_account || '—'}</span></div>
              <div><span className="text-mute">IFSC:</span> <span className="font-mono text-ink">{detail.item?.bank_ifsc || '—'}</span></div>
              <div><span className="text-mute">DOJ:</span> <span className="text-ink">{detail.item?.joining_date ? dateShort(String(detail.item.joining_date)) : '—'}</span></div>
              <div><span className="text-mute">UAN:</span> <span className="font-mono text-ink">{detail.item?.uan || '—'}</span></div>
              <div><span className="text-mute">PAN:</span> <span className="font-mono text-ink">{detail.item?.pan || '—'}</span></div>
            </div>

            {/* Attendance */}
            <div className="bg-canvas-soft rounded-sm p-2.5 mb-3">
              <h4 className="text-[11px] font-mono text-mute uppercase tracking-[0.04em] mb-1">Attendance Summary</h4>
              <div className="flex gap-4 text-[12px]">
                <span><span className="text-mute">Present:</span> <span className="font-medium">{detail.item?.att_present || detail.item?.present_days || 0}</span></span>
                <span><span className="text-mute">Absent:</span> <span className="font-medium">{detail.item?.att_absent || detail.item?.absent_days || 0}</span></span>
                <span><span className="text-mute">Paid Leave:</span> <span className="font-medium">{detail.item?.att_paid || detail.item?.paid_leave || 0}</span></span>
                <span><span className="text-mute">Unpaid Leave:</span> <span className="font-medium">{detail.item?.att_unpaid || detail.item?.unpaid_leave || 0}</span></span>
                <span><span className="text-mute">OT Hours:</span> <span className="font-medium">{detail.item?.att_ot || detail.item?.ot_hours || 0}</span></span>
              </div>
            </div>

            {/* Earnings & Deductions */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-[11px] font-mono text-mute uppercase tracking-[0.04em] mb-2 border-b border-hairline pb-1">Earnings</h4>
                <div className="space-y-1 text-[12px]">
                  <div className="flex justify-between"><span className="text-body">Basic</span><span className="text-ink font-medium">{money(detail.item?.basic || 0)}</span></div>
                  <div className="flex justify-between"><span className="text-body">HRA</span><span>{money(detail.item?.hra || 0)}</span></div>
                  <div className="flex justify-between"><span className="text-body">Conveyance</span><span>{money(detail.item?.conveyance || 0)}</span></div>
                  <div className="flex justify-between"><span className="text-body">Other Allowance</span><span>{money(detail.item?.other_allowance || 0)}</span></div>
                  <div className="flex justify-between"><span className="text-body">OT Earnings</span><span>{money(detail.item?.overtime_earnings || 0)}</span></div>
                  <div className="flex justify-between"><span className="text-body text-error">Attendance Deduction</span><span className="text-error">-{money(detail.item?.attendance_deduction || 0)}</span></div>
                  <div className="flex justify-between border-t border-hairline pt-1 font-semibold"><span className="text-ink">Gross Pay</span><span className="text-ink">{money(detail.item?.gross || 0)}</span></div>
                </div>
              </div>
              <div>
                <h4 className="text-[11px] font-mono text-mute uppercase tracking-[0.04em] mb-2 border-b border-hairline pb-1">Deductions</h4>
                <div className="space-y-1 text-[12px]">
                  <div className="flex justify-between"><span className="text-body">Provident Fund (PF)</span><span>{money(detail.item?.pf || 0)}</span></div>
                  <div className="flex justify-between"><span className="text-body">ESIC</span><span>{money(detail.item?.esic || 0)}</span></div>
                  <div className="flex justify-between"><span className="text-body">Professional Tax</span><span>{money(detail.item?.professional_tax || 0)}</span></div>
                  <div className="flex justify-between"><span className="text-body">LWF</span><span>{money(detail.item?.lwf || 0)}</span></div>
                  <div className="flex justify-between"><span className="text-body">TDS</span><span>{money(detail.item?.tds || 0)}</span></div>
                  <div className="flex justify-between"><span className="text-body">Advance</span><span>{money(detail.item?.advance_deduction || 0)}</span></div>
                  <div className="flex justify-between"><span className="text-body">Other Deduction</span><span>{money(detail.item?.other_deduction || 0)}</span></div>
                  <div className="flex justify-between border-t border-hairline pt-1 font-semibold"><span className="text-ink">Total Deductions</span><span className="text-ink">{money(detail.item?.total_deductions || 0)}</span></div>
                </div>
              </div>
            </div>

            {/* Net */}
            <div className="mt-4 p-3 bg-ink text-white rounded-sm flex items-center justify-between">
              <span className="text-[14px] font-semibold">Net Salary</span>
              <span className="text-[18px] font-semibold tracking-[-0.03em]">{money(detail.item?.net_salary || 0)}</span>
            </div>

            <div className="flex justify-end mt-4 print:hidden">
              <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3 h-8 bg-ink text-white text-[13px] font-medium rounded-sm hover:bg-ink/90"><Printer className="w-3.5 h-3.5" /> Print Slip</button>
            </div>
          </div>
        ) : <LoadingState />}
      </Modal>
    </div>
  )
}
