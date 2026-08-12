import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { employeeApi, clientApi, siteApi } from '@/services/api'
import { Button, Input, Select } from '@/components/ui/fields'
import { Table, Pagination, Badge } from '@/components/ui/data'
import type { Column } from '@/components/ui/data'
import { PageHeader, LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { ConfirmDialog, Modal } from '@/components/ui/overlay'
import { fullName, statusColor, statusLabel, dateShort } from '@/utils/format'
import { toast } from 'sonner'
import { Plus, Search, UserPlus, Trash2 } from 'lucide-react'
import EmployeeForm from './EmployeeForm'
import type { Employee } from '@/types/api'

export default function EmployeesPage() {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState('name')
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const queryClient = useQueryClient()

  const params = { search, page: String(page), page_size: '10', sort, order, ...filters }
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['employees', params], queryFn: () => employeeApi.list(params) })
  const { data: filterData } = useQuery({ queryKey: ['employee-filters'], queryFn: () => employeeApi.filters() })
  const { data: clients } = useQuery({ queryKey: ['clients-select'], queryFn: () => clientApi.list() })
  const { data: sites } = useQuery({ queryKey: ['sites-select'], queryFn: () => siteApi.list() })

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
  ]

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle={`${meta.total} total`}
        actions={<Button onClick={() => { setEditId(null); setShowForm(true) }}><UserPlus className="w-3.5 h-3.5" /> Add Employee</Button>}
      />

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-mute" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search by name, code, email, mobile..."
              className="w-full h-9 pl-8 pr-3 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink"
            />
          </div>
        </div>
        <Select
          options={filterOptions}
          value={filters.status || ''}
          onChange={(e) => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1) }}
          className="w-full sm:w-28"
        />
        <Select
          options={[{ value: '', label: 'All Clients' }, ...(clients?.data || []).map((c: any) => ({ value: String(c.id), label: c.name }))]}
          value={filters.client_id || ''}
          onChange={(e) => { setFilters(f => ({ ...f, client_id: e.target.value, site_id: '' })); setPage(1) }}
          className="w-full sm:w-36"
        />
        <Select
          options={[{ value: '', label: 'All Sites' }, ...siteOptions.filter((s: any) => !filters.client_id || String(s.client_id) === filters.client_id).map((s: any) => ({ value: String(s.id), label: s.name }))]}
          value={filters.site_id || ''}
          onChange={(e) => { setFilters(f => ({ ...f, site_id: e.target.value })); setPage(1) }}
          className="w-full sm:w-36"
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
          />
        </Modal>
      )}

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
