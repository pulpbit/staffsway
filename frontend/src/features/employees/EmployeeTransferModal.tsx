import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, History } from 'lucide-react'
import { employeeApi, siteApi } from '@/services/api'
import { Button, Input, Select, Label, Textarea } from '@/components/ui/fields'
import { Modal } from '@/components/ui/overlay'
import { LoadingState } from '@/components/ui/state'
import { dateShort } from '@/utils/format'
import type { Employee, EmployeeTransfer } from '@/types/api'
import { toast } from 'sonner'

const REASONS = [
  'Site requirement',
  'Client request',
  'Internal movement',
  'Role change',
  'Relocation',
  'Training / deployment',
]

interface Props {
  open: boolean
  onClose: () => void
  employee: Employee | null
}

export default function EmployeeTransferModal({ open, onClose, employee }: Props) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    site_id: '',
    designation: '',
    department: '',
    effective_date: new Date().toISOString().slice(0, 10),
    reason: REASONS[0],
    remarks: '',
  })
  const [showHistory, setShowHistory] = useState(false)

  // Reset the form to the employee's current assignment each time it opens.
  useEffect(() => {
    if (open && employee) {
      setForm({
        site_id: employee.site_id ? String(employee.site_id) : '',
        designation: employee.designation || '',
        department: employee.department || '',
        effective_date: new Date().toISOString().slice(0, 10),
        reason: REASONS[0],
        remarks: '',
      })
      setShowHistory(false)
    }
  }, [open, employee])

  const { data: sitesData, isLoading: sitesLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: () => siteApi.list(),
    enabled: open,
  })
  const sites = (sitesData?.data || []) as any[]

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['employee-transfers', employee?.id],
    queryFn: () => employeeApi.transfers(employee!.id),
    enabled: open && !!employee?.id && showHistory,
  })
  const history = (historyData?.data || []) as EmployeeTransfer[]

  const save = useMutation({
    mutationFn: () =>
      employeeApi.transfer(employee!.id, {
        site_id: form.site_id ? Number(form.site_id) : null,
        designation: form.designation.trim() || null,
        department: form.department.trim() || null,
        effective_date: form.effective_date,
        reason: form.reason || null,
        remarks: form.remarks.trim() || null,
      }),
    onSuccess: () => {
      toast.success('Employee transferred')
      qc.invalidateQueries({ queryKey: ['employees'] })
      qc.invalidateQueries({ queryKey: ['employee', employee?.id] })
      qc.invalidateQueries({ queryKey: ['employee-transfers', employee?.id] })
      onClose()
    },
    onError: (e: any) => toast.error(e?.error?.message || 'Could not transfer employee.'),
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }))

  const targetSite = sites.find((s) => String(s.id) === form.site_id)
  const changed =
    (form.site_id ? Number(form.site_id) : null) !== (employee?.site_id ?? null) ||
    form.designation.trim() !== (employee?.designation || '') ||
    form.department.trim() !== (employee?.department || '')

  return (
    <Modal open={open} onClose={onClose} size="lg" title={`Transfer — ${employee?.first_name || ''} ${employee?.last_name || ''}`}>
      <div className="space-y-4">
        {/* Current assignment */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-canvas-soft rounded-sm">
          <div>
            <div className="text-[11px] font-mono text-mute uppercase">Current site</div>
            <div className="text-[13px] text-ink mt-0.5">{employee?.site_name || '—'}</div>
          </div>
          <div>
            <div className="text-[11px] font-mono text-mute uppercase">Client</div>
            <div className="text-[13px] text-ink mt-0.5">{employee?.client_name || '—'}</div>
          </div>
          <div>
            <div className="text-[11px] font-mono text-mute uppercase">Designation</div>
            <div className="text-[13px] text-ink mt-0.5">{employee?.designation || '—'}</div>
          </div>
        </div>

        {/* New assignment */}
        <div className="space-y-3">
          <div>
            <Select
              id="tr-site"
              label="New site / client"
              required
              value={form.site_id}
              onChange={set('site_id')}
              disabled={sitesLoading}
              options={[
                { value: '', label: sitesLoading ? 'Loading sites...' : '— Unassigned —' },
                ...sites.map((s) => ({ value: String(s.id), label: s.client_name ? `${s.name} — ${s.client_name}` : s.name })),
              ]}
            />
            {targetSite && (
              <p className="mt-1 text-[12px] text-mute inline-flex items-center gap-1">
                {employee?.site_name || 'Unassigned'} <ArrowRight className="w-3 h-3" /> {targetSite.name}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="tr-desig">Designation</Label>
              <Input id="tr-desig" value={form.designation} onChange={set('designation')} placeholder="e.g. Site Supervisor" />
            </div>
            <div>
              <Label htmlFor="tr-dept">Department</Label>
              <Input id="tr-dept" value={form.department} onChange={set('department')} placeholder="e.g. Operations" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="tr-date" required>Effective from</Label>
              <Input id="tr-date" type="date" value={form.effective_date} onChange={set('effective_date')} />
            </div>
            <div>
              <Select
                id="tr-reason"
                label="Reason"
                value={form.reason}
                onChange={set('reason')}
                options={REASONS.map((r) => ({ value: r, label: r }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="tr-remarks">Remarks</Label>
            <Textarea id="tr-remarks" rows={2} value={form.remarks} onChange={set('remarks')} placeholder="Optional notes about this transfer" />
          </div>
        </div>

        {/* History */}
        <div className="pt-1 border-t border-hairline">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="inline-flex items-center gap-1.5 mt-3 text-[12px] font-medium text-link hover:underline cursor-pointer"
          >
            <History className="w-3.5 h-3.5" /> {showHistory ? 'Hide' : 'View'} transfer history
          </button>

          {showHistory && (
            <div className="mt-2.5">
              {historyLoading ? (
                <LoadingState message="Loading history..." />
              ) : history.length === 0 ? (
                <p className="text-[12px] text-mute">No previous transfers recorded.</p>
              ) : (
                <ul className="space-y-1.5">
                  {history.map((t) => (
                    <li key={t.id} className="p-2.5 border border-hairline rounded-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] text-ink inline-flex items-center gap-1.5 min-w-0">
                          <span className="truncate">{t.from_site_name || 'Unassigned'}</span>
                          <ArrowRight className="w-3 h-3 text-mute shrink-0" />
                          <span className="truncate font-medium">{t.to_site_name || 'Unassigned'}</span>
                        </span>
                        <span className="text-[12px] text-mute whitespace-nowrap">{dateShort(t.effective_date)}</span>
                      </div>
                      {(t.from_designation !== t.to_designation || t.reason) && (
                        <p className="mt-1 text-[12px] text-mute">
                          {t.from_designation !== t.to_designation && <>{t.from_designation || '—'} → {t.to_designation || '—'}</>}
                          {t.from_designation !== t.to_designation && t.reason ? ' · ' : ''}
                          {t.reason}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={!changed || save.isPending}>
            {save.isPending ? 'Transferring...' : 'Transfer employee'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
