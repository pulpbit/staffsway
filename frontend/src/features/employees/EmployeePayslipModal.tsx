import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { slipApi } from '@/services/api'
import { Modal } from '@/components/ui/overlay'
import { LoadingState, EmptyState, PageError } from '@/components/ui/state'
import { StatusBadge, statusTone, type Tone } from '@/components/ui/status'
import { SalarySlipModal } from '@/features/slips/SalarySlipView'
import { money, monthYear } from '@/utils/format'
import { FileText, Printer } from 'lucide-react'

const slipTone = (s: string) => ({ finalized: 'warning', paid: 'success', draft: 'neutral', processing: 'info' } as Record<string, Tone>)[s] || statusTone(s)

interface Props {
  open: boolean
  onClose: () => void
  employeeId: number | null
  employeeName?: string
}

export default function EmployeePayslipModal({ open, onClose, employeeId, employeeName }: Props) {
  const [slipId, setSlipId] = useState<number | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['employee-slips', employeeId],
    queryFn: () => slipApi.list({ employee_id: String(employeeId) }),
    enabled: open && !!employeeId,
  })

  const slips = (data?.data || []) as any[]

  return (
    <>
      <Modal open={open} onClose={onClose} size="lg" title={`Payslips — ${employeeName || ''}`}>
        {isLoading ? (
          <LoadingState message="Loading payslips..." />
        ) : error ? (
          <PageError onRetry={() => refetch()} />
        ) : slips.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No payslips yet"
            description="Payslips appear here once payroll has been run and finalized for this employee."
          />
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-3 py-2 text-left text-[11px] font-medium font-mono text-slate-500 uppercase">Period</th>
                  <th className="px-3 py-2 text-left text-[11px] font-medium font-mono text-slate-500 uppercase">Slip No.</th>
                  <th className="px-3 py-2 text-right text-[11px] font-medium font-mono text-slate-500 uppercase">Net Pay</th>
                  <th className="px-3 py-2 text-left text-[11px] font-medium font-mono text-slate-500 uppercase">Status</th>
                  <th className="px-3 py-2 text-right text-[11px] font-medium font-mono text-slate-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {slips.map((s, i) => (
                  <tr key={s.id} className={i % 2 === 1 ? 'bg-slate-50' : ''}>
                    <td className="px-3 py-2 text-[13px] text-slate-900 whitespace-nowrap">{monthYear(s.month, s.year)}</td>
                    <td className="px-3 py-2 text-[12px] font-mono text-slate-600">{s.slip_number}</td>
                    <td className="px-3 py-2 text-[13px] font-semibold text-slate-900 tabular-nums text-right">{money(s.net_salary)}</td>
                    <td className="px-3 py-2"><StatusBadge status={s.payroll_status} tone={slipTone(s.payroll_status)} /></td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => setSlipId(s.id)}
                        className="px-2 py-1 text-[11px] font-medium text-blue-600 hover:bg-blue-50 rounded cursor-pointer inline-flex items-center gap-1"
                      >
                        <Printer className="w-3 h-3" /> Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      <SalarySlipModal
        open={!!slipId}
        onClose={() => setSlipId(null)}
        slipId={slipId}
      />
    </>
  )
}
