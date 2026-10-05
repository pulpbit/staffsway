import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { recruitmentApi, siteApi, type CandidateRow, type JobOpening } from '@/services/api'
import { Button, Input, Textarea } from '@/components/ui/fields'
import { Table, Tabs, StatCard } from '@/components/ui/data'
import { Modal, ConfirmDialog } from '@/components/ui/overlay'
import { PageHeader } from '@/components/ui/layout'
import { LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { StatusBadge, StatusDot } from '@/components/ui/status'
import { toast } from 'sonner'
import { Briefcase, UserPlus, CalendarPlus, FileSignature, Trash2, CheckCircle, XCircle, PauseCircle, PlayCircle, Users, PenLine, Phone, Mail, Clock, Plus } from 'lucide-react'

const PAGE_TABS = [
  { key: 'openings', label: 'Job Openings & Requisitions' },
  { key: 'candidates', label: 'Candidate Pipeline' },
]

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

  // candidate form
  const [showCandidate, setShowCandidate] = useState(false)
  const [cdForm, setCdForm] = useState<Record<string, any>>({ full_name: '', mobile: '', email: '', opening_id: '', source: 'walk_in', experience: '', expected_salary: '', remarks: '' })
  const [confirmCdDelete, setConfirmCdDelete] = useState<number | null>(null)

  const invalidate = (keys: string[]) => keys.forEach(k => qc.invalidateQueries({ queryKey: [k] }))

  const openSaveMut = useMutation({
    mutationFn: () => editOpening
      ? recruitmentApi.updateOpening(editOpening.id, { title: opForm.title, department: opForm.department || null, site_id: opForm.site_id ? Number(opForm.site_id) : null, positions_required: Number(opForm.positions_required) || 1, notes: opForm.notes || null })
      : recruitmentApi.createOpening({ title: opForm.title, department: opForm.department || null, site_id: opForm.site_id ? Number(opForm.site_id) : null, positions_required: Number(opForm.positions_required) || 1, notes: opForm.notes || null }),
    onSuccess: () => { setShowOpening(false); setEditOpening(null); invalidate(['openings']); toast.success('Job requisition saved.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to save job position.'),
  })

  const openStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => recruitmentApi.updateOpening(id, { status }),
    onSuccess: () => { invalidate(['openings']); toast.success('Status updated.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })

  const openDeleteMut = useMutation({
    mutationFn: (id: number) => recruitmentApi.deleteOpening(id),
    onSuccess: () => { setConfirmOpDelete(null); invalidate(['openings']); toast.success('Opening removed.') },
    onError: (e: any) => { setConfirmOpDelete(null); toast.error(e?.error?.message || 'Failed to delete.') },
  })

  const cdCreateMut = useMutation({
    mutationFn: () => recruitmentApi.createCandidate({
      full_name: cdForm.full_name, mobile: cdForm.mobile || null, email: cdForm.email || null,
      opening_id: cdForm.opening_id ? Number(cdForm.opening_id) : null, source: cdForm.source,
      experience: cdForm.experience || null, expected_salary: cdForm.expected_salary ? Number(cdForm.expected_salary) : null,
      remarks: cdForm.remarks || null,
    }),
    onSuccess: () => { setShowCandidate(false); setCdForm({ full_name: '', mobile: '', email: '', opening_id: '', source: 'walk_in', experience: '', expected_salary: '', remarks: '' }); invalidate(['candidates']); toast.success('Candidate profile added.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to add candidate.'),
  })

  const cdStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => recruitmentApi.updateCandidate(id, { status }),
    onSuccess: () => { invalidate(['candidates']); toast.success('Candidate status updated.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })

  const cdDeleteMut = useMutation({
    mutationFn: (id: number) => recruitmentApi.deleteCandidate(id),
    onSuccess: () => { setConfirmCdDelete(null); invalidate(['candidates']); toast.success('Candidate deleted.') },
    onError: (e: any) => { setConfirmCdDelete(null); toast.error(e?.error?.message || 'Failed to delete.') },
  })

  const openings = (opData?.data || []) as JobOpening[]
  const candidates = (cdData?.data || []) as CandidateRow[]
  const sites = (allSites?.data || []) as any[]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Talent Acquisition & Recruitment"
        description="Job requisitions, candidate pipeline, interview schedules and offer letters"
        actions={
          tab === 'openings' ? (
            <button
              type="button"
              onClick={() => { setEditOpening(null); setOpForm({ title: '', department: '', site_id: '', positions_required: '1', notes: '' }); setShowOpening(true) }}
              className="h-10 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Job Opening</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowCandidate(true)}
              className="h-10 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Candidate</span>
            </button>
          )
        }
      />

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Briefcase} label="Active Requisitions" value={openings.filter(o => o.status === 'open').length} tone="primary" sub={`Total Openings: ${openings.length}`} />
        <StatCard icon={Users} label="Total Pipeline" value={candidates.length} tone="info" sub={`Selected: ${candidates.filter(c => c.status === 'selected' || c.status === 'joined').length}`} />
        <StatCard icon={UserPlus} label="Joined Recently" value={candidates.filter(c => c.status === 'joined').length} tone="success" sub="Onboarded staff" />
      </div>

      <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs">
        <Tabs tabs={PAGE_TABS} active={tab} onChange={setTab} variant="pill" />
      </div>

      {tab === 'openings' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="p-8"><LoadingState /></div>
          ) : error ? (
            <PageError onRetry={() => refetch()} />
          ) : openings.length === 0 ? (
            <EmptyState icon={Briefcase} title="No active job positions" description="Create a job requisition to start sourcing and screening talent." action={<Button onClick={() => setShowOpening(true)}>Create Job Opening</Button>} />
          ) : (
            <div className="divide-y divide-slate-100">
              {openings.map((op) => (
                <div key={op.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <h4 className="text-sm font-bold text-slate-900">{op.title}</h4>
                      <StatusBadge status={op.status} />
                    </div>
                    <p className="text-xs text-slate-500">
                      Dept: <strong>{op.department || 'General'}</strong> &bull; Site: <strong>{op.site_name || 'All Sites'}</strong> &bull; Vacancies: <strong className="text-blue-700">{op.positions_required}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {op.status === 'open' ? (
                      <button onClick={() => openStatusMut.mutate({ id: op.id, status: 'on_hold' })} className="px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-200 cursor-pointer">Put on Hold</button>
                    ) : (
                      <button onClick={() => openStatusMut.mutate({ id: op.id, status: 'open' })} className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 cursor-pointer">Reopen Position</button>
                    )}
                    <button onClick={() => { setEditOpening(op); setOpForm({ title: op.title, department: op.department || '', site_id: String(op.site_id || ''), positions_required: String(op.positions_required || 1), notes: op.notes || '' }); setShowOpening(true) }} className="p-2 text-slate-400 hover:text-blue-600 rounded-xl border border-slate-200 cursor-pointer">
                      <PenLine className="w-4 h-4" />
                    </button>
                    <button onClick={() => setConfirmOpDelete(op.id)} className="p-2 text-slate-400 hover:text-rose-600 rounded-xl border border-slate-200 cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'candidates' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          {cdLoading ? (
            <div className="p-8"><LoadingState /></div>
          ) : cdError ? (
            <PageError onRetry={() => cdRefetch()} />
          ) : candidates.length === 0 ? (
            <EmptyState icon={Users} title="No candidate applications" description="Add candidate profiles to track their interview and hiring stages." action={<Button onClick={() => setShowCandidate(true)}>Add Candidate</Button>} />
          ) : (
            <Table
              columns={[
                { key: 'name', header: 'Candidate Name', render: (r: any) => (
                  <div>
                    <span className="text-xs sm:text-[13px] font-bold text-slate-900 block">{r.full_name}</span>
                    <span className="text-[11px] text-slate-500 font-mono">{r.mobile || r.email || '—'}</span>
                  </div>
                ) },
                { key: 'role', header: 'Applied Position', render: (r: any) => <span className="text-xs font-semibold text-slate-800">{r.opening_title || 'General Pool'}</span> },
                { key: 'exp', header: 'Experience', render: (r: any) => <span className="text-xs text-slate-600">{r.experience || '—'}</span> },
                { key: 'status', header: 'Stage', className: 'w-9', render: (r: any) => <StatusDot status={r.status} /> },
                { key: 'actions', header: 'Update Status', className: 'text-right', render: (r: any) => (
                  <div className="flex items-center justify-end gap-1.5">
                    {r.status === 'new' && <button onClick={() => cdStatusMut.mutate({ id: r.id, status: 'screening' })} className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 cursor-pointer">Screen</button>}
                    {r.status === 'screening' && <button onClick={() => cdStatusMut.mutate({ id: r.id, status: 'shortlisted' })} className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 cursor-pointer">Shortlist</button>}
                    {r.status === 'shortlisted' && <button onClick={() => cdStatusMut.mutate({ id: r.id, status: 'selected' })} className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 cursor-pointer">Select</button>}
                    {r.status !== 'rejected' && r.status !== 'joined' && (
                      <button onClick={() => cdStatusMut.mutate({ id: r.id, status: 'rejected' })} className="px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 rounded-lg hover:bg-rose-100 cursor-pointer">Reject</button>
                    )}
                    <button onClick={() => setConfirmCdDelete(r.id)} className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ) },
              ]}
              data={candidates}
              keyFn={(r: any) => String(r.id)}
              minWidth="900px"
            />
          )}
        </div>
      )}

      {/* Opening Modal */}
      {showOpening && (
        <Modal open={showOpening} onClose={() => setShowOpening(false)} title={editOpening ? 'Edit Job Opening' : 'Create Job Requisition'} size="md">
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Job Title</label>
              <input value={opForm.title} onChange={e => setOpForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Senior Machine Operator" className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Department</label>
                <input value={opForm.department} onChange={e => setOpForm(f => ({ ...f, department: e.target.value }))} placeholder="e.g. Production" className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Vacancies</label>
                <input type="number" min={1} value={opForm.positions_required} onChange={e => setOpForm(f => ({ ...f, positions_required: e.target.value }))} className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Deployment Site</label>
              <select value={opForm.site_id} onChange={e => setOpForm(f => ({ ...f, site_id: e.target.value }))} className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500">
                <option value="">All Sites</option>
                {sites.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setShowOpening(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
              <button type="button" onClick={() => openSaveMut.mutate()} disabled={!opForm.title || openSaveMut.isPending} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer">Save Position</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Candidate Modal */}
      {showCandidate && (
        <Modal open={showCandidate} onClose={() => setShowCandidate(false)} title="Add Candidate Profile" size="md">
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Candidate Full Name</label>
              <input value={cdForm.full_name} onChange={e => setCdForm(f => ({ ...f, full_name: e.target.value }))} placeholder="e.g. Rahul Verma" className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Mobile Contact</label>
                <input value={cdForm.mobile} onChange={e => setCdForm(f => ({ ...f, mobile: e.target.value }))} placeholder="10-digit mobile" className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Email ID</label>
                <input type="email" value={cdForm.email} onChange={e => setCdForm(f => ({ ...f, email: e.target.value }))} placeholder="candidate@email.com" className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setShowCandidate(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
              <button type="button" onClick={() => cdCreateMut.mutate()} disabled={!cdForm.full_name || cdCreateMut.isPending} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer">Register Candidate</button>
            </div>
          </div>
        </Modal>
      )}

      {confirmOpDelete && (
        <ConfirmDialog
          open={!!confirmOpDelete}
          onClose={() => setConfirmOpDelete(null)}
          onConfirm={() => confirmOpDelete && openDeleteMut.mutate(confirmOpDelete)}
          title="Delete Job Opening"
          message="Are you sure you want to delete this job opening?"
          confirmText="Delete"
          danger
          loading={openDeleteMut.isPending}
        />
      )}

      {confirmCdDelete && (
        <ConfirmDialog
          open={!!confirmCdDelete}
          onClose={() => setConfirmCdDelete(null)}
          onConfirm={() => confirmCdDelete && cdDeleteMut.mutate(confirmCdDelete)}
          title="Delete Candidate"
          message="Are you sure you want to remove this candidate profile?"
          confirmText="Delete"
          danger
          loading={cdDeleteMut.isPending}
        />
      )}
    </div>
  )
}
