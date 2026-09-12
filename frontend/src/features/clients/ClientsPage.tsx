import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientApi } from '@/services/api'
import { Button, Input, Select, Toggle, FormSection, FormGrid, FormDivider } from '@/components/ui/fields'
import { Modal, ConfirmDialog } from '@/components/ui/overlay'
import { FieldErrorsDialog, useFormValidation, type FieldRule } from '@/components/ui/validation'
import { Table } from '@/components/ui/data'
import { PageHeader } from '@/components/ui/layout'
import { StatusBadge } from '@/components/ui/status'
import { FilterBar, SearchInput, Avatar, ActionMenu } from '@/components/ui/actions'
import { LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { STATE_OPTIONS } from '@/utils/indianStates'
import { toast } from 'sonner'
import { Plus, Building2, Trash2, PenLine, Building, Users, FileText, Wallet, Landmark } from 'lucide-react'

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

  // Live preview of the generated Client Code before saving.
  useEffect(() => {
    if (editId || !form.name.trim()) {
      if (!editId) setCodePreview('')
      return
    }
    const t = setTimeout(() => {
      clientApi.generateCode(form.name).then((r: any) => setCodePreview(r?.data?.code || '')).catch(() => {})
    }, 300)
    return () => clearTimeout(t)
  }, [form.name, editId])

  const saveMut = useMutation({
    mutationFn: (d: any) => editId ? clientApi.update(editId, d) : clientApi.create(d),
    onSuccess: () => {
      setShowForm(false)
      setEditId(null)
      setForm(emptyForm)
      setCodePreview('')
      clearAll()
      qc.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Client saved.')
    },
    onError: (e: any) => {
      if (e?.error?.fields) { applyServerErrors(e.error.fields); toast.error('Please correct the highlighted fields.') }
      else toast.error(e?.error?.message || 'Failed to save client.')
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => clientApi.delete(id),
    onSuccess: () => { setDeleteId(null); qc.invalidateQueries({ queryKey: ['clients'] }); toast.success('Client deleted.') },
  })

  const openCreate = () => {
    setEditId(null)
    setForm(emptyForm)
    setCodePreview('')
    clearAll()
    setShowForm(true)
  }

  const openEdit = (id: number) => {
    setEditId(id)
    setCodePreview('')
    clearAll()
    setShowForm(true)
  }

  const closeForm = () => { setShowForm(false); setEditId(null); setForm(emptyForm); setCodePreview(''); clearAll() }

  const update = (key: string, value: any) => { setForm((f) => ({ ...f, [key]: value })); clear(key) }

  const cols: any[] = [
    { key: 'name', header: 'Client', render: (r: any) => (
      <span className="flex items-center gap-2.5 min-w-0">
        <Avatar name={r.name} tone="gold" />
        <span className="min-w-0">
          <span className="block text-[13px] font-medium text-ink truncate max-w-48">{r.name}</span>
          <span className="block text-[11px] font-mono text-link">{r.client_code || '—'}</span>
          {r.primary_contact_person && <span className="block text-[11px] text-mute truncate max-w-48">{r.primary_contact_person}</span>}
        </span>
      </span>
    ) },
    { key: 'company_email', header: 'Email', hideSm: true, render: (r: any) => <span className="text-[12px] text-body">{r.company_email || '—'}</span> },
    { key: 'location', header: 'Location', hideSm: true, render: (r: any) => <span className="text-[12px] text-body">{[r.state, r.district].filter(Boolean).join(', ') || '—'}</span> },
    { key: 'sites', header: 'Sites / Emp', hideSm: true, render: (r: any) => <span className="text-[12px] text-body">{r.site_count || 0} / {r.active_employees || 0} active</span> },
    { key: 'payroll_cycle', header: 'Payroll', hideSm: true, render: (r: any) => <span className="text-[12px] text-body">{r.payroll_cycle ? PAYROLL_CYCLE_OPTIONS.find(o => o.value === r.payroll_cycle)?.label || r.payroll_cycle : '—'}</span> },
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
        title="Clients"
        description={`${clients.length} client${clients.length === 1 ? '' : 's'} — business accounts with sites, payroll policies and billed workforce.`}
        actions={<Button onClick={openCreate}><Plus className="w-3.5 h-3.5" /> Add Client</Button>}
      />

      <div className="bg-white card-shadow rounded-md overflow-hidden">
        <FilterBar className="px-4 py-3 border-b border-hairline">
          <SearchInput value={search} onChange={setSearch} placeholder="Search clients..." className="w-full sm:w-72" />
        </FilterBar>

        {isLoading ? (
          <div className="p-4"><LoadingState /></div>
        ) : error ? (
          <PageError onRetry={() => refetch()} />
        ) : clients.length === 0 ? (
          <EmptyState icon={Building2} title="No clients" description="Add your first client to start managing sites and payroll." action={<Button onClick={openCreate}><Plus className="w-3.5 h-3.5" /> Add Client</Button>} />
        ) : (
          <Table columns={cols} data={clients} keyFn={(r) => String(r.id)} minWidth="900px" />
        )}
      </div>

      <Modal open={showForm} onClose={closeForm} title={editId ? 'Edit Client' : 'Add Client'} size="lg">
        <div className="space-y-4">
          <FormSection icon={Building} title="Client Details" subtitle="Company identity, business code and status" className="mb-4">
            <FormGrid cols={2}>
              <div>
                <Input label="Client Code" value={codePreview} readOnly onChange={() => {}} placeholder="Auto-generated" className="bg-canvas-soft/40 font-mono" />
                <p className="text-[11px] text-mute mt-1">{editId ? 'Business code. Not auto-changed on edits.' : 'Auto-generated from the client name. Unique across all clients.'}</p>
              </div>
              <Input label="Client Name" value={form.name} onChange={e => update('name', e.target.value)} placeholder="Client legal company name" error={errors.name} />
            </FormGrid>
            <FormGrid cols={2}>
              <Select label="Status" options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} value={form.status} onChange={e => update('status', e.target.value)} />
            </FormGrid>
          </FormSection>

          <FormSection icon={Users} title="Contact Details" subtitle="People responsible for this engagement" className="mb-4">
            <FormGrid cols={2}>
              <Input label="Primary Contact Person" value={form.primary_contact_person} onChange={e => update('primary_contact_person', e.target.value)} />
              <Input label="HR Contact Person" value={form.hr_contact_person} onChange={e => update('hr_contact_person', e.target.value)} />
              <Input label="Company Email ID" type="email" value={form.company_email} onChange={e => update('company_email', e.target.value)} error={errors.company_email} />
            </FormGrid>
            <FormDivider label="Registered Address" />
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

          <FormSection icon={FileText} title="Tax Documents" subtitle="GST and PAN used for invoices and compliance" className="mb-4">
            <FormGrid cols={2}>
              <Input label="GST No" value={form.gst_no} onChange={e => update('gst_no', e.target.value)} />
              <Input label="Company PAN" value={form.company_pan} onChange={e => update('company_pan', e.target.value)} />
            </FormGrid>
          </FormSection>

          <FormSection icon={Wallet} title="Payroll Settings" subtitle="Billing and salary policies for this client" className="mb-4">
            <FormGrid cols={2}>
              <Select label="Payroll Cycle" options={PAYROLL_CYCLE_OPTIONS} value={form.payroll_cycle} onChange={e => update('payroll_cycle', e.target.value)} />
              <Select label="Salary Calculation" options={SALARY_CALC_OPTIONS} value={form.salary_calculation} onChange={e => update('salary_calculation', e.target.value)} />
            </FormGrid>
            <FormDivider label="Policies" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
              <Toggle label="Overtime" hint="Overtime hours are captured and billed" checked={form.overtime_enabled} onChange={v => update('overtime_enabled', v)} />
              <Toggle label="Leave Policy" checked={form.leave_policy_enabled} onChange={v => update('leave_policy_enabled', v)} />
              <Toggle label="Arrears" checked={form.arrears_enabled} onChange={v => update('arrears_enabled', v)} />
              <Toggle label="Advance / Loan Facility" checked={form.advance_loan_enabled} onChange={v => update('advance_loan_enabled', v)} />
            </div>
          </FormSection>

          <FormSection icon={Landmark} title="Bank & Payment Details" subtitle="Remittance account for billing (masked elsewhere)" className="mb-4">
            <FormGrid cols={2}>
              <Input label="Bank Name" value={form.bank_name} onChange={e => update('bank_name', e.target.value)} />
              <Input label="IFSC" value={form.bank_ifsc} onChange={e => update('bank_ifsc', e.target.value)} />
              <Input label="Account No." value={form.bank_account} onChange={e => update('bank_account', e.target.value)} />
              <Input label="Account Holder Name" value={form.bank_account_holder} onChange={e => update('bank_account_holder', e.target.value)} />
            </FormGrid>
          </FormSection>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={closeForm}>Cancel</Button>
            <Button onClick={() => { if (validate(CLIENT_RULES, form)) saveMut.mutate(form) }} loading={saveMut.isPending}>Save</Button>
          </div>
        </div>
      </Modal>

      <FieldErrorsDialog open={popupOpen} labels={invalidLabels(CLIENT_RULES)} onClose={closePopup} />

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMut.mutate(deleteId)} title="Delete Client" message="This will also delete all associated sites and employees. Are you sure?" danger loading={deleteMut.isPending} />
    </div>
  )
}