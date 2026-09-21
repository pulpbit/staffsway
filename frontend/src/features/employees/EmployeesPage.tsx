import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom'
import { employeeApi, clientApi, siteApi, recruitmentApi } from '@/services/api'
import { Button } from '@/components/ui/fields'
import { Table, Pagination } from '@/components/ui/data'
import type { Column } from '@/components/ui/data'
import { PageHeader } from '@/components/ui/layout'
import { LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { StatusBadge } from '@/components/ui/status'
import { FilterBar, SearchInput, SelectFilter, Avatar } from '@/components/ui/actions'
import { Modal, ConfirmDialog } from '@/components/ui/overlay'
import { fullName, dateShort, money } from '@/utils/format'
import { downloadCsv } from '@/utils/csv'
import { stateShort } from '@/utils/states'
import { toast } from 'sonner'
import { Plus, UserPlus, Upload, Pencil, Eye, Users, CalendarDays, LogOut, SlidersHorizontal, ChevronDown, X, Download, ScrollText } from 'lucide-react'
import EmployeeForm from './EmployeeForm'
import JoiningFormModal from './JoiningFormModal'
import SalaryRevisionModal from './SalaryRevisionModal'
import BulkEmployeeImport from './BulkEmployeeImport'
import EmployeeProfileDrawer from './EmployeeProfileDrawer'

export default function EmployeesPage() {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [advanced, setAdvanced] = useState<Record<string, string>>({})
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState('name')
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [focusField, setFocusField] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [onbFor, setOnbFor] = useState<any>(null)
  const [revFor, setRevFor] = useState<any>(null)
  const [joiningFor, setJoiningFor] = useState<number | null>(null)
  const [viewRow, setViewRow] = useState<any>(null)
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

  const openView = (r: any) => {
    setViewRow(r)
  }

  const closeView = () => setViewRow(null)

  const resetPaging = () => setPage(1)

  const setFilter = (key: string, v: string) => {
    setFilters((f) => ({ ...f, [key]: v }))
    if (key === 'client_id') setAdvanced((a) => ({ ...a, site_id: '' }))
    resetPaging()
  }

  const setAdv = (key: string, v: string) => {
    setAdvanced((a) => ({ ...a, [key]: v }))
    resetPaging()
  }

  useEffect(() => {
    const focusId = searchParams.get('focus')
    if (focusId) {
      openEdit(Number(focusId), searchParams.get('field') || undefined)
      setSearchParams({}, { replace: true })
    } else if (searchParams.has('add')) {
      openAdd()
      setSearchParams({}, { replace: true })
    } else if (searchParams.has('import')) {
      setShowImport(true)
      setSearchParams({}, { replace: true })
    }
    const joinId = (location.state as { joinId?: number } | null)?.joinId
    if (joinId) {
      setJoiningFor(Number(joinId))
      navigate(location.pathname, { replace: true, state: {} })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const params = { search, page: String(page), page_size: '50', sort, order, ...filters, ...advanced }
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['employees', params], queryFn: () => employeeApi.list(params) })
  const { data: stats } = useQuery({ queryKey: ['employees-stats'], queryFn: () => employeeApi.stats(), refetchInterval: 60_000 })
  const { data: filterMeta } = useQuery({ queryKey: ['employees-filters'], queryFn: () => employeeApi.filters() })
  const { data: clients } = useQuery({ queryKey: ['clients-select'], queryFn: () => clientApi.list() })
  const { data: sites } = useQuery({ queryKey: ['sites-select'], queryFn: () => siteApi.list() })

  const { data: onbData } = useQuery({
    queryKey: ['onboarding', onbFor?.id],
    queryFn: () => recruitmentApi.onboarding(onbFor.id),
    enabled: !!onbFor,
  })

  const onbToggleMut = useMutation({
    mutationFn: ({ taskId, done }: { taskId: number; done: boolean }) => recruitmentApi.toggleOnboardingTask(taskId, done),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['onboarding'] }) },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to update task.'),
  })

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => employeeApi.setStatus(id, status),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['employees'] }); queryClient.invalidateQueries({ queryKey: ['employees-stats'] }); toast.success('Status updated.'); },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to update status.'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => employeeApi.delete(id),
    onSuccess: () => { setDeleteId(null); queryClient.invalidateQueries({ queryKey: ['employees'] }); queryClient.invalidateQueries({ queryKey: ['employees-stats'] }); toast.success('Employee deleted.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to delete employee.'),
  })

  const employees = (data?.data || []) as any[]
  const meta: any = data?.meta || { total: 0, page: 1, page_size: 10, total_pages: 0 }
  const stat = stats?.data || { total: 0, active: 0, inactive: 0, joined_this_month: 0, exit_this_month: 0, on_leave_today: 0 }
  const departments = filterMeta?.data?.departments || []
  const designations = filterMeta?.data?.designations || []
  const employeeTypes = filterMeta?.data?.employee_types || []

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
        status: r.status || '',
        name: fullName(r.first_name, r.last_name),
        father_name: r.father_name || r.spouse_name || '',
        gender: r.gender || '',
        dob: r.dob || '',
        aadhaar: r.aadhaar || '',
        pan: r.pan || '',
        state: r.state || '',
        mobile: r.mobile || '',
        designation: r.designation || '',
        basic: r.basic || '',
        hra: r.hra || '',
        joining_date: r.joining_date || '',
        exit_date: r.exit_date || '',
        bank_account: r.bank_account || '',
        bank_ifsc: r.bank_ifsc || '',
        uan: r.uan || '',
        esi_number: r.esi_number || '',
        client: r.client_name || '',
        site: r.site_name || '',
      })),
      'employees'
    )
    toast.success('Employee list exported.')
  }

  const columns: Column<any>[] = [
    { key: 'employee_code', header: 'Emp. ID', sticky: true, sortable: true, className: 'w-24', render: (r) => <span className="font-mono text-[12px] font-medium text-ink whitespace-nowrap">{r.employee_code}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'name', header: 'Employee Name', sortable: true, render: (r) => (
      <span className="flex items-center gap-2.5 min-w-0">
        <Avatar name={fullName(r.first_name, r.last_name)} size="sm" />
        <button onClick={() => openEdit(r.id)} className="text-[13px] font-medium text-ink hover:underline truncate max-w-40 cursor-pointer text-left">{fullName(r.first_name, r.last_name)}</button>
      </span>
    ) },
    { key: 'father_name', header: 'Father\'s/Spouse', hideSm: true, render: (r) => <span className="text-[12px] text-body">{r.father_name || r.spouse_name || '—'}</span> },
    { key: 'gender', header: 'Gender', hideSm: true, render: (r) => <span className="text-[12px] text-body">{r.gender || '—'}</span> },
    { key: 'dob', header: 'DOB', render: (r) => <span className="text-[12px] text-body whitespace-nowrap tabular-nums">{dateShort(r.dob)}</span> },
    { key: 'aadhaar', header: 'Aadhaar No.', render: (r) => <span className="text-[12px] font-mono text-body">{r.aadhaar || '—'}</span> },
    { key: 'pan', header: 'PAN', hideSm: true, render: (r) => <span className="text-[12px] font-mono text-body">{r.pan || '—'}</span> },
    { key: 'state', header: 'State', hideSm: true, render: (r) => <span className="text-[12px] font-medium text-body">{stateShort(r.state)}</span> },
    { key: 'mobile', header: 'Contact No.', render: (r) => <span className="text-[12px] text-body whitespace-nowrap tabular-nums">{r.mobile || '—'}</span> },
    { key: 'designation', header: 'Job Title', render: (r) => <span className="text-[12px] text-body">{r.designation || '—'}</span> },
    { key: 'basic', header: 'Basic', render: (r) => <span className="text-[12px] text-body font-medium whitespace-nowrap tabular-nums">{r.basic ? money(Number(r.basic)) : '—'}</span> },
    { key: 'hra', header: 'HRA', hideSm: true, render: (r) => <span className="text-[12px] text-body font-medium whitespace-nowrap tabular-nums">{r.hra ? money(Number(r.hra)) : '—'}</span> },
    { key: 'joining', header: 'Joining Date', sortable: true, render: (r) => <span className="text-[12px] text-body whitespace-nowrap tabular-nums">{dateShort(r.joining_date)}</span> },
    { key: 'exit_date', header: 'Exit Date', render: (r) => <span className="text-[12px] text-body whitespace-nowrap tabular-nums">{r.exit_date ? dateShort(r.exit_date) : '—'}</span> },
    { key: 'bank_account', header: 'A/C No.', hideSm: true, render: (r) => <span className="text-[12px] font-mono text-body">{r.bank_account || '—'}</span> },
    { key: 'bank_ifsc', header: 'IFSC', hideSm: true, render: (r) => <span className="text-[12px] font-mono text-body">{r.bank_ifsc || '—'}</span> },
    { key: 'uan', header: 'UAN', hideSm: true, render: (r) => <span className="text-[12px] font-mono text-body">{r.uan || '—'}</span> },
    { key: 'esi_number', header: 'ESIC No.', hideSm: true, render: (r) => <span className="text-[12px] font-mono text-body">{r.esi_number || '—'}</span> },
    { key: 'actions', header: '', className: 'w-24', render: (r) => (
      <div className="flex items-center gap-1">
        <button onClick={() => openView(r)} title="View profile" aria-label="View profile" className="inline-flex items-center justify-center w-7 h-7 rounded-sm text-mute hover:text-ink hover:bg-canvas-soft border border-transparent hover:border-hairline transition-colors cursor-pointer">
          <Eye className="w-4 h-4" />
        </button>
        <button onClick={() => openEdit(r.id)} title="Edit employee" aria-label="Edit employee" className="inline-flex items-center justify-center w-7 h-7 rounded-sm text-mute hover:text-ink hover:bg-canvas-soft border border-transparent hover:border-hairline transition-colors cursor-pointer">
          <Pencil className="w-4 h-4" />
        </button>
        <button onClick={() => setJoiningFor(r.id)} title="Generate joining form" aria-label="Generate joining form" className="inline-flex items-center justify-center w-7 h-7 rounded-sm text-mute hover:text-ink hover:bg-canvas-soft border border-transparent hover:border-hairline transition-colors cursor-pointer">
          <ScrollText className="w-4 h-4" />
        </button>
      </div>
    ) },
  ]

  const filterOptions = [
    { value: '', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'resigned', label: 'Resigned' },
    { value: 'terminated', label: 'Terminated' },
  ]

  const typeOptions = [
    { value: '', label: 'All Types' },
    ...employeeTypes.map((t: string) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' ') })),
  ]

  const viewRowOf = viewRow ? (employees.find((e) => e.id === viewRow.id) || viewRow) : null

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      <div className="shrink-0">
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        <StatCard icon={Users} label="Total Employees" value={stat.total} sub={<>Active <b className="text-ink">{stat.active}</b> · Inactive <b className="text-ink">{stat.inactive}</b></>} />
        <StatCard icon={UserPlus} label="Joined This Month" value={stat.joined_this_month} />
        <StatCard icon={LogOut} label="Exited This Month" value={stat.exit_this_month} />
        <StatCard icon={CalendarDays} label="On Leave Today" value={stat.on_leave_today} />
      </div>

      <div className="flex-1 min-h-0 bg-white card-shadow rounded-md overflow-hidden flex flex-col">
        <FilterBar className="shrink-0 px-4 py-3 border-b border-hairline">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); resetPaging() }}
            placeholder="Search by name, code, email, mobile..."
            className="w-full sm:w-72"
          />
          <SelectFilter
            label="Department"
            value={filters.department || ''}
            onChange={(v) => setFilter('department', v)}
            options={[{ value: '', label: 'All Departments' }, ...departments.map((d: string) => ({ value: d, label: d }))]}
          />
          <SelectFilter
            label="Designation"
            value={filters.designation || ''}
            onChange={(v) => setFilter('designation', v)}
            options={[{ value: '', label: 'All Designations' }, ...designations.map((d: string) => ({ value: d, label: d }))]}
          />
          <SelectFilter
            label="Status"
            value={filters.status || ''}
            onChange={(v) => setFilter('status', v)}
            options={filterOptions}
          />
          <Button variant="secondary" size="sm" onClick={exportCsv} disabled={employees.length === 0} className="ml-auto" title="Download current results as CSV">
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowAdvanced((v) => !v)} className={showAdvanced ? 'bg-canvas-soft' : ''}>
            <SlidersHorizontal className="w-3.5 h-3.5" /> Advanced
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </Button>
        </FilterBar>

        {showAdvanced && (
          <div className="shrink-0 px-4 py-3 border-b border-hairline bg-canvas-soft/30">
            <div className="flex flex-wrap items-end gap-2.5">
              <SelectFilter
                label="Client"
                value={advanced.client_id || ''}
                onChange={(v) => setAdv('client_id', v)}
                options={[{ value: '', label: 'All Clients' }, ...(clients?.data || []).map((c: any) => ({ value: String(c.id), label: c.name }))]}
              />
              <SelectFilter
                label="Site"
                value={advanced.site_id || ''}
                onChange={(v) => setAdv('site_id', v)}
                options={[
                  { value: '', label: 'All Sites' },
                  ...siteOptions.filter((s: any) => !advanced.client_id || String(s.client_id) === advanced.client_id).map((s: any) => ({ value: String(s.id), label: s.name })),
                ]}
              />
              <SelectFilter
                label="Employee Type"
                value={advanced.employee_type || ''}
                onChange={(v) => setAdv('employee_type', v)}
                options={typeOptions}
              />
              <label className="flex flex-col gap-1">
                <span className="mono-label">Joined From</span>
                <input type="date" value={advanced.joined_from || ''} onChange={(e) => setAdv('joined_from', e.target.value)} className="h-9 px-2.5 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-navy-mid" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="mono-label">Joined To</span>
                <input type="date" value={advanced.joined_to || ''} onChange={(e) => setAdv('joined_to', e.target.value)} className="h-9 px-2.5 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-navy-mid" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="mono-label">Exited From</span>
                <input type="date" value={advanced.exited_from || ''} onChange={(e) => setAdv('exited_from', e.target.value)} className="h-9 px-2.5 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-navy-mid" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="mono-label">Exited To</span>
                <input type="date" value={advanced.exited_to || ''} onChange={(e) => setAdv('exited_to', e.target.value)} className="h-9 px-2.5 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-navy-mid" />
              </label>
              {(Object.keys(advanced).length > 0 || Object.keys(filters).length > 0) && (
                <Button variant="ghost" size="sm" onClick={() => { setFilters({}); setAdvanced({}); resetPaging() }}>
                  <X className="w-3.5 h-3.5" /> Clear
                </Button>
              )}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="p-4"><LoadingState /></div>
        ) : error ? (
          <PageError onRetry={() => refetch()} />
        ) : employees.length === 0 && !search && Object.keys(filters).length === 0 && Object.keys(advanced).length === 0 ? (
          <EmptyState
            title="No employees yet"
            description="Add your first employee to get started, or import them in bulk."
            action={<Button onClick={openAdd}><Plus className="w-3.5 h-3.5" /> Add Employee</Button>}
          />
        ) : (
          <>
            <div className="flex-1 min-h-0 overflow-auto scrollbar-thin">
              <Table
                bare
                columns={columns}
                data={employees}
                keyFn={(r) => String(r.id)}
                sortKey={sort}
                sortDir={order}
                onSort={handleSort}
                emptyMessage="No employees match your search."
                minWidth="1500px"
              />
            </div>
            {employees.length > 0 && meta.total_pages > 1 && (
              <div className="shrink-0 px-4 py-2.5 border-t border-hairline">
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
            onSaved={(createdId) => { queryClient.invalidateQueries({ queryKey: ['employees'] }); queryClient.invalidateQueries({ queryKey: ['employees-stats'] }); setShowForm(false); setFocusField(null); toast.success(editId ? 'Employee updated.' : 'Employee added.'); if (createdId) setJoiningFor(createdId) }}
            onSwitchToEdit={(id) => setEditId(id)}
          />
        </Modal>
      )}

      <Modal open={showImport} onClose={() => setShowImport(false)} title="Bulk Import Employees" size="xl">
        {showImport && (
          <BulkEmployeeImport
            onClose={() => setShowImport(false)}
            onImported={() => { queryClient.invalidateQueries({ queryKey: ['employees'] }); queryClient.invalidateQueries({ queryKey: ['employees-stats'] }); toast.success('Employee data imported.') }}
          />
        )}
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

      <EmployeeProfileDrawer
        open={!!viewRow}
        employeeId={viewRow?.id ?? null}
        name={viewRowOf ? fullName(viewRowOf.first_name, viewRowOf.last_name) : undefined}
        code={viewRowOf?.employee_code}
        onClose={closeView}
        onEdit={(id, field) => { setViewRow(null); openEdit(id, field) }}
        onRevise={(id) => { setViewRow(null); setRevFor(employees.find((e) => e.id === id) || null) }}
        onOnboarding={(id) => { setViewRow(null); setOnbFor(employees.find((e) => e.id === id) || null) }}
        onJoiningForm={(id) => { setViewRow(null); setJoiningFor(id) }}
        onToggleStatus={(id, status) => statusMut.mutate({ id, status })}
        onDelete={(id) => { setViewRow(null); setDeleteId(id) }}
      />
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="bg-white card-shadow rounded-md p-4 flex items-start gap-3">
      <span className="w-9 h-9 rounded-sm bg-navy-soft text-navy-mid inline-flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" />
      </span>
      <div className="min-w-0">
        <p className="mono-label">{label}</p>
        <p className="text-[22px] leading-7 font-semibold tabular-nums text-ink">{value}</p>
        {sub && <p className="text-[11px] text-mute mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}