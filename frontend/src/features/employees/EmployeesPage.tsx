import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { employeeApi, clientApi, siteApi, recruitmentApi } from '@/services/api'
import { Button, Input, Select } from '@/components/ui/fields'
import { Table, Pagination, Badge } from '@/components/ui/data'
import type { Column } from '@/components/ui/data'
import { PageHeader, LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { ConfirmDialog, Modal } from '@/components/ui/overlay'
import { fullName, statusColor, statusLabel, dateShort } from '@/utils/format'
import { toast } from 'sonner'
import { Plus, Search, UserPlus, Trash2, FileText, ClipboardCheck, TrendingUp, Upload } from 'lucide-react'
import EmployeeForm from './EmployeeForm'
import SalaryRevisionModal from './SalaryRevisionModal'
import BulkEmployeeImport from './BulkEmployeeImport'
import type { Employee } from '@/types/api'

const DOC_TYPES = ['Aadhaar Card', 'PAN Card', 'Bank Proof', 'Joining Form', 'Education Certificate', 'Address Proof', 'Other']

export default function EmployeesPage() {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState('name')
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [docsFor, setDocsFor] = useState<any>(null)
  const [docForm, setDocForm] = useState({ document_type: DOC_TYPES[0], document_name: '', document_number: '' })
  const [onbFor, setOnbFor] = useState<any>(null)
  const [revFor, setRevFor] = useState<any>(null)
  const queryClient = useQueryClient()

  const params = { search, page: String(page), page_size: '10', sort, order, ...filters }
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['employees', params], queryFn: () => employeeApi.list(params) })
  const { data: filterData } = useQuery({ queryKey: ['employee-filters'], queryFn: () => employeeApi.filters() })
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

  const employees = (data?.data || []) as any[]
  const meta: any = data?.meta || { total: 0, page: 1, page_size: 10, total_pages: 0 }

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => employeeApi.setStatus(id, status),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['employees'] }); toast.success('Status updated.') },
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => employeeApi.delete(id),
    onSuccess: () => { setDeleteId(null); queryClient.invalidateQueries({ queryKey: ['employees'] }); toast.success('Employee deleted.') },
  })

  const columns: Column<any>[] = [
    { key: 'employee_code', header: 'Code', className: 'font-mono text-[11px] text-body' },
    { key: 'name', header: 'Name', sortable: true, render: (r) => (
      <div>
        <p className="text-[13px] font-medium text-ink">{fullName(r.first_name, r.last_name)}</p>
        <p className="text-[11px] text-mute">{r.designation}</p>
      </div>
    ) },
    { key: 'client_name', header: 'Client', hideSm: true, render: (r) => <span className="text-[12px] text-body">{r.client_name || '—'}</span> },
    { key: 'site_name', header: 'Site', hideSm: true, render: (r) => <span className="text-[12px] text-body">{r.site_name || '—'}</span> },
    { key: 'joining_date', header: 'Joined', sortable: true, hideSm: true, render: (r) => <span className="text-[12px] text-body">{dateShort(r.joining_date)}</span> },
    { key: 'status', header: 'Status', sortable: true, render: (r) => <Badge className={statusColor(r.status)}>{statusLabel(r.status)}</Badge> },
    { key: 'actions', header: '', render: (r) => (
      <div className="flex items-center gap-1">
        <button onClick={() => { setEditId(r.id); setShowForm(true) }} className="px-1.5 py-0.5 text-[11px] text-link hover:bg-link-soft rounded-xs">Edit</button>
        <button onClick={() => setRevFor(r)} className="px-1.5 py-0.5 text-[11px] text-body hover:bg-canvas-soft rounded-xs"><TrendingUp className="w-3 h-3 inline mr-0.5" />Revise</button>
        <button onClick={() => { setDocForm({ document_type: DOC_TYPES[0], document_name: '', document_number: '' }); setDocsFor(r) }} className="px-1.5 py-0.5 text-[11px] text-body hover:bg-canvas-soft rounded-xs">Docs</button>
        <button onClick={() => setOnbFor(r)} className="px-1.5 py-0.5 text-[11px] text-body hover:bg-canvas-soft rounded-xs"><ClipboardCheck className="w-3 h-3 inline mr-0.5" />Onboarding</button>
        <button onClick={() => statusMut.mutate({ id: r.id, status: r.status === 'active' ? 'inactive' : 'active' })} className="px-1.5 py-0.5 text-[11px] text-body hover:bg-canvas-soft rounded-xs">
          {r.status === 'active' ? 'Deactivate' : 'Activate'}
        </button>
        <button onClick={() => setDeleteId(r.id)} className="px-1 py-0.5 text-[11px] text-error hover:bg-error-soft rounded-xs"><Trash2 className="w-3 h-3" /></button>
      </div>
    ) },
  ]

  const handleSort = (key: string) => {
    if (sort === key) setOrder(o => o === 'asc' ? 'desc' : 'asc')
    else { setSort(key); setOrder('asc') }
  }

  const siteOptions = (sites?.data || []) as any[]
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
        subtitle={`${meta.total} total`}
        actions={<div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setShowImport(true)}><Upload className="w-3.5 h-3.5" /> Bulk Import</Button>
          <Button onClick={() => { setEditId(null); setShowForm(true) }}><UserPlus className="w-3.5 h-3.5" /> Add Employee</Button>
        </div>}
      />

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-mute" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by name, code, email, mobile..."
            className="w-full h-9 pl-8 pr-3 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink"
          />
        </div>
        <Select
          options={filterOptions}
          value={filters.status || ''}
          onChange={(e) => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1) }}
          wrapperClassName="w-full sm:w-28 shrink-0"
        />
        <Select
          options={[{ value: '', label: 'All Clients' }, ...(clients?.data || []).map((c: any) => ({ value: String(c.id), label: c.name }))]}
          value={filters.client_id || ''}
          onChange={(e) => { setFilters(f => ({ ...f, client_id: e.target.value, site_id: '' })); setPage(1) }}
          wrapperClassName="w-full sm:w-36 shrink-0"
        />
        <Select
          options={[{ value: '', label: 'All Sites' }, ...siteOptions.filter((s: any) => !filters.client_id || String(s.client_id) === filters.client_id).map((s: any) => ({ value: String(s.id), label: s.name }))]}
          value={filters.site_id || ''}
          onChange={(e) => { setFilters(f => ({ ...f, site_id: e.target.value })); setPage(1) }}
          wrapperClassName="w-full sm:w-36 shrink-0"
        />
      </div>

      <div className="bg-white card-shadow rounded-md p-4">
        {isLoading ? <LoadingState /> :
         error ? <PageError onRetry={() => refetch()} /> :
         employees.length === 0 && !search && !filters.status ? (
           <EmptyState title="No employees yet" description="Add your first employee to get started." action={<Button onClick={() => { setEditId(null); setShowForm(true) }}><Plus className="w-3.5 h-3.5" /> Add Employee</Button>} />
         ) : (
           <>
             <Table columns={columns} data={employees} keyFn={(r) => String(r.id)} sortKey={sort} sortDir={order} onSort={handleSort} emptyMessage="No employees match your search." />
             <Pagination page={meta.page} totalPages={meta.total_pages} total={meta.total} pageSize={meta.page_size} onPage={setPage} />
           </>
         )}
      </div>

      {showForm && (
        <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? 'Edit Employee' : 'Add Employee'} size="lg">
          <EmployeeForm
            employeeId={editId}
            onClose={() => setShowForm(false)}
            onSaved={() => { queryClient.invalidateQueries({ queryKey: ['employees'] }); setShowForm(false); toast.success(editId ? 'Employee updated.' : 'Employee added.') }}
            onSwitchToEdit={(id) => setEditId(id)}
          />
        </Modal>
      )}

      <Modal open={showImport} onClose={() => setShowImport(false)} title="Bulk Import Employees" size="lg">
        {showImport && (
          <BulkEmployeeImport
            onClose={() => setShowImport(false)}
            onImported={() => { queryClient.invalidateQueries({ queryKey: ['employees'] }); toast.success('Employee data imported.') }}
          />
        )}
      </Modal>

      <Modal open={!!docsFor} onClose={() => setDocsFor(null)} title={`Documents — ${docsFor ? fullName(docsFor.first_name, docsFor.last_name) : ''}`} size="md">
        <div className="space-y-4">
          <div className="max-h-[40vh] overflow-y-auto">
            {(docsData?.data?.documents || []).length === 0 ? (
              <p className="text-[13px] text-mute py-3 text-center">No documents on record yet.</p>
            ) : (
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-left text-mute border-b border-hairline">
                    <th className="py-1.5 font-medium">Type</th>
                    <th className="py-1.5 font-medium">Number</th>
                    <th className="py-1.5 font-medium">Verified</th>
                    <th className="py-1.5" />
                  </tr>
                </thead>
                <tbody>
                  {(docsData?.data?.documents || []).map((d: any) => (
                    <tr key={d.id} className="border-b border-hairline last:border-0">
                      <td className="py-1.5 text-ink font-medium">{d.document_type}{d.document_name ? <span className="text-mute"> · {d.document_name}</span> : null}</td>
                      <td className="py-1.5 text-body font-mono">{d.document_number || '—'}</td>
                      <td className="py-1.5">
                        <button onClick={() => docVerifyMut.mutate({ docId: d.id, verified: !d.verified })} disabled={docVerifyMut.isPending} title={d.verified ? 'Verified — click to unmark' : 'Mark verified'}>
                          {d.verified
                            ? <Badge className="bg-success-soft text-success">Verified</Badge>
                            : <Badge className="bg-canvas-soft-2 text-mute">Pending</Badge>}
                        </button>
                      </td>
                      <td className="py-1.5 text-right">
                        <button onClick={() => docDeleteMut.mutate(d.id)} disabled={docDeleteMut.isPending} className="px-1.5 py-0.5 text-[11px] text-error hover:bg-error-soft rounded-xs"><Trash2 className="w-3 h-3 inline" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="border-t border-hairline pt-3 space-y-2">
            <p className="mono-label">Add Document Record</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select value={docForm.document_type} onChange={e => setDocForm(f => ({ ...f, document_type: e.target.value }))} className="h-9 px-2 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink">
                {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <Input label="" placeholder="Document name" value={docForm.document_name} onChange={e => setDocForm(f => ({ ...f, document_name: e.target.value }))} />
              <Input label="" placeholder="Document number" value={docForm.document_number} onChange={e => setDocForm(f => ({ ...f, document_number: e.target.value }))} />
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
