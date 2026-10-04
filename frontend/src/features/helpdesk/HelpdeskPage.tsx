import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { helpdeskApi } from '@/services/api'
import { Button, Input, Textarea, Select } from '@/components/ui/fields'
import { Table, Badge, Tabs } from '@/components/ui/data'
import { PageHeader, LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { Modal } from '@/components/ui/overlay'
import { fullName, dateShort } from '@/utils/format'
import { toast } from 'sonner'
import {
  Plus, Search, MessageSquare, Clock, CheckCircle2, AlertTriangle, Send,
  UserCheck, Shield, HelpCircle, ArrowRight, CornerDownRight, Sparkles, Filter
} from 'lucide-react'

const TABS = [
  { key: 'all', label: 'All Tickets' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
]

const CATEGORY_LABELS: Record<string, string> = {
  salary_issue: 'Salary Issue',
  attendance_issue: 'Attendance Issue',
  pf_esi_issue: 'PF / ESI Issue',
  leave_issue: 'Leave Dispute',
  document_request: 'Document Request',
  id_card_request: 'ID Card Re-issue',
  other: 'General Query',
}

const CATEGORY_COLORS: Record<string, string> = {
  salary_issue: 'bg-amber-50 text-amber-700 border-amber-200',
  attendance_issue: 'bg-blue-50 text-blue-700 border-blue-200',
  pf_esi_issue: 'bg-rose-50 text-rose-700 border-rose-200',
  leave_issue: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  document_request: 'bg-purple-50 text-purple-700 border-purple-200',
  id_card_request: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  other: 'bg-slate-100 text-slate-700 border-slate-200',
}

const PRIORITY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  low: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  medium: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  high: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  urgent: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
}

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  open: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  in_progress: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  resolved: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  closed: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  rejected: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
}

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
    onSuccess: () => { setShowForm(false); qc.invalidateQueries({ queryKey: ['helpdesk'] }); qc.invalidateQueries({ queryKey: ['hd-summary'] }); toast.success('Ticket submitted successfully.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <HelpCircle className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">HR Helpdesk & Issue Resolution</h1>
          </div>
          <p className="text-xs text-slate-500">Employee grievance management, automated dual approval flows & SLAs</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => { setForm({ employee_id: '', subject: '', message: '', category: 'other', priority: 'medium' }); setShowForm(true) }}
            className="shadow-sm hover:shadow transition-all"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Raise New Ticket
          </Button>
        </div>
      </div>

      {/* Top Stat Cards */}
      {summary?.data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { label: 'Open Tickets', value: summary.data.open, gradient: 'from-blue-600 to-indigo-600' },
            { label: 'Under Review', value: summary.data.in_progress, gradient: 'from-amber-500 to-orange-500' },
            { label: 'Resolved Tickets', value: summary.data.resolved, gradient: 'from-emerald-600 to-teal-600' },
            { label: 'Urgent Priority', value: summary.data.urgent, gradient: 'from-rose-600 to-red-600' },
            { label: 'Logged This Week', value: summary.data.this_week, gradient: 'from-purple-600 to-pink-600' },
          ].map((s, i) => (
            <div key={i} className="relative overflow-hidden bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500">{s.label}</span>
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-white shadow-sm`}>
                  <MessageSquare className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 tracking-tight">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter and Tab Section */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <div className="w-full sm:w-72 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search ticket subject, employee or ID..."
                className="w-full h-10 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-colors text-slate-800"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                options={[{ value: '', label: 'All Categories' }, ...Object.entries(CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l }))]}
                value={catFilter}
                onChange={e => setCatFilter(e.target.value)}
              />
            </div>
            {(search || catFilter) && (
              <button
                onClick={() => { setSearch(''); setCatFilter('') }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100">
          <Tabs tabs={TABS} active={tab} onChange={setTab} />
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        {isLoading ? (
          <div className="p-8"><LoadingState /></div>
        ) : error ? (
          <div className="p-8"><PageError onRetry={() => refetch()} /></div>
        ) : (reqData?.data || []).length === 0 ? (
          <div className="p-8"><EmptyState title="No Tickets Found" description="Employee grievance and support requests will be listed here." action={<Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1.5" /> Raise Ticket</Button>} /></div>
        ) : (
          <Table
            columns={[
              { key: 'id', header: 'ID', className: 'text-xs font-mono text-slate-400 w-12', render: (r: any) => <span>#{r.id}</span> },
              { key: 'employee', header: 'Raised By', render: (r: any) => (
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-700">
                    {r.first_name?.[0]}{r.last_name?.[0]}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{fullName(r.first_name, r.last_name)}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{r.employee_code}</p>
                  </div>
                </div>
              ) },
              { key: 'subject', header: 'Subject & Inquiry', render: (r: any) => (
                <div>
                  <p className="text-xs font-semibold text-slate-900">{r.subject}</p>
                  <p className="text-xs text-slate-500 line-clamp-1 max-w-[280px]">{r.message || '—'}</p>
                </div>
              ) },
              { key: 'category', header: 'Category', render: (r: any) => (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${CATEGORY_COLORS[r.category] || CATEGORY_COLORS.other}`}>
                  {CATEGORY_LABELS[r.category] || r.category}
                </span>
              ) },
              { key: 'priority', header: 'Priority', render: (r: any) => {
                const p = PRIORITY_COLORS[r.priority] || PRIORITY_COLORS.medium
                return (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider ${p.bg} ${p.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
                    {r.priority}
                  </span>
                )
              } },
              { key: 'workflow', header: 'Approval Chain', render: (r: any) => (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${r.manager_status === 'approved' ? 'bg-emerald-50 text-emerald-700' : r.manager_status === 'rejected' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>
                    Mgr
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-300" />
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${r.hr_status === 'approved' ? 'bg-emerald-50 text-emerald-700' : r.hr_status === 'rejected' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>
                    HR
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-300" />
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLORS[r.status]?.bg || 'bg-slate-100'} ${STATUS_COLORS[r.status]?.text || 'text-slate-600'}`}>
                    {r.status}
                  </span>
                </div>
              ) },
              { key: 'actions', header: '', render: (r: any) => (
                <button onClick={() => setDetailFor(r)} className="px-2.5 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
                  Open Ticket
                </button>
              ) },
            ]}
            data={reqData?.data || []}
            keyFn={(r: any) => String(r.id)}
          />
        )}
      </div>

      {/* Create Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Log Helpdesk Inquiry" size="md">
        <div className="space-y-4 pt-1">
          <Select label="Inquiry Category" options={Object.entries(CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l }))} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
          <Select label="Priority Level" options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' }]} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} />
          <Input label="Summary Subject" placeholder="e.g. Discrepancy in overtime computation" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
          <Textarea label="Detailed Description" placeholder="Explain the grievance, date of occurrence, or documentation required..." value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button loading={createMut.isPending} onClick={() => createMut.mutate()}>Submit Ticket</Button>
          </div>
        </div>
      </Modal>

      {/* Ticket Detail Modal */}
      <Modal open={!!detailFor} onClose={() => setDetailFor(null)} title={`Ticket Case #${detailFor?.id || ''}`} size="lg">
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
    onSuccess: () => { refetch(); qc.invalidateQueries({ queryKey: ['helpdesk'] }); toast.success('Manager review recorded.') },
  })
  const hrApproveMut = useMutation({
    mutationFn: (action: 'approve' | 'reject') => helpdeskApi.hrReview(requestId, { action, remarks: `Reviewed by HR` }),
    onSuccess: () => { refetch(); qc.invalidateQueries({ queryKey: ['helpdesk'] }); toast.success('HR review recorded.') },
  })
  const actionMut = useMutation({
    mutationFn: (notes: string) => helpdeskApi.takeAction(requestId, { action_notes: notes, status: 'resolved' }),
    onSuccess: () => { refetch(); qc.invalidateQueries({ queryKey: ['helpdesk'] }); qc.invalidateQueries({ queryKey: ['hd-summary'] }); toast.success('Ticket marked as resolved.') },
  })
  const commentMut = useMutation({
    mutationFn: () => helpdeskApi.addComment(requestId, { comment: commentText, is_internal: isInternal }),
    onSuccess: () => { setCommentText(''); refetch(); toast.success('Note appended.') },
  })

  if (isLoading) return <div className="p-6"><LoadingState /></div>
  const req = data?.data as any
  if (!req) return null
  const comments = req.comments || []

  return (
    <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
      {/* Header Info Card */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-mono text-slate-400">Case #{req.id}</span>
            <h3 className="text-sm font-bold text-slate-900">{req.subject}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${CATEGORY_COLORS[req.category] || CATEGORY_COLORS.other}`}>
              {CATEGORY_LABELS[req.category] || req.category}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase ${PRIORITY_COLORS[req.priority]?.bg} ${PRIORITY_COLORS[req.priority]?.text}`}>
              {req.priority}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2 border-t border-slate-200/60">
          <div><span className="text-slate-500 block">Employee:</span> <span className="font-semibold text-slate-800">{fullName(req.first_name, req.last_name)}</span></div>
          <div><span className="text-slate-500 block">Employee Code:</span> <span className="font-mono text-slate-700">{req.employee_code}</span></div>
          <div><span className="text-slate-500 block">Submission Date:</span> <span className="text-slate-700">{dateShort(req.created_at)}</span></div>
          <div><span className="text-slate-500 block">Status:</span> <span className="font-semibold text-indigo-700 capitalize">{req.status}</span></div>
        </div>
      </div>

      {req.message && (
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Employee Note</span>
          <p className="text-xs text-slate-800 leading-relaxed">{req.message}</p>
        </div>
      )}

      {/* Dual Workflow Card */}
      <div className="border border-slate-200/80 rounded-2xl p-4 bg-white space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-indigo-50 text-indigo-600 rounded-md">
            <Shield className="w-3.5 h-3.5" />
          </div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Resolution Approval Pathway</h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Manager Step */}
          <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2 text-center">
            <p className="text-xs font-semibold text-slate-600">1. Line Manager</p>
            <div>
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${req.manager_status === 'approved' ? 'bg-emerald-50 text-emerald-700' : req.manager_status === 'rejected' ? 'bg-rose-50 text-rose-700' : 'bg-slate-200 text-slate-600'}`}>
                {req.manager_status}
              </span>
            </div>
            {req.manager_status === 'pending' && (
              <div className="flex items-center justify-center gap-1.5 pt-1">
                <Button size="sm" onClick={() => mgrApproveMut.mutate('approve')} loading={mgrApproveMut.isPending}>Approve</Button>
                <Button size="sm" variant="secondary" onClick={() => mgrApproveMut.mutate('reject')} loading={mgrApproveMut.isPending}>Reject</Button>
              </div>
            )}
            {req.manager_by && <p className="text-[10px] text-slate-400">by {req.manager_by}</p>}
          </div>

          {/* HR Step */}
          <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2 text-center">
            <p className="text-xs font-semibold text-slate-600">2. HR Operations</p>
            <div>
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${req.hr_status === 'approved' ? 'bg-emerald-50 text-emerald-700' : req.hr_status === 'rejected' ? 'bg-rose-50 text-rose-700' : 'bg-slate-200 text-slate-600'}`}>
                {req.hr_status}
              </span>
            </div>
            {req.hr_status === 'pending' && req.manager_status === 'approved' && (
              <div className="flex items-center justify-center gap-1.5 pt-1">
                <Button size="sm" onClick={() => hrApproveMut.mutate('approve')} loading={hrApproveMut.isPending}>Approve</Button>
                <Button size="sm" variant="secondary" onClick={() => hrApproveMut.mutate('reject')} loading={hrApproveMut.isPending}>Reject</Button>
              </div>
            )}
            {req.hr_by && <p className="text-[10px] text-slate-400">by {req.hr_by}</p>}
          </div>

          {/* Action Step */}
          <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2 text-center">
            <p className="text-xs font-semibold text-slate-600">3. Final Status</p>
            <div>
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[req.status]?.bg || 'bg-slate-100'} ${STATUS_COLORS[req.status]?.text || 'text-slate-600'}`}>
                {req.status}
              </span>
            </div>
            {req.action_notes && <p className="text-xs text-slate-700 line-clamp-2">{req.action_notes}</p>}
            {req.action_by && <p className="text-[10px] text-slate-400">by {req.action_by}</p>}
          </div>
        </div>
      </div>

      {/* Quick Action Box */}
      {(req.status === 'open' || req.status === 'in_progress') && (
        <QuickResolve onResolve={(notes) => actionMut.mutate(notes)} loading={actionMut.isPending} />
      )}

      {/* Comments Thread */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-indigo-600" /> Resolution Log & Comments ({comments.length})
        </h4>

        <div className="space-y-2.5 max-h-[30vh] overflow-y-auto">
          {comments.length === 0 && <p className="text-xs text-slate-400 italic">No notes logged yet.</p>}
          {comments.map((c: any) => (
            <div key={c.id} className={`p-3 rounded-xl text-xs space-y-1 ${c.is_internal ? 'bg-amber-50/60 border border-amber-200/80' : 'bg-slate-50 border border-slate-200/60'}`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">{c.comment_by}</span>
                <div className="flex items-center gap-2">
                  {c.is_internal && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wider">Internal Note</span>}
                  <span className="text-[10px] text-slate-400">{dateShort(c.created_at)}</span>
                </div>
              </div>
              <p className="text-slate-700 leading-relaxed">{c.comment}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="text"
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            placeholder="Type comment or case note..."
            className="flex-1 h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-colors"
            onKeyDown={e => e.key === 'Enter' && commentText.trim() && commentMut.mutate()}
          />
          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer px-2">
            <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600 rounded" />
            <span>Internal</span>
          </label>
          <Button size="sm" loading={commentMut.isPending} onClick={() => commentText.trim() && commentMut.mutate()} disabled={!commentText.trim()}>
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function QuickResolve({ onResolve, loading }: { onResolve: (notes: string) => void; loading: boolean }) {
  const [notes, setNotes] = useState('')
  return (
    <div className="border border-emerald-200 bg-emerald-50/30 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Resolve & Close Ticket</span>
      </div>
      <Textarea placeholder="Document the remediation steps taken or resolution summary..." value={notes} onChange={e => setNotes(e.target.value)} />
      <div className="flex justify-end">
        <Button size="sm" loading={loading} onClick={() => { onResolve(notes); setNotes('') }} disabled={!notes.trim()}>
          Mark Case Resolved
        </Button>
      </div>
    </div>
  )
}
