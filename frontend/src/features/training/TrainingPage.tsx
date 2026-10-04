import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { trainingApi, employeeApi } from '@/services/api'
import { Button, Input, Textarea, Select } from '@/components/ui/fields'
import { Table, Badge, Tabs } from '@/components/ui/data'
import { PageHeader, LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { Modal, ConfirmDialog } from '@/components/ui/overlay'
import { fullName, dateShort } from '@/utils/format'
import { toast } from 'sonner'
import {
  Plus, Trash2, Search, Calendar, Users, ClipboardCheck, BookOpen, Award, Star,
  MessageSquare, History, Edit, CheckCircle2, XCircle, Link as LinkIcon, Sparkles,
  GraduationCap, Target, Video
} from 'lucide-react'

const TABS = [
  { key: 'calendar', label: 'Training Calendar' },
  { key: 'assignments', label: 'Batch Enrollments' },
  { key: 'attendance', label: 'Attendance Roster' },
  { key: 'materials', label: 'Learning Content' },
  { key: 'certifications', label: 'Certificates' },
  { key: 'skills', label: 'Skill Matrix' },
  { key: 'feedback', label: 'Program Feedback' },
  { key: 'history', label: 'Training History' },
]

const TRAINING_TYPES = ['technical', 'soft_skills', 'compliance', 'safety', 'onboarding', 'leadership', 'other']
const MODES = ['in_person', 'virtual', 'hybrid', 'self_paced']

const TRAINING_STATUS: Record<string, { bg: string; text: string; dot: string }> = {
  draft: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  scheduled: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  in_progress: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  cancelled: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' }
}

const CERT_STATUS: Record<string, { bg: string; text: string }> = {
  active: { bg: 'bg-emerald-50 text-emerald-700', text: 'Active' },
  expired: { bg: 'bg-rose-50 text-rose-700', text: 'Expired' },
  revoked: { bg: 'bg-slate-100 text-slate-600', text: 'Revoked' }
}

const PROF_MAP: Record<string, { bg: string; text: string }> = {
  beginner: { bg: 'bg-slate-100 text-slate-700', text: 'Beginner' },
  intermediate: { bg: 'bg-blue-50 text-blue-700', text: 'Intermediate' },
  advanced: { bg: 'bg-indigo-50 text-indigo-700', text: 'Advanced' },
  expert: { bg: 'bg-emerald-50 text-emerald-700', text: 'Expert' }
}

const typeLabel = (s: string) => ({ technical: 'Technical', soft_skills: 'Soft Skills', compliance: 'Compliance', safety: 'Safety', onboarding: 'Onboarding', leadership: 'Leadership', other: 'Other' }[s] || s)
const modeLabel = (s: string) => ({ in_person: 'In-Person', virtual: 'Virtual Classroom', hybrid: 'Hybrid', self_paced: 'Self-Paced' }[s] || s)
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
  const empOptions = employees.map((e: any) => ({ value: String(e.id), label: `${e.employee_code} — ${fullName(e.first_name, e.last_name)}` }))

  const params: Record<string, string> = {}
  if (search) params.search = search
  if (typeFilter) params.training_type = typeFilter
  if (statusFilter) params.status = statusFilter

  const { data: trainingData, isLoading, error, refetch } = useQuery({ queryKey: ['trainings', params], queryFn: () => trainingApi.list(params), enabled: tab === 'calendar' || tab === 'assignments' })
  const [form, setForm] = useState({ title: '', description: '', training_type: 'technical', trainer_name: '', trainer_org: '', mode: 'in_person', location: '', start_date: '', end_date: '', start_time: '', end_time: '', duration_hours: '', max_participants: '', status: 'scheduled' })

  const createMut = useMutation({
    mutationFn: () => trainingApi.create({ ...form, duration_hours: form.duration_hours ? Number(form.duration_hours) : undefined, max_participants: form.max_participants ? Number(form.max_participants) : undefined }),
    onSuccess: () => { setShowForm(false); qc.invalidateQueries({ queryKey: ['trainings'] }); qc.invalidateQueries({ queryKey: ['train-summary'] }); toast.success('Training scheduled.') },
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
    onSuccess: () => { setAssignFor(null); setSelectedEmps([]); qc.invalidateQueries({ queryKey: ['trainings'] }); toast.success('Employees enrolled successfully.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })

  // Attendance
  const [attendFor, setAttendFor] = useState<any>(null)
  const [attendMap, setAttendMap] = useState<Record<number, boolean>>({})
  const attendMut = useMutation({
    mutationFn: () => trainingApi.bulkAttendance(attendFor.id, Object.entries(attendMap).map(([eid, att]) => ({ employee_id: Number(eid), attended: att }))),
    onSuccess: () => { setAttendFor(null); qc.invalidateQueries({ queryKey: ['trainings'] }); toast.success('Attendance records updated.') },
  })

  // Materials
  const [matFor, setMatFor] = useState<any>(null)
  const [matForm, setMatForm] = useState({ title: '', description: '', material_type: 'document', url: '' })
  const matCreateMut = useMutation({
    mutationFn: () => trainingApi.addMaterial(matFor.id, matForm),
    onSuccess: () => { setMatFor(null); setMatForm({ title: '', description: '', material_type: 'document', url: '' }); qc.invalidateQueries({ queryKey: ['training-detail'] }); toast.success('Learning material added.') },
  })

  // Certifications
  const [showCertForm, setShowCertForm] = useState(false)
  const [certForm, setCertForm] = useState({ employee_id: '', name: '', issuing_org: '', issue_date: '', expiry_date: '', credential_id: '', status: 'active', notes: '' })
  const { data: certData, isLoading: certLoading } = useQuery({ queryKey: ['certifications'], queryFn: () => trainingApi.certifications(), enabled: tab === 'certifications' })
  const certCreateMut = useMutation({
    mutationFn: () => trainingApi.createCertification({ ...certForm, employee_id: Number(certForm.employee_id) }),
    onSuccess: () => { setShowCertForm(false); qc.invalidateQueries({ queryKey: ['certifications'] }); toast.success('Certification saved.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })

  // Skill Matrix
  const [showSkillForm, setShowSkillForm] = useState(false)
  const [skillForm, setSkillForm] = useState({ employee_id: '', skill_name: '', category: 'technical', proficiency: 'beginner', last_assessed: '', assessed_by: '', notes: '' })
  const { data: skillData, isLoading: skillLoading } = useQuery({ queryKey: ['skills'], queryFn: () => trainingApi.skills(), enabled: tab === 'skills' })
  const skillCreateMut = useMutation({
    mutationFn: () => trainingApi.upsertSkill({ ...skillForm, employee_id: Number(skillForm.employee_id) }),
    onSuccess: () => { setShowSkillForm(false); qc.invalidateQueries({ queryKey: ['skills'] }); toast.success('Skill proficiency recorded.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })

  // Feedback
  const { data: allTrainings } = useQuery({ queryKey: ['trainings-all'], queryFn: () => trainingApi.list({ status: 'completed' }), enabled: tab === 'feedback' || tab === 'history' || tab === 'attendance' || tab === 'materials' })
  const [fbFor, setFbFor] = useState<any>(null)
  const [fbForm, setFbForm] = useState({ employee_id: '', rating: '', content_rating: '', trainer_rating: '', comments: '', suggestions: '' })
  const fbCreateMut = useMutation({
    mutationFn: () => trainingApi.addFeedback(fbFor.id, { ...fbForm, employee_id: Number(fbForm.employee_id), rating: fbForm.rating ? Number(fbForm.rating) : undefined, content_rating: fbForm.content_rating ? Number(fbForm.content_rating) : undefined, trainer_rating: fbForm.trainer_rating ? Number(fbForm.trainer_rating) : undefined }),
    onSuccess: () => { setFbFor(null); qc.invalidateQueries({ queryKey: ['trainings'] }); toast.success('Participant feedback recorded.') },
  })

  // History
  const { data: histData, isLoading: histLoading } = useQuery({ queryKey: ['train-history'], queryFn: () => trainingApi.history(), enabled: tab === 'history' })

  const renderStars = (val: number | null) => {
    if (!val) return <span className="text-slate-400 font-mono text-xs">—</span>
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(s => (
          <Star key={s} className={`w-3.5 h-3.5 ${s <= val ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <GraduationCap className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Learning &amp; Talent Development</h1>
          </div>
          <p className="text-xs text-slate-500">Curriculum calendar, skill matrices, employee certifications and batch attendance rosters</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={openCreate} className="shadow-sm hover:shadow transition-all">
            <Plus className="w-4 h-4 mr-1.5" /> Schedule New Training
          </Button>
        </div>
      </div>

      {/* Top Stat Cards */}
      {summary?.data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { label: 'Total Modules', value: summary.data.total, gradient: 'from-slate-700 to-slate-800' },
            { label: 'Scheduled Batches', value: summary.data.scheduled, gradient: 'from-blue-600 to-indigo-600' },
            { label: 'Completed Trainings', value: summary.data.completed, gradient: 'from-emerald-600 to-teal-600' },
            { label: 'Active Certifications', value: summary.data.active_certs, gradient: 'from-amber-500 to-orange-500' },
            { label: 'Mapped Competencies', value: summary.data.unique_skills, gradient: 'from-purple-600 to-pink-600' },
          ].map((s, i) => (
            <div key={i} className="relative overflow-hidden bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500">{s.label}</span>
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-white shadow-sm`}>
                  <GraduationCap className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 tracking-tight">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter and Tab Section */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 space-y-4">
        {(tab === 'calendar' || tab === 'assignments') && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <div className="w-full sm:w-72 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search topic, trainer, venue..."
                  className="w-full h-10 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div className="w-full sm:w-36">
                <Select
                  options={[{ value: '', label: 'All Types' }, ...TRAINING_TYPES.map(t => ({ value: t, label: typeLabel(t) }))]}
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                />
              </div>
              <div className="w-full sm:w-36">
                <Select
                  options={[{ value: '', label: 'All Status' }, { value: 'scheduled', label: 'Scheduled' }, { value: 'in_progress', label: 'In Progress' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }]}
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                />
              </div>
              {(search || typeFilter || statusFilter) && (
                <button
                  onClick={() => { setSearch(''); setTypeFilter(''); setStatusFilter('') }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-slate-100">
          <Tabs tabs={TABS} active={tab} onChange={setTab} />
        </div>
      </div>

      {/* Main Tab Panels */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        {/* Calendar Tab */}
        {tab === 'calendar' && (
          isLoading ? (
            <div className="p-8"><LoadingState /></div>
          ) : error ? (
            <div className="p-8"><PageError onRetry={() => refetch()} /></div>
          ) : (trainingData?.data || []).length === 0 ? (
            <div className="p-8"><EmptyState title="No Scheduled Trainings" description="Organize workshops, safety orientations or technical skill bootcamps." action={<Button onClick={openCreate}><Plus className="w-4 h-4 mr-1.5" /> Schedule Training</Button>} /></div>
          ) : (
            <Table
              columns={[
                { key: 'title', header: 'Course / Workshop', render: (r: any) => (
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{r.title}</p>
                    <p className="text-[11px] text-slate-500">{typeLabel(r.training_type)} · {modeLabel(r.mode)}</p>
                  </div>
                ) },
                { key: 'trainer_name', header: 'Instructor', render: (r: any) => (
                  <span className="text-xs text-slate-700 font-medium">
                    {r.trainer_name || 'Internal'}{r.trainer_org ? <span className="text-slate-400"> ({r.trainer_org})</span> : ''}
                  </span>
                ) },
                { key: 'start_date', header: 'Timeline', render: (r: any) => (
                  <span className="text-xs text-slate-700">
                    {dateShort(r.start_date)}{r.end_date && r.end_date !== r.start_date ? ` — ${dateShort(r.end_date)}` : ''}
                  </span>
                ) },
                { key: 'duration_hours', header: 'Hours', render: (r: any) => <span className="font-mono text-xs font-semibold text-slate-800">{r.duration_hours ? `${r.duration_hours}h` : '—'}</span> },
                { key: 'status', header: 'Status', render: (r: any) => {
                  const s = TRAINING_STATUS[r.status] || TRAINING_STATUS.scheduled
                  return (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      {statusLabel(r.status)}
                    </span>
                  )
                } },
                { key: 'actions', header: '', render: (r: any) => (
                  <div className="flex items-center gap-1.5 justify-end">
                    <button onClick={() => setDetailFor(r)} className="px-2 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                      Details
                    </button>
                    <button onClick={() => { setAssignFor(r); setSelectedEmps([]) }} className="px-2 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> Enroll
                    </button>
                    <button onClick={() => openEdit(r)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => setConfirmDelete({ type: 'training', id: r.id })} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) },
              ]}
              data={trainingData?.data || []}
              keyFn={(r: any) => String(r.id)}
            />
          )
        )}

        {/* Batch Enrollments Tab */}
        {tab === 'assignments' && (
          isLoading ? (
            <div className="p-8"><LoadingState /></div>
          ) : (trainingData?.data || []).length === 0 ? (
            <div className="p-8"><EmptyState title="No Active Trainings" description="Schedule trainings to manage employee enrollments." /></div>
          ) : (
            <div className="p-4 space-y-3">
              {(trainingData?.data || []).map((t: any) => (
                <div key={t.id} className="p-4 rounded-2xl border border-slate-200/80 bg-white space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{t.title}</h4>
                      <p className="text-xs text-slate-500">{dateShort(t.start_date)} · {(t.assignments || []).length} Enrolled Participants</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={() => { setAssignFor(t); setSelectedEmps([]) }}>
                        <Users className="w-3.5 h-3.5 mr-1" /> Add Participants
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => { setAttendFor(t); const m: Record<number, boolean> = {}; (t.assignments || []).forEach((a: any) => { m[a.employee_id] = false }); setAttendMap(m) }}>
                        <ClipboardCheck className="w-3.5 h-3.5 mr-1" /> Log Attendance
                      </Button>
                    </div>
                  </div>

                  {(t.assignments || []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                      {(t.assignments || []).map((a: any) => (
                        <span key={a.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium bg-slate-100 text-slate-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          {fullName(a.first_name, a.last_name)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {/* Attendance Tab */}
        {tab === 'attendance' && (
          (allTrainings?.data || []).length === 0 ? (
            <div className="p-8"><EmptyState title="No Completed Trainings" description="Attendance can be marked for active or completed batches." /></div>
          ) : (
            <div className="p-4 space-y-3">
              {(allTrainings?.data || []).map((t: any) => (
                <div key={t.id} className="p-4 rounded-2xl border border-slate-200/80 bg-white flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{t.title}</h4>
                    <p className="text-xs text-slate-500">{dateShort(t.start_date)} · {(t.assignments || []).length} participants</p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => { setAttendFor(t); const m: Record<number, boolean> = {}; (t.assignments || []).forEach((a: any) => { m[a.employee_id] = false }); setAttendMap(m) }}>
                    <ClipboardCheck className="w-3.5 h-3.5 mr-1" /> Mark Roster
                  </Button>
                </div>
              ))}
            </div>
          )
        )}

        {/* Materials Tab */}
        {tab === 'materials' && (
          (allTrainings?.data || []).length === 0 ? (
            <div className="p-8"><EmptyState title="No Training Modules" description="Upload slides, video links and syllabi to training modules." /></div>
          ) : (
            <div className="p-4 space-y-4">
              {(allTrainings?.data || []).map((t: any) => (
                <div key={t.id} className="p-4 rounded-2xl border border-slate-200/80 bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{t.title}</h4>
                      <p className="text-xs text-slate-500">{dateShort(t.start_date)} · {modeLabel(t.mode)}</p>
                    </div>
                    <Button size="sm" onClick={() => { setMatFor(t); setMatForm({ title: '', description: '', material_type: 'document', url: '' }) }}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Upload Material
                    </Button>
                  </div>
                  {(t.materials || []).length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No reference documents attached.</p>
                  ) : (
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      {(t.materials || []).map((m: any) => (
                        <div key={m.id} className="flex items-center justify-between py-1.5 px-2 bg-slate-50 rounded-xl text-xs">
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-indigo-600" />
                            <span className="font-semibold text-slate-800">{m.title}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-200 text-slate-700 capitalize">{m.material_type}</span>
                          </div>
                          {m.url && (
                            <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1">
                              <LinkIcon className="w-3 h-3" /> View Resource
                            </a>
                          )}
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
          <div className="p-4 space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setCertForm({ employee_id: '', name: '', issuing_org: '', issue_date: '', expiry_date: '', credential_id: '', status: 'active', notes: '' }); setShowCertForm(true) }}>
                <Plus className="w-4 h-4 mr-1.5" /> Add Employee Certificate
              </Button>
            </div>
            {certLoading ? <div className="p-8"><LoadingState /></div> : (certData?.data || []).length === 0 ? <EmptyState title="No Certifications Found" description="Track professional credentials, licenses and course certificates." /> : (
              <Table
                columns={[
                  { key: 'employee', header: 'Staff Member', render: (r: any) => (
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{fullName(r.first_name, r.last_name)}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{r.employee_code}</p>
                    </div>
                  ) },
                  { key: 'name', header: 'Certification Title', render: (r: any) => (
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{r.name}</p>
                      <p className="text-[11px] text-slate-500">{r.issuing_org || '—'}</p>
                    </div>
                  ) },
                  { key: 'issue_date', header: 'Issue Date', render: (r: any) => <span className="text-xs text-slate-700 font-medium">{r.issue_date ? dateShort(r.issue_date) : '—'}</span> },
                  { key: 'expiry_date', header: 'Expiry Date', render: (r: any) => <span className="text-xs text-slate-700 font-medium">{r.expiry_date ? dateShort(r.expiry_date) : 'Lifetime Validity'}</span> },
                  { key: 'status', header: 'Status', render: (r: any) => (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${CERT_STATUS[r.status]?.bg || 'bg-slate-100'}`}>
                      {CERT_STATUS[r.status]?.text || r.status}
                    </span>
                  ) },
                  { key: 'actions', header: '', render: (r: any) => (
                    <button onClick={() => setConfirmDelete({ type: 'cert', id: r.id })} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) },
                ]}
                data={certData?.data || []}
                keyFn={(r: any) => String(r.id)}
              />
            )}
          </div>
        )}

        {/* Skill Matrix Tab */}
        {tab === 'skills' && (
          <div className="p-4 space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setSkillForm({ employee_id: '', skill_name: '', category: 'technical', proficiency: 'beginner', last_assessed: '', assessed_by: '', notes: '' }); setShowSkillForm(true) }}>
                <Plus className="w-4 h-4 mr-1.5" /> Map Competency
              </Button>
            </div>
            {skillLoading ? <div className="p-8"><LoadingState /></div> : (skillData?.data || []).length === 0 ? <EmptyState title="No Skills Mapped" description="Record departmental capabilities and skill proficiency levels." /> : (
              <Table
                columns={[
                  { key: 'employee', header: 'Employee', render: (r: any) => (
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{fullName(r.first_name, r.last_name)}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{r.employee_code}</p>
                    </div>
                  ) },
                  { key: 'skill_name', header: 'Skill Competency', render: (r: any) => <span className="text-xs font-bold text-slate-900">{r.skill_name}</span> },
                  { key: 'category', header: 'Category', render: (r: any) => <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 capitalize">{r.category}</span> },
                  { key: 'proficiency', header: 'Proficiency Level', render: (r: any) => (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${PROF_MAP[r.proficiency]?.bg || 'bg-slate-100'}`}>
                      {PROF_MAP[r.proficiency]?.text || r.proficiency}
                    </span>
                  ) },
                  { key: 'last_assessed', header: 'Last Assessed', render: (r: any) => <span className="text-xs text-slate-600">{r.last_assessed ? dateShort(r.last_assessed) : '—'}</span> },
                  { key: 'actions', header: '', render: (r: any) => (
                    <button onClick={() => setConfirmDelete({ type: 'skill', id: r.id })} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) },
                ]}
                data={skillData?.data || []}
                keyFn={(r: any) => String(r.id)}
              />
            )}
          </div>
        )}

        {/* Feedback Tab */}
        {tab === 'feedback' && (
          (allTrainings?.data || []).length === 0 ? (
            <div className="p-8"><EmptyState title="No Course Feedback" description="Feedback from trainees will appear here once submitted." /></div>
          ) : (
            <div className="p-4 space-y-4">
              {(allTrainings?.data || []).map((t: any) => (
                <div key={t.id} className="p-4 rounded-2xl border border-slate-200/80 bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{t.title}</h4>
                      <p className="text-xs text-slate-500">{dateShort(t.start_date)} · {(t.feedbacks || []).length} Review(s)</p>
                    </div>
                    <Button size="sm" onClick={() => { setFbFor(t); setFbForm({ employee_id: '', rating: '', content_rating: '', trainer_rating: '', comments: '', suggestions: '' }) }}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Log Review
                    </Button>
                  </div>
                  {(t.feedbacks || []).length > 0 && (
                    <div className="divide-y divide-slate-100 pt-2 border-t border-slate-100">
                      {(t.feedbacks || []).map((f: any) => (
                        <div key={f.id} className="py-2.5 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-900">{fullName(f.first_name, f.last_name)} <span className="text-slate-400 font-mono font-normal">({f.employee_code})</span></span>
                            {renderStars(f.rating)}
                          </div>
                          {f.comments && <p className="text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">{f.comments}</p>}
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
          histLoading ? (
            <div className="p-8"><LoadingState /></div>
          ) : (histData?.data || []).length === 0 ? (
            <div className="p-8"><EmptyState title="No Training History Records" description="Past participant records and workshop records will be maintained here." /></div>
          ) : (
            <Table
              columns={[
                { key: 'employee', header: 'Trainee', render: (r: any) => (
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{fullName(r.first_name, r.last_name)}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{r.employee_code}</p>
                  </div>
                ) },
                { key: 'title', header: 'Completed Course', render: (r: any) => (
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{r.title}</p>
                    <p className="text-[11px] text-slate-500">{typeLabel(r.training_type)}</p>
                  </div>
                ) },
                { key: 'start_date', header: 'Session Date', render: (r: any) => <span className="text-xs text-slate-700 font-medium">{dateShort(r.start_date)}</span> },
                { key: 'mode', header: 'Mode', render: (r: any) => <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">{modeLabel(r.mode)}</span> },
                { key: 'attended', header: 'Attended', render: (r: any) => r.attended === 'Yes' ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">Attended</span> : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700">Absent</span> },
              ]}
              data={histData?.data || []}
              keyFn={(r: any) => `${r.training_id}-${r.employee_id}`}
            />
          )
        )}
      </div>

      {/* Schedule / Edit Training Modal */}
      <Modal open={showForm} onClose={() => { setShowForm(false); setEditItem(null) }} title={editItem ? 'Edit Training Session' : 'Schedule Training Session'} size="md">
        <div className="space-y-4 pt-1">
          <Input label="Training Title" placeholder="e.g. Forklift Safety & Warehouse SOPs" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <Textarea label="Curriculum Outline" placeholder="Detailed syllabus or learning goals..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Type" options={TRAINING_TYPES.map(t => ({ value: t, label: typeLabel(t) }))} value={form.training_type} onChange={e => setForm(f => ({ ...f, training_type: e.target.value }))} />
            <Select label="Delivery Mode" options={MODES.map(m => ({ value: m, label: modeLabel(m) }))} value={form.mode} onChange={e => setForm(f => ({ ...f, mode: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Trainer Name" placeholder="Instructor" value={form.trainer_name} onChange={e => setForm(f => ({ ...f, trainer_name: e.target.value }))} />
            <Input label="Trainer Organization" placeholder="e.g. National Safety Council" value={form.trainer_org} onChange={e => setForm(f => ({ ...f, trainer_org: e.target.value }))} />
          </div>
          <Input label="Venue / Virtual Meeting URL" placeholder="e.g. Conference Room A or Zoom link" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            <Input label="End Date" type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Start Time" type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
            <Input label="End Time" type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
            <Input label="Duration (Hrs)" type="number" value={form.duration_hours} onChange={e => setForm(f => ({ ...f, duration_hours: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Batch Capacity" type="number" placeholder="Max seats" value={form.max_participants} onChange={e => setForm(f => ({ ...f, max_participants: e.target.value }))} />
            <Select label="Status" options={['draft', 'scheduled', 'in_progress', 'completed', 'cancelled'].map(s => ({ value: s, label: statusLabel(s) }))} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => { setShowForm(false); setEditItem(null) }}>Cancel</Button>
            <Button loading={createMut.isPending || updateMut.isPending} onClick={() => editItem ? updateMut.mutate() : createMut.mutate()}>
              Save Training Session
            </Button>
          </div>
        </div>
      </Modal>

      {/* Assign Employees Modal */}
      <Modal open={!!assignFor} onClose={() => setAssignFor(null)} title={`Batch Enrollment — ${assignFor?.title || ''}`} size="md">
        <div className="space-y-4 pt-1">
          <p className="text-xs text-slate-600">Select employees to enroll in this batch ({(assignFor?.assignments || []).length} already enrolled):</p>
          <div className="max-h-[45vh] overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-2xl border border-slate-200/80">
            {empOptions.map(o => (
              <label key={o.value} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white hover:shadow-xs transition-all cursor-pointer">
                <input type="checkbox" checked={selectedEmps.includes(Number(o.value))} onChange={e => setSelectedEmps(prev => e.target.checked ? [...prev, Number(o.value)] : prev.filter(id => id !== Number(o.value)))} className="w-4 h-4 rounded accent-indigo-600" />
                <span className="text-xs font-medium text-slate-800">{o.label}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setAssignFor(null)}>Cancel</Button>
            <Button loading={assignMut.isPending} onClick={() => assignMut.mutate()} disabled={selectedEmps.length === 0}>
              Enroll Selected ({selectedEmps.length})
            </Button>
          </div>
        </div>
      </Modal>

      {/* Attendance Modal */}
      <Modal open={!!attendFor} onClose={() => setAttendFor(null)} title={`Attendance Roster — ${attendFor?.title || ''}`} size="md">
        <div className="space-y-4 pt-1">
          <div className="max-h-[45vh] overflow-y-auto">
            {(attendFor?.assignments || []).length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-6">No participants enrolled in this batch.</p>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden">
                {(attendFor?.assignments || []).map((a: any) => (
                  <label key={a.employee_id} className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors cursor-pointer text-xs">
                    <div>
                      <p className="font-semibold text-slate-900">{fullName(a.first_name, a.last_name)}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{a.employee_code}</p>
                    </div>
                    <input type="checkbox" checked={!!attendMap[a.employee_id]} onChange={e => setAttendMap(m => ({ ...m, [a.employee_id]: e.target.checked }))} className="w-4 h-4 rounded accent-indigo-600" />
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setAttendFor(null)}>Cancel</Button>
            <Button loading={attendMut.isPending} onClick={() => attendMut.mutate()}>
              Save Attendance Roster
            </Button>
          </div>
        </div>
      </Modal>

      {/* Material Modal */}
      <Modal open={!!matFor} onClose={() => setMatFor(null)} title={`Attach Resource — ${matFor?.title || ''}`} size="sm">
        <div className="space-y-4 pt-1">
          <Input label="Material Title" placeholder="e.g. Safety Handout PDF" value={matForm.title} onChange={e => setMatForm(f => ({ ...f, title: e.target.value }))} />
          <Textarea label="Resource Description" value={matForm.description} onChange={e => setMatForm(f => ({ ...f, description: e.target.value }))} />
          <Select label="Resource Type" options={[{ value: 'document', label: 'PDF / Document' }, { value: 'video', label: 'Video Lecture' }, { value: 'link', label: 'External Resource URL' }, { value: 'presentation', label: 'Slide Deck' }]} value={matForm.material_type} onChange={e => setMatForm(f => ({ ...f, material_type: e.target.value }))} />
          <Input label="URL Link" placeholder="https://..." value={matForm.url} onChange={e => setMatForm(f => ({ ...f, url: e.target.value }))} />
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setMatFor(null)}>Cancel</Button>
            <Button loading={matCreateMut.isPending} onClick={() => matCreateMut.mutate()}>Save Material</Button>
          </div>
        </div>
      </Modal>

      {/* Certification Modal */}
      <Modal open={showCertForm} onClose={() => setShowCertForm(false)} title="Record Certificate" size="md">
        <div className="space-y-4 pt-1">
          <Select label="Employee" options={[{ value: '', label: 'Select employee...' }, ...empOptions]} value={certForm.employee_id} onChange={e => setCertForm(f => ({ ...f, employee_id: e.target.value }))} />
          <Input label="Certificate Name" placeholder="e.g. First Aid &amp; CPR Certification" value={certForm.name} onChange={e => setCertForm(f => ({ ...f, name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Issuing Authority" placeholder="e.g. Red Cross" value={certForm.issuing_org} onChange={e => setCertForm(f => ({ ...f, issuing_org: e.target.value }))} />
            <Input label="Credential ID / License #" placeholder="e.g. LIC-987654" value={certForm.credential_id} onChange={e => setCertForm(f => ({ ...f, credential_id: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Issue Date" type="date" value={certForm.issue_date} onChange={e => setCertForm(f => ({ ...f, issue_date: e.target.value }))} />
            <Input label="Expiry Date" type="date" value={certForm.expiry_date} onChange={e => setCertForm(f => ({ ...f, expiry_date: e.target.value }))} />
          </div>
          <Select label="Certificate Status" options={[{ value: 'active', label: 'Active Valid' }, { value: 'expired', label: 'Expired' }, { value: 'revoked', label: 'Revoked' }]} value={certForm.status} onChange={e => setCertForm(f => ({ ...f, status: e.target.value }))} />
          <Textarea label="Notes" value={certForm.notes} onChange={e => setCertForm(f => ({ ...f, notes: e.target.value }))} />
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setShowCertForm(false)}>Cancel</Button>
            <Button loading={certCreateMut.isPending} onClick={() => certCreateMut.mutate()}>Save Certificate</Button>
          </div>
        </div>
      </Modal>

      {/* Skill Modal */}
      <Modal open={showSkillForm} onClose={() => setShowSkillForm(false)} title="Record Competency" size="md">
        <div className="space-y-4 pt-1">
          <Select label="Employee" options={[{ value: '', label: 'Select employee...' }, ...empOptions]} value={skillForm.employee_id} onChange={e => setSkillForm(f => ({ ...f, employee_id: e.target.value }))} />
          <Input label="Skill Name" placeholder="e.g. Inventory Auditing, PLC Programming" value={skillForm.skill_name} onChange={e => setSkillForm(f => ({ ...f, skill_name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Category" options={[{ value: 'technical', label: 'Technical Skill' }, { value: 'soft_skill', label: 'Soft Skill' }, { value: 'domain', label: 'Domain Knowledge' }, { value: 'tool', label: 'Tool Proficiency' }, { value: 'language', label: 'Language' }, { value: 'other', label: 'Other' }]} value={skillForm.category} onChange={e => setSkillForm(f => ({ ...f, category: e.target.value }))} />
            <Select label="Proficiency Level" options={[{ value: 'beginner', label: 'Beginner' }, { value: 'intermediate', label: 'Intermediate' }, { value: 'advanced', label: 'Advanced' }, { value: 'expert', label: 'Expert' }]} value={skillForm.proficiency} onChange={e => setSkillForm(f => ({ ...f, proficiency: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Assessment Date" type="date" value={skillForm.last_assessed} onChange={e => setSkillForm(f => ({ ...f, last_assessed: e.target.value }))} />
            <Input label="Assessed By" placeholder="Evaluator name" value={skillForm.assessed_by} onChange={e => setSkillForm(f => ({ ...f, assessed_by: e.target.value }))} />
          </div>
          <Textarea label="Proficiency Notes" value={skillForm.notes} onChange={e => setSkillForm(f => ({ ...f, notes: e.target.value }))} />
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setShowSkillForm(false)}>Cancel</Button>
            <Button loading={skillCreateMut.isPending} onClick={() => skillCreateMut.mutate()}>Save Skill</Button>
          </div>
        </div>
      </Modal>

      {/* Feedback Modal */}
      <Modal open={!!fbFor} onClose={() => setFbFor(null)} title={`Trainee Feedback — ${fbFor?.title || ''}`} size="md">
        <div className="space-y-4 pt-1">
          <Select label="Participant" options={[{ value: '', label: 'Select employee...' }, ...empOptions]} value={fbForm.employee_id} onChange={e => setFbForm(f => ({ ...f, employee_id: e.target.value }))} />
          <div className="grid grid-cols-3 gap-3">
            <Select label="Overall Rating" options={[{ value: '', label: '—' }, { value: '1', label: '⭐ 1' }, { value: '2', label: '⭐⭐ 2' }, { value: '3', label: '⭐⭐⭐ 3' }, { value: '4', label: '⭐⭐⭐⭐ 4' }, { value: '5', label: '⭐⭐⭐⭐⭐ 5' }]} value={fbForm.rating} onChange={e => setFbForm(f => ({ ...f, rating: e.target.value }))} />
            <Select label="Content Quality" options={[{ value: '', label: '—' }, { value: '1', label: '⭐ 1' }, { value: '2', label: '⭐⭐ 2' }, { value: '3', label: '⭐⭐⭐ 3' }, { value: '4', label: '⭐⭐⭐⭐ 4' }, { value: '5', label: '⭐⭐⭐⭐⭐ 5' }]} value={fbForm.content_rating} onChange={e => setFbForm(f => ({ ...f, content_rating: e.target.value }))} />
            <Select label="Instructor Score" options={[{ value: '', label: '—' }, { value: '1', label: '⭐ 1' }, { value: '2', label: '⭐⭐ 2' }, { value: '3', label: '⭐⭐⭐ 3' }, { value: '4', label: '⭐⭐⭐⭐ 4' }, { value: '5', label: '⭐⭐⭐⭐⭐ 5' }]} value={fbForm.trainer_rating} onChange={e => setFbForm(f => ({ ...f, trainer_rating: e.target.value }))} />
          </div>
          <Textarea label="Review Comments" placeholder="What went well?" value={fbForm.comments} onChange={e => setFbForm(f => ({ ...f, comments: e.target.value }))} />
          <Textarea label="Suggestions for Improvement" value={fbForm.suggestions} onChange={e => setFbForm(f => ({ ...f, suggestions: e.target.value }))} />
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setFbFor(null)}>Cancel</Button>
            <Button loading={fbCreateMut.isPending} onClick={() => fbCreateMut.mutate()}>Submit Feedback</Button>
          </div>
        </div>
      </Modal>

      {/* Training Detail Modal */}
      <Modal open={!!detailFor} onClose={() => setDetailFor(null)} title={detailFor?.title || 'Training Dossier'} size="lg">
        {detailFor && <TrainingDetailView trainingId={detailFor.id} />}
      </Modal>

      <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={() => {
        if (!confirmDelete) return
        if (confirmDelete.type === 'training') deleteMut.mutate(confirmDelete.id)
        else if (confirmDelete.type === 'cert') trainingApi.deleteCertification(confirmDelete.id).then(() => { setConfirmDelete(null); qc.invalidateQueries({ queryKey: ['certifications'] }); toast.success('Deleted.') })
        else if (confirmDelete.type === 'skill') trainingApi.deleteSkill(confirmDelete.id).then(() => { setConfirmDelete(null); qc.invalidateQueries({ queryKey: ['skills'] }); toast.success('Deleted.') })
      }} title="Confirm Deletion" message="Are you sure you want to remove this record? This action cannot be undone." danger />
    </div>
  )
}

function TrainingDetailView({ trainingId }: { trainingId: number }) {
  const { data, isLoading } = useQuery({ queryKey: ['training-detail', trainingId], queryFn: () => trainingApi.get(trainingId) })
  if (isLoading) return <div className="p-6"><LoadingState /></div>
  const t = data?.data as any
  if (!t) return null
  return (
    <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div><span className="text-slate-500 block">Category:</span> <span className="font-semibold text-slate-800">{typeLabel(t.training_type)}</span></div>
        <div><span className="text-slate-500 block">Delivery Mode:</span> <span className="font-semibold text-slate-800">{modeLabel(t.mode)}</span></div>
        <div><span className="text-slate-500 block">Instructor:</span> <span className="font-semibold text-slate-800">{t.trainer_name || 'Internal'}</span></div>
        <div><span className="text-slate-500 block">Status:</span> <span className="font-bold text-slate-800 capitalize">{t.status}</span></div>
        <div><span className="text-slate-500 block">Start Date:</span> <span className="text-slate-700">{dateShort(t.start_date)}</span></div>
        <div><span className="text-slate-500 block">End Date:</span> <span className="text-slate-700">{t.end_date ? dateShort(t.end_date) : '—'}</span></div>
        <div><span className="text-slate-500 block">Total Hours:</span> <span className="font-mono font-bold text-slate-900">{t.duration_hours ? `${t.duration_hours}h` : '—'}</span></div>
        <div><span className="text-slate-500 block">Location / Link:</span> <span className="text-slate-700 truncate block">{t.location || '—'}</span></div>
      </div>

      {t.description && (
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Curriculum Outline</span>
          <p className="text-xs text-slate-800 leading-relaxed">{t.description}</p>
        </div>
      )}

      <div className="space-y-2">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Enrolled Participants ({(t.assignments || []).length})</h4>
        <div className="flex flex-wrap gap-1.5">
          {(t.assignments || []).map((a: any) => (
            <span key={a.id} className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-medium bg-slate-100 text-slate-800">
              {fullName(a.first_name, a.last_name)}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
