import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { essApi, leaveApi, slipApi, helpdeskApi } from '@/services/api'
import type { SalarySlipDetail } from '@/types/api'
import { Table, Tabs, StatCard } from '@/components/ui/data'
import { PageHeader, SectionCard } from '@/components/ui/layout'
import { StatusBadge, type Tone } from '@/components/ui/status'
import { Avatar, NativeSelect } from '@/components/ui/actions'
import { LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { Button, Input, Select } from '@/components/ui/fields'
import { Modal } from '@/components/ui/overlay'
import { money, monthYear, shortMonth, dateShort } from '@/utils/format'
import { toast } from 'sonner'
import { UserRound, CalendarDays, FileText, Send, Printer, X } from 'lucide-react'

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'attendance', label: 'My Attendance' },
  { key: 'leave', label: 'My Leave' },
  { key: 'payslips', label: 'My Payslips' },
  { key: 'requests', label: 'Requests to HR' },
]

const now = new Date()
const YEAR = now.getFullYear()

const regTone = (s: string) => ({ approved: 'success', rejected: 'danger', pending: 'warning', in_progress: 'info' } as Record<string, Tone>)[s] || 'neutral'
const leaveTone = (s: string) => ({ approved: 'success', rejected: 'danger', cancelled: 'neutral', pending_manager: 'warning', pending_hr: 'info' } as Record<string, Tone>)[s] || 'neutral'
const reqTone = (s: string) => ({ open: 'info', in_progress: 'warning', resolved: 'success', closed: 'neutral', rejected: 'danger' } as Record<string, Tone>)[s] || 'neutral'
const slipTone = (s: string) => ({ finalized: 'warning', paid: 'success', draft: 'neutral', processing: 'info' } as Record<string, Tone>)[s] || 'neutral'

export default function MySpacePage() {
  const [active, setActive] = useState('overview')
  const qc = useQueryClient()

  const meQ = useQuery({ queryKey: ['ess-me'], queryFn: () => essApi.me() })
  const profile = meQ.data?.data
  const empId = profile?.id

  return (
    <div>
      <PageHeader title="My Space" description="Your profile, attendance, leave and salary slips" />
      {meQ.isLoading ? <div className="bg-white card-shadow rounded-md p-5 mt-3"><LoadingState /></div>
        : meQ.isError ? <div className="bg-white card-shadow rounded-md p-5 mt-3"><PageError onRetry={() => meQ.refetch()} /></div>
        : !profile ? null : (
          <>
            <div className="mt-4 mb-4"><Tabs tabs={TABS} active={active} onChange={setActive} variant="underline" /></div>

            {active === 'overview' && <OverviewTab profile={profile} />}
            {active === 'attendance' && empId != null && <AttendanceTab />}
            {active === 'leave' && empId != null && <LeaveTab empId={empId} />}
            {active === 'payslips' && <PayslipsTab />}
            {active === 'requests' && <RequestsTab onSubmitted={() => { qc.invalidateQueries({ queryKey: ['ess-regs'] }); qc.invalidateQueries({ queryKey: ['ess-reqs'] }) }} />}
          </>
        )}
    </div>
  )
}

