import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { Printer, X } from 'lucide-react'
import { employeeApi, settingsApi } from '@/services/api'
import { Button, Input, Label, Select, Textarea } from '@/components/ui/fields'
import { Modal } from '@/components/ui/overlay'
import { LoadingState } from '@/components/ui/state'
import EmployeeLetterTemplate, { type LetterForm, type LetterType } from './EmployeeLetterTemplate'
import { dateDMY } from '@/utils/format'

const today = () => new Date().toISOString().slice(0, 10)
const plusDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10)

const EMPLOYMENT_TYPES = ['permanent', 'fixed_term', 'probation', 'contract', 'temporary']

export default function EmployeeLetterModal({
  employeeId,
  employeeIds,
  defaultType = 'appointment',
  onClose,
}: {
  employeeId?: number
  employeeIds?: number[]
  defaultType?: LetterType
  onClose: () => void
}) {
  const { data: emp } = useQuery({
    queryKey: ['employee-letter', employeeId],
    queryFn: () => employeeApi.get(employeeId!),
    enabled: !!employeeId,
  })
  const { data: settingsRes } = useQuery({ queryKey: ['settings'], queryFn: () => settingsApi.get() })

  const employee = emp?.data
  const settings = settingsRes?.data?.settings
  const isBulk = !!employeeIds?.length

  // One form state, reset whenever the modal is opened for a different person
  // so a previous employee's salary never leaks into the next letter.
  const [form, setForm] = useState<LetterForm | null>(null)

  useEffect(() => {
    if (isBulk) {
      // For bulk, initialize with empty form - user will fill in common values
      setForm({
        type: defaultType,
        issue_date: today(),
        accept_by: plusDays(15),
        joining_date: '',
        probation_months: null,
        designation: '',
        department: '',
        grade: '',
        reporting_manager: '',
        employment_type: '',
        shift_type: '',
        basic: null,
        hra: null,
        conveyance: null,
        other_allowance: null,
        ctc: null,
        working_hours: null,
        working_days_week: null,
        notice_period_days: null,
        signatory_name: 'Authorised Signatory',
        signatory_designation: 'Human Resources',
        additional_notes: '',
      })
      return
    }
    if (!employee) return
    const sal = employee.salary
    setForm({
      type: defaultType,
      issue_date: today(),
      accept_by: plusDays(15),
      joining_date: employee.joining_date || '',
      probation_months: null,
      designation: employee.designation || '',
      department: employee.department || '',
      grade: employee.grade || '',
      reporting_manager: employee.reporting_manager || '',
      employment_type: employee.employee_type || '',
      shift_type: employee.shift_type || '',
      basic: Number(sal?.basic || 0),
      hra: Number(sal?.hra || 0),
      conveyance: Number(sal?.conveyance || 0),
      other_allowance: Number(sal?.other_allowance || 0),
      ctc: employee.ctc ? Number(employee.ctc) : null,
      working_hours: sal?.working_hours ?? null,
      working_days_week: employee.working_days_week ?? null,
      notice_period_days: employee.notice_period_days ?? null,
      signatory_name: 'Authorised Signatory',
      signatory_designation: 'Human Resources',
      additional_notes: '',
    })
  }, [employee, defaultType])

  const set = <K extends keyof LetterForm>(k: K, v: LetterForm[K]) => setForm((p) => (p ? { ...p, [k]: v } : p))
  const setNum = (k: keyof LetterForm) => (e: { target: { value: string } }) =>
    set(k, (e.target.value ? Number(e.target.value) : null) as never)

  const content = useMemo(
    () => (employee && settings && form ? <EmployeeLetterTemplate employee={employee} settings={settings} form={form} /> : null),
    [employee, settings, form],
  )

  // Reuse the joining-form print pipeline: it already hides the app, keeps the
  // document in normal flow so it can run past one page, and removes itself.
  useEffect(() => {
    if (!content) return
    document.body.classList.add('print-joining')
    return () => document.body.classList.remove('print-joining')
  }, [content])

  if (!employee || !settings || !form) {
    return (
      <Modal open onClose={onClose} title="Generate Letter">
        <LoadingState message="Loading employee..." />
      </Modal>
    )
  }

  const isOffer = form.type === 'offer'
  const who = [employee.first_name, employee.last_name].filter(Boolean).join(' ')
  const gross = Number(form.basic || 0) + Number(form.hra || 0) + Number(form.conveyance || 0) + Number(form.other_allowance || 0)

  return (
    <>
      <Modal open onClose={onClose} title={`${isOffer ? 'Offer' : 'Appointment'} Letter · ${who}`} size="xl">
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-4 print:hidden">
            {/* -------- Form -------- */}
            <div className="space-y-3 max-h-[80vh] overflow-y-auto pr-1 lg:max-h-[66vh]">
              <div className="rounded-xl border border-slate-200 p-3 space-y-2">
                <p className="text-[11px] font-bold text-slate-700">Letter type</p>
                <Select
                  value={form.type}
                  onChange={(e) => set('type', e.target.value as LetterType)}
                  options={[
                    { value: 'offer', label: 'Offer Letter' },
                    { value: 'appointment', label: 'Appointment Letter' },
                  ]}
                />
                <p className="text-[10.5px] text-slate-500 leading-relaxed">
                  {isOffer
                    ? 'Use for an offer that is being extended. Shows an accept-by date and a proposed joining date.'
                    : 'Use to confirm an appointment once the employee has joined. Shows the actual joining date and probation.'}
                </p>
              </div>

              {/* Read-only identity — the letterhead always shows the employee on file. */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <p className="text-[11px] font-bold text-slate-600 mb-1.5">Employee (from record)</p>
                <Facts rows={[['Employee Code', employee.employee_code], ['Name', who], ['Father / Spouse', employee.father_name || employee.spouse_name || '—'], ['Mobile', employee.mobile || '—'], ['Email', employee.email || '—'], ['Site', employee.site?.name || '—']]} />
              </div>

              <div className="rounded-xl border border-slate-200 p-3 space-y-2">
                <p className="text-[11px] font-bold text-slate-700">Dates</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <Label required>Issue Date</Label>
                    <Input type="date" value={form.issue_date} onChange={(e) => set('issue_date', e.target.value)} />
                  </div>
                  {isOffer ? (
                    <div>
                      <Label required>Accept By</Label>
                      <Input type="date" value={form.accept_by} onChange={(e) => set('accept_by', e.target.value)} />
                    </div>
                  ) : (
                    <div>
                      <Label required>Date of Joining</Label>
                      <Input type="date" value={form.joining_date} onChange={(e) => set('joining_date', e.target.value)} />
                    </div>
                  )}
                </div>
                {isOffer && (
                  <div>
                    <Label>Proposed Date of Joining</Label>
                    <Input type="date" value={form.joining_date} onChange={(e) => set('joining_date', e.target.value)} />
                  </div>
                )}
                <div>
                  <Label>Probation (months)</Label>
                  <Input type="number" min={0} max={60} value={form.probation_months ?? ''} onChange={setNum('probation_months')} placeholder="e.g. 6" />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3 space-y-2">
                <p className="text-[11px] font-bold text-slate-700">Role & posting</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <Label required>Designation</Label>
                    <Input value={form.designation} onChange={(e) => set('designation', e.target.value)} />
                  </div>
                  <div>
                    <Label>Department</Label>
                    <Input value={form.department} onChange={(e) => set('department', e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <Label>Grade</Label>
                    <Input value={form.grade} onChange={(e) => set('grade', e.target.value)} />
                  </div>
                  <div>
                    <Label>Reporting Manager</Label>
                    <Input value={form.reporting_manager} onChange={(e) => set('reporting_manager', e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <Label>Employment Type</Label>
                    <Select
                      value={form.employment_type}
                      onChange={(e) => set('employment_type', e.target.value)}
                      options={EMPLOYMENT_TYPES.map((t) => ({ value: t, label: t.replace(/_/g, ' ') }))}
                    />
                  </div>
                  <div>
                    <Label>Shift</Label>
                    <Input value={form.shift_type} onChange={(e) => set('shift_type', e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3 space-y-2">
                <p className="text-[11px] font-bold text-slate-700">Salary & working terms</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Num label="Basic" value={form.basic} onChange={setNum('basic')} />
                  <Num label="HRA" value={form.hra} onChange={setNum('hra')} />
                  <Num label="Conveyance" value={form.conveyance} onChange={setNum('conveyance')} />
                  <Num label={employee.salary?.other_allowance_label || 'Other Allowance'} value={form.other_allowance} onChange={setNum('other_allowance')} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  <Num label="Annual CTC" value={form.ctc} onChange={setNum('ctc')} />
                  <Num label="Hours / day" value={form.working_hours} onChange={setNum('working_hours')} />
                  <Num label="Days / week" value={form.working_days_week} onChange={setNum('working_days_week')} />
                </div>
                <Num label="Notice period (days)" value={form.notice_period_days} onChange={setNum('notice_period_days')} />
                <p className="text-[10.5px] text-slate-500">Gross monthly from these values: ₹{gross.toLocaleString('en-IN')}</p>
              </div>

              <div className="rounded-xl border border-slate-200 p-3 space-y-2">
                <p className="text-[11px] font-bold text-slate-700">Authorised signatory</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <Label>Name</Label>
                    <Input value={form.signatory_name} onChange={(e) => set('signatory_name', e.target.value)} />
                  </div>
                  <div>
                    <Label>Designation</Label>
                    <Input value={form.signatory_designation} onChange={(e) => set('signatory_designation', e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Additional notes (printed on the letter)</Label>
                  <Textarea rows={2} value={form.additional_notes} onChange={(e) => set('additional_notes', e.target.value)} placeholder="Optional" />
                </div>
              </div>
            </div>

{/* -------- Live preview -------- */}
            <div className="flex flex-col gap-2 min-h-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <p className="text-[11px] font-bold text-slate-600">Live preview</p>
                <Button size="sm" disabled={!content} onClick={() => window.print()} className="w-full sm:w-auto">
                  <Printer className="w-3.5 h-3.5" /> Generate & Print
                </Button>
              </div>
              <div className="flex-1 max-h-[70vh] overflow-y-auto rounded-lg border border-slate-200 bg-slate-100/50 p-4 sm:p-5">
                <div className="bg-white shadow-sm rounded-sm p-4 sm:p-5">{content}</div>
              </div>
              <p className="text-[10.5px] text-slate-500">
                Use your browser's Print dialog and choose &ldquo;Save as PDF&rdquo; to keep a digital copy. Nothing is
                saved to the server.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-200 print:hidden">
            <p className="text-[11px] text-slate-500">
              Reference on the letter:{' '}
              <span className="font-mono font-semibold text-slate-700">
                {`${isOffer ? 'OFF' : 'APP'}/${employee.employee_code}/${form.issue_date ? dateDMY(form.issue_date) : ''}`}
              </span>
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              <Button variant="secondary" onClick={() => window.print()} disabled={!content} className="w-full sm:w-auto">
                <Printer className="w-3.5 h-3.5" /> Print
              </Button>
              <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">
                <X className="w-3.5 h-3.5" /> Close
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {createPortal(<div className="print-join">{content}</div>, document.body)}
    </>
  )
}

function Num({ label, value, onChange }: { label: string; value: number | null; onChange: (e: { target: { value: string } }) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type="number" min={0} value={value ?? ''} onChange={onChange} placeholder="0" />
    </div>
  )
}

function Facts({ rows }: { rows: [string, string | null | undefined][] }) {
  return (
    <table className="w-full">
      <tbody>
        {rows.map(([k, v], i) => (
          <tr key={k} className={i % 2 ? 'bg-white/70' : ''}>
            <th className="w-full sm:w-[42%] py-0.5 pr-2 text-left align-top text-[10px] font-medium text-slate-500">{k}</th>
            <td className="py-0.5 align-top text-[10.5px] font-semibold text-slate-800 truncate">{v || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}