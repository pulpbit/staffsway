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

const sectionTitle = 'text-[10.5px] font-bold uppercase tracking-wider text-slate-500'

/**
 * The printable payslip itself. Extracted from SalarySlipsPage so the
 * employee quick action renders the exact same document as the slips page.
 *
 * Colours are deliberately flat (no gradients or backdrop blur) because the
 * print stylesheet in index.css lifts only `.print-slip` out of the page, and
 * gradient backgrounds are unreliable across print engines.
 */
export function SalarySlipView({ detail }: { detail: SalarySlipDetail }) {
  const labelRow = (label: string, value?: ReactNode, mono = false) => (
    <div className="flex items-baseline gap-2 min-w-0">
      <span className="text-[11px] font-semibold text-slate-400 w-24 shrink-0">{label}</span>
      <span className={`text-[12px] font-semibold text-slate-900 truncate ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
    </div>
  )

  const lineRow = (label: string, value: ReactNode, tone = 'text-slate-900') => (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-[12px] text-slate-600">{label}</span>
      <span className={`text-[12px] font-semibold tabular-nums ${tone}`}>{value}</span>
    </div>
  )

  const attStat = (label: string, value: ReactNode) => (
    <div className="min-w-0">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
      <div className="text-[13px] font-extrabold text-slate-900 tabular-nums mt-0.5">{value}</div>
    </div>
  )

  return (
    <div className="print-slip bg-white text-[12px] leading-relaxed">
      {/* Header */}
      <div className="flex items-start justify-between gap-6 border-b-2 border-slate-900 pb-4 mb-4">
        <div className="flex items-start gap-3 min-w-0">
          <span className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[17px] font-extrabold text-slate-900 tracking-tight leading-tight">{detail.company?.company_name}</h2>
            {detail.company?.company_tagline && <p className="text-[11px] font-medium text-slate-500 mt-0.5">{detail.company.company_tagline}</p>}
            <p className="text-[11px] text-slate-500 mt-0.5">{detail.company?.address},{detail.company?.state} {detail.company?.pincode}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Salary Slip</h3>
          <p className="text-[15px] font-extrabold text-slate-900 tracking-tight mt-0.5">{monthYear(detail.slip?.month, detail.slip?.year)}</p>
          <p className="text-[11px] text-slate-500 font-mono mt-0.5">{detail.slip?.slip_number}</p>
          <div className="mt-1.5 flex justify-end">
            <StatusBadge status={detail.payroll?.status || ''} tone={slipTone(detail.payroll?.status || '')} />
          </div>
        </div>
      </div>

      {/* Employee Info */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 mb-4">
        <h4 className={`${sectionTitle} mb-2.5`}>Employee Details</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          {labelRow('Employee', `${detail.item?.first_name} ${detail.item?.last_name}`)}
          {labelRow('Code', detail.item?.employee_code, true)}
          {labelRow('Designation', detail.item?.designation)}
          {labelRow('Site', `${detail.item?.site_name || '—'} — ${detail.item?.client_name || '—'}`)}
          {labelRow('DOJ', detail.item?.joining_date ? dateShort(String(detail.item.joining_date)) : '—')}
          {labelRow('Bank', detail.item?.bank_name || '—')}
          {labelRow('Account', detail.item?.bank_account, true)}
          {labelRow('IFSC', detail.item?.bank_ifsc, true)}
          {labelRow('UAN', detail.item?.uan, true)}
          {labelRow('PAN', detail.item?.pan, true)}
          {labelRow('ESI No.', detail.item?.esi_number, true)}
        </div>
      </div>

      {/* Attendance */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 mb-4">
        <h4 className={`${sectionTitle} mb-2.5`}>Attendance Summary</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
          {attStat('Present', detail.item?.att_present || detail.item?.present_days || 0)}
          {attStat('Absent', detail.item?.att_absent || detail.item?.absent_days || 0)}
          {attStat('Paid Leave', detail.item?.att_paid || detail.item?.paid_leave || 0)}
          {attStat('Unpaid Leave', detail.item?.att_unpaid || detail.item?.unpaid_leave || 0)}
          {attStat('OT Hours', detail.item?.att_ot || detail.item?.ot_hours || 0)}
          {attStat('Hours / Day', detail.item?.working_hours || 8)}
          {attStat('Day Rate', money(detail.item?.daily_rate || 0))}
          {attStat('Hourly Rate', money(detail.item?.hourly_rate || 0))}
        </div>
      </div>

      {/* Earnings & Deductions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="rounded-xl border border-slate-200 p-4">
          <h4 className={`${sectionTitle} mb-2.5 pb-2 border-b border-slate-100`}>Earnings</h4>
          <div className="space-y-1.5">
            {lineRow('Basic', money(detail.item?.basic || 0))}
            {lineRow('HRA', money(detail.item?.hra || 0))}
            {lineRow('Conveyance', money(detail.item?.conveyance || 0))}
            {lineRow('Other Allowance', money(detail.item?.other_allowance || 0))}
            {lineRow('OT Earnings', money(detail.item?.overtime_earnings || 0))}
            {lineRow('Attendance Deduction', `-${money(detail.item?.attendance_deduction || 0)}`, 'text-rose-600')}
            <div className="flex items-baseline justify-between gap-4 border-t border-slate-200 pt-2 mt-1">
              <span className="text-[12px] font-extrabold text-slate-900">Gross Pay</span>
              <span className="text-[13px] font-extrabold text-slate-900 tabular-nums">{money(detail.item?.gross || 0)}</span>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <h4 className={`${sectionTitle} mb-2.5 pb-2 border-b border-slate-100`}>Deductions</h4>
          <div className="space-y-1.5">
            {lineRow('Provident Fund (PF)', money(detail.item?.pf || 0))}
            {lineRow('ESIC', money(detail.item?.esic || 0))}
            {lineRow('Professional Tax', money(detail.item?.professional_tax || 0))}
            {lineRow('LWF', money(detail.item?.lwf || 0))}
            {lineRow('TDS', money(detail.item?.tds || 0))}
            {lineRow('Advance', money(detail.item?.advance_deduction || 0))}
            {lineRow('Other Deduction', money(detail.item?.other_deduction || 0))}
            <div className="flex items-baseline justify-between gap-4 border-t border-slate-200 pt-2 mt-1">
              <span className="text-[12px] font-extrabold text-slate-900">Total Deductions</span>
              <span className="text-[13px] font-extrabold text-slate-900 tabular-nums">{money(detail.item?.total_deductions || 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Net */}
      <div className="mt-4 px-4 py-3.5 bg-slate-900 text-white rounded-xl flex items-center justify-between gap-4">
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Net Salary Payable</span>
          <span className="block text-[11px] text-slate-400 mt-0.5">
            Gross {money(detail.item?.gross || 0)} &minus; Deductions {money(detail.item?.total_deductions || 0)}
          </span>
        </div>
        <span className="text-[22px] font-extrabold tracking-tight tabular-nums">{money(detail.item?.net_salary || 0)}</span>
      </div>

      <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">
        This is a computer-generated salary slip and does not require a signature. Figures are rounded to two decimal places.
        For any discrepancy, please raise a query with the HR/payroll department within 7 days of the pay date.
      </p>

      <div className="flex justify-end mt-4 pt-4 border-t border-slate-100">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3.5 h-9 bg-slate-900 text-white text-[13px] font-semibold rounded-xl hover:bg-slate-800 transition-colors cursor-pointer shadow-sm"
        >
          <Printer className="w-3.5 h-3.5" /> Print Slip
        </button>
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
      {detail ? <SalarySlipView detail={detail} /> : <LoadingState message={isLoading ? 'Loading salary slip...' : 'No slip data'} />}
    </Modal>
  )
}