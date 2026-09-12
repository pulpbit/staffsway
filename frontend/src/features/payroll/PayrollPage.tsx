import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { payrollApi, clientApi, siteApi, advanceApi, employeeApi, loanApi, settlementApi } from '@/services/api'
import { Button, Input, Select } from '@/components/ui/fields'
import { Table, Tabs } from '@/components/ui/data'
import { Modal, ConfirmDialog } from '@/components/ui/overlay'
import { PageHeader } from '@/components/ui/layout'
import { StatusBadge, statusTone, type Tone } from '@/components/ui/status'
import { NativeSelect } from '@/components/ui/actions'
import { LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { money, monthYear, fullName } from '@/utils/format'
import { toast } from 'sonner'
import { IndianRupee, CheckCircle, Play, ExternalLink, Plus, Trash2, Wallet, Landmark, HandCoins, Save, XCircle, ChevronRight } from 'lucide-react'

const PAGE_TABS = [
  { key: 'runs', label: 'Payroll Runs' },
  { key: 'advances', label: 'Advances' },
  { key: 'loans', label: 'Loans' },
  { key: 'settlements', label: 'F&F Settlement' },
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
  const [showSlips, setShowSlips] = useState(false)
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
    { key: 'month', header: 'Period', render: (r: any) => <span className="text-[13px] font-semibold text-ink">{monthYear(r.month, r.year)}</span> },
    { key: 'employees', header: 'Employees', render: (r: any) => <span className="text-[13px] text-body tabular-nums">{r.item_count || r.total_employees || 0}</span> },
    { key: 'gross', header: 'Gross', render: (r: any) => <span className="text-[13px] text-body tabular-nums">{money(r.gross_total)}</span> },
    { key: 'deductions', header: 'Deductions', render: (r: any) => <span className="text-[13px] text-body tabular-nums">{money(r.deduction_total)}</span> },
    { key: 'net', header: 'Net Payable', render: (r: any) => <span className="text-[13px] font-medium text-ink tabular-nums">{money(r.net_total)}</span> },
    { key: 'status', header: 'Status', render: (r: any) => <StatusBadge status={r.status} tone={payStatus(r.status)} /> },
    { key: 'actions', header: '', className: 'text-right', render: (r: any) => (
      <div className="flex items-center justify-end gap-1">
        <button onClick={() => { setDetailId(r.id); setShowDetail(true) }} className="px-2 py-1 text-[11px] font-medium text-link hover:bg-link-soft rounded-xs cursor-pointer inline-flex items-center gap-1"><ExternalLink className="w-3 h-3" />Review</button>
        {r.status === 'draft' && <button onClick={() => setConfirmAction({ id: r.id, action: 'finalize' })} className="px-2 py-1 text-[11px] font-medium text-body hover:bg-canvas-soft rounded-xs cursor-pointer">Finalize</button>}
        {r.status === 'finalized' && <button onClick={() => setConfirmAction({ id: r.id, action: 'paid' })} className="px-2 py-1 text-[11px] font-medium text-success hover:bg-success-soft rounded-xs cursor-pointer">Mark Paid</button>}
      </div>
    ) },
  ]

  const isDraft = detail?.data?.status === 'draft'
  const getAdj = (r: any) => adjust[r.id] || { incentive: String(r.incentive ?? 0), bonus: String(r.bonus ?? 0), arrears: String(r.arrears ?? 0) }
  const setAdj = (id: number, patch: Partial<{ incentive: string; bonus: string; arrears: string }>) =>
    setAdjust(a => ({ ...a, [id]: { ...(a[id] || { incentive: '', bonus: '', arrears: '' }), ...patch } }))

  const adjInput = 'w-16 h-7 px-1.5 text-[11px] tabular-nums bg-white border border-hairline rounded-sm outline-none focus:border-ink'

  const itemCols: any[] = [
    { key: 'name', header: 'Employee', render: (r: any) => (
      <div>
        <p className="text-[13px] font-medium text-ink">{r.first_name} {r.last_name}</p>
        <p className="text-[11px] text-mute font-mono">{r.employee_code} — {r.designation}</p>
      </div>
    ) },
    { key: 'attendance', header: 'Attendance', hideSm: true, render: (r: any) => <span className="text-[12px] text-body tabular-nums whitespace-nowrap">P:{r.present_days} A:{r.absent_days} OT:{r.ot_hours}</span> },
    ...(isDraft ? [{
      key: 'adjustments', header: 'Incentive / Bonus / Arrears', render: (r: any) => {
        const v = getAdj(r)
        const dirty = adjust[r.id] !== undefined
        return (
          <div className="flex items-center gap-1">
            <input aria-label="Incentive" value={v.incentive} onChange={e => setAdj(r.id, { incentive: e.target.value })} className={adjInput} placeholder="Inc" />
            <input aria-label="Bonus" value={v.bonus} onChange={e => setAdj(r.id, { bonus: e.target.value })} className={adjInput} placeholder="Bonus" />
            <input aria-label="Arrears" value={v.arrears} onChange={e => setAdj(r.id, { arrears: e.target.value })} className={adjInput} placeholder="Arrears" />
            <button
              onClick={() => adjustMut.mutate({ payrollId: detail!.data!.id, itemId: r.id, payload: { incentive: Number(v.incentive) || 0, bonus: Number(v.bonus) || 0, arrears: Number(v.arrears) || 0 } })}
              disabled={!dirty || adjustMut.isPending}
              className={`p-1 rounded-xs ${dirty ? 'text-link hover:bg-link-soft' : 'text-mute/40 cursor-not-allowed'}`}
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
        return <span className="text-[12px] text-body tabular-nums">{extras ? money(extras) : '—'}{Number(r.loan_deduction || 0) > 0 ? <span className="text-error"> − Loan {money(r.loan_deduction)}</span> : null}</span>
      } },
    ]),
    { key: 'gross', header: 'Gross', render: (r: any) => <span className="text-[12px] text-body tabular-nums">{money(r.gross)}</span> },
    { key: 'deductions', header: 'Deductions', render: (r: any) => (
      <span className="text-[12px] text-body tabular-nums">
        {money(r.total_deductions)}
        {isDraft && Number(r.loan_deduction || 0) > 0 ? <span className="block text-[10px] text-error">incl. Loan {money(r.loan_deduction)}</span> : null}
      </span>
    ) },
    { key: 'net', header: 'Net', render: (r: any) => <span className="text-[13px] font-medium text-ink tabular-nums">{money(r.net_salary)}</span> },
  ]

  return (
    <div>
      <PageHeader
        title="Payroll"
        description={tab === 'runs' ? 'Generate, review and finalize monthly payroll runs' : tab === 'advances' ? 'Salary advances deducted from a month\'s payroll' : tab === 'loans' ? 'Interest-free loans recovered through monthly EMIs' : 'Full & final settlement for exiting employees'}
        actions={
          tab === 'advances' ? <Button onClick={() => setShowAddAdv(true)}><Plus className="w-3.5 h-3.5" /> Record Advance</Button>
          : tab === 'loans' ? <Button onClick={() => setShowLoan(true)}><Plus className="w-3.5 h-3.5" /> Issue Loan</Button>
          : tab === 'settlements' ? <Button onClick={() => setShowSettle(true)}><HandCoins className="w-3.5 h-3.5" /> Prepare Settlement</Button>
          : <Button onClick={() => setShowGenerate(true)}><IndianRupee className="w-3.5 h-3.5" /> Generate Payroll</Button>
        }
      />

      <div className="mb-4"><Tabs tabs={PAGE_TABS} active={tab} onChange={setTab} variant="underline" /></div>

      {tab === 'runs' && (isLoading ? (
        <div className="bg-white card-shadow rounded-md p-4"><LoadingState /></div>
      ) : error ? (
        <PageError onRetry={() => refetch()} />
      ) : (
        <div className="bg-white card-shadow rounded-md overflow-hidden">
          {payrolls.length === 0 ? <EmptyState icon={IndianRupee} title="No payroll yet" description="Generate payroll for the first time." action={<Button onClick={() => setShowGenerate(true)}><IndianRupee className="w-3.5 h-3.5" /> Generate Payroll</Button>} /> : (
            <Table columns={cols} data={payrolls} keyFn={(r) => String(r.id)} minWidth="880px" />
          )}
        </div>
      ))}

      {tab === 'advances' && (
        <div>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <NativeSelect className="w-36" value={String(advMonth)} onChange={(v) => setAdvMonth(Number(v))} options={MONTHS.map(m => ({ value: String(m), label: monthLabel(m) }))} />
            <NativeSelect className="w-24" value={String(advYear)} onChange={(v) => setAdvYear(Number(v))} options={YEARS.map(y => ({ value: String(y), label: String(y) }))} />
            <p className="text-[12px] text-mute ml-2">Advances for the selected month are deducted in that month's payroll.</p>
          </div>
          <div className="bg-white card-shadow rounded-md overflow-hidden">
            {advLoading ? (
              <div className="p-4"><LoadingState /></div>
            ) : advError ? (
              <PageError onRetry={() => advRefetch()} />
            ) : (
              <Table
                columns={[
                  { key: 'employee', header: 'Employee', render: (r: any) => (
                    <div>
                      <p className="text-[13px] font-medium text-ink">{fullName(r.first_name, r.last_name)}</p>
                      <p className="text-[11px] text-mute font-mono">{r.employee_code}</p>
                    </div>
                  ) },
                  { key: 'amount', header: 'Amount', render: (r: any) => <span className="text-[13px] font-medium text-error tabular-nums">{money(r.amount)}</span> },
                  { key: 'period', header: 'Period', render: (r: any) => <span className="text-[12px] text-body">{monthYear(r.month, r.year)}</span> },
                  { key: 'remarks', header: 'Remarks', hideSm: true, render: (r: any) => <span className="text-[12px] text-mute">{r.remarks || '—'}</span> },
                  { key: 'actions', header: '', className: 'text-right', render: (r: any) => (
                    <div className="flex justify-end">
                      <button onClick={() => advDeleteMut.mutate(r.id)} className="px-2 py-1 text-[11px] font-medium text-error hover:bg-error-soft rounded-xs cursor-pointer inline-flex items-center gap-1"><Trash2 className="w-3 h-3" /> Delete</button>
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
        <div className="bg-white card-shadow rounded-md overflow-hidden">
          {loanLoading ? (
            <div className="p-4"><LoadingState /></div>
          ) : loanError ? (
            <PageError onRetry={() => loanRefetch()} />
          ) : (
            <Table
              columns={[
                { key: 'employee', header: 'Employee', render: (r: any) => (
                  <div>
                    <p className="text-[13px] font-medium text-ink">{fullName(r.first_name, r.last_name)}</p>
                    <p className="text-[11px] text-mute font-mono">{r.employee_code} — {r.designation}</p>
                  </div>
                ) },
                { key: 'principal', header: 'Principal', render: (r: any) => <span className="text-[13px] text-body tabular-nums">{money(r.principal)}</span> },
                { key: 'emi', header: 'EMI / month', render: (r: any) => <span className="text-[13px] text-body tabular-nums">{money(r.emi_amount)}</span> },
                { key: 'outstanding', header: 'Outstanding', render: (r: any) => <span className={`text-[13px] font-medium tabular-nums ${Number(r.outstanding) > 0 ? 'text-error' : 'text-success'}`}>{money(r.outstanding)}</span> },
                { key: 'recovered', header: 'Recovered', hideSm: true, render: (r: any) => <span className="text-[12px] text-body tabular-nums">{money(r.recovered || 0)}</span> },
                { key: 'start', header: 'Starts', hideSm: true, render: (r: any) => <span className="text-[12px] text-mute">{monthYear(r.start_month, r.start_year)}</span> },
                { key: 'status', header: 'Status', render: (r: any) => <StatusBadge status={r.status} tone={payStatus(r.status)} /> },
                { key: 'actions', header: '', className: 'text-right', render: (r: any) => r.status !== 'active' ? null : (
                  <div className="flex justify-end gap-1">
                    <button onClick={() => setLoanAction({ id: r.id, action: 'close' })} className="px-2 py-1 text-[11px] font-medium text-success hover:bg-success-soft rounded-xs cursor-pointer">Close</button>
                    <button onClick={() => setLoanAction({ id: r.id, action: 'cancel' })} className="px-2 py-1 text-[11px] font-medium text-error hover:bg-error-soft rounded-xs cursor-pointer inline-flex items-center gap-1"><XCircle className="w-3 h-3" /> Cancel</button>
                  </div>
                ) },
              ]}
              data={(loanData?.data || []) as any[]}
              keyFn={(r: any) => String(r.id)}
              emptyMessage="No loans recorded. Issue a loan to start monthly EMI deductions."
              minWidth="820px"
            />
          )}
        </div>
      )}

      {tab === 'settlements' && (
        <div className="bg-white card-shadow rounded-md overflow-hidden">
          {settleLoading ? (
            <div className="p-4"><LoadingState /></div>
          ) : settleError ? (
            <PageError onRetry={() => settleRefetch()} />
          ) : (
            <Table
              columns={[
                { key: 'employee', header: 'Employee', render: (r: any) => (
                  <div>
                    <p className="text-[13px] font-medium text-ink">{fullName(r.first_name, r.last_name)}</p>
                    <p className="text-[11px] text-mute font-mono">{r.employee_code} — {r.designation}</p>
                  </div>
                ) },
                { key: 'exit', header: 'Exit Date', render: (r: any) => <span className="text-[12px] text-body tabular-nums">{r.exit_date}</span> },
                { key: 'dues', header: 'Dues (+)', render: (r: any) => (
                  <span className="text-[12px] text-body tabular-nums">
                    Unpaid ₹{Number(r.unpaid_amount).toLocaleString('en-IN')} ({r.unpaid_days}d) + Encash ₹{Number(r.encashment_amount).toLocaleString('en-IN')} ({r.encash_days}d)
                  </span>
                ) },
                { key: 'recoveries', header: 'Recoveries (−)', hideSm: true, render: (r: any) => (
                  <span className="text-[12px] text-mute tabular-nums">
                    Notice ₹{Number(r.notice_recovery).toLocaleString('en-IN')} + Other ₹{Number(r.other_recovery).toLocaleString('en-In')}{Number(r.loan_outstanding) > 0 ? ` + Loan ₹${Number(r.loan_outstanding).toLocaleString('en-IN')}` : ''}
                  </span>
                ) },
                { key: 'net', header: 'Net Payable', render: (r: any) => <span className="text-[13px] font-medium text-ink tabular-nums">{money(r.net_payable)}</span> },
                { key: 'status', header: 'Status', render: (r: any) => <StatusBadge status={r.status} tone={r.status === 'paid' ? 'success' : 'neutral'} /> },
                { key: 'actions', header: '', className: 'text-right', render: (r: any) => r.status !== 'prepared' ? null : (
                  <div className="flex justify-end">
                    <button onClick={() => settlePaidMut.mutate(r.id)} className="px-2 py-1 text-[11px] font-medium text-success hover:bg-success-soft rounded-xs cursor-pointer inline-flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Mark Paid</button>
                  </div>
                ) },
              ]}
              data={(settleData?.data || []) as any[]}
              keyFn={(r: any) => String(r.id)}
              emptyMessage="No settlements yet. Prepare an F&F for an exiting employee."
              minWidth="900px"
            />
          )}
        </div>
      )}

      {/* Generate Modal */}
      <Modal open={showGenerate} onClose={() => setShowGenerate(false)} title="Generate Payroll" size="md">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <NativeSelect className="w-full" label="Month" value={String(genMonth)} onChange={(v) => setGenMonth(Number(v))} options={MONTHS.map(m => ({ value: String(m), label: monthLabel(m) }))} />
            <NativeSelect className="w-full" label="Year" value={String(genYear)} onChange={(v) => setGenYear(Number(v))} options={YEARS.map(y => ({ value: String(y), label: String(y) }))} />
          </div>
          <Select
            label="Client (optional)"
            options={[{ value: '', label: 'All Clients' }, ...(clients?.data || []).map((c: any) => ({ value: String(c.id), label: c.name }))]}
            value={genClient}
            onChange={e => { setGenClient(e.target.value); setGenSite('') }}
          />
          <Select
            label="Site (optional)"
            disabled={!!genClient}
            options={[{ value: '', label: 'All Sites' }, ...sites.map((s: any) => ({ value: String(s.id), label: s.name }))]}
            value={genSite}
            onChange={e => setGenSite(e.target.value)}
          />
          <p className="text-[12px] text-body leading-relaxed">
            Payroll will be generated using {monthYear(genMonth, genYear)} attendance records.
            {genClient || genSite ? ' Filtered by selected client/site.' : ' All employees with attendance will be included.'}
          </p>
          {availableMonths.some((m: any) => m.month === genMonth && m.year === genYear && (m.payroll_status === 'finalized' || m.payroll_status === 'paid')) && (
            <p className="text-[12px] text-error">A finalized payroll already exists for this month. It cannot be regenerated.</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowGenerate(false)}>Cancel</Button>
            <Button onClick={handleGenerate} loading={genLoading}>Generate</Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal open={showDetail} onClose={() => { setShowDetail(false); setDetailId(null) }} title={detail?.data ? `Payroll — ${monthYear(detail.data.month, detail.data.year)}` : 'Payroll Details'} size="lg">
        {detail?.data ? (
          <div>
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <StatusBadge status={detail.data.status} tone={payStatus(detail.data.status)} />
              <span className="text-[13px] text-body">{detail.data.total_employees} employees</span>
              <span className="text-[13px] font-semibold text-ink ml-auto tabular-nums">Net: {money(detail.data.net_total)}</span>
            </div>
            {detail.data.status === 'draft' && (
              <p className="text-[12px] text-mute mb-3">Draft mode: enter incentive, bonus, or arrears per employee and save — statutory deductions and totals recompute automatically.</p>
            )}
            <div className="max-h-[50vh] overflow-y-auto scrollbar-thin">
              {detail.data.items && detail.data.items.length > 0 ? (
                <Table columns={itemCols} data={detail.data.items} keyFn={(r) => String(r.id)} minWidth="1020px" />
              ) : (
                <p className="text-[13px] text-mute py-4 text-center">No payroll items found.</p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-hairline mt-4">
              {detail.data.status === 'draft' && <Button onClick={() => { setShowDetail(false); setConfirmAction({ id: detail.data.id, action: 'finalize' }) }}><CheckCircle className="w-3.5 h-3.5" /> Finalize & Generate Slips</Button>}
              {detail.data.status === 'finalized' && <Button onClick={() => { setShowDetail(false); setConfirmAction({ id: detail.data.id, action: 'paid' }) }} variant="secondary"><Play className="w-3.5 h-3.5" /> Mark as Paid</Button>}
            </div>
          </div>
        ) : <LoadingState />}
      </Modal>

      {/* Record Advance Modal */}
      <Modal open={showAddAdv} onClose={() => setShowAddAdv(false)} title={`Record Advance — ${monthYear(advMonth, advYear)}`} size="sm">
        <div className="space-y-3">
          <Select
            label="Employee"
            options={[{ value: '', label: 'Select Employee' }, ...((empData?.data || []) as any[]).map((e) => ({ value: String(e.id), label: `${e.employee_code} — ${fullName(e.first_name, e.last_name)}` }))]}
            value={advForm.employee_id}
            onChange={e => setAdvForm(f => ({ ...f, employee_id: e.target.value }))}
          />
          <Input label="Amount (₹)" type="number" value={advForm.amount} onChange={e => setAdvForm(f => ({ ...f, amount: e.target.value }))} />
          <Input label="Remarks" value={advForm.remarks} onChange={e => setAdvForm(f => ({ ...f, remarks: e.target.value }))} />
          <p className="text-[12px] text-mute flex items-center gap-1.5"><Wallet className="w-3 h-3" /> This amount will be deducted as an advance in {monthYear(advMonth, advYear)} payroll.</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowAddAdv(false)}>Cancel</Button>
            <Button loading={advCreateMut.isPending} onClick={() => {
              if (!advForm.employee_id || !Number(advForm.amount)) { toast.error('Select an employee and enter an amount.'); return }
              advCreateMut.mutate()
            }}>Record</Button>
          </div>
        </div>
      </Modal>

      {/* Issue Loan Modal */}
      <Modal open={showLoan} onClose={() => setShowLoan(false)} title="Issue Loan" size="md">
        <div className="space-y-3">
          <Select
            label="Employee"
            options={[{ value: '', label: 'Select Employee' }, ...((empData?.data || []) as any[]).filter((e: any) => e.status === 'active').map((e) => ({ value: String(e.id), label: `${e.employee_code} — ${fullName(e.first_name, e.last_name)}` }))]}
            value={loanForm.employee_id}
            onChange={e => setLoanForm(f => ({ ...f, employee_id: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Loan Amount (₹)" type="number" value={loanForm.principal} onChange={e => setLoanForm(f => ({ ...f, principal: e.target.value }))} />
            <Input label="Monthly EMI (₹)" type="number" value={loanForm.emi_amount} onChange={e => setLoanForm(f => ({ ...f, emi_amount: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NativeSelect className="w-full" label="Start Month" value={loanForm.start_month} onChange={(v) => setLoanForm(f => ({ ...f, start_month: v }))} options={MONTHS.map(m => ({ value: String(m), label: monthLabel(m) }))} />
            <NativeSelect className="w-full" label="Start Year" value={loanForm.start_year} onChange={(v) => setLoanForm(f => ({ ...f, start_year: v }))} options={YEARS.map(y => ({ value: String(y), label: String(y) }))} />
          </div>
          <Input label="Remarks" value={loanForm.remarks} onChange={e => setLoanForm(f => ({ ...f, remarks: e.target.value }))} />
          <p className="text-[12px] text-mute flex items-center gap-1.5"><Landmark className="w-3 h-3" /> The EMI is deducted automatically in each month's payroll until the loan is fully recovered.</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowLoan(false)}>Cancel</Button>
            <Button loading={loanCreateMut.isPending} onClick={() => {
              if (!loanForm.employee_id || !Number(loanForm.principal) || !Number(loanForm.emi_amount)) { toast.error('Select an employee and enter amount + EMI.'); return }
              if (Number(loanForm.emi_amount) > Number(loanForm.principal)) { toast.error('EMI cannot exceed the principal.'); return }
              loanCreateMut.mutate()
            }}>Record Loan</Button>
          </div>
        </div>
      </Modal>

      {/* Prepare Settlement Modal */}
      <Modal open={showSettle} onClose={() => setShowSettle(false)} title="Prepare Full & Final Settlement" size="md">
        <div className="space-y-3">
          <Select
            label="Employee"
            options={[{ value: '', label: 'Select Employee' }, ...((empData?.data || []) as any[]).map((e) => ({ value: String(e.id), label: `${e.employee_code} — ${fullName(e.first_name, e.last_name)}${e.status !== 'active' ? ` (${e.status})` : ''}` }))]}
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
          <p className="text-[12px] text-mute leading-relaxed">Unpaid salary uses the full monthly earnings ÷ salary basis days. Leave encashment is computed on Basic. Any active loan outstanding is recovered from the settlement.</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowSettle(false)}>Cancel</Button>
            <Button loading={settleCreateMut.isPending} onClick={() => {
              if (!settleForm.employee_id) { toast.error('Select an employee.'); return }
              settleCreateMut.mutate()
            }}>Prepare Settlement</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!loanAction}
        onClose={() => setLoanAction(null)}
        onConfirm={() => loanAction && loanActionMut.mutate(loanAction)}
        title={loanAction?.action === 'close' ? 'Close Loan' : 'Cancel Loan'}
        message={loanAction?.action === 'close'
          ? 'Close this loan? The remaining outstanding will be written off and no further EMIs will be deducted.'
          : 'Cancel this loan? No further EMIs will be deducted from payroll.'}
        danger={loanAction?.action === 'cancel'}
        loading={loanActionMut.isPending}
      />

      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirm}
        title={confirmAction?.action === 'finalize' ? 'Finalize Payroll' : confirmAction?.action === 'paid' ? 'Mark as Paid' : 'Confirm Action'}
        message={
          confirmAction?.action === 'finalize'
            ? 'This will finalize the payroll and generate salary slips for all employees. This cannot be undone directly. Continue?'
            : confirmAction?.action === 'paid'
            ? 'Mark this payroll as paid? This confirms that all employee salaries have been disbursed.'
            : 'Are you sure?'
        }
        loading={finalizeMut.isPending || statusMut.isPending}
      />
    </div>
  )
}