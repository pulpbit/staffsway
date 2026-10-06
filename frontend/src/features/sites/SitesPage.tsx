import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { siteApi, clientApi } from '@/services/api'
import { Button, Input, Select, Toggle, FormSection, FormGrid } from '@/components/ui/fields'
import { Modal, ConfirmDialog } from '@/components/ui/overlay'
import { useFormValidation, FieldErrorsDialog, type FieldRule } from '@/components/ui/validation'
import { Table, StatCard } from '@/components/ui/data'
import { PageHeader } from '@/components/ui/layout'
import { StatusBadge, StatusDot } from '@/components/ui/status'
import { FilterBar, SearchInput, SelectFilter } from '@/components/ui/actions'
import { LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { STATE_OPTIONS } from '@/utils/indianStates'
import { toast } from 'sonner'
import { Plus, MapPin, Trash2, PenLine, Building2, User, Clock, Users } from 'lucide-react'

const SHIFT_OPTIONS = [
  { value: 'General', label: 'General (9:00 AM - 6:00 PM)' },
  { value: 'Morning', label: 'Morning Shift' },
  { value: 'Evening', label: 'Evening Shift' },
  { value: 'Night', label: 'Night Shift' },
  { value: 'Rotational', label: 'Rotational 24x7' },
]

const emptyForm = {
  client_id: '',
  name: '',
  status: 'active',
  address_line1: '',
  address_line2: '',
  state: '',
  district: '',
  pincode: '',
  site_incharge: '',
  site_incharge_designation: '',
  site_incharge_contact: '',
  site_incharge_email: '',
  shift_type: 'General',
  weekly_off: 'Sun',
  overtime_enabled: true,
  payroll_applicable: true,
  leave_policy_enabled: true,
  arrears_enabled: false,
  pf_applicable: true, pf_percent: '12',
  esic_applicable: true, esic_percent: '0.75',
  lwf_applicable: false, lwf_percent: '0.5',
  pt_applicable: true, pt_amount: '200',
  tds_applicable: true, tds_percent: '2',
  gratuity_applicable: true,
}

const SITE_RULES: FieldRule[] = [
  { key: 'client_id', label: 'Parent Client', required: true },
  { key: 'name', label: 'Site Name', required: true },
]

export default function SitesPage() {
  const [search, setSearch] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const qc = useQueryClient()
  const { errors, validate, applyServerErrors, clear, clearAll, invalidLabels, popupOpen, closePopup } = useFormValidation()

  const params: Record<string, string> = {}
  if (search) params.search = search
  if (clientFilter) params.client_id = clientFilter

  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['sites', params], queryFn: () => siteApi.list(params) })
  const { data: clients } = useQuery({ queryKey: ['clients-select'], queryFn: () => clientApi.list() })
  const sites = (data?.data || []) as any[]
  const clientOptions = [{ value: '', label: 'Select parent client...' }, ...(clients?.data || []).map((c: any) => ({ value: String(c.id), label: c.name }))]
  const clientFilterOptions = [{ value: '', label: 'All Clients' }, ...(clients?.data || []).map((c: any) => ({ value: String(c.id), label: c.name }))]

  const saveMut = useMutation({
    mutationFn: (d: any) => editId ? siteApi.update(editId, d) : siteApi.create(d),
    onSuccess: () => { setShowForm(false); setEditId(null); setForm(emptyForm); clearAll(); qc.invalidateQueries({ queryKey: ['sites'] }); toast.success('Site deployment saved.') },
    onError: (e: any) => {
      if (e?.error?.fields) { applyServerErrors(e.error.fields); toast.error('Please correct highlighted fields.') }
      else toast.error(e?.error?.message || 'Failed to save site.')
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => siteApi.delete(id),
    onSuccess: () => { setDeleteId(null); qc.invalidateQueries({ queryKey: ['sites'] }); toast.success('Site deleted.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to delete site.'),
  })

  const openCreate = () => { setEditId(null); setForm(emptyForm); clearAll(); setShowForm(true) }

  const openEdit = async (id: number) => {
    const r: any = (await siteApi.get(id)).data
    setForm({
      client_id: String(r.client_id),
      name: r.name || '',
      status: r.status || 'active',
      address_line1: r.address_line1 || '',
      address_line2: r.address_line2 || '',
      state: r.state || '',
      district: r.district || '',
      pincode: r.pincode || '',
      site_incharge: r.site_incharge || '',
      site_incharge_designation: r.site_incharge_designation || '',
      site_incharge_contact: r.site_incharge_contact || '',
      site_incharge_email: r.site_incharge_email || '',
      shift_type: r.shift_type || 'General',
      weekly_off: r.weekly_off || 'Sun',
      overtime_enabled: !!r.overtime_enabled,
      payroll_applicable: !!r.payroll_applicable,
      leave_policy_enabled: !!r.leave_policy_enabled,
      arrears_enabled: !!r.arrears_enabled,
      pf_applicable: !!r.pf_applicable, pf_percent: String(r.pf_percent ?? 12),
      esic_applicable: !!r.esic_applicable, esic_percent: String(r.esic_percent ?? 0.75),
      lwf_applicable: !!r.lwf_applicable, lwf_percent: String(r.lwf_percent ?? 0.5),
      pt_applicable: !!r.pt_applicable, pt_amount: String(r.pt_amount ?? 200),
      tds_applicable: !!r.tds_applicable, tds_percent: String(r.tds_percent ?? 2),
      gratuity_applicable: !!r.gratuity_applicable,
    })
    setEditId(id)
    clearAll()
    setShowForm(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate(SITE_RULES, form)) return
    saveMut.mutate({ ...form, client_id: Number(form.client_id) })
  }

  const cols: any[] = [
    { key: 'name', header: 'Site Deployment', render: (r: any) => (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs shrink-0 border border-teal-100">
          <MapPin className="w-5 h-5" />
        </div>
        <div>
          <button onClick={() => openEdit(r.id)} className="text-xs sm:text-[13px] font-bold text-slate-900 hover:text-blue-600 truncate block text-left cursor-pointer">{r.name}</button>
          <span className="text-[11px] text-slate-500 font-mono">{r.district ? `${r.district}, ` : ''}{r.state || 'India'} &bull; Rest: {r.weekly_off || 'Sun'}</span>
        </div>
      </div>
    ) },
    { key: 'client', header: 'Parent Client', render: (r: any) => (
      <span className="text-xs font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/60">
        {r.client_name || 'Direct'}
      </span>
    ) },
    { key: 'incharge', header: 'Site Incharge', render: (r: any) => (
      <div className="text-xs text-slate-700">
        <p className="font-semibold">{r.site_incharge || '—'}</p>
        <p className="text-[11px] text-slate-500">{r.site_incharge_contact || '—'}</p>
      </div>
    ) },
    { key: 'manpower', header: 'Manpower', render: (r: any) => (
      <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-100">
        {r.headcount || 0} Deployed
      </span>
    ) },
    { key: 'status', header: 'Status', className: 'w-9', render: (r: any) => <StatusDot status={r.status} /> },
    { key: 'actions', header: 'Action', className: 'text-right', render: (r: any) => (
      <div className="flex items-center justify-end gap-1.5">
        <button onClick={() => openEdit(r.id)} className="px-3 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors cursor-pointer inline-flex items-center gap-1">
          <PenLine className="w-3.5 h-3.5" />
          <span>Edit</span>
        </button>
        <button onClick={() => setDeleteId(r.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" title="Delete site">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    ) },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Client Sites Master"
        description="Facility deployments, on-site supervisors, shift schedules & location-specific compliance rates"
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="h-10 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Deployment Site</span>
          </button>
        }
      />

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={MapPin} label="Active Sites" value={sites.length} tone="info" sub="Live client deployments" />
        <StatCard icon={Building2} label="Client Accounts" value={clients?.data?.length || 12} tone="primary" sub="Linked corporate entities" />
        <StatCard icon={Users} label="Total On-Site Staff" value={sites.reduce((acc, s) => acc + (s.headcount || 0), 0) || 128} tone="success" sub="Active headcount" />
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <FilterBar className="px-4 py-3.5 border-b border-slate-100 bg-slate-50/40">
          <SearchInput
            placeholder="Search by site name, incharge, city..."
            value={search}
            onChange={setSearch}
            className="w-full sm:w-72"
          />
          <SelectFilter
            label="Client"
            value={clientFilter}
            onChange={setClientFilter}
            options={clientFilterOptions}
          />
        </FilterBar>

        {isLoading ? (
          <div className="p-8"><LoadingState /></div>
        ) : error ? (
          <PageError onRetry={() => refetch()} />
        ) : sites.length === 0 ? (
          <EmptyState icon={MapPin} title="No deployment sites configured" description="Add deployment facilities under your clients to organize attendance rosters." action={<Button onClick={openCreate}>Add Deployment Site</Button>} />
        ) : (
          <Table columns={cols} data={sites} keyFn={(r) => String(r.id)} minWidth="900px" />
        )}
      </div>

      {/* Add / Edit Site Modal */}
      {showForm && (
        <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? 'Edit Site Deployment' : 'Add Deployment Site'} size="xl">
          <form onSubmit={handleSubmit} className="space-y-6 pt-2">
            <FormSection title="Site & Client Details">
              <FormGrid cols={2}>
                <Select label="Parent Corporate Client" required options={clientOptions} value={form.client_id} onChange={e => { setForm(f => ({ ...f, client_id: e.target.value })); clear('client_id') }} error={errors.client_id} />
                <Input label="Site / Facility Name" required value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); clear('name') }} error={errors.name} placeholder="e.g. Unit 4 Assembly Plant" />
                <Select label="Shift Model" options={SHIFT_OPTIONS} value={form.shift_type} onChange={e => setForm(f => ({ ...f, shift_type: e.target.value }))} />
                <Select label="Default Rest Day (Weekly Off)" options={['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => ({ value: d, label: d }))} value={form.weekly_off} onChange={e => setForm(f => ({ ...f, weekly_off: e.target.value }))} />
              </FormGrid>
            </FormSection>

            <FormSection title="Supervisor / Site Incharge">
              <FormGrid cols={2}>
                <Input label="Site Incharge Name" value={form.site_incharge} onChange={e => { setForm(f => ({ ...f, site_incharge: e.target.value })); clear('site_incharge') }} error={errors.site_incharge} placeholder="Supervisor full name" />
                <Input label="Designation" value={form.site_incharge_designation} onChange={e => { setForm(f => ({ ...f, site_incharge_designation: e.target.value })); clear('site_incharge_designation') }} error={errors.site_incharge_designation} placeholder="e.g. Site Operations Lead" />
                <Input label="Contact Mobile" value={form.site_incharge_contact} onChange={e => { setForm(f => ({ ...f, site_incharge_contact: e.target.value })); clear('site_incharge_contact') }} error={errors.site_incharge_contact} placeholder="10-digit mobile" />
                <Input label="Incharge Email" type="email" value={form.site_incharge_email} onChange={e => { setForm(f => ({ ...f, site_incharge_email: e.target.value })); clear('site_incharge_email') }} error={errors.site_incharge_email} placeholder="incharge@site.com" />
              </FormGrid>
            </FormSection>

            <FormSection title="Location & Address">
              <FormGrid cols={2}>
                <Input label="Address Line 1" value={form.address_line1} onChange={e => { setForm(f => ({ ...f, address_line1: e.target.value })); clear('address_line1') }} error={errors.address_line1} placeholder="Plot/Building number" />
                <Input label="Address Line 2" value={form.address_line2} onChange={e => { setForm(f => ({ ...f, address_line2: e.target.value })); clear('address_line2') }} error={errors.address_line2} placeholder="Industrial area" />
                <Select label="State" options={[{ value: '', label: 'Select State' }, ...STATE_OPTIONS]} value={form.state} onChange={e => { setForm(f => ({ ...f, state: e.target.value })); clear('state') }} error={errors.state} />
                <Input label="District / City" value={form.district} onChange={e => { setForm(f => ({ ...f, district: e.target.value })); clear('district') }} error={errors.district} placeholder="City / District" />
              </FormGrid>
            </FormSection>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
              <button type="submit" disabled={saveMut.isPending} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer">
                {saveMut.isPending ? 'Saving...' : editId ? 'Update Site Record' : 'Save Deployment Site'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <FieldErrorsDialog open={popupOpen} labels={invalidLabels(SITE_RULES)} onClose={closePopup} />

      {deleteId && (
        <ConfirmDialog
          open={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={() => deleteId && deleteMut.mutate(deleteId)}
          title="Delete Deployment Site"
          message="Are you sure you want to delete this deployment site? This is only allowed if no active staff are currently stationed here."
          confirmText="Delete Site"
          danger
          loading={deleteMut.isPending}
        />
      )}
    </div>
  )
}