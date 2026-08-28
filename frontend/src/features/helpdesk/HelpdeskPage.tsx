import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { helpdeskApi } from '@/services/api'
import { Button, Input, Textarea, Select } from '@/components/ui/fields'
import { Table, Badge, Tabs } from '@/components/ui/data'
import { PageHeader, LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { Modal } from '@/components/ui/overlay'
import { fullName, dateShort } from '@/utils/format'
import { toast } from 'sonner'
import { Plus, Search, MessageSquare, Clock, CheckCircle, AlertTriangle, Send, UserCheck, Shield } from 'lucide-react'

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
]

const CATEGORY_LABELS: Record<string, string> = {
  salary_issue: 'Salary Issue', attendance_issue: 'Attendance Issue', pf_esi_issue: 'PF/ESI Issue',
  leave_issue: 'Leave Issue', document_request: 'Document Request', id_card_request: 'ID Card Request', other: 'Other',
}
const CATEGORY_COLORS: Record<string, string> = {
  salary_issue: 'bg-warning-soft text-warning-deep', attendance_issue: 'bg-link-soft text-link-deep',
  pf_esi_issue: 'bg-error-soft text-error-deep', leave_issue: 'bg-success-soft text-success',
  document_request: 'bg-canvas-soft-2 text-body', id_card_request: 'bg-canvas-soft-2 text-body', other: 'bg-canvas-soft-2 text-mute',
}
const PRIORITY_COLORS: Record<string, string> = { low: 'bg-canvas-soft-2 text-mute', medium: 'bg-warning-soft text-warning-deep', high: 'bg-error-soft text-error-deep', urgent: 'bg-error text-white' }
const STATUS_COLORS: Record<string, string> = { open: 'bg-link-soft text-link-deep', in_progress: 'bg-warning-soft text-warning-deep', resolved: 'bg-success-soft text-success', closed: 'bg-canvas-soft-2 text-mute', rejected: 'bg-error-soft text-error-deep' }

