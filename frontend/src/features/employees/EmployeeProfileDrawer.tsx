import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { employeeApi } from '@/services/api'
import type { Employee, EmployeeDocument } from '@/types/api'
import { Drawer } from '@/components/ui/drawer'
import { Avatar } from '@/components/ui/actions'
import { StatusBadge } from '@/components/ui/status'
import { Button } from '@/components/ui/fields'
import { LoadingState } from '@/components/ui/state'
import { fullName, dateShort, money } from '@/utils/format'
import { isPending } from '@/utils/pending'
import { stateShort } from '@/utils/states'
import {
  CalendarCheck, Upload, CalendarDays, Pencil, FileText, ArrowRightLeft,
  Plus, Trash2, Check, CircleAlert, Phone, Mail, MapPin,
  TrendingUp, ClipboardCheck, Printer, SquareUserRound,
} from 'lucide-react'

const DOC_TYPES = ['Aadhaar Card', 'PAN Card', 'Bank Proof', 'Joining Form', 'Education Certificate', 'Address Proof', 'Other']

const PENDING_FIELDS = [
  { key: 'dob', label: 'DOB', tab: 'info' as Tab },
  { key: 'father_name', label: "Father's Name", tab: 'info' as Tab },
  { key: 'spouse_name', label: 'Spouse Name', tab: 'info' as Tab },
  { key: 'gender', label: 'Gender', tab: 'info' as Tab },
  { key: 'aadhaar', label: 'Aadhaar', tab: 'info' as Tab },
  { key: 'pan', label: 'PAN', tab: 'info' as Tab },
  { key: 'mobile', label: 'Contact No.', tab: 'info' as Tab },
  { key: 'designation', label: 'Job Title', tab: 'employment' as Tab },
  { key: 'department', label: 'Department', tab: 'employment' as Tab },
  { key: 'joining_date', label: 'Joining Date', tab: 'employment' as Tab },
  { key: 'bank_account', label: 'Bank A/C', tab: 'employment' as Tab },
  { key: 'bank_ifsc', label: 'IFSC', tab: 'employment' as Tab },
  { key: 'esi_number', label: 'ESIC', tab: 'employment' as Tab },
  { key: 'uan', label: 'UAN', tab: 'employment' as Tab },
] as const

type Tab = 'info' | 'employment' | 'documents' | 'history'

interface EmployeeProfileDrawerProps {
  open: boolean
  employeeId: number | null
  name?: string
  code?: string
  onClose: () => void
  onEdit: (id: number, field?: string) => void
  onRevise?: (id: number) => void
  onOnboarding?: (id: number) => void
  onJoiningForm?: (id: number) => void
  onToggleStatus?: (id: number, status: string) => void
  onDelete?: (id: number) => void
}

