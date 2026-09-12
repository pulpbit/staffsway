import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { siteApi, clientApi } from '@/services/api'
import { Button, Input, Select, Toggle, FormSection, FormGrid, FormDivider } from '@/components/ui/fields'
import { Modal, ConfirmDialog } from '@/components/ui/overlay'
import { FieldErrorsDialog, useFormValidation, type FieldRule } from '@/components/ui/validation'
import { Table, Badge } from '@/components/ui/data'
import { PageHeader } from '@/components/ui/layout'
import { StatusBadge } from '@/components/ui/status'
import { FilterBar, SearchInput, SelectFilter, Avatar, ActionMenu } from '@/components/ui/actions'
import { LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { STATE_OPTIONS } from '@/utils/indianStates'
import { toast } from 'sonner'
import { Plus, MapPin, Trash2, PenLine, Building2, User, Clock, Wallet, ShieldCheck, SlidersHorizontal } from 'lucide-react'

const SHIFT_OPTIONS = [
  { value: 'General', label: 'General' },
  { value: 'Morning', label: 'Morning' },
  { value: 'Evening', label: 'Evening' },
  { value: 'Night', label: 'Night' },
  { value: 'Rotational', label: 'Rotational' },
  { value: 'Split', label: 'Split' },
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
  { key: 'site_incharge_email', label: 'Incharge Email', test: (v: any) => v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Enter a valid email address.' : null },
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
  const clientOptions = [{ value: '', label: 'Select client...' }, ...(clients?.data || []).map((c: any) => ({ value: String(c.id), label: c.name }))]
  const clientFilterOptions = [{ value: '', label: 'All Clients' }, ...(clients?.data || []).map((c: any) => ({ value: String(c.id), label: c.name }))]

  const saveMut = useMutation({
    mutationFn: (d: any) => editId ? siteApi.update(editId, d) : siteApi.create(d),
    onSuccess: () => { setShowForm(false); setEditId(null); setForm(emptyForm); clearAll(); qc.invalidateQueries({ queryKey: ['sites'] }); toast.success('Site saved.') },
    onError: (e: any) => {
      if (e?.error?.fields) { applyServerErrors(e.error.fields); toast.error('Please correct the highlighted fields.') }
      else toast.error(e?.error?.message || 'Failed to save.')
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => siteApi.delete(id),
    onSuccess: () => { setDeleteId(null); qc.invalidateQueries({ queryKey: ['sites'] }); toast.success('Site deleted.') },
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
    setEditId(id); setShowForm(true); clearAll()
  }

  const closeForm = () => { setShowForm(false); setEditId(null); setForm(emptyForm); clearAll() }

  const update = (key: string, value: any) => { setForm((f) => ({ ...f, [key]: value })); clear(key) }

  const statutoryRow = (label: string, onKey: string, valKey: string, suffix: string) => (
    <div className="flex items-end gap-3">
      <div className="flex-1"><Toggle label={label} checked={!!(form as any)[onKey]} onChange={v => update(onKey, v)} /></div>
      <div className="w-32">
        <Input
          label={suffix === '₹' ? 'Amount' : 'Default %'}
          type="number"
          step="any"
          min="0"
          value={(form as any)[valKey]}
          disabled={!(form as any)[onKey]}
          onChange={e => update(valKey, e.target.value)}
          className="disabled:bg-canvas-soft/50 disabled:cursor-not-allowed"
        />
      </div>
    </div>
  )

  const cols: any[] = [
    { key: 'name', header: 'Site', render: (r: any) => (
      <span className="flex items-center gap-2.5 min-w-0">
        <Avatar name={r.name} />
        <span className="min-w-0">
          <span className="block text-[13px] font-medium text-ink truncate max-w-44">{r.name}</span>
          <span className="block text-[11px] text-body truncate max-w-44">{r.client_name || '—'}</span>
        </span>
      </span>
    ) },
    { key: 'location', header: 'Location', hideSm: true, render: (r: any) => <span className="text-[12px] text-body">{[r.state, r.district].filter(Boolean).join(', ') || '—'}</span> },
    { key: 'incharge', header: 'Incharge', hideSm: true, render: (r: any) => <span className="text-[12px] text-body">{r.site_incharge || '—'}</span> },
    { key: 'shift', header: 'Shift', hideSm: true, render: (r: any) => <Badge className="bg-canvas-soft-2 text-body">{r.shift_type || 'General'}</Badge> },
    { key: 'statutory', header: 'Statutory', hideSm: true, render: (r: any) => {
      const list = ['PF', 'ESI', 'LWF', 'PT', 'TDS'].filter(k =>
        k === 'PF' ? r.pf_applicable : k === 'ESI' ? r.esic_applicable : k === 'LWF' ? r.lwf_applicable : k === 'PT' ? r.pt_applicable : r.tds_applicable
      )
      return <span className="text-[12px] text-body">{list.join(', ') || '—'}</span>
    } },
    { key: 'employees', header: 'Emp', hideSm: true, render: (r: any) => <span className="text-[12px] text-body tabular-nums">{r.active_employees || 0} / {r.total_employees || 0}</span> },
    { key: 'status', header: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
    { key: 'actions', header: '', className: 'w-10', render: (r: any) => (
      <ActionMenu
        items={[
          { label: 'Edit', icon: PenLine, onClick: () => openEdit(r.id) },
          { label: 'Delete', icon: Trash2, danger: true, onClick: () => setDeleteId(r.id) },
        ]}
      />
    ) },
  ]

  return (
    <div>
      <PageHeader
        title="Sites"
        description={`${sites.length} site${sites.length === 1 ? '' : 's'} — physical locations with statutory and payroll configurations.`}
        actions={<Button onClick={openCreate}><Plus className="w-3.5 h-3.5" /> Add Site</Button>}
      />

      <div className="bg-white card-shadow rounded-md overflow-hidden">
        <FilterBar className="px-4 py-3 border-b border-hairline">
          <SearchInput value={search} onChange={setSearch} placeholder="Search sites..." className="w-full sm:w-72" />
          <SelectFilter label="Client" value={clientFilter} onChange={setClientFilter} options={clientFilterOptions} />
        </FilterBar>

        {isLoading ? (
          <div className="p-4"><LoadingState /></div>
        ) : error ? (
          <PageError onRetry={() => refetch()} />
        ) : sites.length === 0 ? (
          <EmptyState icon={MapPin} title="No sites" description="Add a site under a client to manage statutory and payroll settings." action={<Button onClick={openCreate}><Plus className="w-3.5 h-3.5" /> Add Site</Button>} />
        ) : (
          <Table columns={cols} data={sites} keyFn={(r) => String(r.id)} minWidth="1000px" />
        )}
      </div>

      <Modal open={showForm} onClose={closeForm} title={editId ? 'Edit Site' : 'Add Site'} size="lg">
        <div className="space-y-4">
          <FormSection icon={Building2} title="Site Details" subtitle="Placement and status under a parent client" className="mb-4">
            <FormGrid cols={3}>
              <Select label="Parent Client" options={clientOptions} value={form.client_id} onChange={e => update('client_id', e.target.value)} error={errors.client_id} />
              <Input label="Site Name" value={form.name} onChange={e => update('name', e.target.value)} error={errors.name} />
              <Select label="Status" options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} value={form.status} onChange={e => update('status', e.target.value)} />
            </FormGrid>
          </FormSection>

          <FormSection icon={MapPin} title="Address" subtitle="Registered address of the site" className="mb-4">
            <FormGrid cols={2}>
              <Input label="Address — Line 1" value={form.address_line1} onChange={e => update('address_line1', e.target.value)} />
              <Input label="Address — Line 2" value={form.address_line2} onChange={e => update('address_line2', e.target.value)} />
              <Select label="State" options={STATE_OPTIONS} value={form.state} onChange={e => update('state', e.target.value)} />
              <div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="District" value={form.district} onChange={e => update('district', e.target.value)} />
                  <Input label="Pin Code" value={form.pincode} onChange={e => update('pincode', e.target.value)} />
                </div>
              </div>
            </FormGrid>
          </FormSection>

          <FormSection icon={User} title="Contact Details" subtitle="Site incharge and operational contact" className="mb-4">
            <FormGrid cols={2}>
              <Input label="Site Incharge" value={form.site_incharge} onChange={e => update('site_incharge', e.target.value)} />
              <Input label="Designation" value={form.site_incharge_designation} onChange={e => update('site_incharge_designation', e.target.value)} />
              <Input label="Contact" value={form.site_incharge_contact} onChange={e => update('site_incharge_contact', e.target.value)} />
              <Input label="Email" type="email" value={form.site_incharge_email} onChange={e => update('site_incharge_email', e.target.value)} error={errors.site_incharge_email} />
            </FormGrid>
          </FormSection>

          <FormSection icon={SlidersHorizontal} title="Operational Details" subtitle="Shifts and overtime rules" className="mb-4">
            <FormGrid cols={2}>
              <Select label="Shifts" options={SHIFT_OPTIONS} value={form.shift_type} onChange={e => update('shift_type', e.target.value)} />
            </FormGrid>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
              <Toggle label="Overtime enabled" checked={form.overtime_enabled} onChange={v => update('overtime_enabled', v)} />
            </div>
          </FormSection>

          <FormSection icon={Wallet} title="Payroll Settings" subtitle="Participation in payroll and leave processing" className="mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
              <Toggle label="Payroll applicable" checked={form.payroll_applicable} onChange={v => update('payroll_applicable', v)} />
              <Toggle label="Leave policy" checked={form.leave_policy_enabled} onChange={v => update('leave_policy_enabled', v)} />
              <Toggle label="Arrears" checked={form.arrears_enabled} onChange={v => update('arrears_enabled', v)} />
            </div>
          </FormSection>

          <FormSection icon={ShieldCheck} title="Statutory & Compliance" subtitle="PF, ESI, LWF, PT, TDS defaults applied at this site" className="mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-2">
              {statutoryRow('PF (Provident Fund)', 'pf_applicable', 'pf_percent', '%')}
              {statutoryRow('ESIC', 'esic_applicable', 'esic_percent', '%')}
              {statutoryRow('LWF (Labour Welfare Fund)', 'lwf_applicable', 'lwf_percent', '%')}
              {statutoryRow('PT (Professional Tax)', 'pt_applicable', 'pt_amount', '₹')}
              {statutoryRow('TDS on Salary', 'tds_applicable', 'tds_percent', '%')}
            </div>
            <FormDivider label="Benefits" />
            <div className="max-w-sm">
              <Toggle label="Gratuity applicable" checked={form.gratuity_applicable} onChange={v => update('gratuity_applicable', v)} />
            </div>
          </FormSection>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={closeForm}>Cancel</Button>
            <Button onClick={() => { if (validate(SITE_RULES, form)) saveMut.mutate({ ...form, client_id: Number(form.client_id), pf_percent: Number(form.pf_percent), esic_percent: Number(form.esic_percent), lwf_percent: Number(form.lwf_percent), pt_amount: Number(form.pt_amount), tds_percent: Number(form.tds_percent) }) }} loading={saveMut.isPending}>Save</Button>
          </div>
        </div>
      </Modal>

      <FieldErrorsDialog open={popupOpen} labels={invalidLabels(SITE_RULES)} onClose={closePopup} />

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMut.mutate(deleteId)} title="Delete Site" message="This will remove all employee assignments. Are you sure?" danger loading={deleteMut.isPending} />
    </div>
  )
}