// ---------------- Overview ----------------
function OverviewTab({ profile }: { profile: any }) {
  const gross = Number(profile.basic || 0) + Number(profile.hra || 0) + Number(profile.conveyance || 0) + Number(profile.other_allowance || 0)
  const rows = [
    ['Employee Code', profile.employee_code],
    ['Designation', profile.designation || '—'],
    ['Department', profile.department || '—'],
    ['Client / Site', `${profile.client_name || '—'} / ${profile.site_name || '—'}`],
    ['Employee Type', profile.employee_type || '—'],
    ['Shift', profile.shift_type || '—'],
    ['Date of Joining', dateShort(profile.joining_date)],
    ['Email', profile.email || '—'],
    ['Mobile', profile.mobile || '—'],
  ]
  const flags = [
    ['PF', profile.pf_applicable], ['ESIC', profile.esi_applicable], ['LWF', profile.lwf_applicable], ['PT', profile.pt_applicable], ['TDS', profile.tds_applicable],
  ]
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard label="Gross Fixed" value={money(gross)} tone="warning" />
        <StatCard label="Employee Code" value={profile.employee_code} />
        <StatCard label="Designation" value={profile.designation || '—'} />
        <StatCard label="Date of Joining" value={profile.joining_date ? dateShort(profile.joining_date) : '—'} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SectionCard title="Profile" subtitle="Details on file with HR">
          <div className="flex items-center gap-3 pb-3 border-b border-hairline mb-2">
            <Avatar name={`${profile.first_name || ''} ${profile.last_name || ''}`} size="md" />
            <div>
              <p className="text-[15px] font-semibold text-ink">{profile.first_name} {profile.last_name}</p>
              <p className="text-[12px] text-mute">{profile.client_name || ''}{profile.client_name && profile.site_name ? ' / ' : ''}{profile.site_name || ''}</p>
            </div>
          </div>
          <dl className="divide-y divide-hairline">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between py-1.5 text-[13px]">
                <dt className="text-mute">{k}</dt>
                <dd className="text-body font-medium text-right">{v}</dd>
              </div>
            ))}
          </dl>
        </SectionCard>
        <div className="space-y-4">
          <SectionCard title="Current Salary" subtitle={profile.salary_effective_from ? `Effective ${dateShort(profile.salary_effective_from)}` : undefined}>
            <Table
              columns={[
                { key: 'c', header: 'Component' },
                { key: 'a', header: 'Amount', render: (r: any) => <span className={`${r.$strong ? 'font-semibold' : 'font-medium'} tabular-nums`}>{money(r.a)}</span> },
              ]}
              data={[
                { c: 'Basic', a: profile.basic },
                { c: 'House Rent Allowance', a: profile.hra },
                { c: 'Conveyance', a: profile.conveyance },
                { c: 'Other Allowance', a: profile.other_allowance },
                { c: 'OT Rate (₹/hour)', a: profile.overtime_rate },
                { c: 'Gross Fixed', a: gross, $strong: true },
              ]}
              keyFn={(r: any) => r.c}
            />
          </SectionCard>
          <SectionCard title="Statutory Applicability" subtitle="Deductions are applied during payroll only where marked applicable.">
            <div className="flex flex-wrap gap-2">
              {flags.map(([name, v]) => (
                <StatusBadge key={String(name)} status={v ? 'Applicable' : 'Not applicable'} tone={v ? 'success' : 'neutral'} />
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  )
}

// ---------------- Attendance + regularization ----------------
function AttendanceTab() {
  const qc = useQueryClient()
  const [year, setYear] = useState(YEAR)
  const [showReg, setShowReg] = useState(false)
  const attQ = useQuery({ queryKey: ['ess-att', year], queryFn: () => essApi.attendance(year) })
  const regsQ = useQuery({ queryKey: ['ess-regs'], queryFn: () => essApi.regularizations() })
  const regMut = useMutation({
    mutationFn: (d: any) => essApi.createRegularization(d),
    onSuccess: () => { setShowReg(false); toast.success('Correction submitted for HR review.'); qc.invalidateQueries({ queryKey: ['ess-regs'] }) },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to submit.'),
  })
  const [form, setForm] = useState({ month: String(now.getMonth() + 1), present_days: '', absent_days: '', paid_leave: '', unpaid_leave: '', reason: '' })

  return (
    <>
      <div className="flex gap-2 mt-4 mb-4 items-center justify-between flex-wrap">
        <NativeSelect className="w-32" value={String(year)} onChange={(v) => setYear(Number(v))} options={[2024, 2025, 2026, 2027, 2028].map(y => ({ value: String(y), label: String(y) }))} />
        <Button variant="secondary" size="sm" onClick={() => setShowReg(true)}><CalendarDays className="w-3.5 h-3.5" /> Request Correction</Button>
      </div>

      <div className="bg-white card-shadow rounded-md p-4">
        {attQ.isLoading ? <LoadingState /> : attQ.isError ? <PageError onRetry={() => attQ.refetch()} /> : (
          <Table
            columns={[
              { key: 'month', header: 'Month', render: (r: any) => <span className="font-medium text-ink">{monthYear(r.month, r.year)}</span> },
              { key: 'present_days', header: 'Present', render: (r: any) => <span className="tabular-nums">{r.present_days}</span> },
              { key: 'absent_days', header: 'Absent', render: (r: any) => <span className="tabular-nums">{r.absent_days}</span> },
              { key: 'paid_leave', header: 'Paid Leave', render: (r: any) => <span className="tabular-nums">{r.paid_leave}</span> },
              { key: 'unpaid_leave', header: 'Unpaid Leave', render: (r: any) => <span className="tabular-nums">{r.unpaid_leave}</span> },
              { key: 'ot_hours', header: 'OT Hours', render: (r: any) => <span className="tabular-nums">{r.ot_hours}</span> },
              { key: 'status', header: 'Status', render: (r: any) => <StatusBadge status={r.status} tone={regTone(r.status)} /> },
              { key: 'remarks', header: 'Remarks', render: (r: any) => <span className="text-mute">{r.remarks || '—'}</span> },
            ]}
            data={attQ.data?.data || []}
            keyFn={(r: any) => String(r.id)}
            minWidth="820px"
          />
        )}
      </div>

      {(regsQ.data?.data || []).length > 0 && (
        <div className="bg-white card-shadow rounded-md p-4 mt-4">
          <h3 className="text-[13px] font-semibold text-ink mb-3">My Correction Requests</h3>
          <Table
            columns={[
              { key: 'period', header: 'Period', render: (r: any) => monthYear(r.month, r.year) },
              { key: 'proposed', header: 'Proposed (P/A/PL/UL)', render: (r: any) => <span className="tabular-nums">{r.present_days} / {r.absent_days} / {r.paid_leave} / {r.unpaid_leave}</span> },
              { key: 'reason', header: 'Reason' },
              { key: 'status', header: 'Status', render: (r: any) => <StatusBadge status={r.status} tone={regTone(r.status)} /> },
              { key: 'reply', header: 'HR Reply', render: (r: any) => <span className="text-mute">{r.reply || '—'}</span> },
            ]}
            data={regsQ.data?.data || []}
            keyFn={(r: any) => String(r.id)}
            minWidth="760px"
          />
        </div>
      )}

      <Modal open={showReg} onClose={() => setShowReg(false)} title="Request Attendance Correction" size="sm">
        <p className="text-[12px] text-mute">Propose corrected day counts for a month. HR reviews and applies it while the period is still in draft.</p>
        <div className="space-y-3 mt-2">
          <Select label="Month" options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: shortMonth(i + 1) }))} value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Present Days" type="number" value={form.present_days} onChange={e => setForm(f => ({ ...f, present_days: e.target.value }))} />
            <Input label="Absent Days" type="number" value={form.absent_days} onChange={e => setForm(f => ({ ...f, absent_days: e.target.value }))} />
            <Input label="Paid Leave" type="number" value={form.paid_leave} onChange={e => setForm(f => ({ ...f, paid_leave: e.target.value }))} />
            <Input label="Unpaid Leave" type="number" value={form.unpaid_leave} onChange={e => setForm(f => ({ ...f, unpaid_leave: e.target.value }))} />
          </div>
          <Input label="Reason" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowReg(false)}>Cancel</Button>
            <Button
              loading={regMut.isPending}
              onClick={() => {
                if (!form.reason || form.reason.trim().length < 5) { toast.error('Please give a short reason (min 5 characters).'); return }
                regMut.mutate({
                  month: Number(form.month), year,
                  present_days: Number(form.present_days) || 0,
                  absent_days: Number(form.absent_days) || 0,
                  paid_leave: Number(form.paid_leave) || 0,
                  unpaid_leave: Number(form.unpaid_leave) || 0,
                  reason: form.reason.trim(),
                })
              }}
            >Submit for Review</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

