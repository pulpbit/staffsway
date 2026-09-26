import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { slipApi } from '@/services/api'
import { Modal } from '@/components/ui/overlay'
import { StatusBadge, statusTone, type Tone } from '@/components/ui/status'
import { LoadingState } from '@/components/ui/state'
import { money, monthYear, dateShort } from '@/utils/format'
import { Printer, Building2 } from 'lucide-react'
import type { SalarySlipDetail } from '@/types/api'

const slipTone = (s: string) => ({ finalized: 'warning', paid: 'success', draft: 'neutral', processing: 'info' } as Record<string, Tone>)[s] || statusTone(s)

/**
 * The printable payslip itself. Extracted from SalarySlipsPage so the
 * employee quick action renders the exact same document as the slips page.
 */
export function SalarySlipView({ detail }: { detail: SalarySlipDetail }) {
  const labelRow = (label: string, value?: ReactNode, mono = false) => (
    <div className="flex">
      <span className="text-mute w-24 shrink-0">{label}</span>
      <span className={`text-ink ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
    </div>
  )

  return (
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
        {labelRow('ESI No.', detail.item?.esi_number, true)}
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
          <span><span className="text-mute">Hours/Day:</span> <span className="font-medium tabular-nums">{detail.item?.working_hours || 8}</span></span>
          <span><span className="text-mute">Day Rate:</span> <span className="font-medium tabular-nums">{money(detail.item?.daily_rate || 0)}</span></span>
          <span><span className="text-mute">Hourly Rate:</span> <span className="font-medium tabular-nums">{money(detail.item?.hourly_rate || 0)}</span></span>
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
  )
}

/** Modal wrapper that loads and prints one slip by id. */
export function SalarySlipModal({ open, onClose, slipId }: { open: boolean; onClose: () => void; slipId: number | null }) {
  const { data, isLoading } = useQuery({
    queryKey: ['slip', slipId],
    queryFn: () => slipApi.get(slipId!),
    enabled: open && !!slipId,
  })
  const detail = data?.data as SalarySlipDetail | undefined

  return (
    <Modal open={open} onClose={onClose} title="Salary Slip" size="lg">
      {detail ? <SalarySlipView detail={detail} /> : <LoadingState />}
    </Modal>
  )
}
