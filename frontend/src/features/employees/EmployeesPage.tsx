import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom'
import { employeeApi, clientApi, siteApi, recruitmentApi } from '@/services/api'
import { Button } from '@/components/ui/fields'
import { Table, Pagination, StatCard } from '@/components/ui/data'
import type { Column } from '@/components/ui/data'
import { PageHeader } from '@/components/ui/layout'
import { LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { StatusBadge } from '@/components/ui/status'
import { FilterBar, SearchInput, SelectFilter, Avatar } from '@/components/ui/actions'
import { Modal, ConfirmDialog } from '@/components/ui/overlay'
import { fullName, dateShort, money, grossSalary } from '@/utils/format'

/**
 * State shown for an employee, taken from their permanent address.
 *
 * Falls back to the present-address state in two cases: when the permanent
 * address is flagged as identical to present, and when no permanent state has
 * been captured. The second case is the norm for existing records - permanent
 * address is optional and currently empty across the seeded employees - so
 * without the fallback this column would read blank for everyone.
 */
const permanentState = (r: any): string | null =>
  (r.permanent_same_as_present ? r.state : r.permanent_state) || r.state || null
import { downloadCsv } from '@/utils/csv'
import { stateShort } from '@/utils/states'
import { toast } from 'sonner'
import { Plus, UserPlus, Upload, Pencil, Eye, Users, CalendarDays, LogOut, SlidersHorizontal, ChevronDown, X, Download, ScrollText, CalendarCheck, Sparkles, FileSignature } from 'lucide-react'
import EmployeeForm from './EmployeeForm'
import JoiningFormModal from './JoiningFormModal'
import EmployeeLetterModal from '@/features/letters/EmployeeLetterModal'
import SalaryRevisionModal from './SalaryRevisionModal'
import BulkEmployeeImport from './BulkEmployeeImport'
import EmployeeProfileDrawer from './EmployeeProfileDrawer'
import EmployeeAttendanceModal from './EmployeeAttendanceModal'
import EmployeePayslipModal from './EmployeePayslipModal'
import EmployeeTransferModal from './EmployeeTransferModal'
import EmployeeApplyLeaveModal from './EmployeeApplyLeaveModal'
import EmployeeExitModal from './EmployeeExitModal'

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
  const [letterFor, setLetterFor] = useState<number | null>(null)
  const [bulkLetters, setBulkLetters] = useState<number[] | null>(null)
  const [viewRow, setViewRow] = useState<any>(null)
  const [attFor, setAttFor] = useState<any>(null)
  const [payslipFor, setPayslipFor] = useState<any>(null)
  const [transferFor, setTransferFor] = useState<any>(null)
  const [leaveFor, setLeaveFor] = useState<any>(null)
  const [exitFor, setExitFor] = useState<any>(null)
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
    mutationFn: ({ id, status }: { id: number; status: 'active' | 'inactive' }) => employeeApi.setStatus(id, status),
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
  const stat = stats?.data || { total: 0, active: 0, inactive: 0, exited: 0, joined_this_month: 0, exit_this_month: 0, on_leave_today: 0 }
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
    { key: 'employee_code', header: 'Emp. ID', sticky: 'left', sortable: true, className: 'w-24', render: (r) => <span className="font-mono text-xs font-bold text-blue-700 whitespace-nowrap bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{r.employee_code}</span> },
    { key: 'status', header: 'Status', sticky: 'left', className: 'w-24', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'name', header: 'Employee Name', sticky: 'left', sortable: true, className: 'min-w-56', render: (r) => (
      <span className="flex items-center gap-2.5 min-w-0">
        <Avatar name={fullName(r.first_name, r.last_name)} size="sm" />
        <button onClick={() => openEdit(r.id)} className="text-xs sm:text-[13px] font-bold text-slate-900 hover:text-blue-600 truncate max-w-48 cursor-pointer text-left">{fullName(r.first_name, r.last_name)}</button>
      </span>
    ) },
    { key: 'father_name', header: 'Father\'s/Spouse', hideSm: true, render: (r) => <span className="text-xs text-slate-600">{r.father_name || r.spouse_name || '—'}</span> },
    { key: 'aadhaar', header: 'Aadhaar No.', render: (r) => <span className="text-xs font-mono text-slate-700">{r.aadhaar || '—'}</span> },
    { key: 'state', header: 'State', hideSm: true, render: (r) => <span className="text-xs font-medium text-slate-700">{stateShort(permanentState(r))}</span> },
    { key: 'mobile', header: 'Contact No.', render: (r) => <span className="text-xs text-slate-700 whitespace-nowrap tabular-nums font-mono">{r.mobile || '—'}</span> },
    { key: 'designation', header: 'Job Title', render: (r) => <span className="text-xs text-slate-700 font-medium">{r.designation || '—'}</span> },
    {
      key: 'gross',
      header: 'Gross',
      render: (r) => {
        const gross = grossSalary(r)
        return <span className="text-xs text-slate-800 font-bold whitespace-nowrap tabular-nums">{gross ? money(gross) : '—'}</span>
      },
    },
    { key: 'joining', header: 'Joining Date', sortable: true, render: (r) => <span className="text-xs text-slate-600 whitespace-nowrap tabular-nums">{dateShort(r.joining_date)}</span> },
    { key: 'exit_date', header: 'Exit Date', render: (r) => <span className="text-xs text-slate-600 whitespace-nowrap tabular-nums">{r.exit_date ? dateShort(r.exit_date) : '—'}</span> },
    { key: 'bank_account', header: 'A/C No.', hideSm: true, render: (r) => <span className="text-xs font-mono text-slate-700">{r.bank_account || '—'}</span> },
    { key: 'bank_ifsc', header: 'IFSC', hideSm: true, render: (r) => <span className="text-xs font-mono text-slate-700">{r.bank_ifsc || '—'}</span> },
    { key: 'uan', header: 'UAN', hideSm: true, render: (r) => <span className="text-xs font-mono text-slate-700">{r.uan || '—'}</span> },
    { key: 'esi_number', header: 'ESIC No.', hideSm: true, render: (r) => <span className="text-xs font-mono text-slate-700">{r.esi_number || '—'}</span> },
    { key: 'actions', header: 'Actions', sticky: 'right', className: 'w-36', render: (r) => (
      <div className="flex items-center gap-1.5">
        <button onClick={() => openView(r)} title="View employee profile" aria-label="View profile" className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200/70 transition-colors cursor-pointer touch-manipulation">
          <Eye className="w-4 h-4" />
        </button>
        <button onClick={() => openEdit(r.id)} title="Edit employee record" aria-label="Edit employee" disabled={r.status === 'exited'} className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200/70 transition-colors cursor-pointer touch-manipulation disabled:opacity-30 disabled:cursor-not-allowed">
          <Pencil className="w-4 h-4" />
        </button>
        <button onClick={() => setAttFor(r)} title="View attendance history" aria-label="View attendance" className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 border border-slate-200/70 transition-colors cursor-pointer touch-manipulation">
          <CalendarCheck className="w-4 h-4" />
        </button>
        <button onClick={() => setJoiningFor(r.id)} title="Print joining form" aria-label="Generate joining form" className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 border border-slate-200/70 transition-colors cursor-pointer touch-manipulation">
          <ScrollText className="w-4 h-4" />
        </button>
        <button onClick={() => setLetterFor(r.id)} title="Generate offer or appointment letter" aria-label="Generate letter" disabled={r.status !== 'active'} className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200/70 transition-colors cursor-pointer touch-manipulation disabled:opacity-30 disabled:cursor-not-allowed">
          <FileSignature className="w-4 h-4" />
        </button>
      </div>
    ) },
  ]

  const filterOptions = [
    { value: '', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'exited', label: 'Exited' },
  ]

  const typeOptions = [
    { value: '', label: 'All Types' },
    ...employeeTypes.map((t: string) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' ') })),
  ]

  const viewRowOf = viewRow ? (employees.find((e) => e.id === viewRow.id) || viewRow) : null
  const rowFor = (id: number) => employees.find((e) => e.id === id) || (viewRow?.id === id ? viewRow : null)
  const activeEmployees = employees.filter((e) => e.status === 'active')

  return (
    <div className="flex flex-col min-h-full gap-5">
      <div className="shrink-0">
        <PageHeader
          title="Employee Master"
          description={`Comprehensive workforce directory &bull; ${meta.total} employee${meta.total === 1 ? '' : 's'} on record`}
          actions={
            <>
              <button
                type="button"
                onClick={() => setShowImport(true)}
                className="h-11 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-2 shadow-2xs transition-all cursor-pointer touch-manipulation"
              >
                <Upload className="w-4 h-4 text-blue-600" />
                <span>Bulk Import</span>
              </button>
              <button
                type="button"
                onClick={openAdd}
                className="h-11 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer touch-manipulation"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Employee</span>
              </button>
              <button
                type="button"
                onClick={() => setBulkLetters(activeEmployees.map((e) => e.id))}
                disabled={!activeEmployees.length}
                title={activeEmployees.length ? `Generate appointment letters for all ${activeEmployees.length} active employees on this page` : 'No active employees on this page'}
                className="h-11 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-2 shadow-2xs transition-all cursor-pointer touch-manipulation disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FileSignature className="w-4 h-4 text-violet-600" />
                <span>Bulk Appointment Letters</span>
              </button>
            </>
          }
        />
      </div>

      {/* Top 4 KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        <StatCard icon={Users} label="Total Workforce" value={stat.total} tone="primary" sub={`Active: ${stat.active} | Inactive: ${stat.inactive}`} />
        <StatCard icon={UserPlus} label="Joined This Month" value={stat.joined_this_month} tone="success" sub="New team members" />
        <StatCard icon={LogOut} label="Exited This Month" value={stat.exit_this_month} tone="danger" sub={`Total exited: ${stat.exited}`} />
        <StatCard icon={CalendarDays} label="On Leave Today" value={stat.on_leave_today} tone="warning" sub="Approved leave records" />
      </div>

      <div className="flex-1 min-h-[520px] bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden flex flex-col">
        <FilterBar className="shrink-0 px-4 py-3.5 border-b border-slate-100 bg-slate-50/40">
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
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowAdvanced((v) => !v)} className={showAdvanced ? 'bg-slate-100' : ''}>
            <SlidersHorizontal className="w-3.5 h-3.5" /> Advanced
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </Button>
        </FilterBar>

        {showAdvanced && (
          <div className="shrink-0 px-4 py-3.5 border-b border-slate-200/80 bg-slate-50/70">
            <div className="flex flex-wrap items-end gap-3">
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
                <span className="text-[10.5px] font-bold uppercase text-slate-400">Joined From</span>
                <input type="date" value={advanced.joined_from || ''} onChange={(e) => setAdv('joined_from', e.target.value)} className="h-9 px-2.5 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10.5px] font-bold uppercase text-slate-400">Joined To</span>
                <input type="date" value={advanced.joined_to || ''} onChange={(e) => setAdv('joined_to', e.target.value)} className="h-9 px-2.5 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500" />
              </label>
              {(Object.keys(advanced).length > 0 || Object.keys(filters).length > 0) && (
                <Button variant="ghost" size="sm" onClick={() => { setFilters({}); setAdvanced({}); resetPaging() }}>
                  <X className="w-3.5 h-3.5" /> Clear Filters
                </Button>
              )}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="p-8"><LoadingState /></div>
        ) : error ? (
          <PageError onRetry={() => refetch()} />
        ) : employees.length === 0 && !search && Object.keys(filters).length === 0 && Object.keys(advanced).length === 0 ? (
          <EmptyState
            title="No employees registered yet"
            description="Add your first employee to get started with automated payroll, attendance, and compliance."
            action={<Button onClick={openAdd}><Plus className="w-3.5 h-3.5" /> Add Employee</Button>}
          />
        ) : (
          <>
            <div className="flex-1 min-h-[420px] flex flex-col">
              <Table
                bare
                maxHeight="max-h-[calc(100vh-16rem)] min-h-[420px]"
                columns={columns}
                data={employees}
                keyFn={(r) => String(r.id)}
                sortKey={sort}
                sortDir={order}
                onSort={handleSort}
                emptyMessage="No employees match your search criteria."
                minWidth="1500px"
              />
            </div>
            {employees.length > 0 && meta.total_pages > 1 && (
              <div className="shrink-0 px-4 py-3 border-t border-slate-100 bg-slate-50/40">
                <Pagination page={meta.page} totalPages={meta.total_pages} total={meta.total} pageSize={meta.page_size} onPage={setPage} />
              </div>
            )}
          </>
        )}
      </div>

      {showForm && (
        <Modal open={showForm} onClose={() => { setShowForm(false); setFocusField(null) }} title={editId ? 'Edit Employee Dossier' : 'Register New Employee'} size="xl">
          <EmployeeForm
            employeeId={editId}
            focusField={focusField}
            onClose={() => { setShowForm(false); setFocusField(null) }}
            onSaved={(createdId) => { queryClient.invalidateQueries({ queryKey: ['employees'] }); queryClient.invalidateQueries({ queryKey: ['employees-stats'] }); setShowForm(false); setFocusField(null); toast.success(editId ? 'Employee record updated.' : 'Employee successfully registered.'); if (createdId) setJoiningFor(createdId) }}
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

      {viewRow && (
        <EmployeeProfileDrawer
          employeeId={viewRow.id}
          name={fullName(viewRowOf?.first_name, viewRowOf?.last_name)}
          code={viewRowOf?.employee_code}
          open={!!viewRow}
          onClose={closeView}
          onEdit={(id) => { closeView(); openEdit(id) }}
          onToggleStatus={(id, st) => statusMut.mutate({ id, status: st })}
          onRevise={(id) => { closeView(); setRevFor(rowFor(id)) }}
          onViewAttendance={(id) => { closeView(); setAttFor(rowFor(id)) }}
          onGeneratePayslip={(id) => { closeView(); setPayslipFor(rowFor(id)) }}
          onTransfer={(id) => { closeView(); setTransferFor(rowFor(id)) }}
          onApplyLeave={(id) => { closeView(); setLeaveFor(rowFor(id)) }}
          onExit={(id) => { closeView(); setExitFor(rowFor(id)) }}
          onJoiningForm={(id) => { closeView(); setJoiningFor(id) }}
          onDelete={(id) => setDeleteId(id)}
        />
      )}

      {deleteId && (
        <ConfirmDialog
          open={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={() => deleteId && deleteMut.mutate(deleteId)}
          title="Delete Employee Record"
          message="Are you sure you want to permanently delete this employee? This will remove all associated attendance and payroll logs."
          confirmText="Delete Permanently"
          danger
          loading={deleteMut.isPending}
        />
      )}

      {joiningFor && (
        <JoiningFormModal
          employeeId={joiningFor}
          onClose={() => setJoiningFor(null)}
        />
      )}

      {letterFor && (
        <EmployeeLetterModal employeeId={letterFor} onClose={() => setLetterFor(null)} />
      )}

      {bulkLetters && (
        <EmployeeLetterModal
          employeeIds={bulkLetters}
          onClose={() => setBulkLetters(null)}
        />
      )}

      {revFor && (
        <SalaryRevisionModal
          employeeId={revFor.id}
          employeeName={fullName(revFor.first_name, revFor.last_name)}
          open={!!revFor}
          onClose={() => setRevFor(null)}
        />
      )}

      {attFor && (
        <EmployeeAttendanceModal
          employeeId={attFor.id}
          employeeName={fullName(attFor.first_name, attFor.last_name)}
          employeeCode={attFor.employee_code}
          joiningDate={attFor.joining_date}
          status={attFor.status}
          open={!!attFor}
          onClose={() => setAttFor(null)}
        />
      )}

      {payslipFor && (
        <EmployeePayslipModal
          employeeId={payslipFor.id}
          employeeName={fullName(payslipFor.first_name, payslipFor.last_name)}
          open={!!payslipFor}
          onClose={() => setPayslipFor(null)}
        />
      )}

      {transferFor && (
        <EmployeeTransferModal
          employee={transferFor}
          open={!!transferFor}
          onClose={() => setTransferFor(null)}
        />
      )}

      {leaveFor && (
        <EmployeeApplyLeaveModal
          employee={leaveFor}
          open={!!leaveFor}
          onClose={() => setLeaveFor(null)}
        />
      )}

      {exitFor && (
        <EmployeeExitModal
          employee={exitFor}
          open={!!exitFor}
          onClose={() => setExitFor(null)}
        />
      )}
    </div>
  )
}