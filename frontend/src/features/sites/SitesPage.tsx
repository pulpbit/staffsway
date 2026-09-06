import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { siteApi, clientApi } from '@/services/api'
import { Button, Input, Select, Toggle, Section } from '@/components/ui/fields'
import { Modal, ConfirmDialog } from '@/components/ui/overlay'
import { Table, Badge } from '@/components/ui/data'
import { PageHeader, LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { statusColor, statusLabel } from '@/utils/format'
import { STATE_OPTIONS } from '@/utils/indianStates'
import { toast } from 'sonner'
import { Plus, MapPin, Trash2, Building2, User, Clock, Wallet, ShieldCheck } from 'lucide-react'

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
  city: '',
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

export default function SitesPage() {
  const [search, setSearch] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const qc = useQueryClient()

  const params: Record<string, string> = {}
  if (search) params.search = search
  if (clientFilter) params.client_id = clientFilter

  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['sites', params], queryFn: () => siteApi.list(params) })
  const { data: clients } = useQuery({ queryKey: ['clients-select'], queryFn: () => clientApi.list() })
  const sites = (data?.data || []) as any[]
  const clientOptions = [{ value: '', label: 'Select client...' }, ...(clients?.data || []).map((c: any) => ({ value: String(c.id), label: c.name }))]

  const saveMut = useMutation({
    mutationFn: (d: any) => editId ? siteApi.update(editId, d) : siteApi.create(d),
    onSuccess: () => { setShowForm(false); setEditId(null); setForm(emptyForm); qc.invalidateQueries({ queryKey: ['sites'] }); toast.success('Site saved.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to save.'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => siteApi.delete(id),
    onSuccess: () => { setDeleteId(null); qc.invalidateQueries({ queryKey: ['sites'] }); toast.success('Site deleted.') },
  })

  const openCreate = () => { setEditId(null); setForm(emptyForm); setShowForm(true) }

  const openEdit = async (id: number) => {
    const r: any = (await siteApi.get(id)).data
    setForm({
      client_id: String(r.client_id),
      name: r.name || '',
      status: r.status || 'active',
      address_line1: r.address_line1 || '',
      address_line2: r.address_line2 || '',
      city: r.city || '',
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
    setEditId(id); setShowForm(true)
  }

  const update = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }))

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
    { key: 'name', header: 'Site Name', render: (r: any) => (
      <div>
        <p className="text-[13px] font-medium text-ink">{r.name}</p>
        <p className="text-[11px] text-body">{r.client_name}</p>
      </div>
    ) },
    { key: 'location', header: 'Location', hideSm: true, render: (r: any) => <span className="text-[12px] text-body">{[r.city, r.state].filter(Boolean).join(', ') || '—'}</span> },
    { key: 'incharge', header: 'Incharge', hideSm: true, render: (r: any) => <span className="text-[12px] text-body">{r.site_incharge || '—'}</span> },
    { key: 'shift', header: 'Shift', hideSm: true, render: (r: any) => <Badge className="bg-canvas-soft-2 text-body">{r.shift_type || 'General'}</Badge> },
    { key: 'statutory', header: 'Statutory', hideSm: true, render: (r: any) => {
      const list = ['PF', 'ESI', 'LWF', 'PT', 'TDS'].filter(k =>
        k === 'PF' ? r.pf_applicable : k === 'ESI' ? r.esic_applicable : k === 'LWF' ? r.lwf_applicable : k === 'PT' ? r.pt_applicable : r.tds_applicable
      )
      return <span className="text-[12px] text-body">{list.join(', ') || '—'}</span>
    } },
    { key: 'employees', header: 'Emp', hideSm: true, render: (r: any) => <span className="text-[12px] text-body">{r.active_employees || 0} / {r.total_employees || 0}</span> },
    { key: 'status', header: 'Status', render: (r: any) => <Badge className={statusColor(r.status)}>{statusLabel(r.status)}</Badge> },
    { key: 'actions', header: '', render: (r: any) => (
      <div className="flex items-center gap-1">
        <button onClick={() => openEdit(r.id)} className="px-1.5 py-0.5 text-[11px] text-body hover:bg-canvas-soft rounded-xs">Edit</button>
        <button onClick={() => setDeleteId(r.id)} className="px-1 py-0.5 text-[11px] text-error hover:bg-error-soft rounded-xs"><Trash2 className="w-3 h-3" /></button>
      </div>
    ) },
  ]

  return (
    <div>
      <PageHeader title="Sites" subtitle={`${sites.length} total`} actions={<Button onClick={openCreate}><Plus className="w-3.5 h-3.5" /> Add Site</Button>} />
      <div className="flex gap-2 mb-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sites..." className="flex-1 h-9 px-2.5 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink" />
        <Select options={[{ value: '', label: 'All Clients' }, ...(clients?.data || []).map((c: any) => ({ value: String(c.id), label: c.name }))]} value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="w-40" />
      </div>

      <div className="bg-white card-shadow rounded-md p-4">
        {isLoading ? <LoadingState /> : error ? <PageError onRetry={() => refetch()} /> : sites.length === 0 ? <EmptyState icon={MapPin} title="No sites" action={<Button onClick={openCreate}><Plus className="w-3.5 h-3.5" /> Add Site</Button>} /> : (
          <Table columns={cols} data={sites} keyFn={(r) => String(r.id)} />
        )}
      </div>

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditId(null); setForm(emptyForm) }} title={editId ? 'Edit Site' : 'Add Site'} size="lg">
        <div className="space-y-3">
          <Section icon={Building2} title="Basic Details">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1"><Select label="Parent Client" options={clientOptions} value={form.client_id} onChange={e => update('client_id', e.target.value)} /></div>
              <Input label="Site Name" value={form.name} onChange={e => update('name', e.target.value)} />
              <Select label="Status" options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} value={form.status} onChange={e => update('status', e.target.value)} />
            </div>
          </Section>

          <Section icon={MapPin} title="Address">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Registered Address — Line 1" value={form.address_line1} onChange={e => update('address_line1', e.target.value)} />
              <Input label="Registered Address — Line 2" value={form.address_line2} onChange={e => update('address_line2', e.target.value)} />
              <Input label="City" value={form.city} onChange={e => update('city', e.target.value)} />
              <Select label="State" options={STATE_OPTIONS} value={form.state} onChange={e => update('state', e.target.value)} />
              <Input label="District" value={form.district} onChange={e => update('district', e.target.value)} />
              <Input label="Pin Code" value={form.pincode} onChange={e => update('pincode', e.target.value)} />
            </div>
          </Section>

          <Section icon={User} title="Contact Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Site Incharge" value={form.site_incharge} onChange={e => update('site_incharge', e.target.value)} />
              <Input label="Designation" value={form.site_incharge_designation} onChange={e => update('site_incharge_designation', e.target.value)} />
              <Input label="Contact" value={form.site_incharge_contact} onChange={e => update('site_incharge_contact', e.target.value)} />
              <Input label="Email" type="email" value={form.site_incharge_email} onChange={e => update('site_incharge_email', e.target.value)} />
            </div>
          </Section>

          <Section icon={Clock} title="Operational Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select label="Shifts" options={SHIFT_OPTIONS} value={form.shift_type} onChange={e => update('shift_type', e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              <Toggle label="Overtime" checked={form.overtime_enabled} onChange={v => update('overtime_enabled', v)} />
            </div>
          </Section>

          <Section icon={Wallet} title="Payroll Settings">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              <Toggle label="Payroll Applicable" checked={form.payroll_applicable} onChange={v => update('payroll_applicable', v)} />
              <Toggle label="Leave Policy" checked={form.leave_policy_enabled} onChange={v => update('leave_policy_enabled', v)} />
              <Toggle label="Arrears" checked={form.arrears_enabled} onChange={v => update('arrears_enabled', v)} />
            </div>
          </Section>

          <Section icon={ShieldCheck} title="Statutory & Compliance">
            <div className="space-y-1">
              {statutoryRow('PF (Provident Fund)', 'pf_applicable', 'pf_percent', '%')}
              {statutoryRow('ESIC', 'esic_applicable', 'esic_percent', '%')}
              {statutoryRow('LWF (Labour Welfare Fund)', 'lwf_applicable', 'lwf_percent', '%')}
              {statutoryRow('PT (Professional Tax)', 'pt_applicable', 'pt_amount', '₹')}
              {statutoryRow('TDS', 'tds_applicable', 'tds_percent', '%')}
              <div className="flex-1 pt-1"><Toggle label="Gratuity" checked={form.gratuity_applicable} onChange={v => update('gratuity_applicable', v)} /></div>
            </div>
          </Section>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm) }}>Cancel</Button>
            <Button onClick={() => saveMut.mutate({ ...form, client_id: Number(form.client_id), pf_percent: Number(form.pf_percent), esic_percent: Number(form.esic_percent), lwf_percent: Number(form.lwf_percent), pt_amount: Number(form.pt_amount), tds_percent: Number(form.tds_percent) })} loading={saveMut.isPending}>Save</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMut.mutate(deleteId)} title="Delete Site" message="This will remove all employee assignments. Are you sure?" danger loading={deleteMut.isPending} />
    </div>
  )
}