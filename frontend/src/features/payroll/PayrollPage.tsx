import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { payrollApi, clientApi, siteApi, advanceApi, employeeApi, loanApi, settlementApi } from '@/services/api'
import { Button, Input, Select } from '@/components/ui/fields'
import { Table, Tabs, StatCard } from '@/components/ui/data'
import { Modal, ConfirmDialog } from '@/components/ui/overlay'
import { PageHeader } from '@/components/ui/layout'
import { StatusBadge, StatusDot, statusTone, type Tone } from '@/components/ui/status'
import { NativeSelect } from '@/components/ui/actions'
import { LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { money, monthYear, fullName, dateShort } from '@/utils/format'
import { toast } from 'sonner'
import { IndianRupee, CheckCircle, Play, ExternalLink, Plus, Trash2, Wallet, Landmark, HandCoins, Save, XCircle, ArrowRight, Sparkles } from 'lucide-react'

const PAGE_TABS = [
  { key: 'runs', label: 'Payroll Processing Runs' },
  { key: 'advances', label: 'Salary Advances' },
  { key: 'loans', label: 'Staff Loans & EMI' },
  { key: 'settlements', label: 'Full & Final (F&F)' },
]

const YEARS = [2025, 2026, 2027]
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
const monthLabel = (m: number) => new Date(2000, m - 1, 1).toLocaleDateString('en-US', { month: 'long' })
const monthShort = (m: number) => new Date(2000, m - 1, 1).toLocaleDateString('en-US', { month: 'short' })

const PAYROLL_TONE: Record<string, Tone> = {
  draft: 'neutral',
  processing: 'info',
  finalized: 'warning',
  paid: 'success',
  active: 'info',
  closed: 'success',
  inactive: 'neutral',
}
const payStatus = (s: string) => PAYROLL_TONE[s] || statusTone(s)

export default function PayrollPage() {
  const [showGenerate, setShowGenerate] = useState(false)
  const [genMonth, setGenMonth] = useState(new Date().getMonth() + 1)
  const [genYear, setGenYear] = useState(new Date().getFullYear())
  const [genClient, setGenClient] = useState('')
  const [genSite, setGenSite] = useState('')
  const [genLoading, setGenLoading] = useState(false)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ id: number; action: string } | null>(null)
  const [adjust, setAdjust] = useState<Record<number, { incentive: string; bonus: string; arrears: string }>>({})
  const [showLoan, setShowLoan] = useState(false)
  const [loanForm, setLoanForm] = useState({ employee_id: '', principal: '', emi_amount: '', start_month: String(new Date().getMonth() + 1), start_year: String(new Date().getFullYear()), remarks: '' })
  const [loanAction, setLoanAction] = useState<{ id: number; action: 'cancel' | 'close' } | null>(null)
  const [showSettle, setShowSettle] = useState(false)
  const [settleForm, setSettleForm] = useState({ employee_id: '', exit_date: new Date().toISOString().slice(0, 10), unpaid_days: '0', encash_days: '0', notice_recovery: '0', other_recovery: '0', remarks: '' })
  const qc = useQueryClient()

  const now = new Date()
  const [tab, setTab] = useState('runs')
  const [advMonth, setAdvMonth] = useState(now.getMonth() + 1)
  const [advYear, setAdvYear] = useState(now.getFullYear())
  const [showAddAdv, setShowAddAdv] = useState(false)
  const [advForm, setAdvForm] = useState({ employee_id: '', amount: '', remarks: '' })

  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['payroll'], queryFn: () => payrollApi.list() })
  const { data: clients } = useQuery({ queryKey: ['clients-select'], queryFn: () => clientApi.list() })
  const { data: allSites } = useQuery({ queryKey: ['sites-select'], queryFn: () => siteApi.list() })
  const { data: months } = useQuery({ queryKey: ['payroll-months'], queryFn: () => payrollApi.months() })

  const { data: detail } = useQuery({ queryKey: ['payroll', detailId], queryFn: () => payrollApi.get(detailId!), enabled: !!detailId })
  const { data: advData, isLoading: advLoading, refetch: advRefetch, error: advError } = useQuery({
    queryKey: ['advances', advMonth, advYear],
    queryFn: () => advanceApi.list(advMonth, advYear),
  })
  const { data: empData } = useQuery({ queryKey: ['employees-all'], queryFn: () => employeeApi.list({ page: '1', page_size: '500' }) })
  const { data: loanData, isLoading: loanLoading, refetch: loanRefetch, error: loanError } = useQuery({ queryKey: ['loans'], queryFn: () => loanApi.list(), enabled: tab === 'loans' })
  const { data: settleData, isLoading: settleLoading, refetch: settleRefetch, error: settleError } = useQuery({ queryKey: ['settlements'], queryFn: () => settlementApi.list(), enabled: tab === 'settlements' })

  const advCreateMut = useMutation({
    mutationFn: () => advanceApi.create({ employee_id: Number(advForm.employee_id), amount: Number(advForm.amount), month: advMonth, year: advYear, remarks: advForm.remarks || undefined }),
    onSuccess: () => { setShowAddAdv(false); setAdvForm({ employee_id: '', amount: '', remarks: '' }); qc.invalidateQueries({ queryKey: ['advances'] }); toast.success('Advance recorded.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to record advance.'),
  })

  const advDeleteMut = useMutation({
    mutationFn: (id: number) => advanceApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['advances'] }); toast.success('Advance deleted.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to delete advance.'),
  })

  const loanCreateMut = useMutation({
    mutationFn: () => loanApi.create({ employee_id: Number(loanForm.employee_id), principal: Number(loanForm.principal), emi_amount: Number(loanForm.emi_amount), start_month: Number(loanForm.start_month), start_year: Number(loanForm.start_year), remarks: loanForm.remarks || undefined }),
    onSuccess: (r) => { setShowLoan(false); setLoanForm(f => ({ ...f, employee_id: '', principal: '', emi_amount: '', remarks: '' })); qc.invalidateQueries({ queryKey: ['loans'] }); toast.success(r.message || 'Loan recorded.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to record loan.'),
  })

  const loanActionMut = useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'cancel' | 'close' }) => (action === 'cancel' ? loanApi.cancel(id) : loanApi.close(id)),
    onSuccess: (r) => { setLoanAction(null); qc.invalidateQueries({ queryKey: ['loans'] }); toast.success(r.message || 'Done.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Action failed.'),
  })

  const settleCreateMut = useMutation({
    mutationFn: () => settlementApi.create({ employee_id: Number(settleForm.employee_id), exit_date: settleForm.exit_date, unpaid_days: Number(settleForm.unpaid_days) || 0, encash_days: Number(settleForm.encash_days) || 0, notice_recovery: Number(settleForm.notice_recovery) || 0, other_recovery: Number(settleForm.other_recovery) || 0, remarks: settleForm.remarks || undefined }),
    onSuccess: (r) => { setShowSettle(false); setSettleForm(f => ({ ...f, employee_id: '', unpaid_days: '0', encash_days: '0', notice_recovery: '0', other_recovery: '0', remarks: '' })); qc.invalidateQueries({ queryKey: ['settlements'] }); toast.success(r.message || 'Settlement prepared.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to prepare settlement.'),
  })

  const settlePaidMut = useMutation({
    mutationFn: (id: number) => settlementApi.markPaid(id),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['settlements'] }); toast.success(r.message || 'Marked paid.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })

  const adjustMut = useMutation({
    mutationFn: ({ payrollId, itemId, payload }: { payrollId: number; itemId: number; payload: { incentive?: number; bonus?: number; arrears?: number } }) => payrollApi.updateItem(payrollId, itemId, payload),
    onSuccess: (_, v) => { setAdjust(a => { const n = { ...a }; delete n[v.itemId]; return n }); qc.invalidateQueries({ queryKey: ['payroll', detailId] }); qc.invalidateQueries({ queryKey: ['payroll'] }); toast.success('Adjustment saved.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to save adjustment.'),
  })

  const finalizeMut = useMutation({
    mutationFn: (id: number) => payrollApi.finalize(id),
    onSuccess: (r) => { toast.success(r.message); qc.invalidateQueries({ queryKey: ['payroll'] }); setConfirmAction(null); setDetailId(null); setShowDetail(false) },
    onError: (e: any) => toast.error(e?.error?.message || 'Action failed.'),
  })

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => payrollApi.setStatus(id, status),
    onSuccess: (r) => { toast.success(r.message); qc.invalidateQueries({ queryKey: ['payroll'] }); setConfirmAction(null) },
    onError: (e: any) => toast.error(e?.error?.message || 'Action failed.'),
  })

  const handleGenerate = async () => {
    setGenLoading(true)
    try {
      const payload: any = { month: genMonth, year: genYear }
      if (genClient) payload.client_id = Number(genClient)
      if (genSite) payload.site_id = Number(genSite)
      const r = await payrollApi.generate(payload)
      toast.success(r.message || 'Payroll generated.')
      setShowGenerate(false)
      qc.invalidateQueries({ queryKey: ['payroll'] })
    } catch (e: any) {
      toast.error(e?.error?.message || 'Failed to generate.')
    } finally { setGenLoading(false) }
  }

  const handleConfirm = () => {
    if (!confirmAction) return
    if (confirmAction.action === 'finalize') finalizeMut.mutate(confirmAction.id)
    else if (confirmAction.action === 'paid') statusMut.mutate({ id: confirmAction.id, status: 'paid' })
    else if (confirmAction.action === 'process') statusMut.mutate({ id: confirmAction.id, status: 'processing' })
  }

  const payrolls = (data?.data || []) as any[]
  const availableMonths = (months?.data || []) as any[]
  const sites = (allSites?.data || []).filter((s: any) => !genClient || String(s.client_id) === genClient)

  const cols: any[] = [
    { key: 'month', header: 'Payroll Period', render: (r: any) => <span className="text-xs sm:text-[13px] font-bold text-slate-900">{monthYear(r.month, r.year)}</span> },
    { key: 'employees', header: 'Processed Staff', render: (r: any) => <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{r.item_count || r.total_employees || 0} emps</span> },
    { key: 'gross', header: 'Gross Earnings', render: (r: any) => <span className="text-xs font-bold text-slate-800 tabular-nums font-mono">₹{money(r.gross_total)}</span> },
    { key: 'deductions', header: 'Total Deductions', render: (r: any) => <span className="text-xs font-bold text-rose-600 tabular-nums font-mono">₹{money(r.deduction_total)}</span> },
    { key: 'net', header: 'Net Disbursement', render: (r: any) => <span className="text-xs font-black text-emerald-700 tabular-nums font-mono">₹{money(r.net_total)}</span> },
    { key: 'status', header: 'Status', className: 'w-9', render: (r: any) => <StatusDot status={r.status} tone={payStatus(r.status)} /> },
    { key: 'actions', header: 'Action', className: 'text-right', render: (r: any) => (
      <div className="flex items-center justify-end gap-1.5">
        <button onClick={() => { setDetailId(r.id); setShowDetail(true) }} className="px-3 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs">
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Review</span>
        </button>
        {r.status === 'draft' && <button onClick={() => setConfirmAction({ id: r.id, action: 'finalize' })} className="px-2.5 py-1 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 cursor-pointer">Finalize</button>}
        {r.status === 'finalized' && <button onClick={() => setConfirmAction({ id: r.id, action: 'paid' })} className="px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 cursor-pointer">Mark Paid</button>}
      </div>
    ) },
  ]

  const isDraft = detail?.data?.status === 'draft'
  const getAdj = (r: any) => adjust[r.id] || { incentive: String(r.incentive ?? 0), bonus: String(r.bonus ?? 0), arrears: String(r.arrears ?? 0) }
  const setAdj = (id: number, patch: Partial<{ incentive: string; bonus: string; arrears: string }>) =>
    setAdjust(a => ({ ...a, [id]: { ...(a[id] || { incentive: '', bonus: '', arrears: '' }), ...patch } }))

  const adjInput = 'w-16 h-7 px-1.5 text-xs tabular-nums bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500'

  const itemCols: any[] = [
    { key: 'name', header: 'Employee', render: (r: any) => (
      <div>
        <p className="text-xs sm:text-[13px] font-bold text-slate-900">{r.first_name} {r.last_name}</p>
        <p className="text-[11px] text-slate-500 font-mono">{r.employee_code} &bull; {r.designation}</p>
      </div>
    ) },
    { key: 'attendance', header: 'Attendance', hideSm: true, render: (r: any) => <span className="text-xs font-medium text-slate-700 tabular-nums whitespace-nowrap">P:{r.present_days} &bull; A:{r.absent_days} &bull; OT:{r.ot_hours}</span> },
    { key: 'rate', header: 'Day / Hr Rate', hideSm: true, render: (r: any) => <span className="text-xs text-slate-600 tabular-nums whitespace-nowrap">₹{money(r.daily_rate)} / ₹{money(r.hourly_rate)}</span> },
    ...(isDraft ? [{
      key: 'adjustments', header: 'Incentive / Bonus / Arrears', render: (r: any) => {
        const v = getAdj(r)
        const dirty = adjust[r.id] !== undefined
        return (
          <div className="flex items-center gap-1.5">
            <input aria-label="Incentive" value={v.incentive} onChange={e => setAdj(r.id, { incentive: e.target.value })} className={adjInput} placeholder="Inc" />
            <input aria-label="Bonus" value={v.bonus} onChange={e => setAdj(r.id, { bonus: e.target.value })} className={adjInput} placeholder="Bonus" />
            <input aria-label="Arrears" value={v.arrears} onChange={e => setAdj(r.id, { arrears: e.target.value })} className={adjInput} placeholder="Arr" />
            <button
              onClick={() => adjustMut.mutate({ payrollId: detail!.data!.id, itemId: r.id, payload: { incentive: Number(v.incentive) || 0, bonus: Number(v.bonus) || 0, arrears: Number(v.arrears) || 0 } })}
              disabled={!dirty || adjustMut.isPending}
              className={`p-1.5 rounded-lg ${dirty ? 'text-blue-600 hover:bg-blue-50 cursor-pointer' : 'text-slate-300 cursor-not-allowed'}`}
              title="Save adjustments"
            >
              <Save className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      },
    }] : [
      { key: 'adjustments_view', header: 'Extras', render: (r: any) => {
        const extras = Number(r.incentive || 0) + Number(r.bonus || 0) + Number(r.arrears || 0)
        return <span className="text-xs text-slate-700 tabular-nums">{extras ? `₹${money(extras)}` : '—'}{Number(r.loan_deduction || 0) > 0 ? <span className="text-rose-600"> &minus; Loan ₹{money(r.loan_deduction)}</span> : null}</span>
      } },
    ]),
    { key: 'gross', header: 'Gross Earnings', render: (r: any) => <span className="text-xs font-bold text-slate-800 tabular-nums font-mono">₹{money(r.gross)}</span> },
    { key: 'deductions', header: 'Total Deductions', render: (r: any) => (
      <span className="text-xs font-bold text-rose-600 tabular-nums font-mono">
        ₹{money(r.total_deductions)}
        {isDraft && Number(r.loan_deduction || 0) > 0 ? <span className="block text-[10px] text-rose-500 font-normal">incl. Loan ₹{money(r.loan_deduction)}</span> : null}
      </span>
    ) },
    { key: 'net', header: 'Net Pay', render: (r: any) => <span className="text-xs font-black text-emerald-700 tabular-nums font-mono">₹{money(r.net_salary)}</span> },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Payroll & Wage Disbursement"
        description={tab === 'runs' ? 'Automated monthly payroll generation, allowance adjustments, statutory deductions and voucher lock' : tab === 'advances' ? 'Salary advances deducted automatically in the active payroll period' : tab === 'loans' ? 'Interest-free staff loans recovered via recurring monthly EMIs' : 'Full & Final (F&F) settlement ledger for separated employees'}
        actions={
          tab === 'advances' ? <button type="button" onClick={() => setShowAddAdv(true)} className="h-10 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"><Plus className="w-4 h-4" /> Record Advance</button>
          : tab === 'loans' ? <button type="button" onClick={() => setShowLoan(true)} className="h-10 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"><Plus className="w-4 h-4" /> Issue Loan</button>
          : tab === 'settlements' ? <button type="button" onClick={() => setShowSettle(true)} className="h-10 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"><HandCoins className="w-4 h-4" /> Prepare Settlement</button>
          : <button type="button" onClick={() => setShowGenerate(true)} className="h-10 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer"><IndianRupee className="w-4 h-4" /> Generate Payroll</button>
        }
      />

      <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs">
        <Tabs tabs={PAGE_TABS} active={tab} onChange={setTab} variant="pill" />
      </div>

      {tab === 'runs' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="p-8"><LoadingState /></div>
          ) : error ? (
            <PageError onRetry={() => refetch()} />
          ) : payrolls.length === 0 ? (
            <EmptyState icon={IndianRupee} title="No payroll runs executed yet" description="Generate monthly payroll using verified biometric / manual attendance records." action={<Button onClick={() => setShowGenerate(true)}><IndianRupee className="w-3.5 h-3.5" /> Generate Payroll</Button>} />
          ) : (
            <Table columns={cols} data={payrolls} keyFn={(r) => String(r.id)} minWidth="880px" />
          )}
        </div>
      )}

      {tab === 'advances' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
            <NativeSelect className="w-40" value={String(advMonth)} onChange={(v) => setAdvMonth(Number(v))} options={MONTHS.map(m => ({ value: String(m), label: monthLabel(m) }))} />
            <NativeSelect className="w-28" value={String(advYear)} onChange={(v) => setAdvYear(Number(v))} options={YEARS.map(y => ({ value: String(y), label: String(y) }))} />
            <p className="text-xs text-slate-500 font-medium ml-auto hidden sm:block">Advances recorded here are auto-deducted in that specific month&apos;s payroll run.</p>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
            {advLoading ? (
              <div className="p-8"><LoadingState /></div>
            ) : advError ? (
              <PageError onRetry={() => advRefetch()} />
            ) : (
              <Table
                columns={[
                  { key: 'employee', header: 'Employee', render: (r: any) => (
                    <div>
                      <p className="text-xs sm:text-[13px] font-bold text-slate-900">{fullName(r.first_name, r.last_name)}</p>
                      <p className="text-[11px] text-slate-500 font-mono">{r.employee_code}</p>
                    </div>
                  ) },
                  { key: 'amount', header: 'Advance Amount', render: (r: any) => <span className="text-xs font-bold text-rose-600 tabular-nums font-mono">₹{money(r.amount)}</span> },
                  { key: 'period', header: 'Deduction Month', render: (r: any) => <span className="text-xs text-slate-700">{monthYear(r.month, r.year)}</span> },
                  { key: 'remarks', header: 'Remarks', hideSm: true, render: (r: any) => <span className="text-xs text-slate-500">{r.remarks || '—'}</span> },
                  { key: 'actions', header: '', className: 'text-right', render: (r: any) => (
                    <div className="flex justify-end">
                      <button onClick={() => advDeleteMut.mutate(r.id)} className="px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                    </div>
                  ) },
                ]}
                data={(advData?.data || []) as any[]}
                keyFn={(r: any) => String(r.id)}
                emptyMessage="No advances recorded for this month."
                minWidth="760px"
              />
            )}
          </div>
        </div>
      )}

      {tab === 'loans' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          {loanLoading ? (
            <div className="p-8"><LoadingState /></div>
          ) : loanError ? (
            <PageError onRetry={() => loanRefetch()} />
          ) : (
            <Table
              columns={[
                { key: 'employee', header: 'Employee', render: (r: any) => (
                  <div>
                    <p className="text-xs sm:text-[13px] font-bold text-slate-900">{fullName(r.first_name, r.last_name)}</p>
                    <p className="text-[11px] text-slate-500 font-mono">{r.employee_code} &bull; {r.designation}</p>
                  </div>
                ) },
                { key: 'principal', header: 'Principal Amount', render: (r: any) => <span className="text-xs font-bold text-slate-800 font-mono">₹{money(r.principal)}</span> },
                { key: 'emi', header: 'Monthly EMI', render: (r: any) => <span className="text-xs font-bold text-blue-700 font-mono">₹{money(r.emi_amount)}</span> },
                { key: 'outstanding', header: 'Outstanding Balance', render: (r: any) => <span className={`text-xs font-black font-mono ${Number(r.outstanding) > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>₹{money(r.outstanding)}</span> },
                { key: 'recovered', header: 'Recovered', hideSm: true, render: (r: any) => <span className="text-xs text-slate-600 font-mono">₹{money(r.recovered || 0)}</span> },
                { key: 'start', header: 'Start Date', hideSm: true, render: (r: any) => <span className="text-xs text-slate-500">{monthYear(r.start_month, r.start_year)}</span> },
                { key: 'status', header: 'Status', className: 'w-9', render: (r: any) => <StatusDot status={r.status} tone={payStatus(r.status)} /> },
                { key: 'actions', header: '', className: 'text-right', render: (r: any) => r.status !== 'active' ? null : (
                  <div className="flex justify-end gap-1.5">
                    <button onClick={() => setLoanAction({ id: r.id, action: 'close' })} className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg cursor-pointer">Close</button>
                    <button onClick={() => setLoanAction({ id: r.id, action: 'cancel' })} className="px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg cursor-pointer inline-flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Cancel</button>
                  </div>
                ) },
              ]}
              data={(loanData?.data || []) as any[]}
              keyFn={(r: any) => String(r.id)}
              emptyMessage="No staff loans active."
              minWidth="820px"
            />
          )}
        </div>
      )}

      {tab === 'settlements' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          {settleLoading ? (
            <div className="p-8"><LoadingState /></div>
          ) : settleError ? (
            <PageError onRetry={() => settleRefetch()} />
          ) : (
            <Table
              columns={[
                { key: 'employee', header: 'Employee', render: (r: any) => (
                  <div>
                    <p className="text-xs sm:text-[13px] font-bold text-slate-900">{fullName(r.first_name, r.last_name)}</p>
                    <p className="text-[11px] text-slate-500 font-mono">{r.employee_code} &bull; {r.designation}</p>
                  </div>
                ) },
                { key: 'exit', header: 'Last Working Day', render: (r: any) => <span className="text-xs text-slate-700 font-mono">{r.exit_date ? dateShort(r.exit_date) : '—'}</span> },
                { key: 'dues', header: 'Dues Payable (+)', render: (r: any) => (
                  <span className="text-xs text-slate-800 font-medium font-mono">
                    Unpaid: ₹{Number(r.unpaid_amount).toLocaleString('en-IN')} ({r.unpaid_days}d) + Encash: ₹{Number(r.encashment_amount).toLocaleString('en-IN')} ({r.encash_days}d)
                  </span>
                ) },
                { key: 'recoveries', header: 'Recoveries (&minus;)', hideSm: true, render: (r: any) => (
                  <span className="text-xs text-rose-600 font-mono">
                    Notice: ₹{Number(r.notice_recovery).toLocaleString('en-IN')} + Other: ₹{Number(r.other_recovery).toLocaleString('en-IN')}{Number(r.loan_outstanding) > 0 ? ` + Loan ₹${Number(r.loan_outstanding).toLocaleString('en-IN')}` : ''}
                  </span>
                ) },
                { key: 'net', header: 'Net Settlement', render: (r: any) => <span className="text-xs font-black text-emerald-700 font-mono">₹{money(r.net_payable)}</span> },
                { key: 'status', header: 'Status', className: 'w-9', render: (r: any) => <StatusDot status={r.status} tone={r.status === 'paid' ? 'success' : 'neutral'} /> },
                { key: 'actions', header: '', className: 'text-right', render: (r: any) => r.status !== 'prepared' ? null : (
                  <div className="flex justify-end">
                    <button onClick={() => settlePaidMut.mutate(r.id)} className="px-3 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 cursor-pointer inline-flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> Mark Paid</button>
                  </div>
                ) },
              ]}
              data={(settleData?.data || []) as any[]}
              keyFn={(r: any) => String(r.id)}
              emptyMessage="No settlements on record. Prepare F&F for separated employees."
              minWidth="900px"
            />
          )}
        </div>
      )}

      {/* Generate Payroll Modal */}
      <Modal open={showGenerate} onClose={() => setShowGenerate(false)} title="Generate Monthly Payroll Run" size="md">
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <NativeSelect className="w-full" label="Month" value={String(genMonth)} onChange={(v) => setGenMonth(Number(v))} options={MONTHS.map(m => ({ value: String(m), label: monthLabel(m) }))} />
            <NativeSelect className="w-full" label="Year" value={String(genYear)} onChange={(v) => setGenYear(Number(v))} options={YEARS.map(y => ({ value: String(y), label: String(y) }))} />
          </div>
          <Select
            label="Filter Client (Optional)"
            options={[{ value: '', label: 'All Clients (Global)' }, ...(clients?.data || []).map((c: any) => ({ value: String(c.id), label: c.name }))]}
            value={genClient}
            onChange={e => { setGenClient(e.target.value); setGenSite('') }}
          />
          <Select
            label="Filter Deployment Site (Optional)"
            disabled={!!genClient}
            options={[{ value: '', label: 'All Sites' }, ...sites.map((s: any) => ({ value: String(s.id), label: s.name }))]}
            value={genSite}
            onChange={e => setGenSite(e.target.value)}
          />
          <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
            Payroll will compute automated statutory deductions (EPF 12%, ESIC 0.75%, PT slabs, TDS, Overtime multipliers) for {monthYear(genMonth, genYear)}.
          </p>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setShowGenerate(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
            <button type="button" onClick={handleGenerate} disabled={genLoading} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer">
              {genLoading ? 'Processing Calculation...' : 'Compute & Generate Payroll'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Payroll Detail Modal */}
      <Modal open={showDetail} onClose={() => { setShowDetail(false); setDetailId(null) }} title={detail?.data ? `Payroll Roster — ${monthYear(detail.data.month, detail.data.year)}` : 'Payroll Details'} size="lg">
        {detail?.data ? (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 flex-wrap">
              <StatusBadge status={detail.data.status} tone={payStatus(detail.data.status)} />
              <span className="text-xs font-bold text-slate-700">{detail.data.total_employees} Employees Processed</span>
              <span className="text-xs font-black text-emerald-700 ml-auto font-mono">Net Disbursement: ₹{money(detail.data.net_total)}</span>
            </div>
            <div className="max-h-[50vh] overflow-y-auto scrollbar-thin">
              {detail.data.items && detail.data.items.length > 0 ? (
                <Table columns={itemCols} data={detail.data.items} keyFn={(r) => String(r.id)} minWidth="1020px" />
              ) : (
                <p className="text-xs text-slate-400 py-6 text-center">No payroll items found.</p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              {detail.data.status === 'draft' && (
                <button type="button" onClick={() => { setShowDetail(false); setConfirmAction({ id: detail.data.id, action: 'finalize' }) }} className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  <span>Finalize &amp; Generate Slips</span>
                </button>
              )}
              {detail.data.status === 'finalized' && (
                <button type="button" onClick={() => { setShowDetail(false); setConfirmAction({ id: detail.data.id, action: 'paid' }) }} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer flex items-center gap-1.5">
                  <Play className="w-4 h-4" />
                  <span>Mark as Disbursed (Paid)</span>
                </button>
              )}
            </div>
          </div>
        ) : <LoadingState />}
      </Modal>

      {/* Record Advance Modal */}
      {showAddAdv && (
        <Modal open={showAddAdv} onClose={() => setShowAddAdv(false)} title={`Record Advance — ${monthYear(advMonth, advYear)}`} size="sm">
          <div className="space-y-4 pt-2">
            <Select
              label="Employee"
              options={[{ value: '', label: 'Select Employee' }, ...((empData?.data || []) as any[]).map((e) => ({ value: String(e.id), label: `${e.employee_code} — ${fullName(e.first_name, e.last_name)}` }))]}
              value={advForm.employee_id}
              onChange={e => setAdvForm(f => ({ ...f, employee_id: e.target.value }))}
            />
            <Input label="Advance Amount (₹)" type="number" value={advForm.amount} onChange={e => setAdvForm(f => ({ ...f, amount: e.target.value }))} />
            <Input label="Remarks" value={advForm.remarks} onChange={e => setAdvForm(f => ({ ...f, remarks: e.target.value }))} />
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setShowAddAdv(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
              <button type="button" disabled={advCreateMut.isPending} onClick={() => {
                if (!advForm.employee_id || !Number(advForm.amount)) { toast.error('Select an employee and enter an amount.'); return }
                advCreateMut.mutate()
              }} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer">Record Advance</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Issue Loan Modal */}
      {showLoan && (
        <Modal open={showLoan} onClose={() => setShowLoan(false)} title="Issue Staff Loan" size="md">
          <div className="space-y-4 pt-2">
            <Select
              label="Employee"
              options={[{ value: '', label: 'Select Employee' }, ...((empData?.data || []) as any[]).filter((e: any) => e.status === 'active').map((e) => ({ value: String(e.id), label: `${e.employee_code} — ${fullName(e.first_name, e.last_name)}` }))]}
              value={loanForm.employee_id}
              onChange={e => setLoanForm(f => ({ ...f, employee_id: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Principal Amount (₹)" type="number" value={loanForm.principal} onChange={e => setLoanForm(f => ({ ...f, principal: e.target.value }))} />
              <Input label="Monthly EMI (₹)" type="number" value={loanForm.emi_amount} onChange={e => setLoanForm(f => ({ ...f, emi_amount: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NativeSelect className="w-full" label="Start Month" value={loanForm.start_month} onChange={(v) => setLoanForm(f => ({ ...f, start_month: v }))} options={MONTHS.map(m => ({ value: String(m), label: monthLabel(m) }))} />
              <NativeSelect className="w-full" label="Start Year" value={loanForm.start_year} onChange={(v) => setLoanForm(f => ({ ...f, start_year: v }))} options={YEARS.map(y => ({ value: String(y), label: String(y) }))} />
            </div>
            <Input label="Remarks" value={loanForm.remarks} onChange={e => setLoanForm(f => ({ ...f, remarks: e.target.value }))} />
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setShowLoan(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
              <button type="button" disabled={loanCreateMut.isPending} onClick={() => {
                if (!loanForm.employee_id || !Number(loanForm.principal) || !Number(loanForm.emi_amount)) { toast.error('Select employee and specify principal + EMI.'); return }
                loanCreateMut.mutate()
              }} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer">Issue Loan</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Prepare Settlement Modal */}
      {showSettle && (
        <Modal open={showSettle} onClose={() => setShowSettle(false)} title="Prepare Full & Final (F&F) Settlement" size="md">
          <div className="space-y-4 pt-2">
            <Select
              label="Employee"
              options={[{ value: '', label: 'Select Employee' }, ...((empData?.data || []) as any[]).map((e) => ({ value: String(e.id), label: `${e.employee_code} — ${fullName(e.first_name, e.last_name)}` }))]}
              value={settleForm.employee_id}
              onChange={e => setSettleForm(f => ({ ...f, employee_id: e.target.value }))}
            />
            <Input label="Exit Date (Last Working Day)" type="date" value={settleForm.exit_date} onChange={e => setSettleForm(f => ({ ...f, exit_date: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Unpaid Salary Days" type="number" value={settleForm.unpaid_days} onChange={e => setSettleForm(f => ({ ...f, unpaid_days: e.target.value }))} />
              <Input label="Leave Encash Days" type="number" value={settleForm.encash_days} onChange={e => setSettleForm(f => ({ ...f, encash_days: e.target.value }))} />
              <Input label="Notice Recovery (₹)" type="number" value={settleForm.notice_recovery} onChange={e => setSettleForm(f => ({ ...f, notice_recovery: e.target.value }))} />
              <Input label="Other Recovery (₹)" type="number" value={settleForm.other_recovery} onChange={e => setSettleForm(f => ({ ...f, other_recovery: e.target.value }))} />
            </div>
            <Input label="Remarks" value={settleForm.remarks} onChange={e => setSettleForm(f => ({ ...f, remarks: e.target.value }))} />
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setShowSettle(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
              <button type="button" disabled={settleCreateMut.isPending} onClick={() => {
                if (!settleForm.employee_id) { toast.error('Select an employee.'); return }
                settleCreateMut.mutate()
              }} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer">Generate F&amp;F</button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirm}
        title={confirmAction?.action === 'finalize' ? 'Finalize Payroll' : 'Mark as Paid'}
        message={confirmAction?.action === 'finalize' ? 'This will finalize the payroll calculations and prepare salary slip vouchers.' : 'Mark this payroll as paid?'}
        loading={finalizeMut.isPending || statusMut.isPending}
      />

      <ConfirmDialog
        open={!!loanAction}
        onClose={() => setLoanAction(null)}
        onConfirm={() => loanAction && loanActionMut.mutate(loanAction)}
        title={loanAction?.action === 'close' ? 'Close Loan' : 'Cancel Loan'}
        message="Are you sure you want to proceed with this loan action?"
        danger={loanAction?.action === 'cancel'}
        loading={loanActionMut.isPending}
      />
    </div>
  )
}