import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { essApi, leaveApi, slipApi, helpdeskApi } from '@/services/api'
import type { SalarySlipDetail } from '@/types/api'
import { Table, Tabs, StatCard } from '@/components/ui/data'
import { PageHeader, SectionCard } from '@/components/ui/layout'
import { StatusBadge, type Tone } from '@/components/ui/status'
import { Avatar, NativeSelect } from '@/components/ui/actions'
import { LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { Button, Input, Select, Textarea } from '@/components/ui/fields'
import { Modal } from '@/components/ui/overlay'
import { money, monthYear, shortMonth, dateShort } from '@/utils/format'
import { toast } from 'sonner'
import {
  UserRound, CalendarDays, FileText, Send, Printer, X, Sparkles, Building2,
  Wallet, ShieldCheck, Clock, CheckCircle2, ChevronRight, Download
} from 'lucide-react'

const TABS = [
  { key: 'overview', label: 'My Profile & Salary' },
  { key: 'attendance', label: 'Attendance & Correction' },
  { key: 'leave', label: 'Leave Balances & Requests' },
  { key: 'payslips', label: 'Payslip Archives' },
  { key: 'requests', label: 'HR Helpdesk Queries' },
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
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <UserRound className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Employee Self-Service (My Space)</h1>
          </div>
          <p className="text-xs text-slate-500">Access your digital profile, monthly pay vouchers, leave ledger and raise tickets directly with HR</p>
        </div>
      </div>

      {meQ.isLoading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-8"><LoadingState /></div>
      ) : meQ.isError ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-8"><PageError onRetry={() => meQ.refetch()} /></div>
      ) : !profile ? null : (
        <>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80">
            <Tabs tabs={TABS} active={active} onChange={setActive} />
          </div>

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
    ['Deployment Client & Site', `${profile.client_name || '—'} · ${profile.site_name || '—'}`],
    ['Employment Contract', profile.employee_type || '—'],
    ['Assigned Shift', profile.shift_type || 'General Shift'],
    ['Date of Joining', dateShort(profile.joining_date)],
    ['Email', profile.email || '—'],
    ['Contact Phone', profile.mobile || '—'],
  ]
  const flags = [
    ['Provident Fund (PF)', profile.pf_applicable],
    ['ESIC Medical', profile.esi_applicable],
    ['Labor Welfare Fund (LWF)', profile.lwf_applicable],
    ['Professional Tax (PT)', profile.pt_applicable],
    ['TDS Tax', profile.tds_applicable],
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Gross Fixed CTC', value: money(gross), icon: Wallet, gradient: 'from-blue-600 to-indigo-600' },
          { label: 'Employee Code', value: profile.employee_code, icon: UserRound, gradient: 'from-slate-700 to-slate-800' },
          { label: 'Designation Role', value: profile.designation || 'Staff', icon: Building2, gradient: 'from-emerald-600 to-teal-600' },
          { label: 'Onboarding Date', value: profile.joining_date ? dateShort(profile.joining_date) : '—', icon: CalendarDays, gradient: 'from-amber-500 to-orange-500' },
        ].map((s, i) => (
          <div key={i} className="relative overflow-hidden bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500">{s.label}</span>
              <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-white shadow-sm`}>
                <s.icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-bold text-slate-900 tracking-tight">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
              {profile.first_name?.[0]}{profile.last_name?.[0]}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{profile.first_name} {profile.last_name}</h3>
              <p className="text-xs text-slate-500">{profile.client_name || ''}{profile.client_name && profile.site_name ? ' · ' : ''}{profile.site_name || ''}</p>
            </div>
          </div>

          <dl className="divide-y divide-slate-100">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between py-2 text-xs">
                <dt className="text-slate-500 font-medium">{k}</dt>
                <dd className="text-slate-900 font-semibold text-right">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Compensation Breakdown</h3>
              <p className="text-xs text-slate-500">{profile.salary_effective_from ? `Effective ${dateShort(profile.salary_effective_from)}` : 'Monthly base salary scale'}</p>
            </div>

            <div className="bg-slate-50 rounded-xl border border-slate-200/80 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200/80 bg-slate-100/50">
                    <th className="py-2.5 px-3 font-semibold">Salary Component</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Monthly Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  <tr><td className="py-2 px-3 text-slate-700">Basic Pay</td><td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">{money(profile.basic)}</td></tr>
                  <tr><td className="py-2 px-3 text-slate-700">House Rent Allowance (HRA)</td><td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">{money(profile.hra)}</td></tr>
                  <tr><td className="py-2 px-3 text-slate-700">Conveyance Allowance</td><td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">{money(profile.conveyance)}</td></tr>
                  <tr><td className="py-2 px-3 text-slate-700">Other Allowance</td><td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">{money(profile.other_allowance)}</td></tr>
                  <tr className="bg-indigo-50/40 border-t-2 border-indigo-100"><td className="py-2.5 px-3 font-bold text-slate-900">Total Monthly Gross Fixed</td><td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-700 text-sm">{money(gross)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Statutory Benefits &amp; Protections</h3>
            <div className="flex flex-wrap gap-2">
              {flags.map(([name, v]) => (
                <span
                  key={String(name)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border ${
                    v ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  <ShieldCheck className={`w-3.5 h-3.5 ${v ? 'text-emerald-600' : 'text-slate-400'}`} />
                  {name}: <strong className="font-semibold">{v ? 'Active' : 'N/A'}</strong>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------- Attendance ----------------
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
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80">
        <div className="w-36">
          <NativeSelect value={String(year)} onChange={(v) => setYear(Number(v))} options={[2024, 2025, 2026, 2027, 2028].map(y => ({ value: String(y), label: `Year ${y}` }))} />
        </div>
        <Button onClick={() => setShowReg(true)}>
          <CalendarDays className="w-4 h-4 mr-1.5" /> Request Attendance Correction
        </Button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        {attQ.isLoading ? <div className="p-8"><LoadingState /></div> : attQ.isError ? <div className="p-8"><PageError onRetry={() => attQ.refetch()} /></div> : (
          <Table
            columns={[
              { key: 'month', header: 'Period', render: (r: any) => <span className="font-semibold text-slate-900 text-xs">{monthYear(r.month, r.year)}</span> },
              { key: 'present_days', header: 'Present', render: (r: any) => <span className="font-mono text-xs font-bold text-emerald-600">{r.present_days} d</span> },
              { key: 'absent_days', header: 'Absent', render: (r: any) => <span className="font-mono text-xs font-bold text-rose-600">{r.absent_days} d</span> },
              { key: 'paid_leave', header: 'Paid Leave', render: (r: any) => <span className="font-mono text-xs text-blue-600">{r.paid_leave} d</span> },
              { key: 'unpaid_leave', header: 'Unpaid Leave', render: (r: any) => <span className="font-mono text-xs text-slate-600">{r.unpaid_leave} d</span> },
              { key: 'ot_hours', header: 'Overtime', render: (r: any) => <span className="font-mono text-xs font-bold text-indigo-600">{r.ot_hours} hrs</span> },
              { key: 'status', header: 'Status', render: (r: any) => <StatusBadge status={r.status} tone={regTone(r.status)} /> },
              { key: 'remarks', header: 'Remarks', render: (r: any) => <span className="text-xs text-slate-500">{r.remarks || '—'}</span> },
            ]}
            data={attQ.data?.data || []}
            keyFn={(r: any) => String(r.id)}
          />
        )}
      </div>

      {(regsQ.data?.data || []).length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Attendance Regularization Requests</h3>
          <Table
            columns={[
              { key: 'period', header: 'Period', render: (r: any) => <span className="font-semibold text-xs text-slate-900">{monthYear(r.month, r.year)}</span> },
              { key: 'proposed', header: 'Proposed Days (P / A / PL / UL)', render: (r: any) => <span className="font-mono text-xs font-bold text-slate-800">{r.present_days} / {r.absent_days} / {r.paid_leave} / {r.unpaid_leave}</span> },
              { key: 'reason', header: 'Explanation', render: (r: any) => <p className="text-xs text-slate-600 max-w-[200px] truncate">{r.reason}</p> },
              { key: 'status', header: 'Status', render: (r: any) => <StatusBadge status={r.status} tone={regTone(r.status)} /> },
              { key: 'reply', header: 'HR Decision / Remarks', render: (r: any) => <span className="text-xs text-slate-500">{r.reply || 'Pending HR Review'}</span> },
            ]}
            data={regsQ.data?.data || []}
            keyFn={(r: any) => String(r.id)}
          />
        </div>
      )}

      <Modal open={showReg} onClose={() => setShowReg(false)} title="Request Attendance Correction" size="sm">
        <div className="space-y-4 pt-1">
          <p className="text-xs text-slate-500">Propose corrected attendance counts for HR verification before payroll lock.</p>
          <Select label="Billing Month" options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: shortMonth(i + 1) }))} value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Present Days" type="number" value={form.present_days} onChange={e => setForm(f => ({ ...f, present_days: e.target.value }))} />
            <Input label="Absent Days" type="number" value={form.absent_days} onChange={e => setForm(f => ({ ...f, absent_days: e.target.value }))} />
            <Input label="Paid Leave" type="number" value={form.paid_leave} onChange={e => setForm(f => ({ ...f, paid_leave: e.target.value }))} />
            <Input label="Unpaid Leave" type="number" value={form.unpaid_leave} onChange={e => setForm(f => ({ ...f, unpaid_leave: e.target.value }))} />
          </div>
          <Input label="Reason for Adjustment" placeholder="e.g. Punch machine failure at site" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setShowReg(false)}>Cancel</Button>
            <Button
              loading={regMut.isPending}
              onClick={() => {
                if (!form.reason || form.reason.trim().length < 5) { toast.error('Please enter a valid reason.'); return }
                regMut.mutate({
                  month: Number(form.month), year,
                  present_days: Number(form.present_days) || 0,
                  absent_days: Number(form.absent_days) || 0,
                  paid_leave: Number(form.paid_leave) || 0,
                  unpaid_leave: Number(form.unpaid_leave) || 0,
                  reason: form.reason.trim(),
                })
              }}
            >Submit Correction</Button>
          </div>
        </div>
      </Modal>
    </div>
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
    onSuccess: () => { toast.success('Leave request cancelled.'); qc.invalidateQueries({ queryKey: ['ess-leaves'] }); qc.invalidateQueries({ queryKey: ['ess-balances'] }) },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })
  const applyMut = useMutation({
    mutationFn: (d: any) => leaveApi.apply(d),
    onSuccess: () => { setApplyOpen(false); toast.success('Leave applied — pending manager review.'); qc.invalidateQueries({ queryKey: ['ess-leaves'] }); qc.invalidateQueries({ queryKey: ['ess-balances'] }) },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to apply.'),
  })
  const [applyOpen, setApplyOpen] = useState(false)
  const [form, setForm] = useState({ leave_type_id: '', start_date: '', end_date: '', reason: '' })

  const balances = ((balQ.data?.data || []) as any[])
  const myRequests = ((reqsQ.data?.data || []) as any[])

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Leave Ledger — FY {YEAR}</h3>
            <p className="text-xs text-slate-500">Available quotas, utilized allowances and pending applications</p>
          </div>
          <Button onClick={() => setApplyOpen(true)}>
            <CalendarDays className="w-4 h-4 mr-1.5" /> Apply Leave
          </Button>
        </div>

        {balQ.isLoading ? <LoadingState /> : balQ.isError ? <PageError onRetry={() => balQ.refetch()} /> : balances.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No Leave Quotas Configured" description="Leave entitlements will appear once allocated by HR." />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {balances.map(b => (
              <div key={b.leave_type_id} className="border border-slate-200/80 rounded-2xl p-4 bg-slate-50/50 space-y-1">
                <span className="text-xs font-semibold text-slate-500 block truncate">{b.name}</span>
                <p className="text-2xl font-bold text-slate-900 font-mono">{b.available}</p>
                <p className="text-[11px] text-slate-500">of {b.entitled} allocated · used {b.used}{b.pending ? ` · pending ${b.pending}` : ''}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Leave History &amp; Approval Status</h3>
        </div>
        {reqsQ.isLoading ? (
          <div className="p-8"><LoadingState /></div>
        ) : reqsQ.isError ? (
          <div className="p-8"><PageError onRetry={() => reqsQ.refetch()} /></div>
        ) : myRequests.length === 0 ? (
          <div className="p-8"><EmptyState icon={CalendarDays} title="No Leave History Logged" description="Submitted leave requests will appear here with live manager review status." /></div>
        ) : (
          <Table
            columns={[
              { key: 'dates', header: 'Leave Duration', render: (r: any) => <span className="font-semibold text-xs text-slate-900">{dateShort(r.start_date)} → {dateShort(r.end_date)}</span> },
              { key: 'type_name', header: 'Leave Category', render: (r: any) => <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">{r.type_name || 'General'}</span> },
              { key: 'days', header: 'Total Days', render: (r: any) => <span className="font-mono text-xs font-bold text-indigo-700">{r.days} d</span> },
              { key: 'status', header: 'Review Status', render: (r: any) => <StatusBadge status={r.status.replace('_', ' ')} tone={leaveTone(r.status)} /> },
              { key: 'actions', header: '', render: (r: any) => r.status.startsWith('pending') ? (
                <button onClick={() => cancelMut.mutate(r.id)} className="px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors">
                  Cancel Request
                </button>
              ) : null },
            ]}
            data={myRequests}
            keyFn={(r: any) => String(r.id)}
          />
        )}
      </div>

      <Modal open={applyOpen} onClose={() => setApplyOpen(false)} title="Apply for Leave" size="sm">
        <div className="space-y-4 pt-1">
          <Select
            label="Leave Type"
            options={(typesQ.data?.data || []).map((t: any) => ({ value: String(t.id), label: t.name }))}
            value={form.leave_type_id}
            onChange={e => setForm(f => ({ ...f, leave_type_id: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="From Date" type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            <Input label="To Date" type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
          </div>
          <Input label="Reason for Leave" placeholder="e.g. Family medical commitment" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setApplyOpen(false)}>Cancel</Button>
            <Button
              loading={applyMut.isPending}
              onClick={() => {
                if (!form.start_date || !form.end_date) { toast.error('Pick the leave dates.'); return }
                applyMut.mutate({ employee_id: empId, leave_type_id: form.leave_type_id ? Number(form.leave_type_id) : null, start_date: form.start_date, end_date: form.end_date, reason: form.reason || undefined })
              }}
            >Submit Leave Request</Button>
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
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
      <div className="p-4 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-900">Monthly Salary Slips</h3>
      </div>

      {slipsQ.isLoading ? <div className="p-8"><LoadingState /></div> : slipsQ.isError ? <div className="p-8"><PageError onRetry={() => slipsQ.refetch()} /></div> : slips.length === 0 ? (
        <div className="p-8"><EmptyState icon={FileText} title="No Payslips Issued Yet" description="Monthly payslips will appear here once payroll cycles are finalized." /></div>
      ) : (
        <Table
          columns={[
            { key: 'slip_number', header: 'Voucher Number', render: (r: any) => <span className="font-mono text-xs font-bold text-indigo-600">{r.slip_number}</span> },
            { key: 'month', header: 'Payroll Period', render: (r: any) => <span className="font-semibold text-xs text-slate-900">{monthYear(r.month, r.year)}</span> },
            { key: 'net_salary', header: 'Net Disbursed Pay', render: (r: any) => <span className="font-mono text-xs font-bold text-emerald-700">{money(r.net_salary)}</span> },
            { key: 'status', header: 'Disbursement Status', render: (r: any) => <StatusBadge status={r.payroll_status} tone={slipTone(r.payroll_status)} /> },
            { key: 'generated_at', header: 'Date Generated', render: (r: any) => <span className="text-xs text-slate-500">{r.generated_at?.slice(0, 10)}</span> },
            { key: 'actions', header: '', render: (r: any) => (
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setOpenSlipId(r.id)}>
                  <FileText className="w-3.5 h-3.5 mr-1" /> View Slip
                </Button>
              </div>
            ) },
          ]}
          data={slips}
          keyFn={(r: any) => String(r.id)}
        />
      )}

      <Modal open={openSlipId != null} onClose={() => setOpenSlipId(null)} title="Official Salary Voucher" size="md">
        {detailQ.isLoading ? <div className="p-6"><LoadingState /></div> : detailQ.isError ? <div className="p-6"><PageError onRetry={() => detailQ.refetch()} /></div> : (() => {
          const d = (detailQ.data?.data || {}) as unknown as SalarySlipDetail
          if (!d.item) return null
          const earnings = [
            ['Basic Pay', d.item.basic], ['House Rent Allowance', d.item.hra], ['Conveyance Allowance', d.item.conveyance], ['Other Allowance', d.item.other_allowance],
            ...(d.item.incentive ? [['Incentive Bonus', d.item.incentive]] : []),
            ...(d.item.bonus ? [['Statutory Bonus', d.item.bonus]] : []),
            ...(d.item.arrears ? [['Salary Arrears', d.item.arrears]] : []),
            ['Overtime Allowance', d.item.overtime_earnings],
          ] as [string, number][]
          const deductions = [
            ['Provident Fund (PF)', d.item.pf], ['ESIC Contribution', d.item.esic], ['Professional Tax', d.item.professional_tax],
            ['Labor Welfare Fund (LWF)', d.item.lwf], ['TDS Deductions', d.item.tds], ['Salary Advance Repayment', d.item.advance_deduction],
            ...(d.item.loan_deduction ? [['Staff Loan Installment', d.item.loan_deduction]] : []),
            ['Attendance Loss of Pay', d.item.attendance_deduction], ['Other Deductions', d.item.other_deduction],
          ] as [string, number][]
          return (
            <div id="ess-slip-print" className="space-y-4">
              <div className="flex justify-between items-start pb-3 border-b border-slate-200">
                <div>
                  <h4 className="text-base font-bold text-slate-900">{d.company.company_name}</h4>
                  <p className="text-xs text-slate-500">{d.company.address}, {d.company.state} — {d.company.pincode}</p>
                </div>
                <div className="text-right text-xs">
                  <span className="font-mono font-bold text-indigo-600 block">{d.slip.slip_number}</span>
                  <span className="font-semibold text-slate-700">{monthYear(d.slip.month, d.slip.year)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs py-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <p><span className="text-slate-500">Employee:</span> <span className="font-bold text-slate-900 ml-1">{d.item.first_name} {d.item.last_name} ({d.item.employee_code})</span></p>
                <p className="text-right"><span className="text-slate-500">Designation:</span> <span className="font-semibold text-slate-800 ml-1">{d.item.designation}</span></p>
                <p><span className="text-slate-500">Attendance Days:</span> <span className="font-bold text-slate-900 ml-1">{d.item.att_present ?? d.item.present_days} Days</span></p>
                <p className="text-right"><span className="text-slate-500">Bank Account:</span> <span className="font-mono font-semibold text-slate-800 ml-1">{d.item.bank_account || '—'}</span></p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2">Earnings</h5>
                  <div className="space-y-1">
                    {earnings.filter(([, v]) => v).map(([k, v]) => (
                      <div key={k} className="flex justify-between py-0.5"><span className="text-slate-600">{k}</span><span className="font-mono font-semibold text-slate-900">{money(v)}</span></div>
                    ))}
                    <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-900"><span>Gross Earnings</span><span className="font-mono text-indigo-700">{money(d.item.gross)}</span></div>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2">Deductions</h5>
                  <div className="space-y-1">
                    {deductions.filter(([, v]) => v).map(([k, v]) => (
                      <div key={k} className="flex justify-between py-0.5"><span className="text-slate-600">{k}</span><span className="font-mono font-semibold text-slate-900">{money(v)}</span></div>
                    ))}
                    <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-900"><span>Total Deductions</span><span className="font-mono text-rose-700">{money(d.item.total_deductions)}</span></div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center p-3.5 bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-xl border border-indigo-200 text-xs">
                <span className="font-bold text-slate-900 uppercase tracking-wider">Net Disbursed Take-Home</span>
                <span className="font-mono font-bold text-indigo-700 text-base">{money(d.item.net_salary)}</span>
              </div>
            </div>
          )
        })()}
        <div className="flex justify-end gap-2.5 mt-4 pt-3 border-t border-slate-100">
          <Button variant="secondary" onClick={() => setOpenSlipId(null)}>Close</Button>
          <Button onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-1.5" /> Print Payslip
          </Button>
        </div>
      </Modal>
    </div>
  )
}

// ---------------- Requests ----------------
function RequestsTab({ onSubmitted }: { onSubmitted?: () => void }) {
  const reqsQ = useQuery({ queryKey: ['ess-reqs'], queryFn: () => helpdeskApi.myRequests() })
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState('other')
  const [priority, setPriority] = useState('medium')
  const createMut = useMutation({
    mutationFn: () => helpdeskApi.createSelf({ subject: subject.trim(), message: message.trim() || undefined, category, priority }),
    onSuccess: () => { setSubject(''); setMessage(''); setCategory('other'); setPriority('medium'); toast.success('Ticket submitted.'); onSubmitted?.() },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to submit.'),
  })

  const CATS = [
    { value: 'salary_issue', label: 'Salary Issue' }, { value: 'attendance_issue', label: 'Attendance Issue' },
    { value: 'pf_esi_issue', label: 'PF / ESI Issue' }, { value: 'leave_issue', label: 'Leave Dispute' },
    { value: 'document_request', label: 'Document Request' }, { value: 'id_card_request', label: 'ID Card Re-issue' },
    { value: 'other', label: 'General Query' },
  ]

  const rows = ((reqsQ.data?.data || []) as any[])

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 space-y-4 h-fit">
        <h3 className="text-sm font-bold text-slate-900">Raise Helpdesk Ticket</h3>
        <div className="space-y-3">
          <Select label="Inquiry Category" options={CATS} value={category} onChange={e => setCategory(e.target.value)} />
          <Select label="Priority" options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' }]} value={priority} onChange={e => setPriority(e.target.value)} />
          <Input label="Summary Subject" placeholder="e.g. Experience Certificate Request" value={subject} onChange={e => setSubject(e.target.value)} />
          <Textarea label="Details & Notes" placeholder="Provide extra background or dates..." value={message} onChange={e => setMessage(e.target.value)} />
          <Button
            className="w-full"
            loading={createMut.isPending}
            onClick={() => {
              if (subject.trim().length < 3) { toast.error('Subject must be at least 3 characters.'); return }
              createMut.mutate()
            }}
          >
            <Send className="w-4 h-4 mr-1.5" /> Submit to HR
          </Button>
        </div>
      </div>

      <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Ticket History &amp; Resolution Updates</h3>
        </div>
        {reqsQ.isLoading ? <div className="p-8"><LoadingState /></div> : reqsQ.isError ? <div className="p-8"><PageError onRetry={() => reqsQ.refetch()} /></div> : rows.length === 0 ? (
          <div className="p-8"><EmptyState icon={UserRound} title="No Tickets Raised" description="Create a ticket on the left to request HR assistance." /></div>
        ) : (
          <div className="divide-y divide-slate-100 p-4 space-y-3">
            {rows.map((r: any) => (
              <div key={r.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{r.subject}</h4>
                    {r.message && <p className="text-xs text-slate-500 mt-0.5">{r.message}</p>}
                  </div>
                  <StatusBadge status={r.status} tone={reqTone(r.status)} />
                </div>
                {r.reply && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80 text-xs space-y-1">
                    <span className="font-bold text-indigo-700">HR Resolution Note:</span>
                    <p className="text-slate-700">{r.reply}</p>
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