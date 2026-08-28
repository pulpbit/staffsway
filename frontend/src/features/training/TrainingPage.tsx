import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { trainingApi, employeeApi } from '@/services/api'
import { Button, Input, Textarea, Select } from '@/components/ui/fields'
import { Table, Badge, Tabs } from '@/components/ui/data'
import type { Column } from '@/components/ui/data'
import { PageHeader, LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { Modal, ConfirmDialog } from '@/components/ui/overlay'
import { fullName, dateShort } from '@/utils/format'
import { toast } from 'sonner'
import { Plus, Trash2, Search, Calendar, Users, ClipboardCheck, BookOpen, Award, Star, MessageSquare, History, Edit, CheckCircle, XCircle, Link } from 'lucide-react'

const TABS = [
  { key: 'calendar', label: 'Calendar' },
  { key: 'assignments', label: 'Assignments' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'materials', label: 'Materials' },
  { key: 'certifications', label: 'Certifications' },
  { key: 'skills', label: 'Skill Matrix' },
  { key: 'feedback', label: 'Feedback' },
  { key: 'history', label: 'History' },
]

const TRAINING_TYPES = ['technical', 'soft_skills', 'compliance', 'safety', 'onboarding', 'leadership', 'other']
const MODES = ['in_person', 'virtual', 'hybrid', 'self_paced']
const TRAINING_STATUS: Record<string, string> = { draft: 'bg-canvas-soft-2 text-mute', scheduled: 'bg-link-soft text-link-deep', in_progress: 'bg-warning-soft text-warning-deep', completed: 'bg-success-soft text-success', cancelled: 'bg-error-soft text-error-deep' }
const CERT_STATUS: Record<string, string> = { active: 'bg-success-soft text-success', expired: 'bg-error-soft text-error-deep', revoked: 'bg-canvas-soft-2 text-mute' }
const PROF_MAP: Record<string, string> = { beginner: 'bg-canvas-soft-2 text-mute', intermediate: 'bg-warning-soft text-warning-deep', advanced: 'bg-link-soft text-link-deep', expert: 'bg-success-soft text-success' }

const typeLabel = (s: string) => ({ technical: 'Technical', soft_skills: 'Soft Skills', compliance: 'Compliance', safety: 'Safety', onboarding: 'Onboarding', leadership: 'Leadership', other: 'Other' }[s] || s)
const modeLabel = (s: string) => ({ in_person: 'In-Person', virtual: 'Virtual', hybrid: 'Hybrid', self_paced: 'Self-Paced' }[s] || s)
const statusLabel = (s: string) => ({ draft: 'Draft', scheduled: 'Scheduled', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled' }[s] || s)

export default function TrainingPage() {
  const [tab, setTab] = useState('calendar')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ type: string; id: number } | null>(null)
  const [detailFor, setDetailFor] = useState<any>(null)
  const qc = useQueryClient()

  const { data: summary } = useQuery({ queryKey: ['train-summary'], queryFn: () => trainingApi.summary() })
  const { data: empData } = useQuery({ queryKey: ['employees-select'], queryFn: () => employeeApi.list({ page: '1', page_size: '200', status: 'active' }) })
  const employees = (empData?.data || []) as any[]
  const empOptions = employees.map((e: any) => ({ value: String(e.id), label: `${e.employee_code} - ${fullName(e.first_name, e.last_name)}` }))

  // Training Calendar
  const params: Record<string, string> = {}
  if (search) params.search = search
  if (typeFilter) params.training_type = typeFilter
  if (statusFilter) params.status = statusFilter

  const { data: trainingData, isLoading, error, refetch } = useQuery({ queryKey: ['trainings', params], queryFn: () => trainingApi.list(params), enabled: tab === 'calendar' })
  const [form, setForm] = useState({ title: '', description: '', training_type: 'technical', trainer_name: '', trainer_org: '', mode: 'in_person', location: '', start_date: '', end_date: '', start_time: '', end_time: '', duration_hours: '', max_participants: '', status: 'scheduled' })

  const createMut = useMutation({
    mutationFn: () => trainingApi.create({ ...form, duration_hours: form.duration_hours ? Number(form.duration_hours) : undefined, max_participants: form.max_participants ? Number(form.max_participants) : undefined }),
    onSuccess: () => { setShowForm(false); qc.invalidateQueries({ queryKey: ['trainings'] }); qc.invalidateQueries({ queryKey: ['train-summary'] }); toast.success('Training created.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })
  const updateMut = useMutation({
    mutationFn: () => trainingApi.update(editItem.id, { ...form, duration_hours: form.duration_hours ? Number(form.duration_hours) : undefined, max_participants: form.max_participants ? Number(form.max_participants) : undefined }),
    onSuccess: () => { setShowForm(false); setEditItem(null); qc.invalidateQueries({ queryKey: ['trainings'] }); toast.success('Training updated.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })
  const deleteMut = useMutation({
    mutationFn: (id: number) => trainingApi.delete(id),
    onSuccess: () => { setConfirmDelete(null); qc.invalidateQueries({ queryKey: ['trainings'] }); qc.invalidateQueries({ queryKey: ['train-summary'] }); toast.success('Training deleted.') },
  })

  const openCreate = () => { setEditItem(null); setForm({ title: '', description: '', training_type: 'technical', trainer_name: '', trainer_org: '', mode: 'in_person', location: '', start_date: '', end_date: '', start_time: '', end_time: '', duration_hours: '', max_participants: '', status: 'scheduled' }); setShowForm(true) }
  const openEdit = (t: any) => { setEditItem(t); setForm({ title: t.title, description: t.description || '', training_type: t.training_type, trainer_name: t.trainer_name || '', trainer_org: t.trainer_org || '', mode: t.mode, location: t.location || '', start_date: t.start_date, end_date: t.end_date || '', start_time: t.start_time || '', end_time: t.end_time || '', duration_hours: t.duration_hours ? String(t.duration_hours) : '', max_participants: t.max_participants ? String(t.max_participants) : '', status: t.status }); setShowForm(true) }

  // Assignments
  const [assignFor, setAssignFor] = useState<any>(null)
  const [selectedEmps, setSelectedEmps] = useState<number[]>([])
  const assignMut = useMutation({
    mutationFn: () => trainingApi.assign(assignFor.id, selectedEmps),
    onSuccess: () => { setAssignFor(null); setSelectedEmps([]); qc.invalidateQueries({ queryKey: ['trainings'] }); toast.success('Employees assigned.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })

  // Attendance
  const [attendFor, setAttendFor] = useState<any>(null)
  const [attendMap, setAttendMap] = useState<Record<number, boolean>>({})
  const attendMut = useMutation({
    mutationFn: () => trainingApi.bulkAttendance(attendFor.id, Object.entries(attendMap).map(([eid, att]) => ({ employee_id: Number(eid), attended: att }))),
    onSuccess: () => { setAttendFor(null); qc.invalidateQueries({ queryKey: ['trainings'] }); toast.success('Attendance saved.') },
  })

  // Materials
  const [matFor, setMatFor] = useState<any>(null)
  const [matForm, setMatForm] = useState({ title: '', description: '', material_type: 'document', url: '' })
  const matCreateMut = useMutation({
    mutationFn: () => trainingApi.addMaterial(matFor.id, matForm),
    onSuccess: () => { setMatFor(null); setMatForm({ title: '', description: '', material_type: 'document', url: '' }); qc.invalidateQueries({ queryKey: ['training-detail'] }); toast.success('Material added.') },
  })

  // Certifications
  const [showCertForm, setShowCertForm] = useState(false)
  const [certForm, setCertForm] = useState({ employee_id: '', name: '', issuing_org: '', issue_date: '', expiry_date: '', credential_id: '', status: 'active', notes: '' })
  const { data: certData, isLoading: certLoading } = useQuery({ queryKey: ['certifications'], queryFn: () => trainingApi.certifications(), enabled: tab === 'certifications' })
  const certCreateMut = useMutation({
    mutationFn: () => trainingApi.createCertification({ ...certForm, employee_id: Number(certForm.employee_id) }),
    onSuccess: () => { setShowCertForm(false); qc.invalidateQueries({ queryKey: ['certifications'] }); toast.success('Certification added.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })

  // Skill Matrix
  const [showSkillForm, setShowSkillForm] = useState(false)
  const [skillForm, setSkillForm] = useState({ employee_id: '', skill_name: '', category: 'technical', proficiency: 'beginner', last_assessed: '', assessed_by: '', notes: '' })
  const { data: skillData, isLoading: skillLoading } = useQuery({ queryKey: ['skills'], queryFn: () => trainingApi.skills(), enabled: tab === 'skills' })
  const skillCreateMut = useMutation({
    mutationFn: () => trainingApi.upsertSkill({ ...skillForm, employee_id: Number(skillForm.employee_id) }),
    onSuccess: () => { setShowSkillForm(false); qc.invalidateQueries({ queryKey: ['skills'] }); toast.success('Skill saved.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })

  // Feedback
  const { data: allTrainings } = useQuery({ queryKey: ['trainings-all'], queryFn: () => trainingApi.list({ status: 'completed' }), enabled: tab === 'feedback' || tab === 'history' })
  const [fbFor, setFbFor] = useState<any>(null)
  const [fbForm, setFbForm] = useState({ employee_id: '', rating: '', content_rating: '', trainer_rating: '', comments: '', suggestions: '' })
  const fbCreateMut = useMutation({
    mutationFn: () => trainingApi.addFeedback(fbFor.id, { ...fbForm, employee_id: Number(fbForm.employee_id), rating: fbForm.rating ? Number(fbForm.rating) : undefined, content_rating: fbForm.content_rating ? Number(fbForm.content_rating) : undefined, trainer_rating: fbForm.trainer_rating ? Number(fbForm.trainer_rating) : undefined }),
    onSuccess: () => { setFbFor(null); qc.invalidateQueries({ queryKey: ['trainings'] }); toast.success('Feedback submitted.') },
  })

  // History
  const { data: histData, isLoading: histLoading } = useQuery({ queryKey: ['train-history'], queryFn: () => trainingApi.history(), enabled: tab === 'history' })

  const renderStars = (val: number | null) => {
    if (!val) return <span className="text-mute">—</span>
    return <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map(s => <Star key={s} className={`w-3 h-3 ${s <= val ? 'text-gold fill-gold' : 'text-hairline'}`} />)}</div>
  }

  return (
    <div>
      <PageHeader title="Training Management" subtitle="Calendar, assignments, skills & more" actions={<Button onClick={openCreate}><Plus className="w-3.5 h-3.5" /> New Training</Button>} />

      {summary?.data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
          {[
            { label: 'Total Trainings', value: summary.data.total },
            { label: 'Scheduled', value: summary.data.scheduled, color: 'text-link-deep' },
            { label: 'Completed', value: summary.data.completed, color: 'text-success' },
            { label: 'Active Certs', value: summary.data.active_certs, color: 'text-warning-deep' },
            { label: 'Unique Skills', value: summary.data.unique_skills },
          ].map((s, i) => (
            <div key={i} className="bg-white card-shadow rounded-md p-3">
              <p className="text-[11px] text-mute">{s.label}</p>
              <p className={`text-[18px] font-semibold ${s.color || 'text-ink'}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        {(tab === 'calendar' || tab === 'assignments') && (
          <>
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-mute" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search trainings..." className="w-full h-9 pl-8 pr-3 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink" />
            </div>
            <Select options={[{ value: '', label: 'All Types' }, ...TRAINING_TYPES.map(t => ({ value: t, label: typeLabel(t) }))]} value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="w-full sm:w-32" />
            <Select options={[{ value: '', label: 'All Status' }, { value: 'scheduled', label: 'Scheduled' }, { value: 'in_progress', label: 'In Progress' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }]} value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full sm:w-32" />
          </>
        )}
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      <div className="bg-white card-shadow rounded-md p-4 mt-4">
        {/* Calendar Tab */}
        {tab === 'calendar' && (
          isLoading ? <LoadingState /> :
          error ? <PageError onRetry={() => refetch()} /> :
          (trainingData?.data || []).length === 0 ? <EmptyState title="No trainings found" description="Schedule your first training session." action={<Button onClick={openCreate}><Plus className="w-3.5 h-3.5" /> New Training</Button>} /> : (
            <Table
              columns={[
                { key: 'title', header: 'Training', render: (r: any) => <div><p className="text-[13px] font-medium text-ink">{r.title}</p><p className="text-[11px] text-mute">{typeLabel(r.training_type)} · {modeLabel(r.mode)}</p></div> },
                { key: 'trainer_name', header: 'Trainer', render: (r: any) => <span className="text-[12px]">{r.trainer_name || '—'}{r.trainer_org ? <span className="text-mute"> ({r.trainer_org})</span> : ''}</span> },
                { key: 'start_date', header: 'Date', render: (r: any) => <span className="text-[12px]">{dateShort(r.start_date)}{r.end_date && r.end_date !== r.start_date ? ` — ${dateShort(r.end_date)}` : ''}</span> },
                { key: 'duration_hours', header: 'Hours', render: (r: any) => <span className="text-[12px]">{r.duration_hours ? `${r.duration_hours}h` : '—'}</span> },
                { key: 'status', header: 'Status', render: (r: any) => <Badge className={TRAINING_STATUS[r.status] || ''}>{statusLabel(r.status)}</Badge> },
                { key: 'actions', header: '', render: (r: any) => (
                  <div className="flex gap-1">
                    <button onClick={() => setDetailFor(r)} className="px-1.5 py-0.5 text-[11px] text-body hover:bg-canvas-soft rounded-xs">Details</button>
                    <button onClick={() => { setAssignFor(r); setSelectedEmps([]) }} className="px-1.5 py-0.5 text-[11px] text-link hover:bg-link-soft rounded-xs"><Users className="w-3 h-3 inline" /></button>
                    <button onClick={() => openEdit(r)} className="px-1.5 py-0.5 text-[11px] text-body hover:bg-canvas-soft rounded-xs"><Edit className="w-3 h-3" /></button>
                    <button onClick={() => setConfirmDelete({ type: 'training', id: r.id })} className="px-1 py-0.5 text-[11px] text-error hover:bg-error-soft rounded-xs"><Trash2 className="w-3 h-3" /></button>
                  </div>
                )},
              ]}
              data={trainingData?.data || []}
              keyFn={(r: any) => String(r.id)}
              emptyMessage="No trainings found."
            />
          )
        )}

        {/* Assignments Tab */}
        {tab === 'assignments' && (
          isLoading ? <LoadingState /> :
          (trainingData?.data || []).length === 0 ? <EmptyState title="No trainings" description="Create trainings first to manage assignments." /> : (
            <div className="space-y-3">
              {(trainingData?.data || []).map((t: any) => (
                <TrainingAssignmentRow key={t.id} training={t} onAssign={() => { setAssignFor(t); setSelectedEmps([]) }} onAttend={() => { setAttendFor(t); const m: Record<number, boolean> = {}; (t.assignments || []).forEach((a: any) => { m[a.employee_id] = false }); setAttendMap(m) }} />
              ))}
            </div>
          )
        )}

        {/* Attendance Tab */}
        {tab === 'attendance' && (
          (allTrainings?.data || []).length === 0 ? <EmptyState title="No completed trainings" /> : (
            <div className="space-y-3">
              {(allTrainings?.data || []).map((t: any) => (
                <TrainingAssignmentRow key={t.id} training={t} onAssign={() => {}} onAttend={() => { setAttendFor(t); const m: Record<number, boolean> = {}; (t.assignments || []).forEach((a: any) => { m[a.employee_id] = false }); setAttendMap(m) }} showAttendOnly />
              ))}
            </div>
          )
        )}

        {/* Materials Tab */}
        {tab === 'materials' && (
          (allTrainings?.data || []).length === 0 ? <EmptyState title="No trainings" /> : (
            <div className="space-y-3">
              {(allTrainings?.data || []).map((t: any) => (
                <div key={t.id} className="border border-hairline rounded-sm p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-[13px] font-medium text-ink">{t.title}</p>
                      <p className="text-[11px] text-mute">{dateShort(t.start_date)} · {modeLabel(t.mode)}</p>
                    </div>
                    <Button size="sm" onClick={() => { setMatFor(t); setMatForm({ title: '', description: '', material_type: 'document', url: '' }) }}><Plus className="w-3 h-3" /> Add</Button>
                  </div>
                  {(t.materials || []).length === 0 ? (
                    <p className="text-[12px] text-mute">No materials uploaded.</p>
                  ) : (
                    <div className="space-y-1">
                      {(t.materials || []).map((m: any) => (
                        <div key={m.id} className="flex items-center gap-2 py-1 text-[12px]">
                          <BookOpen className="w-3 h-3 text-mute" />
                          <span className="text-ink">{m.title}</span>
                          <Badge className="bg-canvas-soft-2 text-mute">{m.material_type}</Badge>
                          {m.url && <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-link hover:underline"><Link className="w-3 h-3 inline" /></a>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {/* Certifications Tab */}
        {tab === 'certifications' && (
          <>
            <div className="flex justify-end mb-3">
              <Button onClick={() => { setCertForm({ employee_id: '', name: '', issuing_org: '', issue_date: '', expiry_date: '', credential_id: '', status: 'active', notes: '' }); setShowCertForm(true) }}><Plus className="w-3.5 h-3.5" /> Add Certification</Button>
            </div>
            {certLoading ? <LoadingState /> : (certData?.data || []).length === 0 ? <EmptyState title="No certifications" description="Track employee certifications." /> : (
              <Table
                columns={[
                  { key: 'employee', header: 'Employee', render: (r: any) => <div><p className="text-[13px]">{fullName(r.first_name, r.last_name)}</p><p className="text-[11px] text-mute">{r.employee_code}</p></div> },
                  { key: 'name', header: 'Certification', render: (r: any) => <div><p className="text-[13px] font-medium text-ink">{r.name}</p><p className="text-[11px] text-mute">{r.issuing_org || '—'}</p></div> },
                  { key: 'issue_date', header: 'Issued', render: (r: any) => <span className="text-[12px]">{r.issue_date ? dateShort(r.issue_date) : '—'}</span> },
                  { key: 'expiry_date', header: 'Expiry', render: (r: any) => <span className="text-[12px]">{r.expiry_date ? dateShort(r.expiry_date) : '—'}</span> },
                  { key: 'status', header: 'Status', render: (r: any) => <Badge className={CERT_STATUS[r.status] || ''}>{r.status}</Badge> },
                  { key: 'actions', header: '', render: (r: any) => <button onClick={() => setConfirmDelete({ type: 'cert', id: r.id })} className="text-error hover:text-error-deep"><Trash2 className="w-3.5 h-3.5" /></button> },
                ]}
                data={certData?.data || []}
                keyFn={(r: any) => String(r.id)}
                emptyMessage="No certifications found."
              />
            )}
          </>
        )}

        {/* Skill Matrix Tab */}
        {tab === 'skills' && (
          <>
            <div className="flex justify-end mb-3">
              <Button onClick={() => { setSkillForm({ employee_id: '', skill_name: '', category: 'technical', proficiency: 'beginner', last_assessed: '', assessed_by: '', notes: '' }); setShowSkillForm(true) }}><Plus className="w-3.5 h-3.5" /> Add Skill</Button>
            </div>
            {skillLoading ? <LoadingState /> : (skillData?.data || []).length === 0 ? <EmptyState title="No skills recorded" description="Build a skill matrix for your team." /> : (
              <Table
                columns={[
                  { key: 'employee', header: 'Employee', render: (r: any) => <div><p className="text-[13px]">{fullName(r.first_name, r.last_name)}</p><p className="text-[11px] text-mute">{r.employee_code}</p></div> },
                  { key: 'skill_name', header: 'Skill', render: (r: any) => <span className="text-[13px] font-medium text-ink">{r.skill_name}</span> },
                  { key: 'category', header: 'Category', render: (r: any) => <Badge className="bg-canvas-soft-2 text-body">{r.category}</Badge> },
                  { key: 'proficiency', header: 'Level', render: (r: any) => <Badge className={PROF_MAP[r.proficiency] || ''}>{r.proficiency}</Badge> },
                  { key: 'last_assessed', header: 'Last Assessed', render: (r: any) => <span className="text-[12px]">{r.last_assessed ? dateShort(r.last_assessed) : '—'}</span> },
                  { key: 'actions', header: '', render: (r: any) => <button onClick={() => setConfirmDelete({ type: 'skill', id: r.id })} className="text-error hover:text-error-deep"><Trash2 className="w-3.5 h-3.5" /></button> },
                ]}
                data={skillData?.data || []}
                keyFn={(r: any) => String(r.id)}
                emptyMessage="No skills found."
              />
            )}
          </>
        )}

        {/* Feedback Tab */}
        {tab === 'feedback' && (
          (allTrainings?.data || []).length === 0 ? <EmptyState title="No completed trainings" /> : (
            <div className="space-y-3">
              {(allTrainings?.data || []).map((t: any) => (
                <div key={t.id} className="border border-hairline rounded-sm p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-[13px] font-medium text-ink">{t.title}</p>
                      <p className="text-[11px] text-mute">{dateShort(t.start_date)} · {(t.feedbacks || []).length} feedback(s)</p>
                    </div>
                    <Button size="sm" onClick={() => { setFbFor(t); setFbForm({ employee_id: '', rating: '', content_rating: '', trainer_rating: '', comments: '', suggestions: '' }) }}><Plus className="w-3 h-3" /> Add</Button>
                  </div>
                  {(t.feedbacks || []).length > 0 && (
                    <div className="divide-y divide-hairline">
                      {(t.feedbacks || []).map((f: any) => (
                        <div key={f.id} className="py-2 text-[12px]">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-ink">{fullName(f.first_name, f.last_name)}</span>
                            <span className="text-mute">({f.employee_code})</span>
                            <div className="flex items-center gap-0.5">{renderStars(f.rating)}</div>
                          </div>
                          {f.comments && <p className="text-body">{f.comments}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {/* History Tab */}
        {tab === 'history' && (
          histLoading ? <LoadingState /> :
          (histData?.data || []).length === 0 ? <EmptyState title="No training history" description="Completed training records will appear here." /> : (
            <Table
              columns={[
                { key: 'employee', header: 'Employee', render: (r: any) => <div><p className="text-[13px]">{fullName(r.first_name, r.last_name)}</p><p className="text-[11px] text-mute">{r.employee_code}</p></div> },
                { key: 'title', header: 'Training', render: (r: any) => <div><p className="text-[13px] font-medium text-ink">{r.title}</p><p className="text-[11px] text-mute">{typeLabel(r.training_type)}</p></div> },
                { key: 'start_date', header: 'Date', render: (r: any) => <span className="text-[12px]">{dateShort(r.start_date)}</span> },
                { key: 'mode', header: 'Mode', render: (r: any) => <Badge className="bg-canvas-soft-2 text-body">{modeLabel(r.mode)}</Badge> },
                { key: 'attended', header: 'Attended', render: (r: any) => r.attended === 'Yes' ? <Badge className="bg-success-soft text-success">Yes</Badge> : <Badge className="bg-error-soft text-error-deep">No</Badge> },
              ]}
              data={histData?.data || []}
              keyFn={(r: any) => `${r.training_id}-${r.employee_id}`}
              emptyMessage="No history found."
            />
          )
        )}
      </div>

      {/* Create/Edit Training Modal */}
      <Modal open={showForm} onClose={() => { setShowForm(false); setEditItem(null) }} title={editItem ? 'Edit Training' : 'New Training'} size="md">
        <div className="space-y-3">
          <Input label="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <Textarea label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Type" options={TRAINING_TYPES.map(t => ({ value: t, label: typeLabel(t) }))} value={form.training_type} onChange={e => setForm(f => ({ ...f, training_type: e.target.value }))} />
            <Select label="Mode" options={MODES.map(m => ({ value: m, label: modeLabel(m) }))} value={form.mode} onChange={e => setForm(f => ({ ...f, mode: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Trainer Name" value={form.trainer_name} onChange={e => setForm(f => ({ ...f, trainer_name: e.target.value }))} />
            <Input label="Trainer Organization" value={form.trainer_org} onChange={e => setForm(f => ({ ...f, trainer_org: e.target.value }))} />
          </div>
          <Input label="Location" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            <Input label="End Date" type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Start Time" type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
            <Input label="End Time" type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
            <Input label="Duration (hrs)" type="number" value={form.duration_hours} onChange={e => setForm(f => ({ ...f, duration_hours: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Max Participants" type="number" value={form.max_participants} onChange={e => setForm(f => ({ ...f, max_participants: e.target.value }))} />
            <Select label="Status" options={['draft', 'scheduled', 'in_progress', 'completed', 'cancelled'].map(s => ({ value: s, label: statusLabel(s) }))} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
            <Button variant="secondary" onClick={() => { setShowForm(false); setEditItem(null) }}>Cancel</Button>
            <Button loading={createMut.isPending || updateMut.isPending} onClick={() => editItem ? updateMut.mutate() : createMut.mutate()}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* Assign Employees Modal */}
      <Modal open={!!assignFor} onClose={() => setAssignFor(null)} title={`Assign — ${assignFor?.title || ''}`} size="md">
        <div className="space-y-3">
          <p className="text-[13px] text-body">{(assignFor?.assignments || []).length} already assigned. Select employees to add:</p>
          <div className="max-h-[40vh] overflow-y-auto space-y-1">
            {empOptions.map(o => (
              <label key={o.value} className="flex items-center gap-2 py-1 cursor-pointer">
                <input type="checkbox" checked={selectedEmps.includes(Number(o.value))} onChange={e => setSelectedEmps(prev => e.target.checked ? [...prev, Number(o.value)] : prev.filter(id => id !== Number(o.value)))} className="w-3.5 h-3.5 accent-black" />
                <span className="text-[13px]">{o.label}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
            <Button variant="secondary" onClick={() => setAssignFor(null)}>Cancel</Button>
            <Button loading={assignMut.isPending} onClick={() => assignMut.mutate()} disabled={selectedEmps.length === 0}>Assign ({selectedEmps.length})</Button>
          </div>
        </div>
      </Modal>

      {/* Attendance Modal */}
      <Modal open={!!attendFor} onClose={() => setAttendFor(null)} title={`Attendance — ${attendFor?.title || ''}`} size="md">
        <div className="space-y-3">
          <div className="max-h-[40vh] overflow-y-auto">
            {(attendFor?.assignments || []).length === 0 ? (
              <p className="text-[13px] text-mute text-center py-4">No employees assigned.</p>
            ) : (
              <table className="w-full text-[12px]">
                <thead><tr className="text-left text-mute border-b border-hairline"><th className="py-1.5 font-medium">Employee</th><th className="py-1.5 font-medium text-center">Attended</th></tr></thead>
                <tbody>
                  {(attendFor?.assignments || []).map((a: any) => (
                    <tr key={a.employee_id} className="border-b border-hairline last:border-0">
                      <td className="py-1.5">{fullName(a.first_name, a.last_name)} <span className="text-mute">({a.employee_code})</span></td>
                      <td className="py-1.5 text-center">
                        <input type="checkbox" checked={!!attendMap[a.employee_id]} onChange={e => setAttendMap(m => ({ ...m, [a.employee_id]: e.target.checked }))} className="w-3.5 h-3.5 accent-black" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
            <Button variant="secondary" onClick={() => setAttendFor(null)}>Cancel</Button>
            <Button loading={attendMut.isPending} onClick={() => attendMut.mutate()}>Save Attendance</Button>
          </div>
        </div>
      </Modal>

      {/* Add Material Modal */}
      <Modal open={!!matFor} onClose={() => setMatFor(null)} title={`Add Material — ${matFor?.title || ''}`} size="sm">
        <div className="space-y-3">
          <Input label="Title" value={matForm.title} onChange={e => setMatForm(f => ({ ...f, title: e.target.value }))} />
          <Textarea label="Description" value={matForm.description} onChange={e => setMatForm(f => ({ ...f, description: e.target.value }))} />
          <Select label="Type" options={[{ value: 'document', label: 'Document' }, { value: 'video', label: 'Video' }, { value: 'link', label: 'Link' }, { value: 'presentation', label: 'Presentation' }, { value: 'other', label: 'Other' }]} value={matForm.material_type} onChange={e => setMatForm(f => ({ ...f, material_type: e.target.value }))} />
          <Input label="URL (optional)" placeholder="https://..." value={matForm.url} onChange={e => setMatForm(f => ({ ...f, url: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
            <Button variant="secondary" onClick={() => setMatFor(null)}>Cancel</Button>
            <Button loading={matCreateMut.isPending} onClick={() => matCreateMut.mutate()}>Add</Button>
          </div>
        </div>
      </Modal>

      {/* Add Certification Modal */}
      <Modal open={showCertForm} onClose={() => setShowCertForm(false)} title="Add Certification" size="md">
        <div className="space-y-3">
          <Select label="Employee" options={[{ value: '', label: 'Select...' }, ...empOptions]} value={certForm.employee_id} onChange={e => setCertForm(f => ({ ...f, employee_id: e.target.value }))} />
          <Input label="Certification Name" value={certForm.name} onChange={e => setCertForm(f => ({ ...f, name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Issuing Organization" value={certForm.issuing_org} onChange={e => setCertForm(f => ({ ...f, issuing_org: e.target.value }))} />
            <Input label="Credential ID" value={certForm.credential_id} onChange={e => setCertForm(f => ({ ...f, credential_id: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Issue Date" type="date" value={certForm.issue_date} onChange={e => setCertForm(f => ({ ...f, issue_date: e.target.value }))} />
            <Input label="Expiry Date" type="date" value={certForm.expiry_date} onChange={e => setCertForm(f => ({ ...f, expiry_date: e.target.value }))} />
          </div>
          <Select label="Status" options={[{ value: 'active', label: 'Active' }, { value: 'expired', label: 'Expired' }, { value: 'revoked', label: 'Revoked' }]} value={certForm.status} onChange={e => setCertForm(f => ({ ...f, status: e.target.value }))} />
          <Textarea label="Notes" value={certForm.notes} onChange={e => setCertForm(f => ({ ...f, notes: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
            <Button variant="secondary" onClick={() => setShowCertForm(false)}>Cancel</Button>
            <Button loading={certCreateMut.isPending} onClick={() => certCreateMut.mutate()}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* Add Skill Modal */}
      <Modal open={showSkillForm} onClose={() => setShowSkillForm(false)} title="Add Skill" size="md">
        <div className="space-y-3">
          <Select label="Employee" options={[{ value: '', label: 'Select...' }, ...empOptions]} value={skillForm.employee_id} onChange={e => setSkillForm(f => ({ ...f, employee_id: e.target.value }))} />
          <Input label="Skill Name" placeholder="e.g. React, Python, Leadership" value={skillForm.skill_name} onChange={e => setSkillForm(f => ({ ...f, skill_name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Category" options={[{ value: 'technical', label: 'Technical' }, { value: 'soft_skill', label: 'Soft Skill' }, { value: 'domain', label: 'Domain' }, { value: 'tool', label: 'Tool' }, { value: 'language', label: 'Language' }, { value: 'other', label: 'Other' }]} value={skillForm.category} onChange={e => setSkillForm(f => ({ ...f, category: e.target.value }))} />
            <Select label="Proficiency" options={[{ value: 'beginner', label: 'Beginner' }, { value: 'intermediate', label: 'Intermediate' }, { value: 'advanced', label: 'Advanced' }, { value: 'expert', label: 'Expert' }]} value={skillForm.proficiency} onChange={e => setSkillForm(f => ({ ...f, proficiency: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Last Assessed" type="date" value={skillForm.last_assessed} onChange={e => setSkillForm(f => ({ ...f, last_assessed: e.target.value }))} />
            <Input label="Assessed By" value={skillForm.assessed_by} onChange={e => setSkillForm(f => ({ ...f, assessed_by: e.target.value }))} />
          </div>
          <Textarea label="Notes" value={skillForm.notes} onChange={e => setSkillForm(f => ({ ...f, notes: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
            <Button variant="secondary" onClick={() => setShowSkillForm(false)}>Cancel</Button>
            <Button loading={skillCreateMut.isPending} onClick={() => skillCreateMut.mutate()}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* Add Feedback Modal */}
      <Modal open={!!fbFor} onClose={() => setFbFor(null)} title={`Feedback — ${fbFor?.title || ''}`} size="md">
        <div className="space-y-3">
          <Select label="Employee" options={[{ value: '', label: 'Select...' }, ...empOptions]} value={fbForm.employee_id} onChange={e => setFbForm(f => ({ ...f, employee_id: e.target.value }))} />
          <div className="grid grid-cols-3 gap-3">
            <Select label="Overall Rating" options={[{ value: '', label: '—' }, { value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' }, { value: '4', label: '4' }, { value: '5', label: '5' }]} value={fbForm.rating} onChange={e => setFbForm(f => ({ ...f, rating: e.target.value }))} />
            <Select label="Content Rating" options={[{ value: '', label: '—' }, { value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' }, { value: '4', label: '4' }, { value: '5', label: '5' }]} value={fbForm.content_rating} onChange={e => setFbForm(f => ({ ...f, content_rating: e.target.value }))} />
            <Select label="Trainer Rating" options={[{ value: '', label: '—' }, { value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' }, { value: '4', label: '4' }, { value: '5', label: '5' }]} value={fbForm.trainer_rating} onChange={e => setFbForm(f => ({ ...f, trainer_rating: e.target.value }))} />
          </div>
          <Textarea label="Comments" value={fbForm.comments} onChange={e => setFbForm(f => ({ ...f, comments: e.target.value }))} />
          <Textarea label="Suggestions" value={fbForm.suggestions} onChange={e => setFbForm(f => ({ ...f, suggestions: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
            <Button variant="secondary" onClick={() => setFbFor(null)}>Cancel</Button>
            <Button loading={fbCreateMut.isPending} onClick={() => fbCreateMut.mutate()}>Submit</Button>
          </div>
        </div>
      </Modal>

      {/* Training Detail Modal */}
      <Modal open={!!detailFor} onClose={() => setDetailFor(null)} title={detailFor?.title || 'Training Detail'} size="lg">
        {detailFor && <TrainingDetailView trainingId={detailFor.id} />}
      </Modal>

      <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={() => {
        if (!confirmDelete) return
        if (confirmDelete.type === 'training') deleteMut.mutate(confirmDelete.id)
        else if (confirmDelete.type === 'cert') trainingApi.deleteCertification(confirmDelete.id).then(() => { setConfirmDelete(null); qc.invalidateQueries({ queryKey: ['certifications'] }); toast.success('Deleted.') })
        else if (confirmDelete.type === 'skill') trainingApi.deleteSkill(confirmDelete.id).then(() => { setConfirmDelete(null); qc.invalidateQueries({ queryKey: ['skills'] }); toast.success('Deleted.') })
      }} title="Delete" message="Are you sure?" danger />
    </div>
  )
}

function TrainingAssignmentRow({ training, onAssign, onAttend, showAttendOnly }: { training: any; onAssign: () => void; onAttend: () => void; showAttendOnly?: boolean }) {
  const assignments = training.assignments || []
  return (
    <div className="border border-hairline rounded-sm p-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-[13px] font-medium text-ink">{training.title}</p>
          <p className="text-[11px] text-mute">{dateShort(training.start_date)} · {assignments.length} assigned</p>
        </div>
        {!showAttendOnly && <Button size="sm" onClick={onAssign}><Users className="w-3 h-3" /> Assign</Button>}
        <Button size="sm" variant="secondary" onClick={onAttend}><ClipboardCheck className="w-3 h-3" /> Attendance</Button>
      </div>
      {assignments.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {assignments.map((a: any) => (
            <Badge key={a.id} className="bg-canvas-soft-2 text-body">{fullName(a.first_name, a.last_name)}</Badge>
          ))}
        </div>
      )}
    </div>
  )
}

function TrainingDetailView({ trainingId }: { trainingId: number }) {
  const { data, isLoading } = useQuery({ queryKey: ['training-detail', trainingId], queryFn: () => trainingApi.get(trainingId) })
  if (isLoading) return <LoadingState />
  const t = data?.data as any
  if (!t) return null
  return (
    <div className="space-y-4 text-[12px]">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div><span className="text-mute">Type:</span> {typeLabel(t.training_type)}</div>
        <div><span className="text-mute">Mode:</span> {modeLabel(t.mode)}</div>
        <div><span className="text-mute">Trainer:</span> {t.trainer_name || '—'}</div>
        <div><span className="text-mute">Status:</span> <Badge className={TRAINING_STATUS[t.status]}>{statusLabel(t.status)}</Badge></div>
        <div><span className="text-mute">Start:</span> {dateShort(t.start_date)}</div>
        <div><span className="text-mute">End:</span> {t.end_date ? dateShort(t.end_date) : '—'}</div>
        <div><span className="text-mute">Duration:</span> {t.duration_hours ? `${t.duration_hours}h` : '—'}</div>
        <div><span className="text-mute">Location:</span> {t.location || '—'}</div>
      </div>
      {t.description && <p className="text-body">{t.description}</p>}
      <div>
        <h4 className="font-medium text-ink mb-1">Assigned ({(t.assignments || []).length})</h4>
        <div className="flex flex-wrap gap-1">{(t.assignments || []).map((a: any) => <Badge key={a.id} className="bg-canvas-soft-2 text-body">{fullName(a.first_name, a.last_name)}</Badge>)}</div>
      </div>
    </div>
  )
}
