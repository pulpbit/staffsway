import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarDays } from 'lucide-react'
import { leaveApi, type BalanceRow } from '@/services/api'
import { Button, Input, Select, Textarea } from '@/components/ui/fields'
import { Modal } from '@/components/ui/overlay'
import { LoadingState } from '@/components/ui/state'
import { StatusBadge } from '@/components/ui/status'
import { number, dateShort } from '@/utils/format'
import type { Employee } from '@/types/api'
import { toast } from 'sonner'

const today = () => new Date().toISOString().slice(0, 10)

interface Props {
  open: boolean
  onClose: () => void
  employee: Employee | null
}

export default function EmployeeApplyLeaveModal({ open, onClose, employee }: Props) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ leave_type_id: '', start_date: today(), end_date: today(), reason: '' })

  useEffect(() => {
    if (open) setForm({ leave_type_id: '', start_date: today(), end_date: today(), reason: '' })
  }, [open, employee?.id])

  const year = String(new Date().getFullYear())

  const { data: balData, isLoading } = useQuery({
    queryKey: ['employee-leave-balances', employee?.id, year],
    queryFn: () => leaveApi.employeeBalances(employee!.id, year),
    enabled: open && !!employee?.id,
  })
  const balances = (balData?.data || []) as BalanceRow[]

  // Default to the first type that actually has days available, so the form is
  // not pre-filled with an already-exhausted entitlement.
  useEffect(() => {
    if (open && !form.leave_type_id && balances.length) {
      const first = balances.find((b) => b.available > 0) || balances[0]
      setForm((p) => ({ ...p, leave_type_id: String(first.leave_type_id) }))
    }
  }, [open, balances, form.leave_type_id])

  const selected = balances.find((b) => String(b.leave_type_id) === form.leave_type_id)

  const days = useMemo(() => {
    if (!form.start_date || !form.end_date) return 0
    const s = new Date(`${form.start_date}T00:00:00`)
    const e = new Date(`${form.end_date}T00:00:00`)
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0
    return Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1
  }, [form.start_date, form.end_date])

  const errors = useMemo(() => {
    const e: Record<string, string> = {}
    if (!form.start_date) e.start_date = 'Required'
    if (!form.end_date) e.end_date = 'Required'
    else if (form.end_date < form.start_date) e.end_date = 'Cannot be before the start date'
    if (selected && days > selected.available) {
      e.start_date = `Only ${number(selected.available, 1)} day(s) available for ${selected.name}`
    }
    if (employee?.status === 'exited') e.start_date = 'An exited employee cannot apply for leave'
    return e
  }, [form, selected, days, employee])

  const apply = useMutation({
    mutationFn: () =>
      leaveApi.apply({
        employee_id: employee!.id,
        leave_type_id: form.leave_type_id ? Number(form.leave_type_id) : null,
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason.trim() || undefined,
      }),
    onSuccess: (r) => {
      toast.success(r?.message || 'Leave applied.')
      qc.invalidateQueries({ queryKey: ['employee-leave-balances', employee?.id] })
      qc.invalidateQueries({ queryKey: ['leave-requests'] })
      qc.invalidateQueries({ queryKey: ['leave-balances'] })
      onClose()
    },
    onError: (e: any) => toast.error(e?.error?.message || 'Could not apply for leave.'),
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }))

  return (
    <Modal open={open} onClose={onClose} size="md" title={`Apply Leave — ${employee?.first_name || ''} ${employee?.last_name || ''}`}>
      {isLoading ? (
        <LoadingState message="Loading leave balance..." />
      ) : balances.length === 0 ? (
        <p className="py-4 text-center text-[13px] text-slate-500">
          No leave types are configured for this year. Add leave types under Leave Management first.
        </p>
      ) : (
        <div className="space-y-4">
          {/* Balance strip */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-2.5 py-1.5 bg-slate-50 border-b border-slate-200">
              <span className="text-[11px] font-mono text-slate-500 uppercase">Balance {year}</span>
            </div>
            <div className="max-h-40 overflow-y-auto scrollbar-thin">
              {balances.map((b) => (
                <div
                  key={b.leave_type_id}
                  onClick={() => setForm((p) => ({ ...p, leave_type_id: String(b.leave_type_id) }))}
                  className={`flex items-center justify-between gap-2 px-2.5 py-2 cursor-pointer border-b border-slate-200 last:border-b-0 transition-colors ${
                    String(b.leave_type_id) === form.leave_type_id ? 'bg-slate-50' : 'hover:bg-slate-50/50'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <CalendarDays className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="text-[13px] text-slate-900 truncate">{b.name}</span>
                    {!b.paid && <StatusBadge status="unpaid" />}
                  </span>
                  <span className="text-[12px] tabular-nums whitespace-nowrap">
                    <span className={`font-semibold ${b.available > 0 ? 'text-slate-900' : 'text-rose-600'}`}>{number(b.available, 1)}</span>
                    <span className="text-slate-500"> / {number(b.entitled, 1)}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Select
              label="Leave type"
              required
              value={form.leave_type_id}
              onChange={set('leave_type_id')}
              options={balances.map((b) => ({
                value: String(b.leave_type_id),
                label: `${b.name} — ${number(b.available, 1)} available`,
              }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="From"
              type="date"
              required
              value={form.start_date}
              onChange={set('start_date')}
              error={errors.start_date}
            />
            <Input
              label="To"
              type="date"
              required
              value={form.end_date}
              onChange={set('end_date')}
              error={errors.end_date}
            />
          </div>

          {days > 0 && (
            <p className="text-[12px] text-slate-500 -mt-1">
              {days} day{days === 1 ? '' : 's'} &middot; {dateShort(form.start_date)} &rarr; {dateShort(form.end_date)}
            </p>
          )}

          <Textarea label="Reason" rows={3} value={form.reason} onChange={set('reason')} placeholder="Optional reason for the leave" />

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={() => apply.mutate()} disabled={apply.isPending || Object.keys(errors).length > 0}>
              {apply.isPending ? 'Applying...' : 'Apply leave'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
