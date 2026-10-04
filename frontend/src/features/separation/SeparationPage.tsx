import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { separationApi, employeeApi } from '@/services/api'
import { Button, Input, Textarea, Select } from '@/components/ui/fields'
import { Table, Badge, Tabs } from '@/components/ui/data'
import { PageHeader, LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { Modal, ConfirmDialog } from '@/components/ui/overlay'
import { fullName, dateShort } from '@/utils/format'
import { toast } from 'sonner'
import {
  Plus, Trash2, Search, FileText, CheckCircle2, XCircle, Clock, UserMinus,
  Star, Briefcase, Award, ShieldAlert, ArrowRight, RotateCcw, AlertCircle
} from 'lucide-react'

const TABS = [
  { key: 'list', label: 'All Exit Requests' },
  { key: 'pending', label: 'Pending Approvals' },
  { key: 'approved', label: 'Completed Exits' },
]

const SEP_TYPES: Record<string, string> = {
  resignation: 'Resignation',
  termination: 'Termination',
  retirement: 'Retirement',
  end_of_contract: 'End of Contract',
  other: 'Other'
}

const SEP_STATUS: Record<string, { bg: string; text: string; dot: string }> = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  rejected: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
  completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' }
}

export default function SeparationPage() {
  const [tab, setTab] = useState('list')
  const [showForm, setShowForm] = useState(false)
  const [detailFor, setDetailFor] = useState<any>(null)
  const qc = useQueryClient()

  const { data: summary } = useQuery({ queryKey: ['sep-summary'], queryFn: () => separationApi.summary() })
  const { data: empData } = useQuery({ queryKey: ['employees-select'], queryFn: () => employeeApi.list({ page: '1', page_size: '200' }) })
  const employees = (empData?.data || []) as any[]
  const empOptions = employees.map((e: any) => ({ value: String(e.id), label: `${e.employee_code} — ${fullName(e.first_name, e.last_name)}` }))
  const exitCandidates = employees.filter((e: any) => e.status !== 'exited')

  const params: Record<string, string> = {}
  if (tab === 'pending') params.status = 'pending'
  else if (tab === 'approved') params.status = 'approved'

  const { data: sepData, isLoading, error, refetch } = useQuery({ queryKey: ['separations', params], queryFn: () => separationApi.list(params) })

  // Create Separation
  const [form, setForm] = useState({ employee_id: '', separation_type: 'resignation', resignation_date: new Date().toISOString().slice(0, 10), last_working_date: '', notice_period_days: '30', notice_served_days: '0', notice_buyout: '0', reason: '' })
  const createMut = useMutation({
    mutationFn: () => separationApi.create({ ...form, employee_id: Number(form.employee_id), notice_period_days: Number(form.notice_period_days), notice_served_days: Number(form.notice_served_days), notice_buyout: Number(form.notice_buyout) }),
    onSuccess: () => { setShowForm(false); qc.invalidateQueries({ queryKey: ['separations'] }); qc.invalidateQueries({ queryKey: ['sep-summary'] }); toast.success('Exit request created.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })

  const approveMut = useMutation({
    mutationFn: (id: number) => separationApi.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['separations'] })
      qc.invalidateQueries({ queryKey: ['sep-summary'] })
      qc.invalidateQueries({ queryKey: ['employees'] })
      qc.invalidateQueries({ queryKey: ['employees-stats'] })
      toast.success('Exit approved — the employee is now marked as exited.')
    },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })

  const rejectMut = useMutation({
    mutationFn: (id: number) => separationApi.reject(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['separations'] }); qc.invalidateQueries({ queryKey: ['sep-summary'] }); toast.success('Exit rejected.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })

  const reinstateMut = useMutation({
    mutationFn: (id: number) => separationApi.reinstate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['separations'] })
      qc.invalidateQueries({ queryKey: ['sep-summary'] })
      qc.invalidateQueries({ queryKey: ['employees'] })
      qc.invalidateQueries({ queryKey: ['employees-stats'] })
      toast.success('Exit reversed — the employee is now inactive.')
    },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
              <UserMinus className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Exit & Separation Management</h1>
          </div>
          <p className="text-xs text-slate-500">Resignation workflow, departmental clearances, asset returns & Full & Final settlement</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => { setForm({ employee_id: '', separation_type: 'resignation', resignation_date: new Date().toISOString().slice(0, 10), last_working_date: '', notice_period_days: '30', notice_served_days: '0', notice_buyout: '0', reason: '' }); setShowForm(true) }}
            className="shadow-sm hover:shadow transition-all"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Initiate Exit Request
          </Button>
        </div>
      </div>

      {/* Top Stat Cards */}
      {summary?.data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { label: 'Total Separations', value: summary.data.total, gradient: 'from-slate-700 to-slate-800' },
            { label: 'Pending Approvals', value: summary.data.pending, gradient: 'from-amber-500 to-orange-500' },
            { label: 'Approved & Finalized', value: summary.data.approved, gradient: 'from-emerald-600 to-teal-600' },
            { label: 'Rejected Requests', value: summary.data.rejected, gradient: 'from-rose-600 to-red-600' },
            { label: 'Exits This Month', value: summary.data.this_month, gradient: 'from-indigo-600 to-blue-600' },
          ].map((s, i) => (
            <div key={i} className="relative overflow-hidden bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500">{s.label}</span>
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-white shadow-sm`}>
                  <UserMinus className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 tracking-tight">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs Filter */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80">
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        {isLoading ? (
          <div className="p-8"><LoadingState /></div>
        ) : error ? (
          <div className="p-8"><PageError onRetry={() => refetch()} /></div>
        ) : (sepData?.data || []).length === 0 ? (
          <div className="p-8"><EmptyState title="No Exit Requests Found" description="Initiate a resignation or termination record to start the clearance workflow." action={<Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1.5" /> Initiate Exit</Button>} /></div>
        ) : (
          <Table
            columns={[
              { key: 'employee', header: 'Employee', render: (r: any) => (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
                    {r.first_name?.[0]}{r.last_name?.[0]}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{fullName(r.first_name, r.last_name)}</p>
                    <p className="text-[11px] text-slate-500 font-mono">{r.employee_code} · {r.designation || 'Staff'}</p>
                  </div>
                </div>
              ) },
              { key: 'separation_type', header: 'Separation Type', render: (r: any) => (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                  {SEP_TYPES[r.separation_type] || r.separation_type}
                </span>
              ) },
              { key: 'resignation_date', header: 'Notice Served Date', render: (r: any) => <span className="text-xs text-slate-700 font-medium">{dateShort(r.resignation_date)}</span> },
              { key: 'last_working_date', header: 'Last Working Day', render: (r: any) => <span className="text-xs font-semibold text-slate-900">{r.last_working_date ? dateShort(r.last_working_date) : '—'}</span> },
              { key: 'notice_period_days', header: 'Notice Period', render: (r: any) => <span className="text-xs font-mono text-slate-600 font-medium">{r.notice_period_days} days</span> },
              { key: 'status', header: 'Status', render: (r: any) => {
                const s = SEP_STATUS[r.status] || SEP_STATUS.pending
                return (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    {r.status}
                  </span>
                )
              } },
              { key: 'actions', header: '', render: (r: any) => (
                <div className="flex items-center gap-1.5 justify-end">
                  <button onClick={() => setDetailFor(r)} className="px-2.5 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
                    View Clearance
                  </button>
                  {r.status === 'pending' && (
                    <>
                      <button
                        onClick={() => approveMut.mutate(r.id)}
                        disabled={approveMut.isPending}
                        className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors disabled:opacity-40"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => rejectMut.mutate(r.id)}
                        disabled={rejectMut.isPending}
                        className="px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors disabled:opacity-40"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {r.status === 'approved' && (
                    <button
                      onClick={() => reinstateMut.mutate(r.id)}
                      disabled={reinstateMut.isPending}
                      className="px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors disabled:opacity-40 flex items-center gap-1"
                      title="Reverse exit and bring employee back as inactive"
                    >
                      <RotateCcw className="w-3 h-3" /> Revert
                    </button>
                  )}
                </div>
              ) },
            ]}
            data={sepData?.data || []}
            keyFn={(r: any) => String(r.id)}
          />
        )}
      </div>

      {/* Create Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Initiate Exit Request" size="md">
        <div className="space-y-4 pt-1">
          <Select
            label="Select Candidate"
            required
            options={[{ value: '', label: 'Select employee...' }, ...exitCandidates.map((e: any) => ({ value: String(e.id), label: `${e.employee_code} — ${fullName(e.first_name, e.last_name)}${e.status === 'inactive' ? ' (inactive)' : ''}` }))]}
            value={form.employee_id}
            onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}
          />
          <Select label="Separation Category" options={Object.entries(SEP_TYPES).map(([v, l]) => ({ value: v, label: l }))} value={form.separation_type} onChange={e => setForm(f => ({ ...f, separation_type: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Resignation Submission Date" type="date" value={form.resignation_date} onChange={e => setForm(f => ({ ...f, resignation_date: e.target.value }))} />
            <Input
              label="Last Working Date"
              type="date"
              required
              value={form.last_working_date}
              onChange={e => setForm(f => ({ ...f, last_working_date: e.target.value }))}
              error={form.last_working_date && form.last_working_date < form.resignation_date ? 'Cannot be before resignation date.' : undefined}
            />
          </div>
          <p className="text-[11px] text-slate-500 -mt-2">The last working day marks the employee&apos;s formal exit in payroll calculations.</p>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Notice (Days)" type="number" value={form.notice_period_days} onChange={e => setForm(f => ({ ...f, notice_period_days: e.target.value }))} />
            <Input label="Served (Days)" type="number" value={form.notice_served_days} onChange={e => setForm(f => ({ ...f, notice_served_days: e.target.value }))} />
            <Input label="Buyout (Days)" type="number" value={form.notice_buyout} onChange={e => setForm(f => ({ ...f, notice_buyout: e.target.value }))} />
          </div>
          <Textarea label="Reason for Leaving" placeholder="State reason or summary of resignation..." value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button loading={createMut.isPending} onClick={() => createMut.mutate()} disabled={!form.employee_id || !form.last_working_date || form.last_working_date < form.resignation_date}>
              Create Request
            </Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!detailFor} onClose={() => setDetailFor(null)} title={`Exit Dossier — ${detailFor ? fullName(detailFor.first_name, detailFor.last_name) : ''}`} size="lg">
        {detailFor && <SeparationDetailView separationId={detailFor.id} />}
      </Modal>
    </div>
  )
}

function SeparationDetailView({ separationId }: { separationId: number }) {
  const { data, isLoading, refetch } = useQuery({ queryKey: ['separation', separationId], queryFn: () => separationApi.get(separationId) })
  if (isLoading) return <div className="p-6"><LoadingState /></div>
  const sep = data?.data as any
  if (!sep) return null

  const clearance = sep.clearance || []
  const clearedCount = clearance.filter((c: any) => c.is_cleared).length
  const assetReturns = sep.asset_returns || []
  const returnedCount = assetReturns.filter((a: any) => a.returned).length
  const noDues = sep.no_dues || []
  const duesCleared = noDues.filter((d: any) => d.is_cleared).length
  const letters = sep.letters || []

  return (
    <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs">
        <div><span className="text-slate-500 block">Type:</span> <span className="font-semibold text-slate-800">{SEP_TYPES[sep.separation_type] || sep.separation_type}</span></div>
        <div><span className="text-slate-500 block">Status:</span> <span className="font-semibold capitalize text-indigo-700">{sep.status}</span></div>
        <div><span className="text-slate-500 block">Resigned Date:</span> <span className="font-semibold text-slate-800">{dateShort(sep.resignation_date)}</span></div>
        <div><span className="text-slate-500 block">Last Working Date:</span> <span className="font-semibold text-slate-900">{sep.last_working_date ? dateShort(sep.last_working_date) : '—'}</span></div>
        <div><span className="text-slate-500 block">Notice Period:</span> <span className="font-semibold text-slate-800">{sep.notice_period_days}d (Served: {sep.notice_served_days}d)</span></div>
        <div><span className="text-slate-500 block">Notice Buyout:</span> <span className="font-semibold text-slate-800">{sep.notice_buyout}d</span></div>
        <div><span className="text-slate-500 block">Approved By:</span> <span className="font-semibold text-slate-800">{sep.approved_by || '—'}</span></div>
        <div><span className="text-slate-500 block">Reason:</span> <span className="font-semibold text-slate-800 truncate block">{sep.reason || '—'}</span></div>
      </div>

      {/* Exit Interview */}
      <Section title="Exit Interview Feedback" icon={FileText}>
        {sep.interview ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs bg-white p-3.5 rounded-xl border border-slate-200/80">
            <div><span className="text-slate-500 block mb-1">Job Satisfaction</span> <RatingStars val={sep.interview.job_satisfaction} /></div>
            <div><span className="text-slate-500 block mb-1">Work Environment</span> <RatingStars val={sep.interview.work_environment} /></div>
            <div><span className="text-slate-500 block mb-1">Management</span> <RatingStars val={sep.interview.management_rating} /></div>
            <div><span className="text-slate-500 block mb-1">Growth Opportunities</span> <RatingStars val={sep.interview.growth_opportunity} /></div>
            <div><span className="text-slate-500 block mb-1">Recommend Company</span> <RatingStars val={sep.interview.would_recommend} /></div>
            {sep.interview.reason_for_leaving && <div className="col-span-full pt-2 border-t border-slate-100"><span className="text-slate-500 block">Reason for Departure:</span> <p className="text-slate-800 mt-0.5">{sep.interview.reason_for_leaving}</p></div>}
            {sep.interview.feedback_text && <div className="col-span-full pt-2 border-t border-slate-100"><span className="text-slate-500 block">General Feedback:</span> <p className="text-slate-800 mt-0.5">{sep.interview.feedback_text}</p></div>}
          </div>
        ) : <p className="text-xs text-slate-400 italic">Exit interview has not been logged yet.</p>}
      </Section>

      {/* Clearance Checklist */}
      <Section title={`Departmental Clearance (${clearedCount} / ${clearance.length} Complete)`} icon={CheckCircle2}>
        {clearance.length === 0 ? <p className="text-xs text-slate-400 italic">No clearance items assigned.</p> : (
          <div className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200/80">
            {clearance.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between py-1.5 px-2 hover:bg-slate-50 rounded-lg text-xs transition-colors">
                <div className="flex items-center gap-2.5">
                  <button onClick={() => separationApi.toggleClearance(separationId, c.id, { is_cleared: !c.is_cleared }).then(() => refetch())} className={c.is_cleared ? 'text-emerald-600' : 'text-slate-300 hover:text-slate-500'}>
                    {c.is_cleared ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  </button>
                  <span className={`font-medium ${c.is_cleared ? 'line-through text-slate-400' : 'text-slate-900'}`}>{c.item_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 uppercase">{c.item_category}</span>
                  {c.cleared_by && <span className="text-[11px] text-slate-400">by {c.cleared_by}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Asset Returns */}
      <Section title={`Asset Handover (${returnedCount} / ${assetReturns.length} Handed Over)`} icon={Briefcase}>
        {assetReturns.length === 0 ? <p className="text-xs text-slate-400 italic">No assigned assets to recover.</p> : (
          <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-slate-500 bg-slate-50 border-b border-slate-200/80"><th className="py-2 px-3 font-semibold">Asset Description</th><th className="py-2 px-3 font-semibold font-mono">Asset Tag</th><th className="py-2 px-3 font-semibold">Status</th><th className="py-2 px-3 font-semibold">Return Date</th></tr></thead>
              <tbody>
                {assetReturns.map((a: any) => (
                  <tr key={a.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-medium text-slate-800">{a.asset_description}</td>
                    <td className="py-2 px-3 font-mono text-slate-600">{a.asset_code || '—'}</td>
                    <td className="py-2 px-3">{a.returned ? <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700">Returned</span> : <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700">Pending</span>}</td>
                    <td className="py-2 px-3 text-slate-500">{a.returned_date ? dateShort(a.returned_date) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* No-Dues */}
      <Section title={`No-Dues Certificates (${duesCleared} / ${noDues.length} Cleared)`} icon={Award}>
        {noDues.length === 0 ? <p className="text-xs text-slate-400 italic">No financial due entries recorded.</p> : (
          <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-slate-500 bg-slate-50 border-b border-slate-200/80"><th className="py-2 px-3 font-semibold">Department</th><th className="py-2 px-3 font-semibold">Outstanding Amount</th><th className="py-2 px-3 font-semibold">Clearance Status</th></tr></thead>
              <tbody>
                {noDues.map((d: any) => (
                  <tr key={d.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-medium text-slate-800">{d.department}</td>
                    <td className="py-2 px-3 font-mono text-slate-700 font-semibold">₹{Number(d.amount).toLocaleString('en-IN')}</td>
                    <td className="py-2 px-3">{d.is_cleared ? <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700">Cleared</span> : <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700">Pending</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Letters */}
      <Section title="Letters & Experience Certificates" icon={FileText}>
        {letters.length === 0 ? <p className="text-xs text-slate-400 italic">No exit documentation generated yet.</p> : (
          <div className="space-y-2">
            {letters.map((l: any) => (
              <div key={l.id} className="border border-slate-200/80 rounded-xl p-3 text-xs bg-white space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${l.letter_type === 'experience' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {l.letter_type === 'experience' ? 'Experience Certificate' : 'Relieving Letter'}
                  </span>
                  <span className="text-[11px] text-slate-400">{dateShort(l.letter_date)}</span>
                </div>
                <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 leading-relaxed">{l.letter_body}</pre>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Full & Final Settlement */}
      {sep.settlement && (
        <Section title="Full & Final (F&F) Settlement Calculation" icon={Award}>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs bg-gradient-to-br from-indigo-50/50 to-slate-50 p-4 rounded-xl border border-indigo-100">
            <div><span className="text-slate-500 block">Settlement Exit Date</span> <span className="font-semibold text-slate-900">{dateShort(sep.settlement.exit_date)}</span></div>
            <div><span className="text-slate-500 block">Unpaid Days</span> <span className="font-mono font-bold text-slate-900">{sep.settlement.unpaid_days}</span></div>
            <div><span className="text-slate-500 block">Leave Encashment</span> <span className="font-mono font-bold text-slate-900">{sep.settlement.encash_days} days</span></div>
            <div><span className="text-slate-500 block">Net Payable CTC</span> <span className="font-mono font-bold text-emerald-700 text-sm">₹{Number(sep.settlement.net_payable).toLocaleString('en-IN')}</span></div>
            <div><span className="text-slate-500 block">Settlement Status</span> <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold ${sep.settlement.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{sep.settlement.status}</span></div>
          </div>
        </Section>
      )}
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="p-1 bg-indigo-50 text-indigo-600 rounded-md">
          <Icon className="w-3.5 h-3.5" />
        </div>
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">{title}</h3>
      </div>
      <div>{children}</div>
    </div>
  )
}

function RatingStars({ val }: { val: number | null }) {
  if (!val) return <span className="text-slate-400 font-mono text-xs">—</span>
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={`w-3 h-3 ${s <= val ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
      ))}
    </div>
  )
}