export default function EmployeeProfileDrawer({ open, employeeId, name, code, onClose, onEdit, onRevise, onOnboarding, onJoiningForm, onToggleStatus, onDelete }: EmployeeProfileDrawerProps) {
  const [tab, setTab] = useState<Tab>('info')
  const [docForm, setDocForm] = useState({ document_type: DOC_TYPES[0], document_name: '', document_number: '' })
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => employeeApi.get(employeeId!),
    enabled: !!employeeId,
  })
  const { data: revisionsData } = useQuery({
    queryKey: ['employee-revisions', employeeId],
    queryFn: () => employeeApi.revisions(employeeId!),
    enabled: !!employeeId,
  })

  const emp = data?.data as Employee | undefined
  const documents = (emp?.documents || []) as EmployeeDocument[]
  const revisions = (revisionsData?.data || []) as any[]

  const docAddMut = useMutation({
    mutationFn: () => employeeApi.addDocument(employeeId!, docForm),
    onSuccess: () => { setDocForm({ document_type: DOC_TYPES[0], document_name: '', document_number: '' }); queryClient.invalidateQueries({ queryKey: ['employee', employeeId] }); },
  })
  const docDeleteMut = useMutation({
    mutationFn: (docId: number) => employeeApi.deleteDocument(employeeId!, docId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employee', employeeId] }),
  })
  const docVerifyMut = useMutation({
    mutationFn: ({ docId, verified }: { docId: number; verified: boolean }) => employeeApi.verifyDocument(employeeId!, docId, verified),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employee', employeeId] }),
  })

  const pendingFor = (t: Tab) => {
    if (!emp) return []
    return PENDING_FIELDS.filter((f) => f.tab === t && isPending(emp[f.key as keyof Employee]))
  }

  const quickActions = [
    { label: 'View Attendance', icon: CalendarCheck, to: '/attendance' },
    { label: 'Upload Documents', icon: Upload, action: () => setTab('documents') },
    { label: 'Apply Leave', icon: CalendarDays, to: '/leaves' },
    { label: 'Update Details', icon: Pencil, action: () => employeeId && onEdit(employeeId) },
    { label: 'Generate Payslip', icon: FileText, to: '/slips' },
    { label: 'Transfer Employee', icon: ArrowRightLeft, to: '/employees/transfer' },
    { label: 'Revise Salary', icon: TrendingUp, action: () => employeeId && onRevise?.(employeeId) },
    { label: 'Onboarding Checklist', icon: ClipboardCheck, action: () => employeeId && onOnboarding?.(employeeId) },
    { label: 'Joining Form', icon: Printer, action: () => employeeId && onJoiningForm?.(employeeId) },
  ]

  const nameStr = emp ? fullName(emp.first_name, emp.last_name) : name || ''

  return (
    <Drawer open={open} onClose={onClose} title={nameStr || code || 'Employee Profile'}>
      {isLoading || !emp ? (
        <div className="p-6"><LoadingState /></div>
      ) : (
        <div className="flex flex-col">
          <div className="p-4 border-b border-hairline bg-canvas-soft/40">
            <div className="flex items-start gap-3">
              <Avatar name={nameStr} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-[15px] font-semibold text-ink tracking-[-0.02em]">{nameStr}</h3>
                  <StatusBadge status={emp.status} />
                </div>
                <p className="text-[11px] font-mono text-mute mt-0.5">{emp.employee_code}</p>
                <div className="mt-2 space-y-1">
                  {emp.mobile && (
                    <p className="flex items-center gap-1.5 text-[12px] text-body"><Phone className="w-3.5 h-3.5 text-mute" /> {emp.mobile}</p>
                  )}
                  {emp.email && (
                    <p className="flex items-center gap-1.5 text-[12px] text-body truncate"><Mail className="w-3.5 h-3.5 text-mute shrink-0" /> {emp.email}</p>
                  )}
                  {(emp.address || emp.state || emp.pincode) && (
                    <p className="flex items-start gap-1.5 text-[12px] text-body"><MapPin className="w-3.5 h-3.5 text-mute shrink-0 mt-0.5" /> <span className="min-w-0 truncate">{emp.address}{emp.state ? `, ${stateShort(emp.state)}` : ''}{emp.pincode ? ` ${emp.pincode}` : ''}</span></p>
                  )}
                </div>
              </div>
            </div>
            <Button size="sm" className="mt-3" onClick={() => onEdit(emp.id)}><Pencil className="w-3.5 h-3.5" /> Edit Profile</Button>
          </div>

          <div className="px-4 pt-3 pb-1 flex items-center gap-1 border-b border-hairline">
            {(['info', 'employment', 'documents', 'history'] as Tab[]).map((t) => {
              const pendingCount = pendingFor(t).length
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium rounded-sm transition-colors ${tab === t ? 'bg-canvas-soft text-ink' : 'text-mute hover:text-body'}`}
                >
                  {t === 'info' ? 'Personnel Info' : t === 'employment' ? 'Employment' : t === 'documents' ? 'Documents' : 'History'}
                  {pendingCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-error" />}
                </button>
              )
            })}
          </div>

          <div className="p-4">
            {tab === 'info' && (
              <section className="space-y-5">
                <FieldGroup title="Personal">
                  <Info label="Father's/Spouse Name" value={emp.father_name || emp.spouse_name || ''} pending={!emp.father_name && !emp.spouse_name} onEdit={() => onEdit(emp.id, 'father_name')} />
                  <Info label="Gender" value={emp.gender || ''} pending={!emp.gender} onEdit={() => onEdit(emp.id, 'gender')} />
                  <Info label="Date of Birth" value={dateShort(emp.dob)} pending={!emp.dob} onEdit={() => onEdit(emp.id, 'dob')} />
                  <Info label="Marital Status" value={emp.marital_status || ''} />
                  <Info label="Nationality" value={emp.nationality || ''} />
                </FieldGroup>
                <FieldGroup title="Contact">
                  <Info label="Mobile" value={emp.mobile || ''} pending={!emp.mobile} onEdit={() => onEdit(emp.id, 'mobile')} />
                  <Info label="Alternate Mobile" value={emp.alternate_mobile || ''} />
                  <Info label="Email" value={emp.email || ''} />
                </FieldGroup>
                <FieldGroup title="Address">
                  <Info label="Present Address" value={emp.address || ''} pending={!emp.address} onEdit={() => onEdit(emp.id, 'address')} />
                  <Info label="State" value={emp.state ? `${emp.state} (${stateShort(emp.state)})` : ''} />
                  <Info label="District" value={emp.district || ''} />
                  <Info label="Pincode" value={emp.pincode || ''} />
                  {!emp.permanent_same_as_present ? (
                    <Info label="Permanent Address" value={emp.permanent_address || ''} />
                  ) : null}
                </FieldGroup>
                <FieldGroup title="Emergency Contact">
                  <Info label="Name" value={emp.emergency_contact_name || ''} />
                  <Info label="Relation" value={emp.emergency_contact_relation || ''} />
                  <Info label="Phone" value={emp.emergency_contact_phone || ''} />
                </FieldGroup>
                <FieldGroup title="Identity">
                  <Info label="Aadhaar No." value={emp.aadhaar || ''} pending={!emp.aadhaar} onEdit={() => onEdit(emp.id, 'aadhaar')} />
                  <Info label="PAN" value={emp.pan || ''} pending={!emp.pan} onEdit={() => onEdit(emp.id, 'pan')} />
                </FieldGroup>
              </section>
            )}

            {tab === 'employment' && (
              <section className="space-y-5">
                <FieldGroup title="Employment">
                  <Info label="Job Title" value={emp.designation || ''} pending={!emp.designation} onEdit={() => onEdit(emp.id, 'designation')} />
                  <Info label="Department" value={emp.department || ''} pending={!emp.department} onEdit={() => onEdit(emp.id, 'department')} />
                  <Info label="Employee Type" value={emp.employee_type || ''} />
                  <Info label="Shift Type" value={emp.shift_type || ''} />
                  <Info label="Grade" value={emp.grade || ''} />
                  <Info label="Reporting Manager" value={emp.reporting_manager || ''} />
                  <Info label="Working Days / Week" value={emp.working_days_week ? String(emp.working_days_week) : ''} />
                  <Info label="Notice Period (days)" value={emp.notice_period_days ? String(emp.notice_period_days) : ''} />
                  <Info label="Joining Date" value={dateShort(emp.joining_date)} pending={!emp.joining_date} onEdit={() => onEdit(emp.id, 'joining_date')} />
                  {emp.site_name ? <Info label="Site" value={emp.client_name && emp.site_name ? `${emp.site_name} · ${emp.client_name}` : emp.site_name || emp.client_name || ''} /> : null}
                </FieldGroup>
                <FieldGroup title="Compensation">
                  <Info label="Basic" value={emp.salary?.basic ? money(Number(emp.salary.basic)) : ''} />
                  <Info label="HRA" value={emp.salary?.hra ? money(Number(emp.salary.hra)) : ''} />
                  <Info label="Conveyance" value={emp.salary?.conveyance ? money(Number(emp.salary.conveyance)) : ''} />
                  <Info label="Other Allowance" value={emp.salary?.other_allowance ? money(Number(emp.salary.other_allowance)) : ''} />
                </FieldGroup>
                <FieldGroup title="Bank & Statutory">
                  <Info label="A/C No." value={emp.bank_account || ''} pending={!emp.bank_account} onEdit={() => onEdit(emp.id, 'bank_account')} />
                  <Info label="IFSC Code" value={emp.bank_ifsc || ''} pending={!emp.bank_ifsc} onEdit={() => onEdit(emp.id, 'bank_ifsc')} />
                  <Info label="Bank Name" value={emp.bank_name || ''} />
                  <Info label="UAN (PF)" value={emp.uan || ''} pending={!emp.uan} onEdit={() => onEdit(emp.id, 'uan')} />
                  <Info label="ESIC No." value={emp.esi_number || ''} pending={!emp.esi_number} onEdit={() => onEdit(emp.id, 'esi_number')} />
                </FieldGroup>
                <FieldGroup title="Status & Exit">
                  <Info label="Status" value={emp.status || ''} />
                  <Info label="Exit Date" value={(emp as any).exit_date ? dateShort((emp as any).exit_date) : ''} />
                  <Info label="Deactivated On" value={dateShort(emp.deactivated_at)} />
                  <Info label="Reactivated On" value={dateShort(emp.reactivated_at)} />
                </FieldGroup>
              </section>
            )}

            {tab === 'documents' && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="mono-label">Documents on record</p>
                </div>
                {documents.length === 0 ? (
                  <p className="text-[13px] text-mute py-3 text-center">No documents on record yet.</p>
                ) : (
                  <div className="divide-y divide-hairline border border-hairline rounded-sm">
                    {documents.map((d) => (
                      <div key={d.id} className="flex items-center justify-between gap-2 px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-ink truncate">{d.document_type}{d.document_name ? <span className="text-mute font-normal"> · {d.document_name}</span> : null}</p>
                          <p className="text-[11px] font-mono text-mute truncate">{d.document_number || '—'}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => docVerifyMut.mutate({ docId: d.id, verified: !d.verified })}
                            disabled={docVerifyMut.isPending}
                            title={d.verified ? 'Verified — click to unmark' : 'Mark verified'}
                            className={`p-1.5 rounded-sm transition-colors ${d.verified ? 'text-success bg-success-soft' : 'text-mute hover:text-ink hover:bg-canvas-soft'}`}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => docDeleteMut.mutate(d.id)}
                            disabled={docDeleteMut.isPending}
                            className="p-1.5 rounded-sm text-mute hover:text-error hover:bg-error-soft transition-colors"
                            aria-label="Remove document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="border-t border-hairline pt-3 space-y-2">
                  <p className="mono-label">Add Document Record</p>
                  <div className="space-y-2">
                    <select value={docForm.document_type} onChange={e => setDocForm(f => ({ ...f, document_type: e.target.value }))} className="w-full h-9 px-2 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-navy-mid">
                      {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input placeholder="Document name" className="w-full h-9 px-2.5 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-navy-mid placeholder:text-mute" value={docForm.document_name} onChange={e => setDocForm(f => ({ ...f, document_name: e.target.value }))} />
                    <input placeholder="Document number" className="w-full h-9 px-2.5 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-navy-mid placeholder:text-mute" value={docForm.document_number} onChange={e => setDocForm(f => ({ ...f, document_number: e.target.value }))} />
                  </div>
                  <Button size="sm" loading={docAddMut.isPending} onClick={() => docAddMut.mutate()}><Plus className="w-3 h-3" /> Add</Button>
                </div>
              </section>
            )}

            {tab === 'history' && (
              <section className="space-y-5">
                <FieldGroup title="Employment Timeline">
                  <TimelineItem
                    title="Joined"
                    date={dateShort(emp.joining_date)}
                    meta={emp.designation ? emp.designation : undefined}
                    pending={!emp.joining_date}
                    onEdit={() => onEdit(emp.id, 'joining_date')}
                  />
                  {(emp as any).exit_date && <TimelineItem title="Exited" date={dateShort((emp as any).exit_date)} tone="danger" />}
                  {emp.deactivated_at && <TimelineItem title="Deactivated" date={dateShort(emp.deactivated_at)} tone="danger" />}
                  {emp.reactivated_at && <TimelineItem title="Reactivated" date={dateShort(emp.reactivated_at)} tone="success" />}
                  {!emp.joining_date && !(emp as any).exit_date && !emp.deactivated_at && !emp.reactivated_at && (
                    <p className="text-[13px] text-mute py-2 text-center">No timeline events recorded yet.</p>
                  )}
                </FieldGroup>
                <FieldGroup title="Salary Revisions">
                  {revisions.length === 0 && emp.status === 'active' ? (
                    <p className="text-[13px] text-mute py-2">No revisions yet.</p>
                  ) : null}
                  {revisions.map((r) => (
                    <div key={r.id} className="py-2.5 border-b border-hairline last:border-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-[13px] font-medium text-ink capitalize">{String(r.reason || 'Revision').replace(/_/g, ' ')}</p>
                        <p className="text-[11px] font-mono text-mute">{dateShort(r.effective_from)}</p>
                      </div>
                      <p className="text-[12px] text-body mt-1 font-mono tabular-nums">
                        Basic {money(Number(r.old_basic || 0))} → {money(Number(r.new_basic || 0))}
                        <span className="text-mute"> · Gross {money(Number(r.old_gross || 0))} → {money(Number(r.new_gross || 0))}</span>
                      </p>
                      {r.designation && <p className="text-[12px] text-mute mt-0.5">Designation: {r.designation}</p>}
                      {r.remarks && <p className="text-[12px] text-mute mt-0.5">{r.remarks}</p>}
                    </div>
                  ))}
                </FieldGroup>
              </section>
            )}
          </div>

          <div className="px-4 pb-4">
            <div className="bg-canvas-soft/60 rounded-md p-3">
              <p className="mono-label mb-2">Quick Actions</p>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((a) => (
                  <button
                    key={a.label}
                    onClick={() => { onClose(); if (a.action) a.action(); else if (a.to) navigate(a.to) }}
                    className="flex items-center gap-2 px-2.5 py-2 text-[12px] font-medium text-body bg-white border border-hairline rounded-sm hover:bg-canvas-soft hover:text-ink transition-colors text-left cursor-pointer"
                  >
                    <a.icon className="w-3.5 h-3.5 text-mute shrink-0" />
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => onToggleStatus?.(emp.id, emp.status === 'active' ? 'inactive' : 'active')}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-[12px] font-medium text-body bg-white border border-hairline rounded-sm hover:bg-canvas-soft hover:text-ink transition-colors cursor-pointer"
              >
                <SquareUserRound className="w-3.5 h-3.5 text-mute shrink-0" />
                {emp.status === 'active' ? 'Deactivate' : 'Activate'}
              </button>
              <button
                onClick={() => onDelete?.(emp.id)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-[12px] font-medium text-error bg-error-soft/40 border border-error/20 rounded-sm hover:bg-error-soft transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  )
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mono-label mb-2">{title}</p>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">{children}</dl>
    </div>
  )
}

function Info({ label, value, pending = false, onEdit }: { label: string; value: string; pending?: boolean; onEdit?: () => void }) {
  return (
    <div className="min-w-0">
      <dt className="mono-label mb-0.5">{label}</dt>
      <dd className="text-[13px] font-medium text-ink break-words">
        {pending ? (
          <button onClick={onEdit} className="inline-flex items-center gap-1 text-error font-medium hover:underline cursor-pointer text-[12px]">
            <CircleAlert className="w-3.5 h-3.5" /> Pending — fill in
          </button>
        ) : (
          value || '—'
        )}
      </dd>
    </div>
  )
}

function TimelineItem({ title, date, meta, tone, pending = false, onEdit }: { title: string; date: string; meta?: string; tone?: 'success' | 'danger'; pending?: boolean; onEdit?: () => void }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${tone === 'danger' ? 'bg-error' : tone === 'success' ? 'bg-success' : 'bg-navy-mid'}`} />
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-ink">
          {title}
          {pending ? <span className="text-error text-[12px] ml-1 font-normal">(pending)</span> : null}
        </p>
        {meta && <p className="text-[12px] text-mute">{meta}</p>}
        <p className="text-[12px] font-mono text-body">{date}</p>
      </div>
    </div>
  )
}