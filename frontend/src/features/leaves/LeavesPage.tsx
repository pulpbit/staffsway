import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { leaveApi, employeeApi, type LeaveRequestRow, type BalanceRow } from '@/services/api'
import { Button, Input, Textarea, Select } from '@/components/ui/fields'
import { Table, Tabs } from '@/components/ui/data'
import { Modal, ConfirmDialog } from '@/components/ui/overlay'
import { PageHeader } from '@/components/ui/layout'
import { StatusBadge, type Tone } from '@/components/ui/status'
import { NativeSelect, Avatar } from '@/components/ui/actions'
import { LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { fullName, dateShort } from '@/utils/format'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'
import { CalendarDays, Plus, Trash2, CheckCircle, XCircle, CalendarOff, Coins, Sparkles, CalendarClock } from 'lucide-react'

const PAGE_TABS = [
  { key: 'requests', label: 'Leave Requests' },
  { key: 'balances', label: 'Balances' },
  { key: 'holidays', label: 'Holidays' },
]

const REQ_TONE: Record<string, Tone> = {
  pending_manager: 'warning',
  pending_hr: 'info',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
}
const reqLabel = (s: string) => ({ pending_manager: 'Pending Manager', pending_hr: 'Pending HR', approved: 'Approved', rejected: 'Rejected', cancelled: 'Cancelled' } as Record<string, string>)[s] || s

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
    onSuccess: (r) => { setShowApply(false); setApplyForm({ employee_id: '', leave_type_id: '', start_date: '', end_date: '', reason: '' }); invalidate('leave-requests', 'leave-balances'); toast.success(r.message || 'Applied.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to apply.'),
  })
  const approvalMut = useMutation({
    mutationFn: () => leaveApi.approve(approveFor!.row.id, { level: approveFor!.level, action: approveFor!.action, remarks: remarks || undefined }),
    onSuccess: (r) => { setApproveFor(null); setRemarks(''); invalidate('leave-requests', 'leave-balances'); toast.success(r.message || 'Done.') },
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

  const actionBtn = 'px-2 py-1 text-[11px] font-medium rounded-xs transition-colors cursor-pointer inline-flex items-center gap-1'

  const reqCols: any[] = [
    { key: 'employee', header: 'Employee', render: (r: LeaveRequestRow) => (
      <span className="flex items-center gap-2.5 min-w-0">
        <Avatar name={fullName(r.first_name, r.last_name)} />
        <span className="min-w-0">
          <span className="block text-[13px] font-medium text-ink truncate max-w-40">{fullName(r.first_name, r.last_name)}</span>
          <span className="block text-[11px] text-mute font-mono">{r.employee_code}</span>
        </span>
      </span>
    ) },
    { key: 'type', header: 'Type', render: (r: LeaveRequestRow) => <span className="text-[12px] text-body">{r.type_name || 'LWP'}{r.type_code ? ` (${r.type_code})` : ''}</span> },
    { key: 'dates', header: 'Dates', render: (r: LeaveRequestRow) => <span className="text-[12px] text-body whitespace-nowrap">{dateShort(r.start_date)} → {dateShort(r.end_date)}</span> },
    { key: 'days', header: 'Days', render: (r: LeaveRequestRow) => <span className="text-[12px] font-medium text-ink tabular-nums">{r.days}</span> },
    { key: 'reason', header: 'Reason', hideSm: true, render: (r: LeaveRequestRow) => <span className="text-[12px] text-mute">{r.reason || '—'}</span> },
    { key: 'approvals', header: 'Approvals', hideSm: true, render: (r: LeaveRequestRow) => (
      <div className="text-[11px] text-mute leading-relaxed whitespace-nowrap">
        <div>Mgr: {r.manager_status === 'approved' ? `✓ ${r.manager_by || ''}` : r.manager_status === 'rejected' ? '✗' : '—'}</div>
        <div>HR: {r.hr_status === 'approved' ? `✓ ${r.hr_by || ''}` : r.hr_status === 'rejected' ? '✗' : '—'}</div>
      </div>
    ) },
    { key: 'status', header: 'Status', render: (r: LeaveRequestRow) => <StatusBadge status={r.status} tone={REQ_TONE[r.status]} /> },
    { key: 'actions', header: '', className: 'text-right', render: (r: LeaveRequestRow) => (
      <div className="flex items-center justify-end gap-1 flex-wrap">
        {canApproveManager && r.status === 'pending_manager' && <>
          <button onClick={() => { setApproveFor({ row: r, level: 'manager', action: 'approve' }); setRemarks('') }} className={`${actionBtn} text-success hover:bg-success-soft`}><CheckCircle className="w-3 h-3" /> Mgr</button>
          <button onClick={() => { setApproveFor({ row: r, level: 'manager', action: 'reject' }); setRemarks('') }} className={`${actionBtn} text-error hover:bg-error-soft`}><XCircle className="w-3 h-3" /> Reject</button>
        </>}
        {isHr && r.status === 'pending_hr' && <>
          <button onClick={() => { setApproveFor({ row: r, level: 'hr', action: 'approve' }); setRemarks('') }} className={`${actionBtn} text-success hover:bg-success-soft font-semibold`}><CheckCircle className="w-3 h-3" /> HR</button>
          <button onClick={() => { setApproveFor({ row: r, level: 'hr', action: 'reject' }); setRemarks('') }} className={`${actionBtn} text-error hover:bg-error-soft`}><XCircle className="w-3 h-3" /> Reject</button>
        </>}
        {r.status.startsWith('pending') && <button onClick={() => cancelMut.mutate(r.id)} className={`${actionBtn} text-body hover:bg-canvas-soft`}>Cancel</button>}
      </div>
    ) },
  ]

  return (
    <div>
      <PageHeader
        title="Leave Management"
        description={tab === 'requests' ? 'Applications with two-level approval (manager → HR)' : tab === 'balances' ? 'Accrual and available balances per employee' : 'Holidays excluded from leave day counts'}
        actions={
          tab === 'requests' ? (
            <Button onClick={() => setShowApply(true)}><Plus className="w-3.5 h-3.5" /> Apply Leave</Button>
          ) : tab === 'balances' ? (
            <NativeSelect className="w-24" value={String(year)} onChange={(v) => setYear(Number(v))} options={[2025, 2026, 2027].map((y) => ({ value: String(y), label: String(y) }))} />
          ) : undefined
        }
      />

      <div className="mb-4"><Tabs tabs={PAGE_TABS} active={tab} onChange={setTab} variant="underline" /></div>

      {tab === 'requests' && (
        <div className="bg-white card-shadow rounded-md overflow-hidden">
          {isLoading ? (
            <div className="p-4"><LoadingState /></div>
          ) : error ? (
            <PageError onRetry={() => refetch()} />
          ) : requests.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No leave applications" description="Apply leave for an employee to get started." action={<Button onClick={() => setShowApply(true)}>Apply Leave</Button>} />
          ) : (
            <Table columns={reqCols} data={requests} keyFn={(r) => String(r.id)} minWidth="1000px" />
          )}
        </div>
      )}

      {tab === 'balances' && (
        <div className="bg-white card-shadow rounded-md overflow-hidden">
          {balLoading ? (
            <div className="p-4"><LoadingState /></div>
          ) : balError ? (
            <PageError onRetry={() => balRefetch()} />
          ) : balances.length === 0 ? (
            <EmptyState icon={Coins} title="No active employees" description="Balances are computed for active employees in the selected year." />
          ) : (
            <Table
              columns={[
                { key: 'emp', header: 'Employee', render: (r: any) => (
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={fullName(r.employee.first_name, r.employee.last_name)} />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium text-ink truncate">{fullName(r.employee.first_name, r.employee.last_name)}</span>
                      <span className="block text-[11px] text-mute font-mono">{r.employee.employee_code}</span>
                    </span>
                  </span>
                ) },
                ...types.filter((t: any) => t.paid_default === 1).map((t: any) => ({
                  key: `t${t.id}`, header: `${t.code}${t.accrual_monthly ? ' ⟳' : ''}`, render: (r: any) => {
                    const b = (r.rows || []).find((x: BalanceRow) => x.leave_type_id === t.id)
                    if (!b) return <span className="text-[12px] text-mute">—</span>
                    return <span className={`text-[12px] tabular-nums ${b.available < 0 ? 'text-error font-medium' : 'text-body'}`} title={`${b.accrued} accrued · ${b.used} used · ${b.pending} pending · ${b.comp_off_extra} comp-off · ${b.encashed} encashed`}>{b.available}</span>
                  },
                })),
                { key: 'actions', header: '', className: 'text-right', render: (r: any) => (
                  <div className="flex justify-end">
                    <button onClick={() => setBalFor(r.employee)} className="px-2 py-1 text-[11px] font-medium text-link hover:bg-link-soft rounded-xs cursor-pointer">Details</button>
                  </div>
                ) },
              ]}
              data={balances}
              keyFn={(r: any) => String(r.employee.id)}
              minWidth="800px"
            />
          )}
          <p className="text-[11px] text-mute px-4 py-2.5 border-t border-hairline">⟳ = monthly accrual. Column value is available balance (accrued + comp-off − encashed − used − pending).</p>
        </div>
      )}

      {tab === 'holidays' && (
        <div className="bg-white card-shadow rounded-md p-4 max-w-xl">
          {holLoading ? (
            <LoadingState />
          ) : holError ? (
            <PageError onRetry={() => holRefetch()} />
          ) : (
            <>
              {isHr && (
                <div className="flex flex-col sm:flex-row gap-2 mb-4">
                  <Input label="" type="date" value={holidayForm.date} onChange={e => setHolidayForm(f => ({ ...f, date: e.target.value }))} className="sm:w-40" />
                  <Input label="" placeholder="Holiday name" value={holidayForm.name} onChange={e => setHolidayForm(f => ({ ...f, name: e.target.value }))} />
                  <Button size="sm" loading={holidayAddMut.isPending} onClick={() => { if (!holidayForm.date || !holidayForm.name.trim()) { toast.error('Date and name required.'); return } holidayAddMut.mutate() }}><Plus className="w-3 h-3" /> Add</Button>
                </div>
              )}
              {holidays.length === 0 ? (
                <EmptyState icon={CalendarOff} title="No holidays configured" description="Holidays are excluded when counting leave days." />
              ) : (
                <table className="w-full text-[13px]">
                  <tbody>
                    {holidays.map((h: any) => (
                      <tr key={h.id} className="border-b border-hairline last:border-0">
                        <td className="py-2 font-medium text-ink w-32 tabular-nums">{dateShort(h.date)}</td>
                        <td className="py-2 text-body">{h.name}</td>
                        {isHr && <td className="py-2 text-right"><button onClick={() => setDelHolidayId(h.id)} className="p-1.5 text-[11px] text-error hover:bg-error-soft rounded-xs cursor-pointer" aria-label="Remove holiday"><Trash2 className="w-3.5 h-3.5" /></button></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      )}

      {/* Apply modal */}
      <Modal open={showApply} onClose={() => setShowApply(false)} title="Apply Leave" size="sm">
        <div className="space-y-3">
          <Select
            label="Employee"
            options={[{ value: '', label: 'Select Employee' }, ...employees.map(e => ({ value: String(e.id), label: `${e.employee_code} — ${fullName(e.first_name, e.last_name)}` }))]}
            value={applyForm.employee_id}
            onChange={e => setApplyForm((f: any) => ({ ...f, employee_id: e.target.value }))}
          />
          <Select
            label="Leave Type"
            options={[{ value: '', label: 'Leave Without Pay (no type)' }, ...types.map(t => ({ value: String(t.id), label: `${t.name} (${t.code})${Number(t.annual_quota) > 0 ? '' : ' — quota not set'}` }))]}
            value={applyForm.leave_type_id}
            onChange={e => setApplyForm((f: any) => ({ ...f, leave_type_id: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="From" type="date" value={applyForm.start_date} onChange={e => setApplyForm((f: any) => ({ ...f, start_date: e.target.value }))} />
            <Input label="To" type="date" value={applyForm.end_date} onChange={e => setApplyForm((f: any) => ({ ...f, end_date: e.target.value }))} />
          </div>
          <Textarea label="Reason" value={applyForm.reason} onChange={e => setApplyForm((f: any) => ({ ...f, reason: e.target.value }))} />
          <p className="text-[11px] text-mute flex items-center gap-1"><CalendarClock className="w-3 h-3" /> Sundays and configured holidays are excluded from the day count.</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowApply(false)}>Cancel</Button>
            <Button loading={applyMut.isPending} onClick={() => { if (!applyForm.employee_id || !applyForm.start_date || !applyForm.end_date) { toast.error('Employee and dates are required.'); return } applyMut.mutate() }}>Submit Application</Button>
          </div>
        </div>
      </Modal>

      {/* Approval modal */}
      <Modal open={!!approveFor} onClose={() => setApproveFor(null)} title={approveFor?.action === 'approve' ? (approveFor.level === 'hr' ? 'HR Approval' : 'Manager Approval') : 'Reject Request'} size="sm">
        <div className="space-y-3">
          <p className="text-[13px] text-body">
            {approveFor && <>Approve <strong>{fullName(approveFor.row.first_name, approveFor.row.last_name)}</strong>'s {approveFor.row.type_name || 'LWP'} for <strong>{approveFor.row.days}</strong> day(s)?</>}
          </p>
          <Textarea label="Remarks (optional)" value={remarks} onChange={e => setRemarks(e.target.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setApproveFor(null)}>Cancel</Button>
            <Button variant={approveFor?.action === 'reject' ? 'danger' : 'primary'} loading={approvalMut.isPending}
              onClick={() => approvalMut.mutate()}>{approveFor?.action === 'approve' ? 'Approve' : 'Reject'}</Button>
          </div>
        </div>
      </Modal>

      {/* Balance detail modal */}
      <Modal open={!!balFor} onClose={() => setBalFor(null)} title={`Balances ${year} — ${balFor ? fullName(balFor.first_name, balFor.last_name) : ''}`} size="lg">
        {(balDetail?.data || []).length === 0 ? (
          <LoadingState />
        ) : (
          <>
            <div className="max-h-[45vh] overflow-y-auto scrollbar-thin">
              <table className="w-full text-[12px] min-w-[560px]">
                <thead className="sticky top-0 bg-canvas-soft">
                  <tr className="text-left text-mute border-b border-hairline bg-canvas-soft/60">
                    <th className="py-2 font-medium font-mono uppercase tracking-[0.04em] text-[11px]">Type</th>
                    <th className="py-2 font-medium text-right font-mono uppercase tracking-[0.04em] text-[11px]">Entitled</th>
                    <th className="py-2 font-medium text-right font-mono uppercase tracking-[0.04em] text-[11px]">Accrued</th>
                    <th className="py-2 font-medium text-right font-mono uppercase tracking-[0.04em] text-[11px]">Used</th>
                    <th className="py-2 font-medium text-right font-mono uppercase tracking-[0.04em] text-[11px]">Pending</th>
                    <th className="py-2 font-medium text-right font-mono uppercase tracking-[0.04em] text-[11px]">Comp-off</th>
                    <th className="py-2 font-medium text-right font-mono uppercase tracking-[0.04em] text-[11px]">Available</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {((balDetail?.data || []) as BalanceRow[]).map(b => (
                    <tr key={b.leave_type_id} className="border-b border-hairline last:border-0">
                      <td className="py-2 text-ink font-medium">{b.name}{b.accrual_monthly ? ' ⟳' : ''}{b.is_comp_off ? ' ⭐' : ''}</td>
                      <td className="py-2 text-right text-body tabular-nums">{b.entitled}</td>
                      <td className="py-2 text-right text-body tabular-nums">{b.accrued}</td>
                      <td className="py-2 text-right text-body tabular-nums">{b.used}</td>
                      <td className="py-2 text-right text-body tabular-nums">{b.pending}</td>
                      <td className="py-2 text-right text-body tabular-nums">{b.comp_off_extra}</td>
                      <td className={`py-2 text-right font-medium tabular-nums ${b.available < 0 ? 'text-error' : 'text-ink'}`}>{b.available}</td>
                      <td className="py-2 text-right whitespace-nowrap">
                        {isHr && <>
                          <button onClick={() => { setCompoffForm({ leave_type_id: String(b.leave_type_id), days: '1', remarks: '' }) }} title="Credit 1 comp-off day (use Details form for more)" className="px-1 py-0.5 text-[11px] text-link hover:bg-link-soft rounded-xs cursor-pointer"><Sparkles className="w-3 h-3 inline mr-0.5" />+1 Comp-off</button>
                          {b.available > 0 && b.paid && <button onClick={() => setEncashFor({ employee: balFor, row: b })} title="Encash available balance" className="px-1 py-0.5 text-[11px] text-body hover:bg-canvas-soft rounded-xs cursor-pointer"><Coins className="w-3 h-3 inline mr-0.5" />Encash</button>}
                        </>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {isHr && (
              <div className="border-t border-hairline mt-3 pt-3 flex items-end gap-2 flex-wrap">
                <Select
                  label="Adjustment type"
                  options={[{ value: '', label: 'Select type for adjustment…' }, ...types.map(t => ({ value: String(t.id), label: t.name }))]}
                  value={compoffForm.leave_type_id}
                  onChange={e => setCompoffForm(f => ({ ...f, leave_type_id: e.target.value }))}
                  wrapperClassName="flex-1 min-w-40"
                />
                <Input label="± days" type="number" placeholder="±days" value={compoffForm.days} onChange={e => setCompoffForm(f => ({ ...f, days: e.target.value }))} className="w-24" />
                <Button variant="secondary" size="sm" loading={compoffMut.isPending} onClick={() => { if (!compoffForm.leave_type_id || !Number(compoffForm.days)) { toast.error('Pick a type and non-zero days.'); return } compoffMut.mutate() }}>Apply Adjustment</Button>
              </div>
            )}
            <p className="text-[11px] text-mute mt-2">⭐ comp-off eligible type · +/− adjustments credit or revoke comp-off days · Encash pays basic ÷ 26 per day.</p>
          </>
        )}
      </Modal>

      {/* Encash confirm */}
      <ConfirmDialog
        open={!!encashFor}
        onClose={() => setEncashFor(null)}
        onConfirm={() => encashMut.mutate()}
        title="Encash Leave"
        message={encashFor ? `Encash ${encashFor.row.available} day(s) of ${encashFor.row.name} for ${fullName(encashFor.employee.first_name, encashFor.employee.last_name)}? Amount = days × (latest Basic ÷ 26).` : ''}
        loading={encashMut.isPending}
      />

      <ConfirmDialog
        open={delHolidayId !== null}
        onClose={() => setDelHolidayId(null)}
        onConfirm={() => delHolidayId !== null && holidayDelMut.mutate(delHolidayId)}
        title="Remove Holiday"
        message="Remove this holiday? Existing leave day counts were already computed at application time."
        danger
        loading={holidayDelMut.isPending}
      />
    </div>
  )
}