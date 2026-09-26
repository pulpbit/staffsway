import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LogOut, AlertTriangle, ExternalLink } from 'lucide-react'
import { separationApi } from '@/services/api'
import { Button, Input, Select, Label, Textarea } from '@/components/ui/fields'
import { Modal } from '@/components/ui/overlay'
import { LoadingState } from '@/components/ui/state'
import { dateShort } from '@/utils/format'
import type { Employee, Separation } from '@/types/api'
import { toast } from 'sonner'

const TYPES = [
  { value: 'resignation', label: 'Resignation' },
  { value: 'termination', label: 'Termination' },
  { value: 'retirement', label: 'Retirement' },
  { value: 'end_of_contract', label: 'End of contract' },
  { value: 'other', label: 'Other' },
]

const typeLabel = (v: string) => TYPES.find((t) => t.value === v)?.label || v

const today = () => new Date().toISOString().slice(0, 10)
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

interface Props {
  open: boolean
  onClose: () => void
  employee: Employee | null
}

export default function EmployeeExitModal({ open, onClose, employee }: Props) {
  const qc = useQueryClient()
  const [step, setStep] = useState<'form' | 'confirm'>('form')
  const [form, setForm] = useState({
    separation_type: 'resignation',
    resignation_date: today(),
    last_working_date: today(),
    notice_period_days: 30,
    notice_served_days: 0,
    notice_buyout: 0,
    reason: '',
  })

  useEffect(() => {
    if (open && employee) {
      setStep('form')
      setForm({
        separation_type: 'resignation',
        resignation_date: today(),
        last_working_date: today(),
        notice_period_days: employee.notice_period_days ?? 30,
        notice_served_days: 0,
        notice_buyout: 0,
        reason: '',
      })
    }
  }, [open, employee])

  // Surface an in-flight request so the user is not asked to redo work.
  const { data: existingData, isLoading: existingLoading } = useQuery({
    queryKey: ['employee-separation', employee?.id],
    queryFn: () => separationApi.list({ employee_id: String(employee!.id) }),
    enabled: open && !!employee?.id,
  })
  const pending: Separation | undefined = (existingData?.data || []).find(
    (s: Separation) => s.status === 'pending' || s.status === 'approved'
  )
  const history: Separation[] = existingData?.data || []

  // Auto-fill the last working day from the notice period, but let the user
  // override it — the notice period is only a default, not a constraint.
  useEffect(() => {
    if (!open) return
    setForm((p) => ({ ...p, last_working_date: addDays(p.resignation_date, p.notice_period_days) }))
  }, [open, form.resignation_date, form.notice_period_days])

  const errors = useMemo(() => {
    const e: Record<string, string> = {}
    if (!form.resignation_date) e.resignation_date = 'Required'
    if (!form.last_working_date) e.last_working_date = 'Required'
    else if (form.last_working_date < form.resignation_date) e.last_working_date = 'Cannot be before the resignation date'
    else if (employee?.joining_date && form.last_working_date < String(employee.joining_date).slice(0, 10)) {
      e.last_working_date = 'Cannot be before the joining date'
    }
    if (form.notice_served_days > form.notice_period_days) e.notice_served_days = 'Cannot exceed the notice period'
    if (form.notice_buyout < 0) e.notice_buyout = 'Cannot be negative'
    return e
  }, [form, employee])

  const create = useMutation({
    mutationFn: async () => {
      const created = await separationApi.create({
        employee_id: employee!.id,
        separation_type: form.separation_type,
        resignation_date: form.resignation_date,
        last_working_date: form.last_working_date,
        notice_period_days: form.notice_period_days,
        notice_served_days: form.notice_served_days,
        notice_buyout: form.notice_buyout,
        reason: form.reason.trim() || null,
      })
      return created.data as Separation
    },
    onSuccess: () => setStep('confirm'),
    onError: (e: any) => toast.error(e?.error?.message || 'Could not start the exit process.'),
  })

  const approve = useMutation({
    mutationFn: async (sepId: number) => {
      await separationApi.approve(sepId, { last_working_date: form.last_working_date })
    },
    onSuccess: () => {
      toast.success(`${employee?.first_name} ${employee?.last_name} has exited`)
      qc.invalidateQueries({ queryKey: ['employees'] })
      qc.invalidateQueries({ queryKey: ['employee', employee?.id] })
      qc.invalidateQueries({ queryKey: ['employee-separation', employee?.id] })
      qc.invalidateQueries({ queryKey: ['separation'] })
      onClose()
    },
    onError: (e: any) => toast.error(e?.error?.message || 'Could not approve the exit.'),
  })

  const reinstate = useMutation({
    mutationFn: (sepId: number) => separationApi.reinstate(sepId),
    onSuccess: () => {
      toast.success('Exit reversed — the employee is inactive and can be reactivated')
      qc.invalidateQueries({ queryKey: ['employees'] })
      qc.invalidateQueries({ queryKey: ['employee', employee?.id] })
      qc.invalidateQueries({ queryKey: ['employee-separation', employee?.id] })
      onClose()
    },
    onError: (e: any) => toast.error(e?.error?.message || 'Could not reverse the exit.'),
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: k.startsWith('notice_') ? Number(e.target.value) || 0 : e.target.value }))

  const busy = create.isPending || approve.isPending || reinstate.isPending
  const exited = employee?.status === 'exited'

  return (
    <Modal open={open} onClose={onClose} size="lg" title={`Exit — ${employee?.first_name || ''} ${employee?.last_name || ''}`}>
      {existingLoading ? (
        <LoadingState message="Checking exit status..." />
      ) : step === 'confirm' && create.data ? (
        /* ---- Step 2: confirm the permanent exit ---- */
        <div className="space-y-4">
          <div className="flex gap-3 p-3 bg-warning-soft border border-warning/30 rounded-sm">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <div className="text-[13px] text-body leading-relaxed">
              <p className="font-medium text-ink mb-1">This permanently marks the employee as exited.</p>
              <p>
                Their exit date is set to <span className="font-medium text-ink">{dateShort(form.last_working_date)}</span> and they
                will no longer appear in attendance, payroll or rosters. This can be reversed later from Exit Management.
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 p-3 bg-canvas-soft rounded-sm">
            <div><dt className="text-[11px] font-mono text-mute uppercase">Type</dt><dd className="text-[13px] text-ink mt-0.5">{typeLabel(form.separation_type)}</dd></div>
            <div><dt className="text-[11px] font-mono text-mute uppercase">Resignation date</dt><dd className="text-[13px] text-ink mt-0.5">{dateShort(form.resignation_date)}</dd></div>
            <div><dt className="text-[11px] font-mono text-mute uppercase">Last working day</dt><dd className="text-[13px] text-ink mt-0.5">{dateShort(form.last_working_date)}</dd></div>
            <div><dt className="text-[11px] font-mono text-mute uppercase">Notice</dt><dd className="text-[13px] text-ink mt-0.5">{form.notice_served_days} of {form.notice_period_days} days</dd></div>
            {form.notice_buyout > 0 && (
              <div><dt className="text-[11px] font-mono text-mute uppercase">Notice buyout</dt><dd className="text-[13px] text-ink mt-0.5">{form.notice_buyout} days</dd></div>
            )}
          </dl>

          <div className="flex items-center justify-between gap-2 pt-1">
            <Button variant="ghost" onClick={() => setStep('form')}>Back to edit</Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose} disabled={busy}>Save as pending</Button>
              <Button variant="danger" onClick={() => approve.mutate(create.data!.id)} disabled={busy}>
                {approve.isPending ? 'Completing...' : 'Complete exit'}
              </Button>
            </div>
          </div>
        </div>
      ) : exited && pending ? (
        /* ---- Already exited: offer a reversal ---- */
        <div className="space-y-4">
          <div className="p-3 bg-canvas-soft rounded-sm space-y-1.5">
            <div className="flex items-center gap-2 text-[13px] text-ink font-medium">
              <LogOut className="w-4 h-4 text-mute" /> Exited on {dateShort(employee?.exit_date || '')}
            </div>
            <p className="text-[12px] text-mute">
              Reason: {typeLabel(pending.separation_type || employee?.exit_reason || 'other')}
              {pending.reason ? ` — ${pending.reason}` : ''}
            </p>
          </div>
          <p className="text-[13px] text-body leading-relaxed">
            This employee has already exited. Reverse the exit to bring them back — they will become
            inactive and can then be reactivated, edited or transferred normally.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Close</Button>
            <Button variant="danger" onClick={() => reinstate.mutate(pending.id)} disabled={busy}>
              {reinstate.isPending ? 'Reversing...' : 'Reverse exit'}
            </Button>
          </div>
        </div>
      ) : pending ? (
        /* ---- A request is already in flight ---- */
        <div className="space-y-4">
          <div className="p-3 bg-warning-soft border border-warning/30 rounded-sm">
            <p className="text-[13px] text-body">
              An exit request is already{' '}
              <span className="font-medium text-ink">{pending.status === 'pending' ? 'pending approval' : 'approved'}</span> for this
              employee (last working day {dateShort(pending.last_working_date || '')}). Open Exit Management to review it.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Close</Button>
            <a
              href="/separation"
              className="inline-flex items-center gap-1.5 px-3 h-8 text-[13px] font-medium text-link hover:bg-link-soft rounded-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open Exit Management
            </a>
          </div>
        </div>
      ) : (
        /* ---- Step 1: collect the exit details ---- */
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 p-2.5 bg-canvas-soft rounded-sm">
            <span className="text-[12px] text-mute">
              {employee?.employee_code} · {employee?.designation || '—'}
            </span>
            <span className="text-[12px] text-mute">Joined {dateShort(String(employee?.joining_date || '').slice(0, 10))}</span>
          </div>

          <div>
            <Select
              id="ex-type"
              label="Exit type"
              required
              value={form.separation_type}
              onChange={set('separation_type')}
              options={TYPES.map((t) => ({ value: t.value, label: t.label }))}
            />
            <p className="mt-1 text-[11px] text-mute">Recorded as the exit reason on the employee record.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ex-resig" required>Resignation date</Label>
              <Input id="ex-resig" type="date" value={form.resignation_date} onChange={set('resignation_date')} className={errors.resignation_date ? 'border-error' : ''} />
              {errors.resignation_date && <p className="mt-1 text-[11px] text-error">{errors.resignation_date}</p>}
            </div>
            <div>
              <Label htmlFor="ex-lwd" required>Last working day</Label>
              <Input id="ex-lwd" type="date" value={form.last_working_date} onChange={set('last_working_date')} className={errors.last_working_date ? 'border-error' : ''} />
              {errors.last_working_date
                ? <p className="mt-1 text-[11px] text-error">{errors.last_working_date}</p>
                : <p className="mt-1 text-[11px] text-mute">Becomes the employee&apos;s exit date.</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="ex-np">Notice period (days)</Label>
              <Input id="ex-np" type="number" min={0} value={form.notice_period_days} onChange={set('notice_period_days')} />
            </div>
            <div>
              <Label htmlFor="ex-ns">Notice served (days)</Label>
              <Input id="ex-ns" type="number" min={0} value={form.notice_served_days} onChange={set('notice_served_days')} className={errors.notice_served_days ? 'border-error' : ''} />
              {errors.notice_served_days && <p className="mt-1 text-[11px] text-error">{errors.notice_served_days}</p>}
            </div>
            <div>
              <Label htmlFor="ex-nb">Notice buyout (days)</Label>
              <Input id="ex-nb" type="number" min={0} value={form.notice_buyout} onChange={set('notice_buyout')} />
            </div>
          </div>

          <div>
            <Label htmlFor="ex-reason">Reason / remarks</Label>
            <Textarea id="ex-reason" rows={3} value={form.reason} onChange={set('reason')} placeholder="Reason for leaving, handover notes, agreed terms..." />
          </div>

          {history.length > 0 && (
            <div className="pt-2 border-t border-hairline">
              <div className="text-[11px] font-mono text-mute uppercase mb-1.5">Previous exit records</div>
              <ul className="space-y-1">
                {history.map((h) => (
                  <li key={h.id} className="text-[12px] text-mute">
                    {typeLabel(h.separation_type)} · last working day {dateShort(h.last_working_date || '')} · {h.status}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="danger" onClick={() => create.mutate()} disabled={busy || Object.keys(errors).length > 0}>
              {create.isPending ? 'Saving...' : 'Continue'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
