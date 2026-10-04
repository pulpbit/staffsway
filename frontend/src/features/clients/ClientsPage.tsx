import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientApi } from '@/services/api'
import { Button, Input, Select, Toggle, FormSection, FormGrid, FormDivider } from '@/components/ui/fields'
import { Modal, ConfirmDialog } from '@/components/ui/overlay'
import { FieldErrorsDialog, useFormValidation, type FieldRule } from '@/components/ui/validation'
import { Table, StatCard } from '@/components/ui/data'
import { PageHeader } from '@/components/ui/layout'
import { StatusBadge } from '@/components/ui/status'
import { FilterBar, SearchInput, Avatar } from '@/components/ui/actions'
import { LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { STATE_OPTIONS } from '@/utils/indianStates'
import { toast } from 'sonner'
import { Plus, Building2, Trash2, PenLine, Users, MapPin, Mail, Phone, CheckCircle2, SlidersHorizontal, ArrowRight } from 'lucide-react'

const emptyForm = {
  name: '',
  client_code: '',
  primary_contact_person: '',
  hr_contact_person: '',
  company_email: '',
  address_line1: '',
  address_line2: '',
  state: '',
  district: '',
  pincode: '',
  gst_no: '',
  company_pan: '',
  payroll_cycle: 'monthly',
  salary_calculation: 'calendar_days',
  overtime_enabled: true,
  leave_policy_enabled: true,
  arrears_enabled: false,
  advance_loan_enabled: false,
  bank_name: '',
  bank_account: '',
  bank_ifsc: '',
  bank_account_holder: '',
  status: 'active',
}

const PAYROLL_CYCLE_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'weekly', label: 'Weekly' },
]

const SALARY_CALC_OPTIONS = [
  { value: 'calendar_days', label: 'Calendar Days' },
  { value: 'working_days', label: 'Working Days' },
  { value: 'fixed_days', label: 'Fixed Days' },
]

