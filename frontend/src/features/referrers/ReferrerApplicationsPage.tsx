import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { referrerApi, siteApi, type ReferrerRow, type ReferrerApplication } from '@/services/api'
import { Button, Input, Select, Textarea, FormSection, FormGrid } from '@/components/ui/fields'
import { Table, Badge, Tabs } from '@/components/ui/data'
import { Modal, ConfirmDialog } from '@/components/ui/overlay'
import { PageHeader, LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { SearchInput, SelectFilter, Toolbar } from '@/components/ui/actions'
import { DetailGrid, InfoRow, Metric, SectionCard } from '@/components/ui/layout'
import { toast } from 'sonner'
import {
  UserCheck, ClipboardList, CheckCircle, XCircle, Plus, Trash2, Eye, Users, Phone, MapPin, Banknote, Fingerprint,
  Briefcase, ShieldCheck,
} from 'lucide-react'

/**
 * Referrer Management: the referrer master and the public-registration review
 * queue, on one page.
 *
 * A referrer refers staff to Staffsway and registers them on the company's
 * behalf. Referrers are added here by HR/admin and never log in. This is not a
 * commercial arrangement, so the record holds contact details only — no rates,
 * agreements, GST or billing.
 *
 * The public link at /apply shows only active referrers, so a row set to inactive
 * here disappears from the public form immediately without losing the history of
 * registrations or employees already attributed to it.
 */

const PAGE_TABS = [
  { key: 'registrations', label: 'Registrations' },
  { key: 'referrers', label: 'Referrers' },
]

const APP_STATUS: Record<string, string> = {
  pending: 'bg-warning-soft text-warning-deep',
  approved: 'bg-success-soft text-success',
  rejected: 'bg-error-soft text-error-deep',
}
const appLabel = (s: string) => ({ pending: 'Pending Review', approved: 'Approved', rejected: 'Rejected' } as Record<string, string>)[s] || s

const EMP_TYPES = [
  { value: 'contract', label: 'Contract' },
  { value: 'daily_wages', label: 'Daily Wages' },
  { value: 'permanent', label: 'Permanent' },
]
const SHIFTS = ['General', 'Morning', 'Evening', 'Night', 'Rotational', 'Split']
const YES_NO = [{ value: '1', label: 'Applicable' }, { value: '0', label: 'Not applicable' }]

const emptyReferrer = {
  name: '', referrer_code: '', contact_person: '', phone: '', email: '', status: 'active',
}

const emptyApproveForm = () => ({
  joining_date: new Date().toISOString().slice(0, 10), site_id: '', designation: '', department: '',
  employee_type: 'contract', shift_type: 'General', basic: '', hra: '', conveyance: '', other_allowance: '',
  other_allowance_label: '', working_hours: '8', grade: '', reporting_manager: '',
  pf_applicable: true, esi_applicable: true, pt_applicable: true,
})

const fmtDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')

export default function ReferrerApplicationsPage() {
  const [tab, setTab] = useState('registrations')
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [referrerFilter, setReferrerFilter] = useState('')

  const [showReferrer, setShowReferrer] = useState(false)
  const [editReferrer, setEditReferrer] = useState<ReferrerRow | null>(null)
  const [referrerForm, setReferrerForm] = useState({ ...emptyReferrer })
  const [confirmDeactivate, setConfirmDeactivate] = useState<ReferrerRow | null>(null)

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
    onSuccess: () => { invalidate(); setShowReferrer(false); toast.success(editReferrer ? 'Referrer updated.' : 'Referrer added.') },
    onError: (err: any) => toast.error(err?.error?.message || 'Could not save the referrer.'),
  })

  const deactivateReferrer = useMutation({
    mutationFn: (id: number) => referrerApi.deactivate(id),
    onSuccess: () => { invalidate(); setConfirmDeactivate(null); toast.success('Referrer marked inactive.') },
    onError: (err: any) => { setConfirmDeactivate(null); toast.error(err?.error?.message || 'Could not update the referrer.') },
  })

  const approve = useMutation({
    mutationFn: (body: Record<string, unknown>) => referrerApi.approve(approveFor!.id, body),
    onSuccess: (res) => {
      invalidate()
      qc.invalidateQueries({ queryKey: ['employees'] })
      qc.invalidateQueries({ queryKey: ['employees-all'] })
      setApproveFor(null)
      toast.success(res.message || 'Registration approved.')
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
    // These three are required by the API: approving without them would create
    // an employee who cannot be rostered or paid.
    if (!approveForm.joining_date) { toast.error('Enter the joining date.'); return }
    if (!approveForm.site_id) { toast.error('Select a site.'); return }
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
    if (!referrerForm.name.trim()) { toast.error('Enter the referrer name.'); return }
    saveReferrer.mutate({ ...referrerForm, referrer_code: referrerForm.referrer_code || undefined })
  }

  const applications = appQuery.data || []
  const referrers = refQuery.data || []
  const pendingCount = applications.filter((a) => a.status === 'pending').length

  const appCols: any[] = [
    { key: 'candidate', header: 'Person', render: (a: ReferrerApplication) => (
      <div>
        <p className="text-[13px] font-medium text-ink">{a.full_name}{a.employee_code ? ` · ${a.employee_code}` : ''}</p>
        <p className="text-[11px] text-mute font-mono">{a.aadhaar}</p>
      </div>
    ) },
    { key: 'referrer', header: 'Referrer', render: (a: ReferrerApplication) => (
      <div>
        <p className="text-[12px] text-body">{a.referrer_name || '—'}</p>
        <p className="text-[11px] text-mute">{a.referrer_code || ''}</p>
      </div>
    ) },
    { key: 'contact', header: 'Contact', hideSm: true, render: (a: ReferrerApplication) => (
      <div className="text-[11px] text-mute leading-relaxed">
        <p className="text-body text-[12px]">{a.mobile}</p>
        {a.experience && <p>{a.experience}</p>}
      </div>
    ) },
    { key: 'received', header: 'Received', hideSm: true, render: (a: ReferrerApplication) => (
      <span className="text-[12px] text-body">{fmtDate(a.created_at)}</span>
    ) },
    { key: 'status', header: 'Status', render: (a: ReferrerApplication) => (
      <div>
        <Badge className={APP_STATUS[a.status]}>{appLabel(a.status)}</Badge>
        {a.status === 'rejected' && a.rejection_reason && (
          <p className="text-[11px] text-mute mt-1 max-w-[180px]">{a.rejection_reason}</p>
        )}
        {a.status === 'approved' && a.reviewer_name && (
          <p className="text-[11px] text-mute mt-1">by {a.reviewer_name}</p>
        )}
      </div>
    ) },
    { key: 'actions', header: '', render: (a: ReferrerApplication) => (
      <div className="flex items-center gap-1 justify-end flex-wrap">
        <button onClick={() => setViewApp(a)} className="px-1.5 py-0.5 text-[11px] text-body hover:bg-canvas-soft rounded-xs"><Eye className="w-3 h-3 inline mr-0.5" />View</button>
        {a.status === 'pending' && (
          <>
            <button onClick={() => openApprove(a)} className="px-1.5 py-0.5 text-[11px] text-success hover:bg-success-soft rounded-xs font-medium"><CheckCircle className="w-3 h-3 inline mr-0.5" />Approve</button>
            <button onClick={() => { setRejectFor(a); setRejectReason('') }} className="px-1.5 py-0.5 text-[11px] text-error hover:bg-error-soft rounded-xs"><XCircle className="w-3 h-3 inline mr-0.5" />Reject</button>
          </>
        )}
      </div>
    ) },
  ]

  const refCols: any[] = [
    { key: 'name', header: 'Referrer', render: (r: ReferrerRow) => (
      <div>
        <p className="text-[13px] font-medium text-ink">{r.name}</p>
        <p className="text-[11px] text-mute font-mono">{r.referrer_code}</p>
      </div>
    ) },
    { key: 'contact', header: 'Contact', hideSm: true, render: (r: ReferrerRow) => (
      <div className="text-[11px] text-mute leading-relaxed">
        <p className="text-body text-[12px]">{r.contact_person || '—'}</p>
        <p>{r.phone || r.email || ''}</p>
      </div>
    ) },
    { key: 'pipeline', header: 'Referrals', render: (r: ReferrerRow) => (
      <div className="text-[11px] text-mute leading-relaxed">
        <p><span className="text-warning-deep font-medium">{r.pending_count || 0}</span> pending · <span className="text-body">{r.application_count || 0}</span> total</p>
        <p><span className="text-body">{r.active_employees || 0}</span> active · <span className="text-mute">{r.employee_count || 0}</span> total employees</p>
      </div>
    ) },
    { key: 'status', header: 'Status', render: (r: ReferrerRow) => (
      <Badge className={r.status === 'active' ? 'bg-success-soft text-success' : 'bg-canvas-soft-2 text-mute'}>
        {r.status === 'active' ? 'Active' : 'Inactive'}
      </Badge>
    ) },
    { key: 'actions', header: '', render: (r: ReferrerRow) => (
      <div className="flex items-center gap-1 justify-end">
        <button onClick={() => { setEditReferrer(r); setReferrerForm({ ...emptyReferrer, ...r } as any); setShowReferrer(true) }} className="px-1.5 py-0.5 text-[11px] text-link hover:bg-link-soft rounded-xs">Edit</button>
        {r.status === 'active' && (
          <button onClick={() => setConfirmDeactivate(r)} className="px-1.5 py-0.5 text-[11px] text-error hover:bg-error-soft rounded-xs" title="Mark inactive">
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    ) },
  ]

  return (
    <div>
      <PageHeader
        title="Referrers"
        subtitle="Add the people who refer staff to you, and review registrations submitted from the public link."
        actions={
          <Button onClick={() => { setEditReferrer(null); setReferrerForm({ ...emptyReferrer }); setShowReferrer(true) }}>
            <Plus className="w-4 h-4" /> Add Referrer
          </Button>
        }
      />

      <Tabs tabs={PAGE_TABS} active={tab} onChange={setTab} />

      {tab === 'registrations' && (
        <>
          <Toolbar
            left={
              <>
                <SearchInput value={search} onChange={setSearch} placeholder="Search name, Aadhaar, mobile or referrer..." />
                <SelectFilter
                  label="Status"
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[{ value: '', label: 'All' }, { value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }]}
                />
                <SelectFilter
                  label="Referrer"
                  value={referrerFilter}
                  onChange={setReferrerFilter}
                  options={[{ value: '', label: 'All' }, ...referrers.map((r) => ({ value: String(r.id), label: r.name }))]}
                />
              </>
            }
            right={pendingCount > 0 ? <span className="text-[12px] text-warning-deep font-medium">{pendingCount} awaiting review</span> : null}
          />

          {appQuery.isLoading ? (
            <LoadingState />
          ) : appQuery.isError ? (
            <PageError onRetry={() => appQuery.refetch()} />
          ) : applications.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No registrations"
              description="Registrations submitted through the public link appear here for review."
            />
          ) : (
            <Table columns={appCols} data={applications} keyFn={(a: ReferrerApplication) => a.id} minWidth="980px" />
          )}
        </>
      )}

      {tab === 'referrers' && (
        <>
          <Toolbar left={<SearchInput value={search} onChange={setSearch} placeholder="Search referrers..." />} />
          {refQuery.isLoading ? (
            <LoadingState />
          ) : refQuery.isError ? (
            <PageError onRetry={() => refQuery.refetch()} />
          ) : referrers.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title="No referrers yet"
              description="Add a referrer to make it selectable on the public registration form."
              action={<Button onClick={() => { setEditReferrer(null); setReferrerForm({ ...emptyReferrer }); setShowReferrer(true) }}><Plus className="w-4 h-4" /> Add Referrer</Button>}
            />
          ) : (
            <Table columns={refCols} data={referrers} keyFn={(r: ReferrerRow) => r.id} minWidth="820px" />
          )}
        </>
      )}

      {/* ---- Referrer form ---- */}
      <Modal open={showReferrer} onClose={() => setShowReferrer(false)} title={editReferrer ? 'Edit Referrer' : 'Add Referrer'} size="md">
        <FormSection icon={UserCheck} title="Referrer Details" subtitle="Just enough to identify and contact them.">
          <FormGrid cols={2}>
            <Input label="Referrer Name" value={referrerForm.name} onChange={(e) => setReferrerForm((f) => ({ ...f, name: e.target.value }))} required />
            <Input label="Referrer Code" placeholder="Auto-assigned" value={referrerForm.referrer_code} onChange={(e) => setReferrerForm((f) => ({ ...f, referrer_code: e.target.value.toUpperCase() }))} />
          </FormGrid>
          <FormGrid cols={2}>
            <Input label="Contact Person" value={referrerForm.contact_person} onChange={(e) => setReferrerForm((f) => ({ ...f, contact_person: e.target.value }))} />
            <Input label="Phone" value={referrerForm.phone} onChange={(e) => setReferrerForm((f) => ({ ...f, phone: e.target.value }))} />
          </FormGrid>
          <FormGrid cols={2}>
            <Input label="Email" type="email" value={referrerForm.email} onChange={(e) => setReferrerForm((f) => ({ ...f, email: e.target.value }))} />
            <Select label="Status" options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} value={referrerForm.status} onChange={(e) => setReferrerForm((f) => ({ ...f, status: e.target.value }))} />
          </FormGrid>
        </FormSection>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setShowReferrer(false)}>Cancel</Button>
          <Button onClick={submitReferrer} loading={saveReferrer.isPending}>{editReferrer ? 'Save Changes' : 'Add Referrer'}</Button>
        </div>
      </Modal>

      {/* ---- Registration detail ---- */}
      <Modal open={!!viewApp} onClose={() => setViewApp(null)} title="Registration Details" size="lg">
        {viewApp && (
          <>
            <SectionCard title="Person" icon={Fingerprint}>
              <DetailGrid>
                <InfoRow label="Full Name">{viewApp.full_name}</InfoRow>
                <InfoRow label="Aadhaar"><span className="font-mono">{viewApp.aadhaar}</span></InfoRow>
                <InfoRow label="Father's Name">{viewApp.father_name || '—'}</InfoRow>
                <InfoRow label="Gender">{viewApp.gender || '—'}</InfoRow>
                <InfoRow label="Date of Birth">{fmtDate(viewApp.dob)}</InfoRow>
                <InfoRow label="Marital Status">{viewApp.marital_status || '—'}</InfoRow>
                <InfoRow label="Experience">{viewApp.experience || '—'}</InfoRow>
                <InfoRow label="Previous Employer">{viewApp.previous_employment || '—'}</InfoRow>
              </DetailGrid>
            </SectionCard>
            <SectionCard title="Contact" icon={Phone} className="mt-3">
              <DetailGrid>
                <InfoRow label="Mobile">{viewApp.mobile}</InfoRow>
                <InfoRow label="Alternate Mobile">{viewApp.alternate_mobile || '—'}</InfoRow>
                <InfoRow label="Email">{viewApp.email || '—'}</InfoRow>
                <InfoRow label="Emergency Contact">
                  {[viewApp.emergency_contact_name, viewApp.emergency_contact_phone, viewApp.emergency_contact_relation].filter(Boolean).join(' · ') || '—'}
                </InfoRow>
              </DetailGrid>
            </SectionCard>
            <SectionCard title="Address" icon={MapPin} className="mt-3">
              <DetailGrid>
                <InfoRow label="Present">{[viewApp.address, viewApp.district, viewApp.state, viewApp.pincode].filter(Boolean).join(', ') || '—'}</InfoRow>
                <InfoRow label="Permanent">
                  {viewApp.permanent_same_as_present
                    ? 'Same as present'
                    : [viewApp.permanent_address, viewApp.permanent_district, viewApp.permanent_state, viewApp.permanent_pincode].filter(Boolean).join(', ') || '—'}
                </InfoRow>
              </DetailGrid>
            </SectionCard>
            <SectionCard title="Bank & Statutory" icon={Banknote} className="mt-3">
              <DetailGrid>
                <InfoRow label="Bank">{[viewApp.bank_name, viewApp.bank_account, viewApp.bank_ifsc].filter(Boolean).join(' · ') || '—'}</InfoRow>
                <InfoRow label="Account Holder">{viewApp.bank_holder_name || '—'}</InfoRow>
                <InfoRow label="PAN">{viewApp.pan || '—'}</InfoRow>
                <InfoRow label="UAN / ESIC">{[viewApp.uan, viewApp.esi_number].filter(Boolean).join(' · ') || '—'}</InfoRow>
              </DetailGrid>
            </SectionCard>
            <SectionCard title="Submission" icon={Users} className="mt-3">
              <DetailGrid>
                <InfoRow label="Referrer">{viewApp.referrer_name || '—'} <span className="text-mute">({viewApp.referrer_code || ''})</span></InfoRow>
                <InfoRow label="Status"><Badge className={APP_STATUS[viewApp.status]}>{appLabel(viewApp.status)}</Badge></InfoRow>
                <InfoRow label="Received">{fmtDate(viewApp.created_at)}</InfoRow>
                <InfoRow label="Reviewed">{viewApp.reviewed_at ? `${fmtDate(viewApp.reviewed_at)} by ${viewApp.reviewer_name || '—'}` : '—'}</InfoRow>
                {viewApp.employee_code && <InfoRow label="Employee"><span className="font-mono">{viewApp.employee_code}</span></InfoRow>}
                {viewApp.rejection_reason && <InfoRow label="Rejection Reason">{viewApp.rejection_reason}</InfoRow>}
              </DetailGrid>
            </SectionCard>
            {viewApp.status === 'pending' && (
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="secondary" onClick={() => { setRejectFor(viewApp); setRejectReason(''); setViewApp(null) }}>
                  <XCircle className="w-4 h-4" /> Reject
                </Button>
                <Button onClick={() => { openApprove(viewApp); setViewApp(null) }}>
                  <CheckCircle className="w-4 h-4" /> Approve &amp; Create Employee
                </Button>
              </div>
            )}
          </>
        )}
      </Modal>

      {/* ---- Approve ---- */}
      <Modal open={!!approveFor} onClose={() => setApproveFor(null)} title="Approve & Create Employee" size="md">
        {approveFor && (
          <>
            <div className="rounded-md border border-hairline bg-canvas-soft-2 p-3 mb-4">
              <DetailGrid>
                <Metric label="Person" value={approveFor.full_name} mono={false} />
                <Metric label="Aadhaar" value={approveFor.aadhaar} />
                <Metric label="Referrer" value={approveFor.referrer_name || '—'} mono={false} />
                <Metric label="Experience" value={approveFor.experience || '—'} mono={false} />
              </DetailGrid>
            </div>

            <FormSection icon={Briefcase} title="Employment Details" subtitle="Not collected on the public form. Site, designation and basic pay are required.">
              <FormGrid cols={2}>
                <Input label="Joining Date" type="date" value={approveForm.joining_date} onChange={(e) => setApproveForm((f) => ({ ...f, joining_date: e.target.value }))} required />
                <Select
                  label="Site"
                  options={[{ value: '', label: 'Select site' }, ...sites.map((s) => ({ value: String(s.id), label: s.client_name ? `${s.client_name} — ${s.name}` : s.name }))]}
                  value={approveForm.site_id}
                  onChange={(e) => setApproveForm((f) => ({ ...f, site_id: e.target.value }))}
                  required
                />
              </FormGrid>
              <FormGrid cols={2}>
                <Input label="Designation" value={approveForm.designation} onChange={(e) => setApproveForm((f) => ({ ...f, designation: e.target.value }))} required />
                <Input label="Department" value={approveForm.department} onChange={(e) => setApproveForm((f) => ({ ...f, department: e.target.value }))} />
              </FormGrid>
              <FormGrid cols={3}>
                <Select label="Employee Type" options={EMP_TYPES} value={approveForm.employee_type} onChange={(e) => setApproveForm((f) => ({ ...f, employee_type: e.target.value }))} />
                <Select label="Shift" options={SHIFTS.map((s) => ({ value: s, label: s }))} value={approveForm.shift_type} onChange={(e) => setApproveForm((f) => ({ ...f, shift_type: e.target.value }))} />
                <Input label="Grade" value={approveForm.grade} onChange={(e) => setApproveForm((f) => ({ ...f, grade: e.target.value }))} />
              </FormGrid>
              <FormGrid cols={2}>
                <Input label="Reporting Manager" value={approveForm.reporting_manager} onChange={(e) => setApproveForm((f) => ({ ...f, reporting_manager: e.target.value }))} />
                <Input label="Working Hours / Day" type="number" value={approveForm.working_hours} onChange={(e) => setApproveForm((f) => ({ ...f, working_hours: e.target.value }))} />
              </FormGrid>
            </FormSection>

            <FormSection icon={Banknote} title="Salary" subtitle="Basic is required. Leave the rest at zero if not yet agreed.">
              <FormGrid cols={4}>
                <Input label="Basic" type="number" value={approveForm.basic} onChange={(e) => setApproveForm((f) => ({ ...f, basic: e.target.value }))} required />
                <Input label="HRA" type="number" value={approveForm.hra} onChange={(e) => setApproveForm((f) => ({ ...f, hra: e.target.value }))} />
                <Input label="Conveyance" type="number" value={approveForm.conveyance} onChange={(e) => setApproveForm((f) => ({ ...f, conveyance: e.target.value }))} />
                <Input label="Other Allowance" type="number" value={approveForm.other_allowance} onChange={(e) => setApproveForm((f) => ({ ...f, other_allowance: e.target.value }))} />
              </FormGrid>
              {Number(approveForm.other_allowance) > 0 && (
                <Input label="Other Allowance Field Name" placeholder="e.g. Attendance Bonus" value={approveForm.other_allowance_label} onChange={(e) => setApproveForm((f) => ({ ...f, other_allowance_label: e.target.value }))} />
              )}
            </FormSection>

            <FormSection icon={ShieldCheck} title="Statutory Applicability" subtitle="Per employee. Never assumed from the salary figures above.">
              <FormGrid cols={3}>
                <Select label="PF" options={YES_NO} value={approveForm.pf_applicable ? '1' : '0'} onChange={(e) => setApproveForm((f) => ({ ...f, pf_applicable: e.target.value === '1' }))} />
                <Select label="ESIC" options={YES_NO} value={approveForm.esi_applicable ? '1' : '0'} onChange={(e) => setApproveForm((f) => ({ ...f, esi_applicable: e.target.value === '1' }))} />
                <Select label="Professional Tax" options={YES_NO} value={approveForm.pt_applicable ? '1' : '0'} onChange={(e) => setApproveForm((f) => ({ ...f, pt_applicable: e.target.value === '1' }))} />
              </FormGrid>
            </FormSection>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="secondary" onClick={() => setApproveFor(null)}>Cancel</Button>
              <Button onClick={submitApprove} loading={approve.isPending}>
                <CheckCircle className="w-4 h-4" /> Approve &amp; Create Employee
              </Button>
            </div>
          </>
        )}
      </Modal>

      {/* ---- Reject ---- */}
      <Modal open={!!rejectFor} onClose={() => setRejectFor(null)} title="Reject Registration" size="sm">
        {rejectFor && (
          <>
            <p className="text-[13px] text-body mb-3">
              Rejecting <span className="font-medium text-ink">{rejectFor.full_name}</span> ({rejectFor.referrer_name || 'no referrer'}).
            </p>
            <Textarea
              label="Reason"
              rows={3}
              required
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Aadhaar number does not match the records on file"
            />
            <p className="text-[11px] text-mute mt-2">
              The reason is stored on the registration. A rejected registration frees the Aadhaar for a fresh submission.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="secondary" onClick={() => setRejectFor(null)}>Cancel</Button>
              <Button variant="danger" onClick={() => reject.mutate({ reason: rejectReason })} loading={reject.isPending} disabled={rejectReason.trim().length < 3}>
                Reject Registration
              </Button>
            </div>
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmDeactivate}
        onClose={() => setConfirmDeactivate(null)}
        onConfirm={() => deactivateReferrer.mutate(confirmDeactivate!.id)}
        title="Mark referrer inactive?"
        message={`${confirmDeactivate?.name} will be hidden from the public registration form. Existing registrations and employees are kept.`}
        loading={deactivateReferrer.isPending}
      />
    </div>
  )
}
