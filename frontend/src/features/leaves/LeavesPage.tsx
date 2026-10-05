import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { leaveApi, employeeApi, type LeaveRequestRow, type BalanceRow } from '@/services/api'
import { Button, Input, Textarea, Select } from '@/components/ui/fields'
import { Table, Tabs } from '@/components/ui/data'
import { Modal, ConfirmDialog } from '@/components/ui/overlay'
import { PageHeader } from '@/components/ui/layout'
import { StatusBadge, StatusDot, type Tone } from '@/components/ui/status'
import { NativeSelect, Avatar } from '@/components/ui/actions'
import { LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { fullName, dateShort } from '@/utils/format'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'
import { CalendarDays, Plus, Trash2, CheckCircle, XCircle, CalendarOff, Coins, Sparkles, CalendarClock, ShieldAlert, Gift } from 'lucide-react'

const PAGE_TABS = [
  { key: 'requests', label: 'Leave Applications' },
  { key: 'balances', label: 'Leave Balances & Accrual' },
  { key: 'holidays', label: 'Official Holidays' },
]

const REQ_TONE: Record<string, Tone> = {
  pending_manager: 'warning',
  pending_hr: 'info',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
}

export default function LeavesPage() {
  const { user } = useAuth()
  const role = user?.role || ''
  const isHr = ['super_admin', 'admin', 'hr'].includes(role)
  const canApproveManager = ['super_admin', 'admin', 'hr', 'manager'].includes(role)

  const [tab, setTab] = useState('requests')
  const [year, setYear] = useState(new Date().getFullYear())
  const qc = useQueryClient()
  const invalidate = (...keys: string[]) => keys.forEach(k => qc.invalidateQueries({ queryKey: [k] }))

  const [showApply, setShowApply] = useState(false)
  const [applyForm, setApplyForm] = useState<Record<string, any>>({ employee_id: '', leave_type_id: '', start_date: '', end_date: '', reason: '' })
  const [approveFor, setApproveFor] = useState<{ row: LeaveRequestRow; level: 'manager' | 'hr'; action: 'approve' | 'reject' } | null>(null)
  const [remarks, setRemarks] = useState('')

  const [balFor, setBalFor] = useState<any>(null)
  const [compoffForm, setCompoffForm] = useState({ leave_type_id: '', days: '', remarks: '' })
  const [encashFor, setEncashFor] = useState<{ employee: any; row: BalanceRow } | null>(null)

  const [holidayForm, setHolidayForm] = useState({ date: '', name: '' })
  const [delHolidayId, setDelHolidayId] = useState<number | null>(null)

  const { data: reqData, isLoading, error, refetch } = useQuery({ queryKey: ['leave-requests', year], queryFn: () => leaveApi.requests({ year: String(year) }) })
  const { data: typesData } = useQuery({ queryKey: ['leave-types'], queryFn: () => leaveApi.types() })
  const { data: empData } = useQuery({ queryKey: ['employees-all'], queryFn: () => employeeApi.list({ page: '1', page_size: '500' }) })
  const { data: balData, isLoading: balLoading, error: balError, refetch: balRefetch } = useQuery({ queryKey: ['leave-balances', year], queryFn: () => leaveApi.balances(String(year)) })
  const { data: holData, isLoading: holLoading, error: holError, refetch: holRefetch } = useQuery({ queryKey: ['holidays', year], queryFn: () => leaveApi.holidays(String(year)) })
  const { data: balDetail } = useQuery({ queryKey: ['leave-balances', balFor?.id], queryFn: () => leaveApi.employeeBalances(balFor.id, String(year)), enabled: !!balFor })

  const applyMut = useMutation({
    mutationFn: () => leaveApi.apply({
      employee_id: Number(applyForm.employee_id),
      leave_type_id: applyForm.leave_type_id ? Number(applyForm.leave_type_id) : null,
      start_date: applyForm.start_date, end_date: applyForm.end_date,
      reason: applyForm.reason || undefined,
    }),
    onSuccess: (r) => { setShowApply(false); setApplyForm({ employee_id: '', leave_type_id: '', start_date: '', end_date: '', reason: '' }); invalidate('leave-requests', 'leave-balances'); toast.success(r.message || 'Leave applied.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to apply.'),
  })
  const approvalMut = useMutation({
    mutationFn: () => leaveApi.approve(approveFor!.row.id, { level: approveFor!.level, action: approveFor!.action, remarks: remarks || undefined }),
    onSuccess: (r) => { setApproveFor(null); setRemarks(''); invalidate('leave-requests', 'leave-balances'); toast.success(r.message || 'Status updated.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })
  const cancelMut = useMutation({
    mutationFn: (id: number) => leaveApi.cancel(id),
    onSuccess: () => { invalidate('leave-requests', 'leave-balances'); toast.success('Request cancelled.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })
  const compoffMut = useMutation({
    mutationFn: () => leaveApi.compoff({ employee_id: balFor.id, leave_type_id: Number(compoffForm.leave_type_id), days: Number(compoffForm.days), remarks: compoffForm.remarks || undefined }),
    onSuccess: (r) => { setCompoffForm({ leave_type_id: '', days: '', remarks: '' }); invalidate('leave-balances'); toast.success(r.message || 'Comp-off updated.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })
  const encashMut = useMutation({
    mutationFn: () => leaveApi.encash({ employee_id: encashFor!.employee.id, leave_type_id: encashFor!.row.leave_type_id, days: Number(encashFor!.row.available) }),
    onSuccess: (r) => { setEncashFor(null); invalidate('leave-balances'); toast.success(r.message || 'Encashed.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })
  const holidayAddMut = useMutation({
    mutationFn: () => leaveApi.addHoliday(holidayForm),
    onSuccess: () => { setHolidayForm({ date: '', name: '' }); invalidate('holidays'); toast.success('Holiday added.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to add holiday.'),
  })
  const holidayDelMut = useMutation({
    mutationFn: (id: number) => leaveApi.deleteHoliday(id),
    onSuccess: () => { setDelHolidayId(null); invalidate('holidays'); toast.success('Holiday removed.') },
    onError: (e: any) => { setDelHolidayId(null); toast.error(e?.error?.message || 'Failed.') },
  })

  const requests = (reqData?.data || []) as unknown as LeaveRequestRow[]
  const types = (typesData?.data || []) as any[]
  const employees = ((empData?.data || []) as any[])
  const balances = (balData?.data || []) as any[]
  const holidays = (holData?.data || []) as any[]

  const reqCols: any[] = [
    { key: 'employee', header: 'Employee', render: (r: LeaveRequestRow) => (
      <span className="flex items-center gap-2.5 min-w-0">
        <Avatar name={fullName(r.first_name, r.last_name)} size="sm" />
        <span className="min-w-0">
          <span className="block text-xs sm:text-[13px] font-bold text-slate-900 truncate max-w-44">{fullName(r.first_name, r.last_name)}</span>
          <span className="block text-[11px] text-blue-600 font-mono font-medium">{r.employee_code}</span>
        </span>
      </span>
    ) },
    { key: 'type', header: 'Leave Category', render: (r: LeaveRequestRow) => <span className="text-xs font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/60">{r.type_name || 'LWP'}{r.type_code ? ` (${r.type_code})` : ''}</span> },
    { key: 'dates', header: 'Duration', render: (r: LeaveRequestRow) => <span className="text-xs text-slate-700 font-medium whitespace-nowrap">{dateShort(r.start_date)} &rarr; {dateShort(r.end_date)}</span> },
    { key: 'days', header: 'Days', render: (r: LeaveRequestRow) => <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 tabular-nums">{r.days} day{r.days === 1 ? '' : 's'}</span> },
    { key: 'reason', header: 'Reason', hideSm: true, render: (r: LeaveRequestRow) => <span className="text-xs text-slate-500 max-w-xs truncate block">{r.reason || '—'}</span> },
    { key: 'approvals', header: 'Workflow Status', hideSm: true, render: (r: LeaveRequestRow) => (
      <div className="text-[11px] leading-relaxed whitespace-nowrap">
        <div className={r.manager_status === 'approved' ? 'text-emerald-700 font-bold' : r.manager_status === 'rejected' ? 'text-rose-600 font-bold' : 'text-slate-400'}>
          Manager: {r.manager_status === 'approved' ? `✓ ${r.manager_by || 'Approved'}` : r.manager_status === 'rejected' ? '✗ Rejected' : 'Pending'}
        </div>
        <div className={r.hr_status === 'approved' ? 'text-emerald-700 font-bold' : r.hr_status === 'rejected' ? 'text-rose-600 font-bold' : 'text-slate-400'}>
          HR Admin: {r.hr_status === 'approved' ? `✓ ${r.hr_by || 'Approved'}` : r.hr_status === 'rejected' ? '✗ Rejected' : 'Pending'}
        </div>
      </div>
    ) },
    { key: 'status', header: 'Status', className: 'w-9', render: (r: LeaveRequestRow) => <StatusDot status={r.status} tone={REQ_TONE[r.status]} /> },
    { key: 'actions', header: 'Actions', className: 'text-right', render: (r: LeaveRequestRow) => (
      <div className="flex items-center justify-end gap-1.5 flex-wrap">
        {canApproveManager && r.status === 'pending_manager' && <>
          <button onClick={() => { setApproveFor({ row: r, level: 'manager', action: 'approve' }); setRemarks('') }} className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer inline-flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Approve</button>
          <button onClick={() => { setApproveFor({ row: r, level: 'manager', action: 'reject' }); setRemarks('') }} className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer inline-flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Reject</button>
        </>}
        {isHr && r.status === 'pending_hr' && <>
          <button onClick={() => { setApproveFor({ row: r, level: 'hr', action: 'approve' }); setRemarks('') }} className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer inline-flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Final HR</button>
          <button onClick={() => { setApproveFor({ row: r, level: 'hr', action: 'reject' }); setRemarks('') }} className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer inline-flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Reject</button>
        </>}
        {r.status.startsWith('pending') && <button onClick={() => cancelMut.mutate(r.id)} className="px-2 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer">Cancel</button>}
      </div>
    ) },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Leave Management & Approvals"
        description={tab === 'requests' ? 'Two-tier hierarchical approval workflow (Manager → HR Admin)' : tab === 'balances' ? 'Annual leave quota, monthly accrual, and encashment balance' : 'Official statutory & company holiday calendar'}
        actions={
          tab === 'requests' ? (
            <button
              type="button"
              onClick={() => setShowApply(true)}
              className="h-10 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Apply Leave</span>
            </button>
          ) : tab === 'balances' ? (
            <NativeSelect className="w-28" value={String(year)} onChange={(v) => setYear(Number(v))} options={[2025, 2026, 2027].map((y) => ({ value: String(y), label: String(y) }))} />
          ) : undefined
        }
      />

      <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs">
        <Tabs tabs={PAGE_TABS} active={tab} onChange={setTab} variant="pill" />
      </div>

      {tab === 'requests' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="p-8"><LoadingState /></div>
          ) : error ? (
            <PageError onRetry={() => refetch()} />
          ) : requests.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No leave applications on record" description="Apply leave for an employee to begin the approval process." action={<Button onClick={() => setShowApply(true)}>Apply Leave</Button>} />
          ) : (
            <Table columns={reqCols} data={requests} keyFn={(r) => String(r.id)} minWidth="1000px" />
          )}
        </div>
      )}

      {tab === 'balances' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          {balLoading ? (
            <div className="p-8"><LoadingState /></div>
          ) : balError ? (
            <PageError onRetry={() => balRefetch()} />
          ) : balances.length === 0 ? (
            <EmptyState icon={Coins} title="No active employees found" description="Balances are computed automatically for active employees in the selected calendar year." />
          ) : (
            <Table
              columns={[
                { key: 'emp', header: 'Employee', render: (r: any) => (
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={fullName(r.employee.first_name, r.employee.last_name)} size="sm" />
                    <span className="min-w-0">
                      <span className="block text-xs sm:text-[13px] font-bold text-slate-900 truncate">{fullName(r.employee.first_name, r.employee.last_name)}</span>
                      <span className="block text-[11px] text-blue-600 font-mono">{r.employee.employee_code}</span>
                    </span>
                  </span>
                ) },
                ...types.filter((t: any) => t.paid_default === 1).map((t: any) => ({
                  key: `t${t.id}`, header: `${t.code}${t.accrual_monthly ? ' ⟳' : ''}`, render: (r: any) => {
                    const b = (r.rows || []).find((x: BalanceRow) => x.leave_type_id === t.id)
                    if (!b) return <span className="text-xs text-slate-400">—</span>
                    return <span className={`text-xs font-bold tabular-nums ${b.available < 0 ? 'text-rose-600' : 'text-slate-800'}`} title={`${b.accrued} accrued · ${b.used} used · ${b.pending} pending · ${b.comp_off_extra} comp-off · ${b.encashed} encashed`}>{b.available}</span>
                  },
                })),
                { key: 'actions', header: 'Action', className: 'text-right', render: (r: any) => (
                  <div className="flex justify-end">
                    <button onClick={() => setBalFor(r.employee)} className="px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors cursor-pointer">View Statement</button>
                  </div>
                ) },
              ]}
              data={balances}
              keyFn={(r: any) => String(r.employee.id)}
              minWidth="800px"
            />
          )}
          <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-500">
            <strong>Note:</strong> &bull; ⟳ indicates monthly accrual. Available balance formula = (Accrued + Comp-off Credit &minus; Encashed &minus; Used &minus; Pending Approvals).
          </div>
        </div>
      )}

      {tab === 'holidays' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs max-w-2xl">
          {holLoading ? (
            <LoadingState />
          ) : holError ? (
            <PageError onRetry={() => holRefetch()} />
          ) : (
            <>
              {isHr && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 mb-5 flex flex-col sm:flex-row gap-3 items-end">
                  <div className="w-full sm:w-44">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Date</label>
                    <input type="date" value={holidayForm.date} onChange={e => setHolidayForm(f => ({ ...f, date: e.target.value }))} className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500" />
                  </div>
                  <div className="flex-1 w-full">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Holiday Title</label>
                    <input placeholder="e.g. Diwali Festival" value={holidayForm.name} onChange={e => setHolidayForm(f => ({ ...f, name: e.target.value }))} className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500" />
                  </div>
                  <button
                    type="button"
                    onClick={() => { if (!holidayForm.date || !holidayForm.name.trim()) { toast.error('Date and name required.'); return } holidayAddMut.mutate() }}
                    disabled={holidayAddMut.isPending}
                    className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Holiday</span>
                  </button>
                </div>
              )}
              {holidays.length === 0 ? (
                <EmptyState icon={CalendarOff} title="No holidays configured" description="Holidays added here are excluded from employee leave day deductions." />
              ) : (
                <div className="divide-y divide-slate-100">
                  {holidays.map((h: any) => (
                    <div key={h.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0 border border-purple-100">
                          <Gift className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs sm:text-[13px] font-bold text-slate-900 block">{h.name}</span>
                          <span className="text-[11px] text-slate-500 block font-mono">{dateShort(h.date)}</span>
                        </div>
                      </div>
                      {isHr && (
                        <button onClick={() => setDelHolidayId(h.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" aria-label="Remove holiday">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Apply Leave Modal */}
      {showApply && (
        <Modal open={showApply} onClose={() => setShowApply(false)} title="Apply Leave for Employee" size="md">
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Select Employee</label>
              <select
                value={applyForm.employee_id}
                onChange={e => setApplyForm(f => ({ ...f, employee_id: e.target.value }))}
                className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
              >
                <option value="">Choose employee...</option>
                {employees.map((e: any) => (
                  <option key={e.id} value={e.id}>{e.employee_code} &bull; {fullName(e.first_name, e.last_name)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Leave Type</label>
              <select
                value={applyForm.leave_type_id}
                onChange={e => setApplyForm(f => ({ ...f, leave_type_id: e.target.value }))}
                className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
              >
                <option value="">Choose leave type (or LWP)...</option>
                {types.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Start Date</label>
                <input type="date" value={applyForm.start_date} onChange={e => setApplyForm(f => ({ ...f, start_date: e.target.value }))} className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">End Date</label>
                <input type="date" value={applyForm.end_date} onChange={e => setApplyForm(f => ({ ...f, end_date: e.target.value }))} className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Reason / Note</label>
              <textarea rows={3} value={applyForm.reason} onChange={e => setApplyForm(f => ({ ...f, reason: e.target.value }))} placeholder="Provide details regarding the leave request..." className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500" />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setShowApply(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
              <button type="button" onClick={() => applyMut.mutate()} disabled={!applyForm.employee_id || !applyForm.start_date || !applyForm.end_date || applyMut.isPending} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-40">Submit Leave Application</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Approve Modal */}
      {approveFor && (
        <Modal open={!!approveFor} onClose={() => setApproveFor(null)} title={`${approveFor.action === 'approve' ? 'Approve' : 'Reject'} Leave Request`} size="sm">
          <div className="space-y-4 pt-2">
            <p className="text-xs text-slate-600">
              Are you sure you want to <strong>{approveFor.action}</strong> leave for <strong>{fullName(approveFor.row.first_name, approveFor.row.last_name)}</strong> ({dateShort(approveFor.row.start_date)} &rarr; {dateShort(approveFor.row.end_date)})?
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Remarks (Optional)</label>
              <textarea rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Add approval/rejection remarks..." className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500" />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setApproveFor(null)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
              <button type="button" onClick={() => approvalMut.mutate()} disabled={approvalMut.isPending} className={`px-5 py-2 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer ${approveFor.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}>
                Confirm {approveFor.action === 'approve' ? 'Approval' : 'Rejection'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {delHolidayId && (
        <ConfirmDialog
          open={!!delHolidayId}
          onClose={() => setDelHolidayId(null)}
          onConfirm={() => delHolidayId && holidayDelMut.mutate(delHolidayId)}
          title="Remove Holiday"
          message="Are you sure you want to remove this official holiday?"
          confirmText="Remove"
          danger
          loading={holidayDelMut.isPending}
        />
      )}
    </div>
  )
}