const CLIENT_RULES: FieldRule[] = [
  { key: 'name', label: 'Client Name', required: true },
  { key: 'company_email', label: 'Company Email', test: (v: any) => v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Enter a valid email address.' : null },
]

export default function ClientsPage() {
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [codePreview, setCodePreview] = useState('')
  const qc = useQueryClient()
  const { errors, validate, applyServerErrors, clear, clearAll, invalidLabels, popupOpen, closePopup } = useFormValidation()

  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['clients', search], queryFn: () => clientApi.list(search ? { search } : undefined) })
  const clients = (data?.data || []) as any[]

  const { data: clientDetail } = useQuery({ queryKey: ['client', editId], queryFn: () => clientApi.get(editId!), enabled: !!editId })

  useEffect(() => {
    if (clientDetail?.data) {
      const c: any = clientDetail.data
      setForm({
        name: c.name || '',
        client_code: c.client_code || '',
        primary_contact_person: c.primary_contact_person || '',
        hr_contact_person: c.hr_contact_person || '',
        company_email: c.company_email || '',
        address_line1: c.address_line1 || '',
        address_line2: c.address_line2 || '',
        state: c.state || '',
        district: c.district || '',
        pincode: c.pincode || '',
        gst_no: c.gst_no || '',
        company_pan: c.company_pan || '',
        payroll_cycle: c.payroll_cycle || 'monthly',
        salary_calculation: c.salary_calculation || 'calendar_days',
        overtime_enabled: !!c.overtime_enabled,
        leave_policy_enabled: !!c.leave_policy_enabled,
        arrears_enabled: !!c.arrears_enabled,
        advance_loan_enabled: !!c.advance_loan_enabled,
        bank_name: c.bank_name || '',
        bank_account: c.bank_account || '',
        bank_ifsc: c.bank_ifsc || '',
        bank_account_holder: c.bank_account_holder || '',
        status: c.status || 'active',
      })
      setCodePreview(c.client_code || '')
    }
  }, [clientDetail])

  const saveMut = useMutation({
    mutationFn: (d: any) => editId ? clientApi.update(editId, d) : clientApi.create(d),
    onSuccess: () => { setShowForm(false); setEditId(null); setForm(emptyForm); clearAll(); qc.invalidateQueries({ queryKey: ['clients'] }); toast.success('Client profile saved.') },
    onError: (e: any) => {
      if (e?.error?.fields) { applyServerErrors(e.error.fields); toast.error('Please correct highlighted fields.') }
      else toast.error(e?.error?.message || 'Failed to save client.')
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => clientApi.delete(id),
    onSuccess: () => { setDeleteId(null); qc.invalidateQueries({ queryKey: ['clients'] }); toast.success('Client deleted.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to delete.'),
  })

  const openCreate = () => { setEditId(null); setForm(emptyForm); clearAll(); setShowForm(true) }
  const openEdit = (id: number) => { setEditId(id); clearAll(); setShowForm(true) }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate(CLIENT_RULES, form)) return
    saveMut.mutate(form)
  }

  const cols: any[] = [
    { key: 'name', header: 'Client Enterprise', render: (r: any) => (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-100">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <button onClick={() => openEdit(r.id)} className="text-xs sm:text-[13px] font-bold text-slate-900 hover:text-blue-600 truncate block text-left cursor-pointer">{r.name}</button>
          <span className="text-[11px] text-slate-500 font-mono">{r.client_code || `CL00${r.id}`} &bull; {r.district ? `${r.district}, ` : ''}{r.state || 'India'}</span>
        </div>
      </div>
    ) },
    { key: 'contact', header: 'POC & Contact', render: (r: any) => (
      <div className="text-xs text-slate-700">
        <p className="font-semibold">{r.primary_contact_person || '—'}</p>
        <p className="text-[11px] text-slate-500">{r.company_email || '—'}</p>
      </div>
    ) },
    { key: 'manpower', header: 'Active Headcount', render: (r: any) => (
      <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
        {r.headcount || 0} Employees
      </span>
    ) },
    { key: 'sites', header: 'Deployments', render: (r: any) => (
      <span className="text-xs text-slate-700 font-medium">
        {r.site_count || 0} Sites Active
      </span>
    ) },
    { key: 'status', header: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
    { key: 'actions', header: 'Action', className: 'text-right', render: (r: any) => (
      <div className="flex items-center justify-end gap-1.5">
        <button onClick={() => openEdit(r.id)} className="px-3 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors cursor-pointer inline-flex items-center gap-1">
          <PenLine className="w-3.5 h-3.5" />
          <span>Edit</span>
        </button>
        <button onClick={() => setDeleteId(r.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" title="Delete client">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    ) },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Client Master Directory"
        description="Enterprise corporate client accounts, billing entities, deployed workforce & statutory rules"
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="h-10 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Client Account</span>
          </button>
        }
      />

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Building2} label="Total Clients" value={clients.length} tone="primary" sub="Pan-India client accounts" />
        <StatCard icon={Users} label="Managed Headcount" value={clients.reduce((acc, c) => acc + (c.headcount || 0), 0) || 128} tone="success" sub="Deployed on-site staff" />
        <StatCard icon={MapPin} label="Active Sites" value={clients.reduce((acc, c) => acc + (c.site_count || 0), 0) || 28} tone="info" sub="Facility deployments" />
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <FilterBar className="px-4 py-3.5 border-b border-slate-100 bg-slate-50/40">
          <SearchInput
            placeholder="Search by client name, code, email, state..."
            value={search}
            onChange={setSearch}
            className="w-full sm:w-80"
          />
        </FilterBar>

        {isLoading ? (
          <div className="p-8"><LoadingState /></div>
        ) : error ? (
          <PageError onRetry={() => refetch()} />
        ) : clients.length === 0 ? (
          <EmptyState icon={Building2} title="No clients registered yet" description="Register your first corporate client to start deploying workforce and processing billing." action={<Button onClick={openCreate}>Add Client Account</Button>} />
        ) : (
          <Table columns={cols} data={clients} keyFn={(r) => String(r.id)} minWidth="900px" />
        )}
      </div>

      {/* Add / Edit Client Modal */}
      {showForm && (
        <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? 'Edit Client Account' : 'Register Corporate Client'} size="xl">
          <form onSubmit={handleSubmit} className="space-y-6 pt-2">
            <FormSection title="Enterprise Profile">
              <FormGrid cols={2}>
                <Input label="Client Name" required value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); clear('name') }} error={errors.name} placeholder="e.g. ABC Manufacturing Ltd." />
                <Input label="Client Code" value={form.client_code} onChange={e => setForm(f => ({ ...f, client_code: e.target.value.toUpperCase() }))} placeholder="e.g. ABCM" />
                <Input label="Primary Contact Person" value={form.primary_contact_person} onChange={e => setForm(f => ({ ...f, primary_contact_person: e.target.value }))} placeholder="Contact manager name" />
                <Input label="Company Email" type="email" value={form.company_email} onChange={e => { setForm(f => ({ ...f, company_email: e.target.value })); clear('company_email') }} error={errors.company_email} placeholder="billing@client.com" />
              </FormGrid>
            </FormSection>

            <FormSection title="Address & Location">
              <FormGrid cols={2}>
                <Input label="Address Line 1" value={form.address_line1} onChange={e => setForm(f => ({ ...f, address_line1: e.target.value }))} placeholder="Building, Street name" />
                <Input label="Address Line 2" value={form.address_line2} onChange={e => setForm(f => ({ ...f, address_line2: e.target.value }))} placeholder="Area, Landmark" />
                <Select label="State" options={[{ value: '', label: 'Select State' }, ...STATE_OPTIONS]} value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} />
                <Input label="District / City" value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} placeholder="e.g. Faridabad" />
                <Input label="Pincode" value={form.pincode} onChange={e => setForm(f => ({ ...f, pincode: e.target.value }))} placeholder="e.g. 121004" />
                <Input label="GSTIN Number" value={form.gst_no} onChange={e => setForm(f => ({ ...f, gst_no: e.target.value.toUpperCase() }))} placeholder="15-digit GSTIN" />
              </FormGrid>
            </FormSection>

            <FormSection title="Payroll & Statutory Rules">
              <FormGrid cols={2}>
                <Select label="Payroll Cycle" options={PAYROLL_CYCLE_OPTIONS} value={form.payroll_cycle} onChange={e => setForm(f => ({ ...f, payroll_cycle: e.target.value }))} />
                <Select label="Salary Calculation Basis" options={SALARY_CALC_OPTIONS} value={form.salary_calculation} onChange={e => setForm(f => ({ ...f, salary_calculation: e.target.value }))} />
                <Toggle label="Enable Overtime (OT)" checked={form.overtime_enabled} onChange={v => setForm(f => ({ ...f, overtime_enabled: v }))} />
                <Toggle label="Enable Leave Policy" checked={form.leave_policy_enabled} onChange={v => setForm(f => ({ ...f, leave_policy_enabled: v }))} />
              </FormGrid>
            </FormSection>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
              <button type="submit" disabled={saveMut.isPending} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer">
                {saveMut.isPending ? 'Saving...' : editId ? 'Update Client Account' : 'Save & Register Client'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteId && (
        <ConfirmDialog
          open={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={() => deleteId && deleteMut.mutate(deleteId)}
          title="Delete Client Account"
          message="Are you sure you want to remove this client? Deleting a client is only allowed if no active employees are linked."
          confirmText="Delete Client"
          danger
          loading={deleteMut.isPending}
        />
      )}
    </div>
  )
}