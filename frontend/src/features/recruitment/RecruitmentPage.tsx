import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { recruitmentApi, siteApi, type CandidateRow, type JobOpening } from '@/services/api'
import { Button, Input, Textarea } from '@/components/ui/fields'
import { Table, Badge, Tabs } from '@/components/ui/data'
import { Modal, ConfirmDialog } from '@/components/ui/overlay'
import { PageHeader, LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { statusColor, statusLabel } from '@/utils/format'
import { toast } from 'sonner'
import { Briefcase, UserPlus, CalendarPlus, FileSignature, Trash2, CheckCircle, XCircle, PauseCircle, PlayCircle, Printer, Users } from 'lucide-react'

const PAGE_TABS = [
  { key: 'openings', label: 'Open Positions' },
  { key: 'candidates', label: 'Candidates' },
]

const CAND_STATUS: Record<string, string> = {
  new: 'bg-canvas-soft-2 text-mute',
  screening: 'bg-warning-soft text-warning-deep',
  shortlisted: 'bg-link-soft text-link-deep',
  selected: 'bg-success-soft text-success',
  rejected: 'bg-error-soft text-error-deep',
  on_hold: 'bg-warning-soft text-warning-deep',
  joined: 'bg-success-soft text-success',
}
const candLabel = (s: string) => ({ new: 'New', screening: 'Screening', shortlisted: 'Shortlisted', selected: 'Selected', rejected: 'Rejected', on_hold: 'On Hold', joined: 'Joined' } as Record<string, string>)[s] || s
const openLabel = (s: string) => ({ open: 'Open', on_hold: 'On Hold', closed: 'Closed', fulfilled: 'Fulfilled' } as Record<string, string>)[s] || s
const srcLabel = (s?: string | null) => ({ walk_in: 'Walk-in', referral: 'Referral', job_portal: 'Job Portal', agency: 'Agency', other: 'Other' } as Record<string, string>)[s || ''] || '—'
const modeLabel = (m: string | null) => ({ in_person: 'In-person', phone: 'Phone', video: 'Video' } as Record<string, string>)[m || ''] || ''

export default function RecruitmentPage() {
  const [tab, setTab] = useState('openings')
  const qc = useQueryClient()

  const { data: opData, isLoading, error, refetch } = useQuery({ queryKey: ['openings'], queryFn: () => recruitmentApi.openings() })
  const { data: cdData, isLoading: cdLoading, error: cdError, refetch: cdRefetch } = useQuery({ queryKey: ['candidates'], queryFn: () => recruitmentApi.candidates() })
  const { data: allSites } = useQuery({ queryKey: ['sites-select'], queryFn: () => siteApi.list() })

  // opening form
  const [showOpening, setShowOpening] = useState(false)
  const [editOpening, setEditOpening] = useState<JobOpening | null>(null)
  const [opForm, setOpForm] = useState<Record<string, any>>({ title: '', department: '', site_id: '', positions_required: '1', notes: '' })
  const [confirmOpDelete, setConfirmOpDelete] = useState<number | null>(null)

  // candidate form / actions
  const [showCandidate, setShowCandidate] = useState(false)
  const [cdForm, setCdForm] = useState<Record<string, any>>({ full_name: '', mobile: '', email: '', opening_id: '', source: 'walk_in', experience: '', expected_salary: '', remarks: '' })
  const [ivFor, setIvFor] = useState<CandidateRow | null>(null)
  const [ivForm, setIvForm] = useState<Record<string, any>>({ scheduled_at: '', interviewer: '', mode: 'in_person', remarks: '' })
  const [joinFor, setJoinFor] = useState<CandidateRow | null>(null)
  const [joinForm, setJoinForm] = useState<Record<string, any>>({ joining_date: new Date().toISOString().slice(0, 10), designation: '', basic: '', hra: '', conveyance: '' })
  const [lettersFor, setLettersFor] = useState<CandidateRow | null>(null)
  const [letterKind, setLetterKind] = useState<'offer' | 'appointment' | 'joining'>('offer')
  const [confirmCdDelete, setConfirmCdDelete] = useState<number | null>(null)

  const invalidate = (keys: string[]) => keys.forEach(k => qc.invalidateQueries({ queryKey: [k] }))

  const openSaveMut = useMutation({
    mutationFn: () => editOpening
      ? recruitmentApi.updateOpening(editOpening.id, { title: opForm.title, department: opForm.department || null, site_id: opForm.site_id ? Number(opForm.site_id) : null, positions_required: Number(opForm.positions_required) || 1, notes: opForm.notes || null })
      : recruitmentApi.createOpening({ title: opForm.title, department: opForm.department || null, site_id: opForm.site_id ? Number(opForm.site_id) : null, positions_required: Number(opForm.positions_required) || 1, notes: opForm.notes || null }),
    onSuccess: () => { setShowOpening(false); setEditOpening(null); invalidate(['openings']); toast.success('Position saved.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to save position.'),
  })
  const openStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => recruitmentApi.updateOpening(id, { status }),
    onSuccess: () => { invalidate(['openings']); toast.success('Position updated.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })
  const openDeleteMut = useMutation({
    mutationFn: (id: number) => recruitmentApi.deleteOpening(id),
    onSuccess: () => { setConfirmOpDelete(null); invalidate(['openings']); toast.success('Position deleted.') },
    onError: (e: any) => { setConfirmOpDelete(null); toast.error(e?.error?.message || 'Failed to delete.') },
  })

  const cdCreateMut = useMutation({
    mutationFn: () => recruitmentApi.createCandidate({
      full_name: cdForm.full_name, mobile: cdForm.mobile || null, email: cdForm.email || null,
      opening_id: cdForm.opening_id ? Number(cdForm.opening_id) : null, source: cdForm.source,
      experience: cdForm.experience || null, expected_salary: cdForm.expected_salary ? Number(cdForm.expected_salary) : null,
      remarks: cdForm.remarks || null,
    }),
    onSuccess: () => { setShowCandidate(false); setCdForm({ full_name: '', mobile: '', email: '', opening_id: '', source: 'walk_in', experience: '', expected_salary: '', remarks: '' }); invalidate(['candidates']); toast.success('Candidate added.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to add candidate.'),
  })
  const cdStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => recruitmentApi.updateCandidate(id, { status }),
    onSuccess: () => { invalidate(['candidates']); toast.success('Status updated.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })
  const cdDeleteMut = useMutation({
    mutationFn: (id: number) => recruitmentApi.deleteCandidate(id),
    onSuccess: () => { setConfirmCdDelete(null); invalidate(['candidates']); toast.success('Candidate deleted.') },
    onError: (e: any) => { setConfirmCdDelete(null); toast.error(e?.error?.message || 'Failed to delete.') },
  })
  const ivScheduleMut = useMutation({
    mutationFn: () => recruitmentApi.scheduleInterview(ivFor!.id, { scheduled_at: ivForm.scheduled_at, interviewer: ivForm.interviewer || undefined, mode: ivForm.mode, remarks: ivForm.remarks || undefined }),
    onSuccess: () => { setIvFor(null); invalidate(['candidates']); toast.success('Interview scheduled.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to schedule.'),
  })
  const ivOutcomeMut = useMutation({
    mutationFn: ({ interviewId, outcome }: { interviewId: number; outcome: 'passed' | 'failed' }) => recruitmentApi.updateInterview(interviewId, { outcome }),
    onSuccess: (_r, v) => { invalidate(['candidates']); if (v.outcome === 'passed') toast.success('Round passed — mark candidate shortlisted/selected when ready.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })
  const joinMut = useMutation({
    mutationFn: () => recruitmentApi.join(joinFor!.id, {
      joining_date: joinForm.joining_date, designation: joinForm.designation || undefined,
      basic: Number(joinForm.basic), hra: joinForm.hra ? Number(joinForm.hra) : undefined,
      conveyance: joinForm.conveyance ? Number(joinForm.conveyance) : undefined,
    }),
    onSuccess: (r) => { setJoinFor(null); invalidate(['candidates', 'openings', 'employees-all']); toast.success(r.message || 'Candidate joined.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to complete joining.'),
  })

  const openings = (opData?.data || []) as unknown as JobOpening[]
  const candidates = (cdData?.data || []) as unknown as CandidateRow[]
  const sites = (allSites?.data || []) as any[]

  const openCols: any[] = [
    { key: 'code', header: 'Code', render: (r: JobOpening) => <span className="text-[12px] font-medium text-ink">{r.code}</span> },
    { key: 'title', header: 'Position', render: (r: JobOpening) => (
      <div>
        <p className="text-[13px] font-medium text-ink">{r.title}</p>
        <p className="text-[11px] text-mute">{r.department || '—'}</p>
      </div>
    ) },
    { key: 'site', header: 'Client / Site', hideSm: true, render: (r: JobOpening) => <span className="text-[12px] text-body">{r.client_name ? `${r.client_name} — ${r.site_name}` : '—'}</span> },
    { key: 'required', header: 'Required', render: (r: JobOpening) => <span className="text-[12px] text-body">{r.filled_count || 0} / {r.positions_required} filled</span> },
    { key: 'status', header: 'Status', render: (r: JobOpening) => <Badge className={statusColor(r.status === 'fulfilled' ? 'paid' : r.status)}>{openLabel(r.status)}</Badge> },
    { key: 'actions', header: '', render: (r: JobOpening) => (
      <div className="flex items-center gap-1 justify-end">
        <button onClick={() => { setEditOpening(r); setOpForm({ title: r.title, department: r.department || '', site_id: r.site_id ? String(r.site_id) : '', positions_required: String(r.positions_required), notes: r.notes || '' }); setShowOpening(true) }} className="px-1.5 py-0.5 text-[11px] text-link hover:bg-link-soft rounded-xs">Edit</button>
        {r.status === 'open' && <button onClick={() => openStatusMut.mutate({ id: r.id, status: 'on_hold' })} className="px-1.5 py-0.5 text-[11px] text-body hover:bg-canvas-soft rounded-xs"><PauseCircle className="w-3 h-3 inline" /> Hold</button>}
        {r.status === 'on_hold' && <button onClick={() => openStatusMut.mutate({ id: r.id, status: 'open' })} className="px-1.5 py-0.5 text-[11px] text-success hover:bg-success-soft rounded-xs"><PlayCircle className="w-3 h-3 inline" /> Reopen</button>}
        {(r.status === 'open' || r.status === 'on_hold') && <button onClick={() => openStatusMut.mutate({ id: r.id, status: 'closed' })} className="px-1.5 py-0.5 text-[11px] text-body hover:bg-canvas-soft rounded-xs">Close</button>}
        <button onClick={() => setConfirmOpDelete(r.id)} className="px-1.5 py-0.5 text-[11px] text-error hover:bg-error-soft rounded-xs"><Trash2 className="w-3 h-3" /></button>
      </div>
    ) },
  ]

  const cdCols: any[] = [
    { key: 'name', header: 'Candidate', render: (r: CandidateRow) => (
      <div>
        <p className="text-[13px] font-medium text-ink">{r.full_name}{r.joined_code ? ` · ${r.joined_code}` : ''}</p>
        <p className="text-[11px] text-mute">{[r.mobile, r.email].filter(Boolean).join(' · ') || '—'}</p>
      </div>
    ) },
    { key: 'position', header: 'Applied For', render: (r: CandidateRow) => <span className="text-[12px] text-body">{r.opening_title ? `${r.opening_title}` : '—'}</span> },
    { key: 'source', header: 'Source', hideSm: true, render: (r: CandidateRow) => <span className="text-[12px] text-body">{srcLabel(r.source)}</span> },
    { key: 'exp', header: 'Experience', hideSm: true, render: (r: CandidateRow) => <span className="text-[12px] text-body">{r.experience || '—'}</span> },
    { key: 'interviews', header: 'Interviews', render: (r: CandidateRow) => (
      <div className="text-[11px] text-mute leading-relaxed">
        {r.interviews.length === 0 && <span>—</span>}
        {r.interviews.map(iv => (
          <div key={iv.id} className="flex items-center gap-1">
            <span>R{iv.round} {new Date(iv.scheduled_at || '').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}{iv.interviewer ? ` · ${iv.interviewer}` : ''}</span>
            {iv.outcome === 'pending' && <button onClick={() => ivOutcomeMut.mutate({ interviewId: iv.id, outcome: 'passed' })} className="text-success" title="Mark passed"><CheckCircle className="w-3 h-3" /></button>}
            {iv.outcome === 'pending' && <button onClick={() => ivOutcomeMut.mutate({ interviewId: iv.id, outcome: 'failed' })} className="text-error" title="Mark failed"><XCircle className="w-3 h-3" /></button>}
            {iv.outcome !== 'pending' && <Badge className={iv.outcome === 'passed' ? 'bg-success-soft text-success' : 'bg-error-soft text-error-deep'}>{iv.outcome === 'passed' ? 'Passed' : 'Failed'}</Badge>}
          </div>
        ))}
      </div>
    ) },
    { key: 'status', header: 'Status', render: (r: CandidateRow) => <Badge className={CAND_STATUS[r.status]}>{candLabel(r.status)}</Badge> },
    { key: 'actions', header: '', render: (r: CandidateRow) => (
      <div className="flex items-center gap-1 justify-end flex-wrap">
        {!['joined', 'rejected'].includes(r.status) && <button onClick={() => { setIvFor(r); setIvForm({ scheduled_at: '', interviewer: '', mode: 'in_person', remarks: '' }) }} className="px-1.5 py-0.5 text-[11px] text-link hover:bg-link-soft rounded-xs"><CalendarPlus className="w-3 h-3 inline mr-0.5" />Interview</button>}
        {!['joined', 'rejected'].includes(r.status) && <button onClick={() => cdStatusMut.mutate({ id: r.id, status: 'selected' })} className="px-1.5 py-0.5 text-[11px] text-success hover:bg-success-soft rounded-xs">Select</button>}
        {r.status !== 'rejected' && r.status !== 'joined' && <button onClick={() => cdStatusMut.mutate({ id: r.id, status: 'rejected' })} className="px-1.5 py-0.5 text-[11px] text-body hover:bg-canvas-soft rounded-xs">Reject</button>}
        {r.status === 'selected' && <button onClick={() => { setJoinFor(r); setJoinForm({ joining_date: new Date().toISOString().slice(0, 10), designation: r.opening_title || '', basic: r.expected_salary ? String(r.expected_salary) : '', hra: '', conveyance: '' }) }} className="px-1.5 py-0.5 text-[11px] text-success hover:bg-success-soft rounded-xs font-medium">Join</button>}
        <button onClick={() => setLettersFor(r)} className="px-1.5 py-0.5 text-[11px] text-body hover:bg-canvas-soft rounded-xs"><FileSignature className="w-3 h-3 inline mr-0.5" />Letters</button>
        <button onClick={() => setConfirmCdDelete(r.id)} className="px-1.5 py-0.5 text-[11px] text-error hover:bg-error-soft rounded-xs"><Trash2 className="w-3 h-3" /></button>
      </div>
    ) },
  ]

  return (
    <div>
      <PageHeader
        title="Recruitment"
        subtitle="Manpower requests, candidates, interviews and joining"
        actions={tab === 'openings'
          ? <Button onClick={() => { setEditOpening(null); setOpForm({ title: '', department: '', site_id: '', positions_required: '1', notes: '' }); setShowOpening(true) }}><Briefcase className="w-3.5 h-3.5" /> New Position</Button>
          : <Button onClick={() => setShowCandidate(true)}><UserPlus className="w-3.5 h-3.5" /> Add Candidate</Button>}
      />

      <Tabs tabs={PAGE_TABS} active={tab} onChange={setTab} />

      {tab === 'openings' && (isLoading ? <LoadingState /> : error ? <PageError onRetry={() => refetch()} /> : (
        <div className="bg-white card-shadow rounded-md p-4">
          {openings.length === 0 ? <EmptyState icon={Briefcase} title="No positions yet" description="Create a job opening to track manpower requirements." action={<Button onClick={() => setShowOpening(true)}>New Position</Button>} /> : (
            <Table columns={openCols} data={openings} keyFn={(r) => String(r.id)} />
          )}
        </div>
      ))}

      {tab === 'candidates' && (cdLoading ? <LoadingState /> : cdError ? <PageError onRetry={() => cdRefetch()} /> : (
        <div className="bg-white card-shadow rounded-md p-4">
          {candidates.length === 0 ? <EmptyState icon={Users} title="No candidates yet" description="Add candidates to build your hiring pipeline." action={<Button onClick={() => setShowCandidate(true)}>Add Candidate</Button>} /> : (
            <Table columns={cdCols} data={candidates} keyFn={(r) => String(r.id)} />
          )}
        </div>
      ))}

      {/* Opening modal */}
      <Modal open={showOpening} onClose={() => setShowOpening(false)} title={editOpening ? `Edit Position — ${editOpening.code}` : 'New Position'} size="sm">
        <div className="space-y-3">
          <Input label="Position Title" value={opForm.title} onChange={e => setOpForm((f: any) => ({ ...f, title: e.target.value }))} />
          <Input label="Department" value={opForm.department} onChange={e => setOpForm((f: any) => ({ ...f, department: e.target.value }))} />
          <select value={opForm.site_id} onChange={e => setOpForm((f: any) => ({ ...f, site_id: e.target.value }))} className="w-full h-9 px-2 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink">
            <option value="">No site (internal)</option>
            {sites.map((s: any) => <option key={s.id} value={s.id}>{s.client_name} — {s.name}</option>)}
          </select>
          <Input label="Positions Required" type="number" min={1} value={opForm.positions_required} onChange={e => setOpForm((f: any) => ({ ...f, positions_required: e.target.value }))} />
          <Textarea label="Notes / Requirements" value={opForm.notes} onChange={e => setOpForm((f: any) => ({ ...f, notes: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowOpening(false)}>Cancel</Button>
            <Button loading={openSaveMut.isPending} onClick={() => { if (!opForm.title.trim()) { toast.error('Title is required.'); return } openSaveMut.mutate() }}>Save Position</Button>
          </div>
        </div>
      </Modal>

      {/* Candidate modal */}
      <Modal open={showCandidate} onClose={() => setShowCandidate(false)} title="Add Candidate" size="sm">
        <div className="space-y-3">
          <Input label="Full Name" value={cdForm.full_name} onChange={e => setCdForm((f: any) => ({ ...f, full_name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Mobile" value={cdForm.mobile} onChange={e => setCdForm((f: any) => ({ ...f, mobile: e.target.value }))} />
            <Input label="Email" type="email" value={cdForm.email} onChange={e => setCdForm((f: any) => ({ ...f, email: e.target.value }))} />
          </div>
          <select value={cdForm.opening_id} onChange={e => setCdForm((f: any) => ({ ...f, opening_id: e.target.value }))} className="w-full h-9 px-2 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink">
            <option value="">Applying for (none)</option>
            {openings.filter(o => o.status !== 'closed').map(o => <option key={o.id} value={o.id}>{o.code} — {o.title}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <select value={cdForm.source} onChange={e => setCdForm((f: any) => ({ ...f, source: e.target.value }))} className="h-9 px-2 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink">
              {['walk_in', 'referral', 'job_portal', 'agency', 'other'].map(s => <option key={s} value={s}>{srcLabel(s)}</option>)}
            </select>
            <Input label="Experience" placeholder="e.g. 2 yrs" value={cdForm.experience} onChange={e => setCdForm((f: any) => ({ ...f, experience: e.target.value }))} />
          </div>
          <Input label="Expected Salary (₹)" type="number" value={cdForm.expected_salary} onChange={e => setCdForm((f: any) => ({ ...f, expected_salary: e.target.value }))} />
          <Textarea label="Remarks" value={cdForm.remarks} onChange={e => setCdForm((f: any) => ({ ...f, remarks: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowCandidate(false)}>Cancel</Button>
            <Button loading={cdCreateMut.isPending} onClick={() => { if (!cdForm.full_name.trim()) { toast.error('Name is required.'); return } cdCreateMut.mutate() }}>Add Candidate</Button>
          </div>
        </div>
      </Modal>

      {/* Interview modal */}
      <Modal open={!!ivFor} onClose={() => setIvFor(null)} title={`Schedule Interview — ${ivFor?.full_name || ''}`} size="sm">
        <div className="space-y-3">
          <Input label="Date & Time" type="datetime-local" value={ivForm.scheduled_at} onChange={e => setIvForm((f: any) => ({ ...f, scheduled_at: e.target.value }))} />
          <Input label="Interviewer" value={ivForm.interviewer} onChange={e => setIvForm((f: any) => ({ ...f, interviewer: e.target.value }))} />
          <select value={ivForm.mode} onChange={e => setIvForm((f: any) => ({ ...f, mode: e.target.value }))} className="w-full h-9 px-2 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink">
            {['in_person', 'phone', 'video'].map(m => <option key={m} value={m}>{modeLabel(m)}</option>)}
          </select>
          <Textarea label="Remarks" value={ivForm.remarks} onChange={e => setIvForm((f: any) => ({ ...f, remarks: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIvFor(null)}>Cancel</Button>
            <Button loading={ivScheduleMut.isPending} onClick={() => { if (!ivForm.scheduled_at) { toast.error('Pick a date & time.'); return } ivScheduleMut.mutate() }}>Schedule</Button>
          </div>
        </div>
      </Modal>

      {/* Join modal */}
      <Modal open={!!joinFor} onClose={() => setJoinFor(null)} title={`Complete Joining — ${joinFor?.full_name || ''}`} size="sm">
        <div className="space-y-3">
          <p className="text-[12px] text-mute">Creates the employee record with an auto-generated ID and seeds the onboarding checklist.</p>
          <Input label="Joining Date" type="date" value={joinForm.joining_date} onChange={e => setJoinForm((f: any) => ({ ...f, joining_date: e.target.value }))} />
          <Input label="Designation" value={joinForm.designation} onChange={e => setJoinForm((f: any) => ({ ...f, designation: e.target.value }))} />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Basic" type="number" value={joinForm.basic} onChange={e => setJoinForm((f: any) => ({ ...f, basic: e.target.value }))} />
            <Input label="HRA" type="number" value={joinForm.hra} onChange={e => setJoinForm((f: any) => ({ ...f, hra: e.target.value }))} />
            <Input label="Conveyance" type="number" value={joinForm.conveyance} onChange={e => setJoinForm((f: any) => ({ ...f, conveyance: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setJoinFor(null)}>Cancel</Button>
            <Button loading={joinMut.isPending} onClick={() => { if (!joinForm.basic || !joinForm.joining_date) { toast.error('Joining date and basic salary are required.'); return } joinMut.mutate() }}>Confirm Joining</Button>
          </div>
        </div>
      </Modal>

      {/* Letters modal */}
      <Modal open={!!lettersFor} onClose={() => setLettersFor(null)} title={`Letters — ${lettersFor?.full_name || ''}`} size="lg">
        {lettersFor && (
          <div>
            <div className="flex items-center gap-2 mb-3 print:hidden">
              {(['offer', 'appointment', 'joining'] as const).map(k => (
                <button key={k} onClick={() => setLetterKind(k)} className={`px-2.5 py-1 text-[12px] rounded-sm border ${letterKind === k ? 'border-ink bg-canvas-soft-2 font-medium' : 'border-hairline text-mute'}`}>
                  {k === 'offer' ? 'Offer Letter' : k === 'appointment' ? 'Appointment Letter' : 'Joining Form'}
                </button>
              ))}
              <Button className="ml-auto" variant="secondary" onClick={() => window.print()}><Printer className="w-3.5 h-3.5" /> Print</Button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto bg-white border border-hairline rounded-sm p-6">
              <LetterTemplate kind={letterKind} candidate={lettersFor} />
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={confirmOpDelete !== null} onClose={() => setConfirmOpDelete(null)} onConfirm={() => confirmOpDelete !== null && openDeleteMut.mutate(confirmOpDelete)} title="Delete Position" message="Delete this job opening? This is only possible while no candidates are linked." loading={openDeleteMut.isPending} />
      <ConfirmDialog open={confirmCdDelete !== null} onClose={() => setConfirmCdDelete(null)} onConfirm={() => confirmCdDelete !== null && cdDeleteMut.mutate(confirmCdDelete)} title="Delete Candidate" message="Remove this candidate and their interview records?" loading={cdDeleteMut.isPending} />
    </div>
  )
}

function LetterTemplate({ kind, candidate }: { kind: 'offer' | 'appointment' | 'joining'; candidate: CandidateRow }) {
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
  const company = 'Staffsway Manpower Staffing & HR Services'
  const head = (
    <div className="text-center mb-8">
      <p className="text-lg font-bold tracking-tight">{company}</p>
      <p className="text-[11px] text-neutral-500">Chennai · Mumbai · Bengaluru · Pune · Hyderabad · Delhi</p>
      <hr className="mt-4 border-neutral-300" />
    </div>
  )
  if (kind === 'joining') {
    return (
      <div className="print-letter text-[12px] text-neutral-900 leading-relaxed">
        {head}
        <p className="font-bold text-center underline mb-6">JOINING FORM</p>
        <table className="w-full border-collapse">
          <tbody>
            {[
              ['Employee Name', candidate.full_name],
              ['Mobile', candidate.mobile || '________________'],
              ['Email', candidate.email || '________________'],
              ['Applied Position', candidate.opening_title || '________________'],
              ['Date of Joining', '____-__-__'],
              ['Aadhaar Number', '________________'],
              ['PAN', '________________'],
              ['Bank Account & IFSC', '________________'],
              ['Emergency Contact', '________________'],
              ['Previous Employer', candidate.experience ? `Experience: ${candidate.experience}` : '________________'],
              ['Signature of Employee', '________________'],
            ].map(([k, v]) => (
              <tr key={k}>
                <td className="border border-neutral-300 px-2 py-1.5 font-medium w-56">{k}</td>
                <td className="border border-neutral-300 px-2 py-1.5">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-8 text-right">Date: {today}</p>
      </div>
    )
  }
  const subject = kind === 'offer' ? `Offer of Employment — ${candidate.opening_title || 'Suitable Position'}` : `Appointment Letter — ${candidate.opening_title || 'Suitable Position'}`
  const bodyPara = kind === 'offer'
    ? `We are pleased to inform you that you have been selected for the position mentioned above at ${company}, based on your interviews and discussions with our team. Your expected compensation will be discussed and confirmed in the enclosed terms. Kindly confirm your acceptance within 7 working days from the date of this letter.`
    : `This letter formalizes your employment with ${company} subsequent to your acceptance of our offer. You will be governed by the company's policies, rules, and regulations as applicable to your role. Your probation period will be 6 months unless communicated otherwise in writing.`
  return (
    <div className="print-letter text-[12px] text-neutral-900 leading-relaxed">
      {head}
      <p>Date: {today}</p>
      <p className="mt-4"><strong>To,</strong><br />{candidate.full_name}<br />{candidate.mobile || ''}</p>
      <p className="mt-4"><strong>Subject: {subject}</strong></p>
      <p className="mt-4">Dear {candidate.full_name.split(' ')[0]},</p>
      <p className="mt-3">{bodyPara}</p>
      <ul className="mt-3 list-disc pl-6 space-y-1">
        <li>Position: <strong>{candidate.opening_title || 'As discussed'}</strong>{candidate.opening_code ? ` (${candidate.opening_code})` : ''}</li>
        <li>Reporting: at the assigned client site, as communicated by the operations team</li>
        <li>Working hours & shift: as per site requirements</li>
      </ul>
      <p className="mt-4">We welcome you and look forward to a long and rewarding association.</p>
      <div className="mt-16 flex justify-between">
        <div>
          <p>_________________________</p>
          <p className="text-[11px] mt-1">Accepted by (Candidate)</p>
        </div>
        <div className="text-right">
          <p>For {company}</p>
          <p className="mt-12">Authorized Signatory</p>
        </div>
      </div>
    </div>
  )
}
