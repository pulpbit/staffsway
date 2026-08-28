import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { separationApi, employeeApi } from '@/services/api'
import { Button, Input, Textarea, Select } from '@/components/ui/fields'
import { Table, Badge, Tabs } from '@/components/ui/data'
import { PageHeader, LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { Modal, ConfirmDialog } from '@/components/ui/overlay'
import { fullName, dateShort } from '@/utils/format'
import { toast } from 'sonner'
import { Plus, Trash2, Search, FileText, CheckCircle, XCircle, Clock, UserMinus, Star, Briefcase, Award } from 'lucide-react'

const TABS = [
  { key: 'list', label: 'All Requests' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
]

const SEP_TYPES: Record<string, string> = { resignation: 'Resignation', termination: 'Termination', retirement: 'Retirement', end_of_contract: 'End of Contract', other: 'Other' }
const SEP_STATUS: Record<string, string> = { pending: 'bg-warning-soft text-warning-deep', approved: 'bg-success-soft text-success', rejected: 'bg-error-soft text-error-deep', completed: 'bg-success-soft text-success' }

export default function SeparationPage() {
  const [tab, setTab] = useState('list')
  const [showForm, setShowForm] = useState(false)
  const [detailFor, setDetailFor] = useState<any>(null)
  const [empFilter, setEmpFilter] = useState('')
  const qc = useQueryClient()

  const { data: summary } = useQuery({ queryKey: ['sep-summary'], queryFn: () => separationApi.summary() })
  const { data: empData } = useQuery({ queryKey: ['employees-select'], queryFn: () => employeeApi.list({ page: '1', page_size: '200', status: 'active' }) })
  const employees = (empData?.data || []) as any[]
  const empOptions = employees.map((e: any) => ({ value: String(e.id), label: `${e.employee_code} - ${fullName(e.first_name, e.last_name)}` }))

  const params: Record<string, string> = {}
  if (tab === 'pending') params.status = 'pending'
  else if (tab === 'approved') params.status = 'approved'

  const { data: sepData, isLoading, error, refetch } = useQuery({ queryKey: ['separations', params], queryFn: () => separationApi.list(params) })

  // Create Separation
  const [form, setForm] = useState({ employee_id: '', separation_type: 'resignation', resignation_date: new Date().toISOString().slice(0, 10), last_working_date: '', notice_period_days: '30', notice_served_days: '0', notice_buyout: '0', reason: '' })
  const createMut = useMutation({
    mutationFn: () => separationApi.create({ ...form, employee_id: Number(form.employee_id), notice_period_days: Number(form.notice_period_days), notice_served_days: Number(form.notice_served_days), notice_buyout: Number(form.notice_buyout), last_working_date: form.last_working_date || undefined }),
    onSuccess: () => { setShowForm(false); qc.invalidateQueries({ queryKey: ['separations'] }); qc.invalidateQueries({ queryKey: ['sep-summary'] }); toast.success('Separation request created.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })

  return (
    <div>
      <PageHeader title="Separation / Exit Management" subtitle="Resignation, clearance & exit workflow" actions={<Button onClick={() => { setForm({ employee_id: '', separation_type: 'resignation', resignation_date: new Date().toISOString().slice(0, 10), last_working_date: '', notice_period_days: '30', notice_served_days: '0', notice_buyout: '0', reason: '' }); setShowForm(true) }}><Plus className="w-3.5 h-3.5" /> New Request</Button>} />

      {summary?.data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
          {[
            { label: 'Total', value: summary.data.total },
            { label: 'Pending', value: summary.data.pending, color: 'text-warning-deep' },
            { label: 'Approved', value: summary.data.approved, color: 'text-success' },
            { label: 'Rejected', value: summary.data.rejected, color: 'text-error' },
            { label: 'This Month', value: summary.data.this_month },
          ].map((s, i) => (
            <div key={i} className="bg-white card-shadow rounded-md p-3">
              <p className="text-[11px] text-mute">{s.label}</p>
              <p className={`text-[18px] font-semibold ${s.color || 'text-ink'}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      <div className="bg-white card-shadow rounded-md p-4 mt-4">
        {isLoading ? <LoadingState /> :
         error ? <PageError onRetry={() => refetch()} /> :
         (sepData?.data || []).length === 0 ? <EmptyState title="No separation requests" description="Create a resignation or exit request to start the workflow." /> : (
          <Table
            columns={[
              { key: 'employee', header: 'Employee', render: (r: any) => <div><p className="text-[13px] font-medium text-ink">{fullName(r.first_name, r.last_name)}</p><p className="text-[11px] text-mute">{r.employee_code} · {r.designation || '—'}</p></div> },
              { key: 'separation_type', header: 'Type', render: (r: any) => <Badge className="bg-canvas-soft-2 text-body">{SEP_TYPES[r.separation_type] || r.separation_type}</Badge> },
              { key: 'resignation_date', header: 'Resigned', render: (r: any) => <span className="text-[12px]">{dateShort(r.resignation_date)}</span> },
              { key: 'last_working_date', header: 'Last Day', render: (r: any) => <span className="text-[12px]">{r.last_working_date ? dateShort(r.last_working_date) : '—'}</span> },
              { key: 'notice_period_days', header: 'Notice', render: (r: any) => <span className="text-[12px]">{r.notice_period_days}d</span> },
              { key: 'status', header: 'Status', render: (r: any) => <Badge className={SEP_STATUS[r.status] || ''}>{r.status}</Badge> },
              { key: 'actions', header: '', render: (r: any) => (
                <div className="flex gap-1">
                  <button onClick={() => setDetailFor(r)} className="px-1.5 py-0.5 text-[11px] text-link hover:bg-link-soft rounded-xs">View</button>
                  {r.status === 'pending' && <>
                    <button onClick={() => separationApi.approve(r.id).then(() => { qc.invalidateQueries({ queryKey: ['separations'] }); toast.success('Approved.') })} className="px-1.5 py-0.5 text-[11px] text-success hover:bg-success-soft rounded-xs">Approve</button>
                    <button onClick={() => separationApi.reject(r.id).then(() => { qc.invalidateQueries({ queryKey: ['separations'] }); toast.success('Rejected.') })} className="px-1.5 py-0.5 text-[11px] text-error hover:bg-error-soft rounded-xs">Reject</button>
                  </>}
                </div>
              )},
            ]}
            data={sepData?.data || []}
            keyFn={(r: any) => String(r.id)}
            emptyMessage="No requests found."
          />
        )}
      </div>

      {/* Create Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Separation Request" size="md">
        <div className="space-y-3">
          <Select label="Employee" options={[{ value: '', label: 'Select employee...' }, ...empOptions]} value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))} />
          <Select label="Type" options={Object.entries(SEP_TYPES).map(([v, l]) => ({ value: v, label: l }))} value={form.separation_type} onChange={e => setForm(f => ({ ...f, separation_type: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Resignation Date" type="date" value={form.resignation_date} onChange={e => setForm(f => ({ ...f, resignation_date: e.target.value }))} />
            <Input label="Last Working Date" type="date" value={form.last_working_date} onChange={e => setForm(f => ({ ...f, last_working_date: e.target.value }))} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Notice Period (days)" type="number" value={form.notice_period_days} onChange={e => setForm(f => ({ ...f, notice_period_days: e.target.value }))} />
            <Input label="Notice Served (days)" type="number" value={form.notice_served_days} onChange={e => setForm(f => ({ ...f, notice_served_days: e.target.value }))} />
            <Input label="Buyout (days)" type="number" value={form.notice_buyout} onChange={e => setForm(f => ({ ...f, notice_buyout: e.target.value }))} />
          </div>
          <Textarea label="Reason" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button loading={createMut.isPending} onClick={() => createMut.mutate()}>Create</Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!detailFor} onClose={() => setDetailFor(null)} title={`Exit — ${detailFor ? fullName(detailFor.first_name, detailFor.last_name) : ''}`} size="lg">
        {detailFor && <SeparationDetailView separationId={detailFor.id} empOptions={empOptions} />}
      </Modal>
    </div>
  )
}

function SeparationDetailView({ separationId, empOptions }: { separationId: number; empOptions: { value: string; label: string }[] }) {
  const { data, isLoading, refetch } = useQuery({ queryKey: ['separation', separationId], queryFn: () => separationApi.get(separationId) })
  const qc = useQueryClient()
  if (isLoading) return <LoadingState />
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
    <div className="space-y-6 max-h-[70vh] overflow-y-auto">
      {/* Header Info */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px]">
        <div><span className="text-mute">Type:</span> <Badge className="bg-canvas-soft-2 text-body">{SEP_TYPES[sep.separation_type]}</Badge></div>
        <div><span className="text-mute">Status:</span> <Badge className={SEP_STATUS[sep.status]}>{sep.status}</Badge></div>
        <div><span className="text-mute">Resigned:</span> {dateShort(sep.resignation_date)}</div>
        <div><span className="text-mute">Last Day:</span> {sep.last_working_date ? dateShort(sep.last_working_date) : '—'}</div>
        <div><span className="text-mute">Notice:</span> {sep.notice_period_days}d (served: {sep.notice_served_days}d)</div>
        <div><span className="text-mute">Buyout:</span> {sep.notice_buyout}d</div>
        <div><span className="text-mute">Approved by:</span> {sep.approved_by || '—'}</div>
        <div><span className="text-mute">Reason:</span> {sep.reason || '—'}</div>
      </div>

      {/* Exit Interview */}
      <Section title="Exit Interview" icon={FileText}>
        {sep.interview ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-[12px]">
            <div><span className="text-mute">Job Satisfaction:</span> <RatingStars val={sep.interview.job_satisfaction} /></div>
            <div><span className="text-mute">Work Environment:</span> <RatingStars val={sep.interview.work_environment} /></div>
            <div><span className="text-mute">Management:</span> <RatingStars val={sep.interview.management_rating} /></div>
            <div><span className="text-mute">Growth:</span> <RatingStars val={sep.interview.growth_opportunity} /></div>
            <div><span className="text-mute">Would Recommend:</span> <RatingStars val={sep.interview.would_recommend} /></div>
            {sep.interview.reason_for_leaving && <div className="col-span-2"><span className="text-mute">Reason:</span> {sep.interview.reason_for_leaving}</div>}
            {sep.interview.feedback_text && <div className="col-span-2"><span className="text-mute">Feedback:</span> {sep.interview.feedback_text}</div>}
          </div>
        ) : <p className="text-[12px] text-mute">Not conducted yet.</p>}
      </Section>

      {/* Clearance */}
      <Section title={`Clearance (${clearedCount}/${clearance.length})`} icon={CheckCircle}>
        {clearance.length === 0 ? <p className="text-[12px] text-mute">No items.</p> : (
          <div className="space-y-1">
            {clearance.map((c: any) => (
              <div key={c.id} className="flex items-center gap-2 py-1 text-[12px]">
                <button onClick={() => separationApi.toggleClearance(separationId, c.id, { is_cleared: !c.is_cleared }).then(() => refetch())} className={c.is_cleared ? 'text-success' : 'text-mute'}>
                  {c.is_cleared ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                </button>
                <span className={c.is_cleared ? 'line-through text-mute' : 'text-ink'}>{c.item_name}</span>
                <Badge className="bg-canvas-soft-2 text-mute">{c.item_category}</Badge>
                {c.cleared_by && <span className="text-mute">by {c.cleared_by}</span>}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Asset Return */}
      <Section title={`Asset Return (${returnedCount}/${assetReturns.length})`} icon={Briefcase}>
        {assetReturns.length === 0 ? <p className="text-[12px] text-mute">No assets to return.</p> : (
          <table className="w-full text-[12px]">
            <thead><tr className="text-left text-mute border-b border-hairline"><th className="py-1 font-medium">Asset</th><th className="py-1 font-medium">Code</th><th className="py-1 font-medium">Returned</th><th className="py-1 font-medium">Date</th></tr></thead>
            <tbody>
              {assetReturns.map((a: any) => (
                <tr key={a.id} className="border-b border-hairline last:border-0">
                  <td className="py-1">{a.asset_description}</td>
                  <td className="py-1 font-mono">{a.asset_code || '—'}</td>
                  <td className="py-1">{a.returned ? <Badge className="bg-success-soft text-success">Yes</Badge> : <Badge className="bg-warning-soft text-warning-deep">Pending</Badge>}</td>
                  <td className="py-1">{a.returned_date ? dateShort(a.returned_date) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* No-Dues */}
      <Section title={`No-Dues (${duesCleared}/${noDues.length})`} icon={Award}>
        {noDues.length === 0 ? <p className="text-[12px] text-mute">No entries.</p> : (
          <table className="w-full text-[12px]">
            <thead><tr className="text-left text-mute border-b border-hairline"><th className="py-1 font-medium">Department</th><th className="py-1 font-medium">Amount</th><th className="py-1 font-medium">Status</th></tr></thead>
            <tbody>
              {noDues.map((d: any) => (
                <tr key={d.id} className="border-b border-hairline last:border-0">
                  <td className="py-1">{d.department}</td>
                  <td className="py-1">₹{Number(d.amount).toLocaleString('en-IN')}</td>
                  <td className="py-1">{d.is_cleared ? <Badge className="bg-success-soft text-success">Cleared</Badge> : <Badge className="bg-warning-soft text-warning-deep">Pending</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* Letters */}
      <Section title="Letters Issued" icon={FileText}>
        {letters.length === 0 ? <p className="text-[12px] text-mute">No letters issued.</p> : (
          <div className="space-y-2">
            {letters.map((l: any) => (
              <div key={l.id} className="border border-hairline rounded-sm p-2 text-[12px]">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Badge className={l.letter_type === 'experience' ? 'bg-link-soft text-link-deep' : 'bg-success-soft text-success'}>{l.letter_type === 'experience' ? 'Experience Certificate' : 'Relieving Letter'}</Badge>
                    <span className="text-mute">{dateShort(l.letter_date)}</span>
                  </div>
                </div>
                <pre className="text-[11px] text-body whitespace-pre-wrap font-sans">{l.letter_body}</pre>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Settlement */}
      {sep.settlement && (
        <Section title="Full & Final Settlement" icon={Award}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px]">
            <div><span className="text-mute">Exit Date:</span> {dateShort(sep.settlement.exit_date)}</div>
            <div><span className="text-mute">Unpaid Days:</span> {sep.settlement.unpaid_days}</div>
            <div><span className="text-mute">Encash Days:</span> {sep.settlement.encash_days}</div>
            <div><span className="text-mute">Net Payable:</span> <span className="font-medium">₹{Number(sep.settlement.net_payable).toLocaleString('en-IN')}</span></div>
            <div><span className="text-mute">Status:</span> <Badge className={sep.settlement.status === 'paid' ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning-deep'}>{sep.settlement.status}</Badge></div>
          </div>
        </Section>
      )}
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5 text-mute" />
        <h3 className="text-[13px] font-medium text-ink">{title}</h3>
      </div>
      <div className="pl-5">{children}</div>
    </div>
  )
}

function RatingStars({ val }: { val: number | null }) {
  if (!val) return <span className="text-mute">—</span>
  return <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map(s => <Star key={s} className={`w-3 h-3 ${s <= val ? 'text-gold fill-gold' : 'text-hairline'}`} />)}</div>
}
