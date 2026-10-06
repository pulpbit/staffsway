import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { referrerApi, siteApi, type ReferrerRow, type ReferrerApplication } from '@/services/api'
import { Button, Input, Select, Textarea, FormSection, FormGrid } from '@/components/ui/fields'
import { Table, Badge, Tabs } from '@/components/ui/data'
import { Modal, ConfirmDialog } from '@/components/ui/overlay'
import { PageHeader, LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { FieldErrorsDialog, useFormValidation, type FieldRule } from '@/components/ui/validation'
import { SearchInput, SelectFilter, Toolbar } from '@/components/ui/actions'
import { DetailGrid, InfoRow, Metric, SectionCard } from '@/components/ui/layout'
import { toast } from 'sonner'
import { dateDMY } from '@/utils/format'
import {
  UserCheck, ClipboardList, CheckCircle2, XCircle, Plus, Trash2, Eye, Users, Phone, MapPin, Banknote, Fingerprint,
  Briefcase, ShieldCheck, Share2, Sparkles, AlertCircle
} from 'lucide-react'

const PAGE_TABS = [
  { key: 'registrations', label: 'Candidate Registrations' },
  { key: 'referrers', label: 'Referrer Directory' },
]

const APP_STATUS: Record<string, { bg: string; text: string; dot: string }> = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  rejected: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
}
const appLabel = (s: string) => ({ pending: 'Pending Review', approved: 'Approved', rejected: 'Rejected' } as Record<string, string>)[s] || s

const EMP_TYPES = [
  { value: 'contract', label: 'Contractual' },
  { value: 'daily_wages', label: 'Daily Wages' },
  { value: 'permanent', label: 'Permanent Full-Time' },
]
const SHIFTS = ['General', 'Morning', 'Evening', 'Night', 'Rotational', 'Split']
const YES_NO = [{ value: '1', label: 'Applicable' }, { value: '0', label: 'Not applicable' }]

const emptyReferrer = {
  name: '', referrer_code: '', contact_person: '', phone: '', email: '', status: 'active',
}

const REFERRER_RULES: FieldRule[] = [
  { key: 'name', label: 'Referrer / Partner Name', required: true },
  {
    key: 'email',
    label: 'Email Address',
    test: (v) =>
      v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim()) ? 'Enter a valid email address.' : null,
  },
  { key: 'phone', label: 'Phone Number', test: (v) => (String(v ?? '').trim().length > 20 ? 'Phone must be 20 characters or fewer.' : null) },
  { key: 'contact_person', label: 'Contact Person', test: (v) => (String(v ?? '').trim().length > 191 ? 'Contact person must be 191 characters or fewer.' : null) },
]

/**
 * Database rows carry NULL for optional contacts. Spreading those straight into
 * the form sent `email: null` to referrerSchema, which is a string schema - the
 * save failed with "Please correct the highlighted fields." while nothing in the
 * form was highlighted, so switching a referrer back to Active looked broken.
 */
const referrerFormFrom = (r: Partial<ReferrerRow>) => ({
  ...emptyReferrer,
  ...r,
  referrer_code: r.referrer_code ?? '',
  contact_person: r.contact_person ?? '',
  phone: r.phone ?? '',
  email: r.email ?? '',
  status: r.status ?? 'active',
})

const emptyApproveForm = () => ({
  joining_date: new Date().toISOString().slice(0, 10), site_id: '', designation: '', department: '',
  employee_type: 'contract', shift_type: 'General', basic: '', hra: '', conveyance: '', other_allowance: '',
  other_allowance_label: '', working_hours: '8', grade: '', reporting_manager: '',
  pf_applicable: true, esi_applicable: true, pt_applicable: true,
})

const fmtDate = (v?: string | null) => dateDMY(v)

