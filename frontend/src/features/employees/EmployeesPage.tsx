import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { employeeApi, clientApi, siteApi, recruitmentApi } from '@/services/api'
import { Button } from '@/components/ui/fields'
import { Table, Pagination } from '@/components/ui/data'
import type { Column } from '@/components/ui/data'
import { PageHeader } from '@/components/ui/layout'
import { LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { StatusBadge } from '@/components/ui/status'
import { FilterBar, SearchInput, SelectFilter, Avatar, ActionMenu } from '@/components/ui/actions'
import { Modal, ConfirmDialog } from '@/components/ui/overlay'
import { fullName, dateShort, money } from '@/utils/format'
import { downloadCsv } from '@/utils/csv'
import { toast } from 'sonner'
import { Plus, UserPlus, Upload, ChevronRight, Pencil, TrendingUp, FileText, ClipboardCheck, Printer, Trash2, SquareUserRound, CircleAlert, Download } from 'lucide-react'
import { isPending } from '@/utils/pending'
import EmployeeForm from './EmployeeForm'
import JoiningFormModal from './JoiningFormModal'
import SalaryRevisionModal from './SalaryRevisionModal'
import BulkEmployeeImport from './BulkEmployeeImport'
import type { Employee } from '@/types/api'

const DOC_TYPES = ['Aadhaar Card', 'PAN Card', 'Bank Proof', 'Joining Form', 'Education Certificate', 'Address Proof', 'Other']

const maskLast = (v: string | null | undefined): string => {
  const s = (v || '').trim()
  if (!s) return '—'
  if (s.length <= 4) return '••••'
  return `••••${s.slice(-4)}`
}

const PENDING_FIELDS = [
  { key: 'dob', label: 'DOB' },
  { key: 'father_name', label: "Father's Name" },
  { key: 'aadhaar', label: 'Aadhaar' },
  { key: 'bank_account', label: 'Bank A/C' },
  { key: 'bank_ifsc', label: 'IFSC' },
  { key: 'esi_number', label: 'ESIC' },
  { key: 'uan', label: 'UAN' },
] as const

export default function EmployeesPage() {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState('name')
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [focusField, setFocusField] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [docsFor, setDocsFor] = useState<any>(null)
  const [docForm, setDocForm] = useState({ document_type: DOC_TYPES[0], document_name: '', document_number: '' })
  const [onbFor, setOnbFor] = useState<any>(null)
  const [revFor, setRevFor] = useState<any>(null)
  const [joiningFor, setJoiningFor] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const queryClient = useQueryClient()

  const openEdit = (id: number, field?: string) => {
    setEditId(id)
    setFocusField(field || null)
    setShowForm(true)
  }

  const openAdd = () => {
    setEditId(null)
    setFocusField(null)
    setShowForm(true)
  }

  useEffect(() => {
    const focusId = searchParams.get('focus')
    if (focusId) {
      openEdit(Number(focusId), searchParams.get('field') || undefined)
      setSearchParams({}, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const params = { search, page: String(page), page_size: '10', sort, order, ...filters }
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['employees', params], queryFn: () => employeeApi.list(params) })
  const { data: clients } = useQuery({ queryKey: ['clients-select'], queryFn: () => clientApi.list() })
  const { data: sites } = useQuery({ queryKey: ['sites-select'], queryFn: () => siteApi.list() })
  const { data: docsData } = useQuery({
    queryKey: ['employee', docsFor?.id],
    queryFn: () => employeeApi.get(docsFor.id),
    enabled: !!docsFor,
  })
  const { data: onbData } = useQuery({
    queryKey: ['onboarding', onbFor?.id],
    queryFn: () => recruitmentApi.onboarding(onbFor.id),
    enabled: !!onbFor,
  })

  const docAddMut = useMutation({
    mutationFn: () => employeeApi.addDocument(docsFor.id, docForm),
    onSuccess: () => { setDocForm({ document_type: DOC_TYPES[0], document_name: '', document_number: '' }); queryClient.invalidateQueries({ queryKey: ['employee', docsFor.id] }); toast.success('Document added.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to add document.'),
  })

  const docDeleteMut = useMutation({
    mutationFn: (docId: number) => employeeApi.deleteDocument(docsFor.id, docId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['employee', docsFor.id] }); toast.success('Document removed.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to remove document.'),
  })

  const docVerifyMut = useMutation({
    mutationFn: ({ docId, verified }: { docId: number; verified: boolean }) => employeeApi.verifyDocument(docsFor.id, docId, verified),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['employee', docsFor.id] }); toast.success('Verification updated.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to update verification.'),
  })

  const onbToggleMut = useMutation({
    mutationFn: ({ taskId, done }: { taskId: number; done: boolean }) => recruitmentApi.toggleOnboardingTask(taskId, done),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['onboarding'] }) },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to update task.'),
  })

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => employeeApi.setStatus(id, status),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['employees'] }); toast.success('Status updated.') },
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => employeeApi.delete(id),
    onSuccess: () => { setDeleteId(null); queryClient.invalidateQueries({ queryKey: ['employees'] }); toast.success('Employee deleted.') },
  })

  const employees = (data?.data || []) as any[]
  const meta: any = data?.meta || { total: 0, page: 1, page_size: 10, total_pages: 0 }

  const pendingFor = (r: any) => PENDING_FIELDS.filter((f) => isPending(r[f.key]))

  const handleSort = (key: string) => {
    if (sort === key) setOrder(o => o === 'asc' ? 'desc' : 'asc')
    else { setSort(key); setOrder('asc') }
  }

  const siteOptions = (sites?.data || []) as any[]

  const exportCsv = () => {
    if (employees.length === 0) return
    downloadCsv(
      employees.map((r: any) => ({
        employee_code: r.employee_code,
        name: fullName(r.first_name, r.last_name),
        client: r.client_name || '',
        site: r.site_name || '',
        designation: r.designation || '',
        joining_date: r.joining_date || '',
        ctc: r.ctc || '',
        status: r.status || '',
        dob: r.dob || '',
        father_name: r.father_name || '',
        gender: r.gender || '',
        aadhaar: r.aadhaar || '',
        bank_account: r.bank_account || '',
        bank_ifsc: r.bank_ifsc || '',
        esi_number: r.esi_number || '',
        uan: r.uan || '',
      })),
      'employees'
    )
    toast.success('Employee list exported.')
  }

  const columns: Column<any>[] = [
    { key: 'name', header: 'Employee', sortable: true, render: (r) => (
      <span className="flex items-center gap-2.5 min-w-0">
        <Avatar name={fullName(r.first_name, r.last_name)} size="sm" />
        <span className="min-w-0">
          <button onClick={() => openEdit(r.id)} className="block text-[13px] font-medium text-ink hover:underline truncate max-w-44 cursor-pointer text-left">{fullName(r.first_name, r.last_name)}</button>
          <span className="block text-[11px] text-mute font-mono">{r.employee_code}</span>
        </span>
      </span>
    ) },
    { key: 'client_name', header: 'Client', hideSm: true, render: (r) => <span className="text-[12px] text-body">{r.client_name || '—'}</span> },
    { key: 'site_name', header: 'Site', hideSm: true, render: (r) => <span className="text-[12px] text-body">{r.site_name || '—'}</span> },
    { key: 'designation', header: 'Designation', hideSm: true, render: (r) => <span className="text-[12px] text-body">{r.designation || '—'}</span> },
    { key: 'joining', header: 'Joining', sortable: true, render: (r) => <span className="text-[12px] text-body whitespace-nowrap tabular-nums">{dateShort(r.joining_date)}</span> },
    { key: 'ctc', header: 'CTC', render: (r) => <span className="text-[12px] text-body font-medium whitespace-nowrap tabular-nums">{r.ctc ? money(Number(r.ctc)) : '—'}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'pending', header: '', className: 'w-24', render: (r) => {
      const p = pendingFor(r)
      if (p.length === 0) return null
      return (
        <span className="inline-flex items-center gap-1.5">
          <CircleAlert className="w-3.5 h-3.5 text-warning-deep" />
          <button
            onClick={() => openEdit(r.id, p[0].key)}
            title={`${p.length} pending field${p.length > 1 ? 's' : ''}`}
            className="text-[11px] font-medium text-warning-deep hover:underline cursor-pointer"
          >
            {p.length} pending
          </button>
        </span>
      )
    } },
    { key: 'expand', header: '', className: 'w-10', render: (r) => (
      <button
        onClick={() => setExpandedId((v) => (v === r.id ? null : r.id))}
        aria-expanded={expandedId === r.id}
        aria-label={expandedId === r.id ? 'Hide details' : 'Show details'}
        className="inline-flex items-center justify-center w-7 h-7 rounded-sm text-mute hover:text-ink hover:bg-canvas-soft transition-colors cursor-pointer"
      >
        <ChevronRight className={`w-4 h-4 transition-transform ${expandedId === r.id ? 'rotate-90' : ''}`} />
      </button>
    ) },
    { key: 'actions', header: '', className: 'w-10', render: (r) => (
      <ActionMenu
        items={[
          { label: 'Edit', icon: Pencil, onClick: () => openEdit(r.id) },
          { label: 'Revise Salary', icon: TrendingUp, onClick: () => setRevFor(r) },
          { label: 'Documents', icon: FileText, onClick: () => { setDocForm({ document_type: DOC_TYPES[0], document_name: '', document_number: '' }); setDocsFor(r) } },
          { label: 'Onboarding Checklist', icon: ClipboardCheck, onClick: () => setOnbFor(r) },
          { label: 'Joining Form', icon: Printer, onClick: () => setJoiningFor(r.id) },
          { divider: true },
          { label: r.status === 'active' ? 'Deactivate' : 'Activate', icon: SquareUserRound, onClick: () => statusMut.mutate({ id: r.id, status: r.status === 'active' ? 'inactive' : 'active' }) },
          { label: 'Delete', icon: Trash2, danger: true, onClick: () => setDeleteId(r.id) },
        ]}
      />
    ) },
  ]

  const renderExpanded = (r: any) => (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mono-label">Records & statutory info</span>
        <span className="text-[11px] text-mute">Sensitive fields masked — click Edit to view or change.</span>
      </div>
      <dl className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-3">
        <Detail label="Date of Birth" mono value={r.dob || '—'} pending={isPending(r.dob)} onEdit={() => openEdit(r.id, 'dob')} />
        <Detail label="Father's Name" value={r.father_name || '—'} pending={isPending(r.father_name)} onEdit={() => openEdit(r.id, 'father_name')} />
        <Detail label="Gender" value={r.gender || '—'} pending={false} />
        <Detail label="Aadhaar No." mono value={maskLast(r.aadhaar)} pending={isPending(r.aadhaar)} onEdit={() => openEdit(r.id, 'aadhaar')} />
        <Detail label="Bank A/C No." mono value={maskLast(r.bank_account)} pending={isPending(r.bank_account)} onEdit={() => openEdit(r.id, 'bank_account')} />
        <Detail label="IFSC Code" mono value={r.bank_ifsc || '—'} pending={isPending(r.bank_ifsc)} onEdit={() => openEdit(r.id, 'bank_ifsc')} />
        <Detail label="ESIC No." mono value={maskLast(r.esi_number)} pending={isPending(r.esi_number)} onEdit={() => openEdit(r.id, 'esi_number')} />
        <Detail label="UAN (PF) No." mono value={maskLast(r.uan)} pending={isPending(r.uan)} onEdit={() => openEdit(r.id, 'uan')} />
        <Detail label="Deactivated On" mono value={dateShort(r.deactivated_at)} pending={false} />
        <Detail label="Reactivated On" mono value={dateShort(r.reactivated_at)} pending={false} />
      </dl>
      {pendingFor(r).length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] text-mute mr-1">Pending:</span>
          {pendingFor(r).map((f) => (
            <button
              key={f.key}
              onClick={() => openEdit(r.id, f.key)}
              title={`Click to update ${f.label}`}
              className="px-2 py-0.5 text-[11px] rounded-sm bg-error-soft text-error-deep font-medium hover:underline cursor-pointer"
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )

  const filterOptions = [
    { value: '', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'resigned', label: 'Resigned' },
    { value: 'terminated', label: 'Terminated' },
  ]

  return (
    <div>
      <PageHeader
        title="Employees"
        description={`${meta.total} employee${meta.total === 1 ? '' : 's'} on record`}
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowImport(true)}><Upload className="w-3.5 h-3.5" /> Bulk Import</Button>
            <Button onClick={openAdd}><UserPlus className="w-3.5 h-3.5" /> Add Employee</Button>
          </>
        }
      />

      <div className="bg-white card-shadow rounded-md overflow-hidden">
        <FilterBar className="px-4 py-3 border-b border-hairline">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1) }}
            placeholder="Search by name, code, email, mobile..."
            className="w-full sm:w-72"
          />
          <SelectFilter
            label="Status"
            value={filters.status || ''}
            onChange={(v) => { setFilters((f) => ({ ...f, status: v })); setPage(1) }}
            options={filterOptions}
          />
          <SelectFilter
            label="Client"
            value={filters.client_id || ''}
            onChange={(v) => { setFilters((f) => ({ ...f, client_id: v, site_id: '' })); setPage(1) }}
            options={[{ value: '', label: 'All Clients' }, ...(clients?.data || []).map((c: any) => ({ value: String(c.id), label: c.name }))]}
          />
          <SelectFilter
            label="Site"
            value={filters.site_id || ''}
            onChange={(v) => { setFilters((f) => ({ ...f, site_id: v })); setPage(1) }}
            options={[
              { value: '', label: 'All Sites' },
              ...siteOptions.filter((s: any) => !filters.client_id || String(s.client_id) === filters.client_id).map((s: any) => ({ value: String(s.id), label: s.name })),
            ]}
          />
          <Button variant="secondary" size="sm" onClick={exportCsv} disabled={employees.length === 0} className="ml-auto" title="Download current results as CSV">
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
        </FilterBar>

        {isLoading ? (
          <div className="p-4"><LoadingState /></div>
        ) : error ? (
          <PageError onRetry={() => refetch()} />
        ) : employees.length === 0 && !search && !filters.status ? (
          <EmptyState
            title="No employees yet"
            description="Add your first employee to get started, or import them in bulk."
            action={<Button onClick={openAdd}><Plus className="w-3.5 h-3.5" /> Add Employee</Button>}
          />
        ) : (
          <>
            <Table
              columns={columns}
              data={employees}
              keyFn={(r) => String(r.id)}
              sortKey={sort}
              sortDir={order}
              onSort={handleSort}
              emptyMessage="No employees match your search."
              minWidth="1100px"
              expandedKey={expandedId}
              renderExpanded={renderExpanded}
            />
            {employees.length > 0 && (
              <div className="px-4 pt-3">
                <Pagination page={meta.page} totalPages={meta.total_pages} total={meta.total} pageSize={meta.page_size} onPage={setPage} />
              </div>
            )}
          </>
        )}
      </div>

      {showForm && (
        <Modal open={showForm} onClose={() => { setShowForm(false); setFocusField(null) }} title={editId ? 'Edit Employee' : 'Add Employee'} size="xl">
          <EmployeeForm
            employeeId={editId}
            focusField={focusField}
            onClose={() => { setShowForm(false); setFocusField(null) }}
            onSaved={(createdId) => { queryClient.invalidateQueries({ queryKey: ['employees'] }); setShowForm(false); setFocusField(null); toast.success(editId ? 'Employee updated.' : 'Employee added.'); if (createdId) setJoiningFor(createdId) }}
            onSwitchToEdit={(id) => setEditId(id)}
          />
        </Modal>
      )}

      <Modal open={showImport} onClose={() => setShowImport(false)} title="Bulk Import Employees" size="xl">
        {showImport && (
          <BulkEmployeeImport
            onClose={() => setShowImport(false)}
            onImported={() => { queryClient.invalidateQueries({ queryKey: ['employees'] }); toast.success('Employee data imported.') }}
          />
        )}
      </Modal>

      <Modal open={!!docsFor} onClose={() => setDocsFor(null)} title={`Documents — ${docsFor ? fullName(docsFor.first_name, docsFor.last_name) : ''}`} size="md">
        <div className="space-y-4">
          {(docsData?.data?.documents || []).length === 0 ? (
            <p className="text-[13px] text-mute py-3 text-center">No documents on record yet.</p>
          ) : (
            <div className="max-h-[40vh] overflow-y-auto scrollbar-thin -mx-1 px-1">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-left text-mute border-b border-hairline">
                    <th className="py-2 font-medium font-mono uppercase tracking-[0.04em] text-[11px]">Type</th>
                    <th className="py-2 font-medium font-mono uppercase tracking-[0.04em] text-[11px]">Number</th>
                    <th className="py-2 font-medium font-mono uppercase tracking-[0.04em] text-[11px]">Verified</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {(docsData?.data?.documents || []).map((d: any) => (
                    <tr key={d.id} className="border-b border-hairline last:border-0">
                      <td className="py-2 text-ink font-medium">{d.document_type}{d.document_name ? <span className="text-mute"> · {d.document_name}</span> : null}</td>
                      <td className="py-2 text-body font-mono">{d.document_number || '—'}</td>
                      <td className="py-2">
                        <button onClick={() => docVerifyMut.mutate({ docId: d.id, verified: !d.verified })} disabled={docVerifyMut.isPending} title={d.verified ? 'Verified — click to unmark' : 'Mark verified'}>
                          <StatusBadge status={d.verified ? 'Finalized' : 'Draft'} />
                        </button>
                      </td>
                      <td className="py-2 text-right">
                        <button onClick={() => docDeleteMut.mutate(d.id)} disabled={docDeleteMut.isPending} className="p-1 text-[11px] text-error hover:bg-error-soft rounded-xs cursor-pointer" aria-label="Remove document">
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="border-t border-hairline pt-3 space-y-2">
            <p className="mono-label">Add Document Record</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select value={docForm.document_type} onChange={e => setDocForm(f => ({ ...f, document_type: e.target.value }))} className="h-9 px-2 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-navy-mid">
                {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input placeholder="Document name" className="h-9 px-2.5 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-navy-mid placeholder:text-mute" value={docForm.document_name} onChange={e => setDocForm(f => ({ ...f, document_name: e.target.value }))} />
              <input placeholder="Document number" className="h-9 px-2.5 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-navy-mid placeholder:text-mute" value={docForm.document_number} onChange={e => setDocForm(f => ({ ...f, document_number: e.target.value }))} />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-mute flex items-center gap-1"><FileText className="w-3 h-3" /> Text records only — no file storage.</p>
              <Button size="sm" loading={docAddMut.isPending} onClick={() => docAddMut.mutate()}><Plus className="w-3 h-3" /> Add</Button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={!!onbFor} onClose={() => setOnbFor(null)} title={`Onboarding Checklist — ${onbFor ? fullName(onbFor.first_name, onbFor.last_name) : ''}`} size="sm">
        <div>
          {(onbData?.data || []).length === 0 ? (
            <p className="text-[13px] text-mute py-3 text-center">No checklist. It is created automatically when a candidate joins via Recruitment.</p>
          ) : (
            <div className="divide-y divide-hairline">
              {(onbData?.data || []).map((t: any) => (
                <label key={t.id} className="flex items-center gap-2.5 py-2 cursor-pointer select-none">
                  <input type="checkbox" checked={!!t.done} onChange={e => onbToggleMut.mutate({ taskId: t.id, done: e.target.checked })} className="w-3.5 h-3.5 accent-black" />
                  <span className={`text-[13px] ${t.done ? 'text-mute line-through' : 'text-ink'}`}>{t.task}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <SalaryRevisionModal
        open={!!revFor}
        onClose={() => setRevFor(null)}
        employeeId={revFor?.id ?? null}
        employeeName={revFor ? fullName(revFor.first_name, revFor.last_name) : undefined}
      />

      <JoiningFormModal employeeId={joiningFor} onClose={() => setJoiningFor(null)} />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMut.mutate(deleteId)}
        title="Delete Employee"
        message="Are you sure you want to delete this employee? This action cannot be undone."
        danger
        loading={deleteMut.isPending}
      />
    </div>
  )
}

function Detail({ label, value, mono = false, pending = false, onEdit }: { label: string; value: string; mono?: boolean; pending?: boolean; onEdit?: () => void }) {
  return (
    <div className="min-w-0">
      <dt className="mono-label mb-0.5">{label}</dt>
      <dd className="text-[13px] text-body">
        {pending ? (
          <button onClick={onEdit} className="text-error font-medium hover:underline cursor-pointer">Pending — fill in</button>
        ) : (
          <span className={`font-medium text-ink ${mono ? 'font-mono tabular-nums' : ''}`}>{value}</span>
        )}
      </dd>
    </div>
  )
}