import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { employeeApi } from '@/services/api'
import { Button, Input, Select } from '@/components/ui/fields'
import { Modal } from '@/components/ui/overlay'
import { LoadingState } from '@/components/ui/state'
import { money } from '@/utils/format'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onClose: () => void
  employeeId: number | null
  employeeName?: string
}

export default function SalaryRevisionModal({ open, onClose, employeeId, employeeName }: Props) {
  const [form, setForm] = useState({
    reason: 'increment',
    effective_from: new Date().toISOString().slice(0, 10),
    basic: '',
    hra: '',
    conveyance: '',
    other_allowance: '',
    overtime_rate: '',
    designation: '',
    remarks: '',
  })
  const qc = useQueryClient()

  const { data: empData } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => employeeApi.get(employeeId!),
    enabled: open && !!employeeId,
  })
  const salary: any = empData?.data?.salary

  const prefill = () => {
    if (!salary) return {}
    return {
      basic: String(salary.basic ?? ''),
      hra: String(salary.hra ?? ''),
      conveyance: String(salary.conveyance ?? ''),
      other_allowance: String(salary.other_allowance ?? ''),
      overtime_rate: String(salary.overtime_rate ?? ''),
    }
  }

  const { data: revData } = useQuery({
    queryKey: ['revisions', employeeId],
    queryFn: () => employeeApi.revisions(employeeId!),
    enabled: open && !!employeeId,
  })

  const mut = useMutation({
    mutationFn: () =>
      employeeApi.createRevision(employeeId!, {
        effective_from: form.effective_from,
        reason: form.reason as 'increment' | 'promotion' | 'revision' | 'correction',
        basic: Number(form.basic) || 0,
        hra: Number(form.hra) || 0,
        conveyance: Number(form.conveyance) || 0,
        other_allowance: Number(form.other_allowance) || 0,
        overtime_rate: Number(form.overtime_rate) || 0,
        designation: form.designation || undefined,
        remarks: form.remarks || undefined,
      }),
    onSuccess: (r: any) => {
      toast.success(r.message || 'Salary revised.')
      qc.invalidateQueries({ queryKey: ['revisions', employeeId] })
      qc.invalidateQueries({ queryKey: ['employee', employeeId] })
      qc.invalidateQueries({ queryKey: ['employees'] })
      setForm(f => ({ ...f, basic: '', hra: '', conveyance: '', other_allowance: '', overtime_rate: '', designation: '', remarks: '' }))
    },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to revise salary.'),
  })

  const cur = form.basic === '' ? prefill() : null
  const val = (k: string) => (cur ? (cur as any)[k] : (form as any)[k])

  const newGross = (Number(val('basic')) || 0) + (Number(val('hra')) || 0) + (Number(val('conveyance')) || 0) + (Number(val('other_allowance')) || 0)
  const oldGross = salary ? Number(salary.basic) + Number(salary.hra) + Number(salary.conveyance) + Number(salary.other_allowance) : 0

  return (
    <Modal open={open} onClose={onClose} title={`Salary Revision — ${employeeName || ''}`} size="md">
      {!salary ? <LoadingState /> : (
        <div className="space-y-3">
          <div className="flex items-center gap-4 text-[12px] text-body bg-canvas-soft rounded-sm p-2">
            <span>Current: Basic <b>{money(salary.basic)}</b> | Gross <b>{money(oldGross)}</b></span>
            <span className="ml-auto">New Gross: <b className={newGross >= oldGross ? 'text-success' : 'text-error'}>{money(newGross)}</b></span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Reason"
              value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              options={[
                { value: 'increment', label: 'Increment' },
                { value: 'promotion', label: 'Promotion' },
                { value: 'revision', label: 'Salary Revision' },
                { value: 'correction', label: 'Correction' },
              ]}
            />
            <Input label="Effective From" type="date" value={form.effective_from} onChange={e => setForm(f => ({ ...f, effective_from: e.target.value }))} />
            <Input label="Basic (₹)" type="number" value={val('basic')} onChange={e => setForm(f => ({ ...f, basic: e.target.value }))} />
            <Input label="HRA (₹)" type="number" value={val('hra')} onChange={e => setForm(f => ({ ...f, hra: e.target.value }))} />
            <Input label="Conveyance (₹)" type="number" value={val('conveyance')} onChange={e => setForm(f => ({ ...f, conveyance: e.target.value }))} />
            <Input label="Other Allowance (₹)" type="number" value={val('other_allowance')} onChange={e => setForm(f => ({ ...f, other_allowance: e.target.value }))} />
            <Input label="OT Rate (/hr)" type="number" value={val('overtime_rate')} onChange={e => setForm(f => ({ ...f, overtime_rate: e.target.value }))} />
            <Input label="New Designation (for promotion)" value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} placeholder={salary ? undefined : ''} />
          </div>
          <Input label="Remarks" value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
          <p className="text-[11px] text-mute">A new salary structure is created from the effective date. Past payslips and payroll runs stay unchanged.</p>

          {(revData?.data || []).length > 0 && (
            <div>
              <p className="text-[12px] font-medium text-ink mb-1 mt-2">Revision History</p>
              <div className="max-h-32 overflow-y-auto border border-hairline rounded-sm divide-y divide-hairline">
                {(revData?.data || []).map((rv: any) => (
                  <div key={rv.id} className="flex items-center gap-2 px-2 py-1.5 text-[11px]">
                    <span className="font-mono text-mute">{rv.effective_from}</span>
                    <span className="capitalize text-body">{rv.reason}</span>
                    <span className="ml-auto text-body">{money(rv.old_basic)} → <b>{money(rv.new_basic)}</b></span>
                    <span className="text-mute w-24 text-right truncate">{rv.remarks || ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={onClose}>Close</Button>
            <Button loading={mut.isPending} onClick={() => {
              if (!form.effective_from || !Number(val('basic'))) { toast.error('Enter effective date and basic amount.'); return }
              mut.mutate()
            }}>Apply Revision</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