export default function ReferrerApplicationsPage() {
  const [tab, setTab] = useState('registrations')
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [referrerFilter, setReferrerFilter] = useState('')

  const [showReferrer, setShowReferrer] = useState(false)
  const [editReferrer, setEditReferrer] = useState<ReferrerRow | null>(null)
  const [referrerForm, setReferrerForm] = useState({ ...emptyReferrer })
  const [confirmDelete, setConfirmDelete] = useState<ReferrerRow | null>(null)
  const { errors, validate, applyServerErrors, clear, clearAll, invalidLabels, popupOpen, closePopup } = useFormValidation()

  const [viewApp, setViewApp] = useState<ReferrerApplication | null>(null)
  const [approveFor, setApproveFor] = useState<ReferrerApplication | null>(null)
  const [rejectFor, setRejectFor] = useState<ReferrerApplication | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [approveForm, setApproveForm] = useState(emptyApproveForm())

  const appQuery = useQuery({
    queryKey: ['referrer-applications', statusFilter, referrerFilter, search],
    queryFn: () =>
      referrerApi
        .applications({
          ...(statusFilter ? { status: statusFilter } : {}),
          ...(referrerFilter ? { referrer_id: referrerFilter } : {}),
          ...(search ? { search } : {}),
        })
        .then((r) => r.data),
  })

  const refQuery = useQuery({
    queryKey: ['referrers', search],
    queryFn: () => referrerApi.list(search ? { search } : {}).then((r) => r.data),
  })

  const { data: allSites } = useQuery({ queryKey: ['sites-select'], queryFn: () => siteApi.list() })
  const sites = (allSites?.data || []) as any[]

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['referrer-applications'] })
    qc.invalidateQueries({ queryKey: ['referrers'] })
    qc.invalidateQueries({ queryKey: ['public-referrers'] })
  }

  const saveReferrer = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      editReferrer ? referrerApi.update(editReferrer.id, body) : referrerApi.create(body),
    onSuccess: () => { invalidate(); clearAll(); setShowReferrer(false); setEditReferrer(null); toast.success(editReferrer ? 'Referrer updated.' : 'Referrer added.') },
    onError: (err: any) => {
      if (err?.error?.fields) { applyServerErrors(err.error.fields); toast.error('Please correct the highlighted fields.') }
      else toast.error(err?.error?.message || 'Could not save the referrer.')
    },
  })

  const deleteReferrer = useMutation({
    mutationFn: (id: number) => referrerApi.deactivate(id),
    onSuccess: () => { invalidate(); setConfirmDelete(null); toast.success('Referrer deleted.') },
    onError: (err: any) => { setConfirmDelete(null); toast.error(err?.error?.message || 'Could not delete the referrer.') },
  })

  // One-click activate/deactivate. Only the status field is sent, so the rest of
  // the referrer row is left exactly as it is.
  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'active' | 'inactive' }) => referrerApi.update(id, { status }),
    onSuccess: () => { invalidate(); toast.success('Referrer status updated.') },
    onError: (err: any) => toast.error(err?.error?.message || 'Could not update the referrer status.'),
  })

  const approve = useMutation({
    mutationFn: (body: Record<string, unknown>) => referrerApi.approve(approveFor!.id, body),
    onSuccess: (res) => {
      invalidate()
      qc.invalidateQueries({ queryKey: ['employees'] })
      qc.invalidateQueries({ queryKey: ['employees-all'] })
      setApproveFor(null)
      toast.success(res.message || 'Registration approved and employee onboarded.')
    },
    onError: (err: any) => toast.error(err?.error?.message || 'Could not approve this registration.'),
  })

  const reject = useMutation({
    mutationFn: (body: { reason: string }) => referrerApi.reject(rejectFor!.id, body.reason),
    onSuccess: () => { invalidate(); setRejectFor(null); setRejectReason(''); toast.success('Registration rejected.') },
    onError: (err: any) => toast.error(err?.error?.message || 'Could not reject this registration.'),
  })

  const openApprove = (a: ReferrerApplication) => {
    setApproveFor(a)
    setApproveForm(emptyApproveForm())
  }

  const submitApprove = () => {
    if (!approveForm.joining_date) { toast.error('Enter the joining date.'); return }
    if (!approveForm.site_id) { toast.error('Select a deployment site.'); return }
    if (!approveForm.designation.trim()) { toast.error('Enter a designation.'); return }
    if (!approveForm.basic || Number(approveForm.basic) <= 0) { toast.error('Enter a basic salary greater than zero.'); return }
    const numeric = (v: string) => (v === '' ? 0 : Number(v))
    approve.mutate({
      joining_date: approveForm.joining_date,
      site_id: Number(approveForm.site_id),
      designation: approveForm.designation.trim(),
      department: approveForm.department || null,
      employee_type: approveForm.employee_type,
      shift_type: approveForm.shift_type,
      basic: Number(approveForm.basic),
      hra: numeric(approveForm.hra),
      conveyance: numeric(approveForm.conveyance),
      other_allowance: numeric(approveForm.other_allowance),
      other_allowance_label: approveForm.other_allowance_label || null,
      working_hours: Number(approveForm.working_hours) || 8,
      grade: approveForm.grade || null,
      reporting_manager: approveForm.reporting_manager || null,
      pf_applicable: approveForm.pf_applicable,
      esi_applicable: approveForm.esi_applicable,
      pt_applicable: approveForm.pt_applicable,
    })
  }

  const submitReferrer = () => {
    if (!validate(REFERRER_RULES, referrerForm)) return
    saveReferrer.mutate({ ...referrerForm, referrer_code: referrerForm.referrer_code.trim() || undefined })
  }

  const applications = appQuery.data || []
  const referrers = refQuery.data || []
  const pendingCount = applications.filter((a) => a.status === 'pending').length

  const appCols: any[] = [
    { key: 'candidate', header: 'Candidate Details', render: (a: ReferrerApplication) => (
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700">
          {a.full_name?.[0]}
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-900">{a.full_name}</p>
          <p className="text-[11px] text-slate-500 font-mono">Aadhaar: {a.aadhaar}{a.employee_code ? ` · ${a.employee_code}` : ''}</p>
        </div>
      </div>
    ) },
    { key: 'referrer', header: 'Referred By', render: (a: ReferrerApplication) => (
      <div>
        <p className="text-xs font-semibold text-slate-800">{a.referrer_name || 'Direct / None'}</p>
        <p className="text-[11px] text-slate-500 font-mono">{a.referrer_code || ''}</p>
      </div>
    ) },
    { key: 'contact', header: 'Contact & Exp', render: (a: ReferrerApplication) => (
      <div className="text-xs space-y-0.5">
        <p className="font-medium text-slate-800">{a.mobile}</p>
        <p className="text-[11px] text-slate-500">{a.experience || 'Fresher'}</p>
      </div>
    ) },
    { key: 'received', header: 'Application Date', render: (a: ReferrerApplication) => (
      <span className="text-xs text-slate-600">{fmtDate(a.created_at)}</span>
    ) },
    { key: 'status', header: 'Status', render: (a: ReferrerApplication) => {
      const s = APP_STATUS[a.status] || APP_STATUS.pending
      return (
        <div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            {appLabel(a.status)}
          </span>
          {a.status === 'rejected' && a.rejection_reason && (
            <p className="text-[10px] text-rose-600 mt-1 max-w-[160px] line-clamp-1">{a.rejection_reason}</p>
          )}
          {a.status === 'approved' && a.reviewer_name && (
            <p className="text-[10px] text-slate-400 mt-0.5">by {a.reviewer_name}</p>
          )}
        </div>
      )
    } },
    { key: 'actions', header: '', render: (a: ReferrerApplication) => (
      <div className="flex items-center gap-1.5 justify-end">
        <button onClick={() => setViewApp(a)} className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1">
          <Eye className="w-3.5 h-3.5" /> Details
        </button>
        {a.status === 'pending' && (
          <>
            <button onClick={() => openApprove(a)} className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Onboard
            </button>
            <button onClick={() => { setRejectFor(a); setRejectReason('') }} className="px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" /> Reject
            </button>
          </>
        )}
      </div>
    ) },
  ]

  const refCols: any[] = [
    { key: 'name', header: 'Referrer Name & Code', render: (r: ReferrerRow) => (
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
          {r.name?.[0]}
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-900">{r.name}</p>
          <p className="text-[11px] text-slate-500 font-mono font-medium">{r.referrer_code}</p>
        </div>
      </div>
    ) },
    { key: 'contact', header: 'Contact Person', render: (r: ReferrerRow) => (
      <div className="text-xs space-y-0.5">
        <p className="font-semibold text-slate-800">{r.contact_person || '—'}</p>
        <p className="text-[11px] text-slate-500">{r.phone || r.email || '—'}</p>
      </div>
    ) },
    { key: 'pipeline', header: 'Referral Pipeline', render: (r: ReferrerRow) => (
      <div className="text-xs space-y-0.5">
        <p><span className="font-bold text-amber-600">{r.pending_count || 0}</span> pending · <span className="font-semibold text-slate-800">{r.application_count || 0}</span> total</p>
        <p className="text-[11px] text-slate-500"><span className="font-semibold text-emerald-600">{r.active_employees || 0}</span> active staff</p>
      </div>
    ) },
    { key: 'status', header: 'Status', render: (r: ReferrerRow) => (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${r.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
        {r.status === 'active' ? 'Active' : 'Inactive'}
      </span>
    ) },
    { key: 'actions', header: '', render: (r: ReferrerRow) => (
      <div className="flex items-center gap-1.5 justify-end">
        <button onClick={() => { clearAll(); setEditReferrer(r); setReferrerForm(referrerFormFrom(r)); setShowReferrer(true) }} className="px-2.5 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
          Edit
        </button>
        <button
          onClick={() => toggleStatus.mutate({ id: r.id, status: r.status === 'active' ? 'inactive' : 'active' })}
          disabled={toggleStatus.isPending}
          className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
          title={r.status === 'active' ? 'Deactivate referrer' : 'Activate referrer'}
        >
          {r.status === 'active' ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
        </button>
        <button onClick={() => setConfirmDelete(r)} className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete referrer">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    ) },
  ]

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <UserCheck className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Referrer & Intake Management</h1>
          </div>
          <p className="text-xs text-slate-500">Manage vendor/partner referrers and review prospective candidate submissions from the public intake portal</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => { clearAll(); setEditReferrer(null); setReferrerForm({ ...emptyReferrer }); setShowReferrer(true) }}
            className="shadow-sm hover:shadow transition-all"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Referrer Partner
          </Button>
        </div>
      </div>

      {/* Tabs Filter */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 space-y-4">
        <Tabs tabs={PAGE_TABS} active={tab} onChange={setTab} />

        {tab === 'registrations' && (
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <div className="w-full sm:w-72 relative">
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search name, Aadhaar, mobile..."
                  className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div className="w-full sm:w-40">
                <Select
                  options={[{ value: '', label: 'All Status' }, { value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }]}
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                />
              </div>
              <div className="w-full sm:w-48">
                <Select
                  options={[{ value: '', label: 'All Referrers' }, ...referrers.map((r) => ({ value: String(r.id), label: r.name }))]}
                  value={referrerFilter}
                  onChange={e => setReferrerFilter(e.target.value)}
                />
              </div>
            </div>
            {pendingCount > 0 && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                {pendingCount} Awaiting Review
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        {tab === 'registrations' ? (
          appQuery.isLoading ? (
            <div className="p-8"><LoadingState /></div>
          ) : appQuery.isError ? (
            <div className="p-8"><PageError onRetry={() => appQuery.refetch()} /></div>
          ) : applications.length === 0 ? (
            <div className="p-8"><EmptyState icon={ClipboardList} title="No Candidate Registrations" description="Submissions from the public registration link will appear here for verification and onboarding." /></div>
          ) : (
            <Table columns={appCols} data={applications} keyFn={(a: ReferrerApplication) => a.id} />
          )
        ) : (
          refQuery.isLoading ? (
            <div className="p-8"><LoadingState /></div>
          ) : refQuery.isError ? (
            <div className="p-8"><PageError onRetry={() => refQuery.refetch()} /></div>
          ) : referrers.length === 0 ? (
            <div className="p-8"><EmptyState icon={UserCheck} title="No Referrers Added" description="Create a referrer partner to enable source attribution on the public intake form." action={<Button onClick={() => { clearAll(); setEditReferrer(null); setReferrerForm({ ...emptyReferrer }); setShowReferrer(true) }}><Plus className="w-4 h-4 mr-1.5" /> Add Referrer</Button>} /></div>
          ) : (
            <Table columns={refCols} data={referrers} keyFn={(r: ReferrerRow) => r.id} />
          )
        )}
      </div>

      {/* Referrer Partner Modal */}
      <Modal open={showReferrer} onClose={() => setShowReferrer(false)} title={editReferrer ? 'Edit Referrer Partner' : 'Add Referrer Partner'} size="md">
        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Referrer / Partner Name" placeholder="e.g. Apex Workforce Solutions" value={referrerForm.name} onChange={(e) => { setReferrerForm((f) => ({ ...f, name: e.target.value })); clear('name') }} error={errors.name} required />
            <Input label="Referrer Code" placeholder="Auto-generated if empty" value={referrerForm.referrer_code} onChange={(e) => setReferrerForm((f) => ({ ...f, referrer_code: e.target.value.toUpperCase() }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Contact Person" placeholder="e.g. Rajesh Sharma" value={referrerForm.contact_person} onChange={(e) => { setReferrerForm((f) => ({ ...f, contact_person: e.target.value })); clear('contact_person') }} error={errors.contact_person} />
            <Input label="Phone Number" placeholder="+91 98765 43210" value={referrerForm.phone} onChange={(e) => { setReferrerForm((f) => ({ ...f, phone: e.target.value })); clear('phone') }} error={errors.phone} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email Address" type="email" placeholder="partner@domain.com" value={referrerForm.email} onChange={(e) => { setReferrerForm((f) => ({ ...f, email: e.target.value })); clear('email') }} error={errors.email} />
            <Select label="Partner Status" options={[{ value: 'active', label: 'Active Partner' }, { value: 'inactive', label: 'Inactive' }]} value={referrerForm.status} onChange={(e) => setReferrerForm((f) => ({ ...f, status: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setShowReferrer(false)}>Cancel</Button>
            <Button onClick={submitReferrer} loading={saveReferrer.isPending}>{editReferrer ? 'Save Changes' : 'Add Partner'}</Button>
          </div>
        </div>
      </Modal>

      {/* Registration Details Modal */}
      <Modal open={!!viewApp} onClose={() => setViewApp(null)} title="Candidate Dossier" size="lg">
        {viewApp && (
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div><span className="text-slate-500 block">Full Name:</span> <span className="font-bold text-slate-900">{viewApp.full_name}</span></div>
              <div><span className="text-slate-500 block">Aadhaar:</span> <span className="font-mono font-semibold text-slate-800">{viewApp.aadhaar}</span></div>
              <div><span className="text-slate-500 block">Mobile:</span> <span className="font-semibold text-slate-800">{viewApp.mobile}</span></div>
              <div><span className="text-slate-500 block">Status:</span> <span className="font-bold text-indigo-700 capitalize">{viewApp.status}</span></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                <span className="font-bold text-slate-900 uppercase tracking-wider block mb-1">Personal Details</span>
                <p><span className="text-slate-500">Father&apos;s Name:</span> <span className="font-medium text-slate-800 ml-1">{viewApp.father_name || '—'}</span></p>
                <p><span className="text-slate-500">Date of Birth:</span> <span className="font-medium text-slate-800 ml-1">{fmtDate(viewApp.dob)}</span></p>
                <p><span className="text-slate-500">Gender / Marital:</span> <span className="font-medium text-slate-800 ml-1">{viewApp.gender || '—'} · {viewApp.marital_status || '—'}</span></p>
                <p><span className="text-slate-500">Prior Experience:</span> <span className="font-medium text-slate-800 ml-1">{viewApp.experience || '—'}</span></p>
                <p><span className="text-slate-500">Previous Company:</span> <span className="font-medium text-slate-800 ml-1">{viewApp.previous_employment || '—'}</span></p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                <span className="font-bold text-slate-900 uppercase tracking-wider block mb-1">Bank & Statutory</span>
                <p><span className="text-slate-500">Bank Details:</span> <span className="font-medium text-slate-800 ml-1">{viewApp.bank_name || '—'} ({viewApp.bank_account || '—'})</span></p>
                <p><span className="text-slate-500">IFSC Code:</span> <span className="font-mono font-medium text-slate-800 ml-1">{viewApp.bank_ifsc || '—'}</span></p>
                <p><span className="text-slate-500">PAN Number:</span> <span className="font-mono font-medium text-slate-800 ml-1">{viewApp.pan || '—'}</span></p>
                <p><span className="text-slate-500">UAN / ESIC:</span> <span className="font-mono font-medium text-slate-800 ml-1">{viewApp.uan || '—'} · {viewApp.esi_number || '—'}</span></p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
              <span className="font-bold text-slate-900 uppercase tracking-wider block mb-1">Residential Address</span>
              <p className="text-slate-700">{[viewApp.address, viewApp.district, viewApp.state, viewApp.pincode].filter(Boolean).join(', ') || '—'}</p>
            </div>

            {viewApp.status === 'pending' && (
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <Button variant="secondary" onClick={() => { setRejectFor(viewApp); setRejectReason(''); setViewApp(null) }}>
                  <XCircle className="w-4 h-4 mr-1" /> Reject
                </Button>
                <Button onClick={() => { openApprove(viewApp); setViewApp(null) }}>
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Approve &amp; Onboard Employee
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Onboarding Approval Modal */}
      <Modal open={!!approveFor} onClose={() => setApproveFor(null)} title="Approve & Deploy Employee" size="md">
        {approveFor && (
          <div className="space-y-4 pt-1">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs grid grid-cols-2 gap-2">
              <div><span className="text-slate-500 block">Candidate:</span> <span className="font-bold text-slate-900">{approveFor.full_name}</span></div>
              <div><span className="text-slate-500 block">Aadhaar:</span> <span className="font-mono font-semibold text-slate-800">{approveFor.aadhaar}</span></div>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">Deployment Parameters</span>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Joining Date" type="date" value={approveForm.joining_date} onChange={(e) => setApproveForm((f) => ({ ...f, joining_date: e.target.value }))} required />
                <Select
                  label="Deployment Site"
                  options={[{ value: '', label: 'Select site...' }, ...sites.map((s) => ({ value: String(s.id), label: s.client_name ? `${s.client_name} — ${s.name}` : s.name }))]}
                  value={approveForm.site_id}
                  onChange={(e) => setApproveForm((f) => ({ ...f, site_id: e.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Designation" placeholder="e.g. Warehouse Executive" value={approveForm.designation} onChange={(e) => setApproveForm((f) => ({ ...f, designation: e.target.value }))} required />
                <Input label="Department" placeholder="e.g. Logistics" value={approveForm.department} onChange={(e) => setApproveForm((f) => ({ ...f, department: e.target.value }))} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Select label="Contract Type" options={EMP_TYPES} value={approveForm.employee_type} onChange={(e) => setApproveForm((f) => ({ ...f, employee_type: e.target.value }))} />
                <Select label="Shift" options={SHIFTS.map((s) => ({ value: s, label: s }))} value={approveForm.shift_type} onChange={(e) => setApproveForm((f) => ({ ...f, shift_type: e.target.value }))} />
                <Input label="Grade" placeholder="e.g. L1" value={approveForm.grade} onChange={(e) => setApproveForm((f) => ({ ...f, grade: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">Monthly CTC Breakdown</span>
              <div className="grid grid-cols-4 gap-2">
                <Input label="Basic (₹)" type="number" value={approveForm.basic} onChange={(e) => setApproveForm((f) => ({ ...f, basic: e.target.value }))} required />
                <Input label="HRA (₹)" type="number" value={approveForm.hra} onChange={(e) => setApproveForm((f) => ({ ...f, hra: e.target.value }))} />
                <Input label="Conveyance" type="number" value={approveForm.conveyance} onChange={(e) => setApproveForm((f) => ({ ...f, conveyance: e.target.value }))} />
                <Input label="Allowance" type="number" value={approveForm.other_allowance} onChange={(e) => setApproveForm((f) => ({ ...f, other_allowance: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">Statutory Compliance</span>
              <div className="grid grid-cols-3 gap-3">
                <Select label="PF Applicable" options={YES_NO} value={approveForm.pf_applicable ? '1' : '0'} onChange={(e) => setApproveForm((f) => ({ ...f, pf_applicable: e.target.value === '1' }))} />
                <Select label="ESIC Applicable" options={YES_NO} value={approveForm.esi_applicable ? '1' : '0'} onChange={(e) => setApproveForm((f) => ({ ...f, esi_applicable: e.target.value === '1' }))} />
                <Select label="PT Applicable" options={YES_NO} value={approveForm.pt_applicable ? '1' : '0'} onChange={(e) => setApproveForm((f) => ({ ...f, pt_applicable: e.target.value === '1' }))} />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setApproveFor(null)}>Cancel</Button>
              <Button onClick={submitApprove} loading={approve.isPending}>
                <CheckCircle2 className="w-4 h-4 mr-1" /> Confirm Onboarding
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal open={!!rejectFor} onClose={() => setRejectFor(null)} title="Reject Registration" size="sm">
        {rejectFor && (
          <div className="space-y-4 pt-1">
            <p className="text-xs text-slate-600">
              Rejecting candidate <span className="font-bold text-slate-900">{rejectFor.full_name}</span>.
            </p>
            <Textarea
              label="Rejection Reason"
              rows={3}
              required
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Identity documents mismatch with government records"
            />
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setRejectFor(null)}>Cancel</Button>
              <Button variant="danger" onClick={() => reject.mutate({ reason: rejectReason })} loading={reject.isPending} disabled={rejectReason.trim().length < 3}>
                Confirm Rejection
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => deleteReferrer.mutate(confirmDelete!.id)}
        title="Delete Referrer Partner?"
        message={`${confirmDelete?.name} will be permanently removed. Employees and registrations it brought in are kept, but will no longer be linked to it.`}
        confirmText="Delete"
        danger
        loading={deleteReferrer.isPending}
      />

      <FieldErrorsDialog open={popupOpen} onClose={closePopup} labels={invalidLabels(REFERRER_RULES)} />
    </div>
  )
}