// ---------------- Leave ----------------
function LeaveTab({ empId }: { empId: number }) {
  const qc = useQueryClient()
  const balQ = useQuery({ queryKey: ['ess-balances'], queryFn: () => leaveApi.balances(String(YEAR)) })
  const reqsQ = useQuery({ queryKey: ['ess-leaves'], queryFn: () => leaveApi.requests({}) })
  const typesQ = useQuery({ queryKey: ['leave-types'], queryFn: () => leaveApi.types() })
  const cancelMut = useMutation({
    mutationFn: (id: number) => leaveApi.cancel(id),
    onSuccess: () => { toast.success('Request cancelled.'); qc.invalidateQueries({ queryKey: ['ess-leaves'] }); qc.invalidateQueries({ queryKey: ['ess-balances'] }) },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })
  const applyMut = useMutation({
    mutationFn: (d: any) => leaveApi.apply(d),
    onSuccess: () => { setApplyOpen(false); toast.success('Leave applied — pending manager approval.'); qc.invalidateQueries({ queryKey: ['ess-leaves'] }); qc.invalidateQueries({ queryKey: ['ess-balances'] }) },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to apply.'),
  })
  const [applyOpen, setApplyOpen] = useState(false)
  const [form, setForm] = useState({ leave_type_id: '', start_date: '', end_date: '', reason: '' })

  const balances = ((balQ.data?.data || []) as any[])
  const myRequests = ((reqsQ.data?.data || []) as any[])

  return (
    <div className="mt-4 space-y-4">
      <SectionCard
        title={`Leave Balances — ${YEAR}`}
        subtitle="Available days for the current year"
        action={<Button variant="secondary" size="sm" onClick={() => setApplyOpen(true)}><CalendarDays className="w-3.5 h-3.5" /> Apply Leave</Button>}
      >
        {balQ.isLoading ? <LoadingState /> : balQ.isError ? <PageError onRetry={() => balQ.refetch()} /> : balances.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No leave balances" description="Balances appear once leave types are configured for your role." />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {balances.map(b => (
              <div key={b.leave_type_id} className="border border-hairline rounded-md p-3 bg-canvas-soft/40">
                <p className="text-[11px] text-mute">{b.name}</p>
                <p className="text-xl font-semibold text-ink tabular-nums">{b.available}</p>
                <p className="text-[10px] text-mute">of {b.entitled} · used {b.used}{b.pending ? ` · pending ${b.pending}` : ''}</p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <div className="bg-white card-shadow rounded-md overflow-hidden">
        <h3 className="text-[13px] font-semibold text-ink px-4 pt-4 pb-3">My Leave History</h3>
        {reqsQ.isLoading ? (
          <div className="p-4"><LoadingState /></div>
        ) : reqsQ.isError ? (
          <PageError onRetry={() => reqsQ.refetch()} />
        ) : myRequests.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No leave yet" description="Applied leave will appear here with its approval status." />
        ) : (
          <Table
            columns={[
              { key: 'dates', header: 'Dates', render: (r: any) => <span className="whitespace-nowrap">{dateShort(r.start_date)} → {dateShort(r.end_date)}</span> },
              { key: 'type_name', header: 'Type', render: (r: any) => r.type_name || 'General' },
              { key: 'days', header: 'Days', render: (r: any) => <span className="tabular-nums">{r.days}</span> },
              { key: 'status', header: 'Status', render: (r: any) => <StatusBadge status={r.status.replace('_', ' ')} tone={leaveTone(r.status)} /> },
              { key: 'actions', header: '', className: 'text-right', render: (r: any) => r.status.startsWith('pending')
                ? <button onClick={() => cancelMut.mutate(r.id)} className="px-2 py-1 text-[11px] font-medium text-error hover:bg-error-soft rounded-xs cursor-pointer">Cancel</button>
                : null },
            ]}
            data={myRequests}
            keyFn={(r: any) => String(r.id)}
            minWidth="820px"
          />
        )}
      </div>

      <Modal open={applyOpen} onClose={() => setApplyOpen(false)} title="Apply for Leave" size="sm">
        <div className="space-y-3">
          <Select
            label="Leave Type"
            options={(typesQ.data?.data || []).map((t: any) => ({ value: String(t.id), label: t.name }))}
            value={form.leave_type_id}
            onChange={e => setForm(f => ({ ...f, leave_type_id: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="From" type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            <Input label="To" type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
          </div>
          <Input label="Reason (optional)" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setApplyOpen(false)}>Cancel</Button>
            <Button
              loading={applyMut.isPending}
              onClick={() => {
                if (!form.start_date || !form.end_date) { toast.error('Pick the leave dates.'); return }
                applyMut.mutate({ employee_id: empId, leave_type_id: form.leave_type_id ? Number(form.leave_type_id) : null, start_date: form.start_date, end_date: form.end_date, reason: form.reason || undefined })
              }}
            >Submit</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ---------------- Payslips ----------------
function PayslipsTab() {
  const slipsQ = useQuery({ queryKey: ['ess-slips'], queryFn: () => slipApi.list() })
  const [openSlipId, setOpenSlipId] = useState<number | null>(null)
  const detailQ = useQuery({
    queryKey: ['ess-slip', openSlipId],
    queryFn: () => slipApi.get(openSlipId as number),
    enabled: openSlipId != null,
  })

  const slips = ((slipsQ.data?.data || []) as any[])

  return (
    <div className="mt-4 bg-white card-shadow rounded-md p-4">
      {slipsQ.isLoading ? <LoadingState /> : slipsQ.isError ? <PageError onRetry={() => slipsQ.refetch()} /> : slips.length === 0 ? (
        <EmptyState icon={FileText} title="No payslips yet" description="Payslips appear here after payroll is finalized each month." />
      ) : (
        <Table
          columns={[
            { key: 'slip_number', header: 'Slip No.', render: (r: any) => <span className="font-mono text-[12px]">{r.slip_number}</span> },
            { key: 'month', header: 'Period', render: (r: any) => <span className="font-medium text-ink">{monthYear(r.month, r.year)}</span> },
            { key: 'net_salary', header: 'Net Pay', render: (r: any) => <span className="font-medium tabular-nums">{money(r.net_salary)}</span> },
            { key: 'status', header: 'Status', render: (r: any) => <StatusBadge status={r.payroll_status} tone={slipTone(r.payroll_status)} /> },
            { key: 'generated_at', header: 'Generated', render: (r: any) => <span className="text-mute">{r.generated_at?.slice(0, 10)}</span> },
            { key: 'actions', header: '', className: 'text-right', render: (r: any) => (
              <div className="flex justify-end">
                <Button variant="secondary" size="sm" onClick={() => setOpenSlipId(r.id)}>View</Button>
              </div>
            ) },
          ]}
          data={slips}
          keyFn={(r: any) => String(r.id)}
          minWidth="820px"
        />
      )}

      <Modal open={openSlipId != null} onClose={() => setOpenSlipId(null)} title="Salary Slip" size="md">
        {detailQ.isLoading ? <LoadingState /> : detailQ.isError ? <PageError onRetry={() => detailQ.refetch()} /> : (() => {
          const d = (detailQ.data?.data || {}) as unknown as SalarySlipDetail
          if (!d.item) return null
          const earnings = [
            ['Basic', d.item.basic], ['HRA', d.item.hra], ['Conveyance', d.item.conveyance], ['Other Allowance', d.item.other_allowance],
            ...(d.item.incentive ? [['Incentive', d.item.incentive]] : []),
            ...(d.item.bonus ? [['Bonus', d.item.bonus]] : []),
            ...(d.item.arrears ? [['Arrears', d.item.arrears]] : []),
            ['Overtime', d.item.overtime_earnings],
          ] as [string, number][]
          const deductions = [
            ['PF', d.item.pf], ['ESIC', d.item.esic], ['Professional Tax', d.item.professional_tax],
            ['LWF', d.item.lwf], ['TDS', d.item.tds], ['Advance', d.item.advance_deduction],
            ...(d.item.loan_deduction ? [['Loan EMI', d.item.loan_deduction]] : []),
            ['Attendance Deduction', d.item.attendance_deduction], ['Other Deduction', d.item.other_deduction],
          ] as [string, number][]
          return (
            <div id="ess-slip-print">
              <div className="flex justify-between items-start pb-3 border-b border-hairline">
                <div>
                  <p className="text-[15px] font-semibold text-ink">{d.company.company_name}</p>
                  <p className="text-[11px] text-mute">{d.company.address}, {d.company.state} — {d.company.pincode}</p>
                </div>
                <div className="text-right text-[11px] text-mute">
                  <p className="font-medium text-body">{d.slip.slip_number}</p>
                  <p>{monthYear(d.slip.month, d.slip.year)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-6 text-[12px] py-3 border-b border-hairline">
                <p><span className="text-mute">Employee:</span> <span className="font-medium">{d.item.first_name} {d.item.last_name} ({d.item.employee_code})</span></p>
                <p className="text-right"><span className="text-mute">Designation:</span> <span className="font-medium">{d.item.designation}</span></p>
                <p><span className="text-mute">Present:</span> {d.item.att_present ?? d.item.present_days} days · OT {d.item.att_ot ?? d.item.ot_hours} hrs</p>
                <p className="text-right"><span className="text-mute">Paid A/c:</span> {d.item.bank_account || '—'} ({d.item.bank_ifsc || '—'})</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-3 text-[12px]">
                <table className="w-full">
                  <thead><tr className="text-left text-mute"><th className="pb-1 font-medium">Earnings</th><th className="pb-1 text-right font-medium">Amount</th></tr></thead>
                  <tbody>
                    {earnings.filter(([, v]) => v).map(([k, v]) => (
                      <tr key={k}><td className="py-0.5">{k}</td><td className="py-0.5 text-right tabular-nums">{money(v)}</td></tr>
                    ))}
                    <tr className="border-t border-hairline"><td className="pt-1 font-semibold">Gross</td><td className="pt-1 text-right font-semibold tabular-nums">{money(d.item.gross)}</td></tr>
                  </tbody>
                </table>
                <table className="w-full">
                  <thead><tr className="text-left text-mute"><th className="pb-1 font-medium">Deductions</th><th className="pb-1 text-right font-medium">Amount</th></tr></thead>
                  <tbody>
                    {deductions.filter(([, v]) => v).map(([k, v]) => (
                      <tr key={k}><td className="py-0.5">{k}</td><td className="py-0.5 text-right tabular-nums">{money(v)}</td></tr>
                    ))}
                    <tr className="border-t border-hairline"><td className="pt-1 font-semibold">Total Deductions</td><td className="pt-1 text-right font-semibold tabular-nums">{money(d.item.total_deductions)}</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between items-center pt-2 border-t-2 border-navy mt-1">
                <span className="text-[13px] font-semibold text-ink">Net Pay</span>
                <span className="text-[15px] font-bold text-navy tabular-nums">{money(d.item.net_salary)}</span>
              </div>
            </div>
          )
        })()}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setOpenSlipId(null)}><X className="w-3.5 h-3.5" /> Close</Button>
          <Button onClick={() => window.print()}><Printer className="w-3.5 h-3.5" /> Print</Button>
        </div>
      </Modal>
    </div>
  )
}

// ---------------- Requests to HR ----------------
function RequestsTab({ onSubmitted }: { onSubmitted?: () => void }) {
  const reqsQ = useQuery({ queryKey: ['ess-reqs'], queryFn: () => helpdeskApi.myRequests() })
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState('other')
  const [priority, setPriority] = useState('medium')
  const createMut = useMutation({
    mutationFn: () => helpdeskApi.createSelf({ subject: subject.trim(), message: message.trim() || undefined, category, priority }),
    onSuccess: () => { setSubject(''); setMessage(''); setCategory('other'); setPriority('medium'); toast.success('Request submitted.'); onSubmitted?.() },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to submit.'),
  })

  const CATS = [
    { value: 'salary_issue', label: 'Salary Issue' }, { value: 'attendance_issue', label: 'Attendance Issue' },
    { value: 'pf_esi_issue', label: 'PF/ESI Issue' }, { value: 'leave_issue', label: 'Leave Issue' },
    { value: 'document_request', label: 'Document Request' }, { value: 'id_card_request', label: 'ID Card Request' },
    { value: 'other', label: 'Other HR Query' },
  ]

  const rows = ((reqsQ.data?.data || []) as any[])

  return (
    <div className="mt-4 grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="bg-white card-shadow rounded-md p-4 h-fit">
        <h3 className="text-[13px] font-semibold text-ink mb-3">New Request</h3>
        <div className="space-y-3">
          <Select label="Category" options={CATS} value={category} onChange={e => setCategory(e.target.value)} />
          <Select label="Priority" options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' }]} value={priority} onChange={e => setPriority(e.target.value)} />
          <Input label="Subject" placeholder="e.g. Address proof letter" value={subject} onChange={e => setSubject(e.target.value)} />
          <Input label="Details (optional)" value={message} onChange={e => setMessage(e.target.value)} />
          <Button
            className="w-full"
            loading={createMut.isPending}
            onClick={() => {
              if (subject.trim().length < 3) { toast.error('Subject must be at least 3 characters.'); return }
              createMut.mutate()
            }}
          ><Send className="w-3.5 h-3.5" /> Submit Request</Button>
        </div>
      </div>
      <div className="xl:col-span-2 bg-white card-shadow rounded-md p-4">
        <h3 className="text-[13px] font-semibold text-ink mb-3">My Requests & Status</h3>
        {reqsQ.isLoading ? <LoadingState /> : reqsQ.isError ? <PageError onRetry={() => reqsQ.refetch()} /> : rows.length === 0 ? (
          <EmptyState icon={UserRound} title="Nothing yet" description="Raise a request above — HR will respond via the Helpdesk." />
        ) : (
          <div className="divide-y divide-hairline">
            {rows.map((r: any) => (
              <div key={r.id} className="py-2.5">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="text-[13px] font-medium text-ink">{r.subject}</p>
                    {r.message && <p className="text-[12px] text-mute mt-0.5 truncate max-w-[300px]">{r.message}</p>}
                  </div>
                  <StatusBadge status={r.status} tone={reqTone(r.status)} />
                </div>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-mute">
                  <span className="uppercase tracking-wider">{r.category?.replace(/_/g, ' ')}</span>
                  {r.priority && <span className="uppercase tracking-wider">· {r.priority}</span>}
                </div>
                {r.reply && (
                  <div className="mt-1.5 bg-canvas-soft rounded-xs px-2.5 py-1.5">
                    <p className="text-[12px] text-body"><span className="font-medium">HR:</span> {r.reply}</p>
                    <p className="text-[10px] text-mute mt-0.5">{r.resolved_by} · {r.resolved_at?.slice(0, 16)}</p>
                  </div>
                )}
                {r.action_notes && !r.reply && (
                  <div className="mt-1.5 bg-canvas-soft rounded-xs px-2.5 py-1.5">
                    <p className="text-[12px] text-body"><span className="font-medium">Action:</span> {r.action_notes}</p>
                    <p className="text-[10px] text-mute mt-0.5">{r.action_by} · {r.action_at?.slice(0, 16)}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}