export default function HelpdeskPage() {
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [detailFor, setDetailFor] = useState<any>(null)
  const [form, setForm] = useState({ employee_id: '', subject: '', message: '', category: 'other', priority: 'medium' })
  const qc = useQueryClient()

  const { data: summary } = useQuery({ queryKey: ['hd-summary'], queryFn: () => helpdeskApi.summary() })
  const params: Record<string, string> = {}
  if (tab !== 'all') params.status = tab
  if (catFilter) params.category = catFilter
  if (search) params.search = search

  const { data: reqData, isLoading, error, refetch } = useQuery({ queryKey: ['helpdesk', params], queryFn: () => helpdeskApi.list(params) })

  const createMut = useMutation({
    mutationFn: () => helpdeskApi.create({ ...form, employee_id: Number(form.employee_id) }),
    onSuccess: () => { setShowForm(false); qc.invalidateQueries({ queryKey: ['helpdesk'] }); qc.invalidateQueries({ queryKey: ['hd-summary'] }); toast.success('Request created.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })

  return (
    <div>
      <PageHeader title="HR Helpdesk" subtitle="Employee requests & issue tracking" actions={<Button onClick={() => { setForm({ employee_id: '', subject: '', message: '', category: 'other', priority: 'medium' }); setShowForm(true) }}><Plus className="w-3.5 h-3.5" /> New Request</Button>} />

      {summary?.data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
          {[
            { label: 'Open', value: summary.data.open, color: 'text-link-deep' },
            { label: 'In Progress', value: summary.data.in_progress, color: 'text-warning-deep' },
            { label: 'Resolved', value: summary.data.resolved, color: 'text-success' },
            { label: 'Urgent', value: summary.data.urgent, color: 'text-error' },
            { label: 'This Week', value: summary.data.this_week },
          ].map((s, i) => (
            <div key={i} className="bg-white card-shadow rounded-md p-3">
              <p className="text-[11px] text-mute">{s.label}</p>
              <p className={`text-[18px] font-semibold ${s.color || 'text-ink'}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-mute" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search requests..." className="w-full h-9 pl-8 pr-3 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink" />
        </div>
        <Select options={[{ value: '', label: 'All Categories' }, ...Object.entries(CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l }))]} value={catFilter} onChange={e => setCatFilter(e.target.value)} className="w-full sm:w-44" />
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      <div className="bg-white card-shadow rounded-md p-4 mt-4">
        {isLoading ? <LoadingState /> :
         error ? <PageError onRetry={() => refetch()} /> :
         (reqData?.data || []).length === 0 ? <EmptyState title="No requests" description="Employee HR helpdesk requests will appear here." /> : (
          <Table
            columns={[
              { key: 'id', header: '#', className: 'text-[11px] text-mute w-10', render: (r: any) => <span className="font-mono">#{r.id}</span> },
              { key: 'employee', header: 'Employee', render: (r: any) => <div><p className="text-[13px] font-medium text-ink">{fullName(r.first_name, r.last_name)}</p><p className="text-[11px] text-mute">{r.employee_code}</p></div> },
              { key: 'subject', header: 'Subject', render: (r: any) => <div><p className="text-[13px] text-ink">{r.subject}</p><p className="text-[11px] text-mute truncate max-w-[200px]">{r.message}</p></div> },
              { key: 'category', header: 'Category', render: (r: any) => <Badge className={CATEGORY_COLORS[r.category] || ''}>{CATEGORY_LABELS[r.category] || r.category}</Badge> },
              { key: 'priority', header: 'Priority', render: (r: any) => <Badge className={PRIORITY_COLORS[r.priority] || ''}>{r.priority}</Badge> },
              { key: 'workflow', header: 'Workflow', render: (r: any) => (
                <div className="flex items-center gap-1 text-[10px]">
                  <Badge className={r.manager_status === 'approved' ? 'bg-success-soft text-success' : r.manager_status === 'rejected' ? 'bg-error-soft text-error-deep' : 'bg-canvas-soft-2 text-mute'}>Mgr</Badge>
                  <span className="text-mute">→</span>
                  <Badge className={r.hr_status === 'approved' ? 'bg-success-soft text-success' : r.hr_status === 'rejected' ? 'bg-error-soft text-error-deep' : 'bg-canvas-soft-2 text-mute'}>HR</Badge>
                  <span className="text-mute">→</span>
                  <Badge className={STATUS_COLORS[r.status] || ''}>{r.status}</Badge>
                </div>
              )},
              { key: 'actions', header: '', render: (r: any) => <button onClick={() => setDetailFor(r)} className="px-1.5 py-0.5 text-[11px] text-link hover:bg-link-soft rounded-xs">View</button> },
            ]}
            data={reqData?.data || []}
            keyFn={(r: any) => String(r.id)}
            emptyMessage="No requests found."
          />
        )}
      </div>

      {/* Create Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="New HR Request" size="md">
        <div className="space-y-3">
          <Select label="Category" options={Object.entries(CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l }))} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
          <Select label="Priority" options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' }]} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} />
          <Input label="Subject" placeholder="Brief description of your issue" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
          <Textarea label="Details" placeholder="Provide more details about your request..." value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button loading={createMut.isPending} onClick={() => createMut.mutate()}>Submit</Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!detailFor} onClose={() => setDetailFor(null)} title={`Request #${detailFor?.id || ''}`} size="lg">
        {detailFor && <HelpdeskDetailView requestId={detailFor.id} />}
      </Modal>
    </div>
  )
}

function HelpdeskDetailView({ requestId }: { requestId: number }) {
  const [commentText, setCommentText] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const { data, isLoading, refetch } = useQuery({ queryKey: ['helpdesk-detail', requestId], queryFn: () => helpdeskApi.get(requestId) })
  const qc = useQueryClient()

  const mgrApproveMut = useMutation({
    mutationFn: (action: 'approve' | 'reject') => helpdeskApi.managerReview(requestId, { action, remarks: `Reviewed by manager` }),
    onSuccess: () => { refetch(); qc.invalidateQueries({ queryKey: ['helpdesk'] }); toast.success('Manager reviewed.') },
  })
  const hrApproveMut = useMutation({
    mutationFn: (action: 'approve' | 'reject') => helpdeskApi.hrReview(requestId, { action, remarks: `Reviewed by HR` }),
    onSuccess: () => { refetch(); qc.invalidateQueries({ queryKey: ['helpdesk'] }); toast.success('HR reviewed.') },
  })
  const actionMut = useMutation({
    mutationFn: (notes: string) => helpdeskApi.takeAction(requestId, { action_notes: notes, status: 'resolved' }),
    onSuccess: () => { refetch(); qc.invalidateQueries({ queryKey: ['helpdesk'] }); qc.invalidateQueries({ queryKey: ['hd-summary'] }); toast.success('Request resolved.') },
  })
  const commentMut = useMutation({
    mutationFn: () => helpdeskApi.addComment(requestId, { comment: commentText, is_internal: isInternal }),
    onSuccess: () => { setCommentText(''); refetch(); toast.success('Comment added.') },
  })

  if (isLoading) return <LoadingState />
  const req = data?.data as any
  if (!req) return null
  const comments = req.comments || []

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto">
      {/* Basic Info */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px]">
        <div><span className="text-mute">Employee:</span> <span className="font-medium">{fullName(req.first_name, req.last_name)}</span></div>
        <div><span className="text-mute">Code:</span> {req.employee_code}</div>
        <div><span className="text-mute">Category:</span> <Badge className={CATEGORY_COLORS[req.category]}>{CATEGORY_LABELS[req.category]}</Badge></div>
        <div><span className="text-mute">Priority:</span> <Badge className={PRIORITY_COLORS[req.priority]}>{req.priority}</Badge></div>
        <div className="col-span-2"><span className="text-mute">Subject:</span> <span className="font-medium text-ink">{req.subject}</span></div>
        <div className="col-span-2"><span className="text-mute">Created:</span> {dateShort(req.created_at)}</div>
      </div>
      {req.message && <p className="text-[13px] text-body bg-canvas-soft p-3 rounded-sm">{req.message}</p>}

      {/* Workflow Actions */}
      <div className="border border-hairline rounded-sm p-3 space-y-3">
        <h4 className="text-[13px] font-medium text-ink flex items-center gap-2"><Shield className="w-3.5 h-3.5" /> Approval Workflow</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Manager */}
          <div className="text-center p-2 border border-hairline rounded-sm">
            <p className="text-[11px] text-mute mb-1">Manager</p>
            <Badge className={req.manager_status === 'approved' ? 'bg-success-soft text-success' : req.manager_status === 'rejected' ? 'bg-error-soft text-error-deep' : 'bg-canvas-soft-2 text-mute'}>
              {req.manager_status}
            </Badge>
            {req.manager_status === 'pending' && (
              <div className="flex gap-1 justify-center mt-2">
                <Button size="sm" onClick={() => mgrApproveMut.mutate('approve')} loading={mgrApproveMut.isPending}>Approve</Button>
                <Button size="sm" variant="secondary" onClick={() => mgrApproveMut.mutate('reject')} loading={mgrApproveMut.isPending}>Reject</Button>
              </div>
            )}
            {req.manager_by && <p className="text-[10px] text-mute mt-1">{req.manager_by}</p>}
          </div>
          {/* HR */}
          <div className="text-center p-2 border border-hairline rounded-sm">
            <p className="text-[11px] text-mute mb-1">HR</p>
            <Badge className={req.hr_status === 'approved' ? 'bg-success-soft text-success' : req.hr_status === 'rejected' ? 'bg-error-soft text-error-deep' : 'bg-canvas-soft-2 text-mute'}>
              {req.hr_status}
            </Badge>
            {req.hr_status === 'pending' && req.manager_status === 'approved' && (
              <div className="flex gap-1 justify-center mt-2">
                <Button size="sm" onClick={() => hrApproveMut.mutate('approve')} loading={hrApproveMut.isPending}>Approve</Button>
                <Button size="sm" variant="secondary" onClick={() => hrApproveMut.mutate('reject')} loading={hrApproveMut.isPending}>Reject</Button>
              </div>
            )}
            {req.hr_by && <p className="text-[10px] text-mute mt-1">{req.hr_by}</p>}
          </div>
          {/* Action / Close */}
          <div className="text-center p-2 border border-hairline rounded-sm">
            <p className="text-[11px] text-mute mb-1">Status</p>
            <Badge className={STATUS_COLORS[req.status] || ''}>{req.status}</Badge>
            {req.action_notes && <p className="text-[11px] text-body mt-1">{req.action_notes}</p>}
            {req.action_by && <p className="text-[10px] text-mute mt-1">by {req.action_by}</p>}
          </div>
        </div>
      </div>

      {/* Quick Resolve */}
      {req.status === 'open' || req.status === 'in_progress' ? (
        <QuickResolve onResolve={(notes) => actionMut.mutate(notes)} loading={actionMut.isPending} />
      ) : null}

      {/* Comments */}
      <div>
        <h4 className="text-[13px] font-medium text-ink mb-2 flex items-center gap-2"><MessageSquare className="w-3.5 h-3.5" /> Comments ({comments.length})</h4>
        <div className="space-y-2 max-h-[30vh] overflow-y-auto mb-3">
          {comments.length === 0 && <p className="text-[12px] text-mute">No comments yet.</p>}
          {comments.map((c: any) => (
            <div key={c.id} className={`p-2 rounded-sm text-[12px] ${c.is_internal ? 'bg-warning-soft/30 border-l-2 border-warning' : 'bg-canvas-soft'}`}>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-medium text-ink">{c.comment_by}</span>
                <span className="text-mute">{dateShort(c.created_at)}</span>
                {c.is_internal && <Badge className="bg-warning-soft text-warning-deep text-[10px]">Internal</Badge>}
              </div>
              <p className="text-body">{c.comment}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="text" value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Add a comment..." className="flex-1 h-8 px-2.5 text-[12px] bg-white border border-hairline rounded-sm outline-none focus:border-ink" onKeyDown={e => e.key === 'Enter' && commentText.trim() && commentMut.mutate()} />
          <label className="flex items-center gap-1 text-[11px] text-mute cursor-pointer">
            <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} className="w-3 h-3 accent-black" /> Internal
          </label>
          <Button size="sm" loading={commentMut.isPending} onClick={() => commentText.trim() && commentMut.mutate()} disabled={!commentText.trim()}><Send className="w-3 h-3" /></Button>
        </div>
      </div>
    </div>
  )
}

function QuickResolve({ onResolve, loading }: { onResolve: (notes: string) => void; loading: boolean }) {
  const [notes, setNotes] = useState('')
  return (
    <div className="border border-hairline rounded-sm p-3 space-y-2">
      <p className="text-[13px] font-medium text-ink flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-success" /> Take Action / Resolve</p>
      <Textarea placeholder="Describe the action taken or resolution notes..." value={notes} onChange={e => setNotes(e.target.value)} />
      <div className="flex justify-end">
        <Button size="sm" loading={loading} onClick={() => { onResolve(notes); setNotes('') }} disabled={!notes.trim()}>Mark Resolved</Button>
      </div>
    </div>
  )
}
