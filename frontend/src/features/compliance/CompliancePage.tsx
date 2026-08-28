import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { statutoryApi } from '@/services/api'
import { Table, Tabs, Badge } from '@/components/ui/data'
import { PageHeader, LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { Button, Input, Select } from '@/components/ui/fields'
import { Modal } from '@/components/ui/overlay'
import { money, monthYear } from '@/utils/format'
import { downloadCsv } from '@/utils/csv'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'
import { ShieldCheck, Download, Plus, Trash2, CheckCircle2, RotateCcw } from 'lucide-react'

const TABS = [
  { key: 'registers', label: 'Registers & Challan' },
  { key: 'min-wages', label: 'Minimum Wages' },
  { key: 'bonus', label: 'Bonus' },
  { key: 'gratuity', label: 'Gratuity' },
  { key: 'calendar', label: 'Calendar' },
]

const REG_VIEWS = [
  { key: 'register', label: 'Statutory Register' },
  { key: 'pf-ecr', label: 'PF ECR' },
  { key: 'challan', label: 'Challan Summary' },
]

const now = new Date()

export default function CompliancePage() {
  const { hasRole } = useAuth()
  const isHr = hasRole('super_admin', 'admin', 'hr')
  const [active, setActive] = useState('registers')
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [regView, setRegView] = useState('register')
  const qc = useQueryClient()

  // ---- Queries ----
  const regQ = useQuery({
    queryKey: ['stat-reg', regView, month, year],
    queryFn: (): Promise<any> => (regView === 'challan' ? statutoryApi.challan(month, year) : regView === 'pf-ecr' ? statutoryApi.pfEcr(month, year) : statutoryApi.register(month, year)),
    enabled: active === 'registers',
  })
  const wagesQ = useQuery({ queryKey: ['min-wages'], queryFn: () => statutoryApi.minWages(), enabled: active === 'min-wages' })
  const wageCheckQ = useQuery({
    queryKey: ['wage-check', month, year],
    queryFn: () => statutoryApi.wageCheck(month, year),
    enabled: active === 'min-wages',
  })
  const bonusQ = useQuery({ queryKey: ['bonus-reg', year], queryFn: () => statutoryApi.bonusRegister(year), enabled: active === 'bonus' })
  const gratuityQ = useQuery({ queryKey: ['gratuity'], queryFn: () => statutoryApi.gratuity(), enabled: active === 'gratuity' })
  const calQ = useQuery({ queryKey: ['compliance-cal', year], queryFn: () => statutoryApi.calendar(year), enabled: active === 'calendar' })

  // ---- Mutations ----
  const wageSaveMut = useMutation({
    mutationFn: (d: any) => statutoryApi.saveMinWage(d),
    onSuccess: (_r: any, v: any) => { qc.invalidateQueries({ queryKey: ['min-wages'] }); toast.success(`Minimum wage saved for ${v.category}.`) },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to save.'),
  })
  const wageDelMut = useMutation({
    mutationFn: (id: number) => statutoryApi.deleteMinWage(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['min-wages'] }); toast.success('Entry removed.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to remove.'),
  })
  const calMut = useMutation({
    mutationFn: ({ id, status, remarks }: { id: number; status: 'pending' | 'done'; remarks?: string }) => statutoryApi.setCalendarStatus(id, status, remarks),
    onSuccess: (_r, v) => { qc.invalidateQueries({ queryKey: ['compliance-cal'] }); toast.success(v.status === 'done' ? 'Marked as filed.' : 'Reopened.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })

  const [showAddWage, setShowAddWage] = useState(false)
  const [wageForm, setWageForm] = useState({ category: 'Unskilled', basic_monthly: '', va_monthly: '', effective_from: `${year}-01-01` })
  const [doneTarget, setDoneTarget] = useState<any>(null)
  const [doneRemarks, setDoneRemarks] = useState('')

  const monthPicker = (
    <div className="flex gap-2 mt-4 mb-4">
      <select value={month} onChange={e => setMonth(Number(e.target.value))} className="h-9 px-2 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink">
        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{new Date(2000, m - 1).toLocaleDateString('en-US', { month: 'long' })}</option>)}
      </select>
      <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="w-20 h-9 px-2 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink" />
    </div>
  )

  return (
    <div>
      <PageHeader title="Statutory Compliance" subtitle="PF, ESI, PT, LWF, TDS registers, minimum wages, bonus and gratuity" />

      <Tabs tabs={TABS} active={active} onChange={setActive} />

      {/* ---------- Registers & Challan ---------- */}
      {active === 'registers' && (
        <>
          <div className="flex flex-wrap items-center gap-2 mt-4 mb-1">
            <div className="flex gap-1">
              {REG_VIEWS.map(v => (
                <button
                  key={v.key}
                  onClick={() => setRegView(v.key)}
                  className={`h-8 px-3 text-[12px] rounded-sm transition-colors ${regView === v.key ? 'bg-ink text-white' : 'bg-white border border-hairline text-body hover:bg-canvas-soft'}`}
                >{v.label}</button>
              ))}
            </div>
          </div>
          {monthPicker}

          {isLoading(regQ) ? <LoadingState /> : isError(regQ) ? <PageError onRetry={() => regQ.refetch()} /> : regView === 'challan' ? (() => {
            const d = (regQ.data as any)?.data?.data || (regQ.data as any)?.data
            if (!d?.pf) return <EmptyState icon={ShieldCheck} title="No challan data" description={`No finalized payroll found for ${monthYear(month, year)}.`} />
            const pf = d.pf, esi = d.esi
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  <SummaryCard label="EPF Total" value={money(pf.total_pf)} sub={`${monthYear(month, year)}`} />
                  <SummaryCard label="ESI Total" value={money(esi.total_esi)} sub={`ER ${money(esi.er_share)}`} />
                  <SummaryCard label="Professional Tax" value={money(d.pt)} />
                  <SummaryCard label="LWF (EE+ER)" value={money(d.lwf)} sub={`Employer ${money(d.lwf_employer)}`} />
                  <SummaryCard label="Grand Total" value={money(d.grand_total)} highlight sub={`TDS ${money(d.tds)} included`} />
                </div>
                <div className="bg-white card-shadow rounded-md p-4">
                  <h3 className="text-[13px] font-semibold text-ink mb-3">EPF Challan Break-up — A/c-wise</h3>
                  <Table
                    columns={[
                      { key: 'k', header: 'Account', render: (r: any) => <span className="text-[13px]">{r.k}</span> },
                      { key: 'desc', header: 'Description' },
                      { key: 'amt', header: 'Amount', render: (r: any) => <span className="font-medium">{money(r.amt)}</span> },
                    ]}
                    data={[
                      { k: 'A/c 01', desc: 'EPF Employee share', amt: pf.a_c_01_ee },
                      { k: 'A/c 02', desc: 'EPF Employer share', amt: pf.a_c_02_er },
                      { k: 'A/c 10', desc: 'EPS (Pension)', amt: pf.a_c_10_eps },
                      { k: 'A/c 21', desc: 'EDLI (0.5%)', amt: pf.a_c_21_edli },
                      { k: 'A/c 22', desc: 'EPF Admin (0.5%)', amt: pf.a_c_22_admin },
                    ]}
                    keyFn={(r: any) => r.k}
                  />
                  <p className="text-[11px] text-mute mt-2">On PF wages of {money(pf.epf_wages)} (capped at the eligibility ceiling). ESI employer contribution shown at 3.25% of applicable gross.</p>
                </div>
              </div>
            )
          })() : (() => {
            const rows = (((regQ.data as any)?.data) || []) as any[]
            if (rows.length === 0) return <EmptyState icon={ShieldCheck} title="No data" description={`No payroll items for ${monthYear(month, year)}.`} />
            const meta: any = (regQ.data as any)?.meta
            return (
              <div className="bg-white card-shadow rounded-md p-4">
                <div className="flex justify-between items-center mb-3 gap-2">
                  <div className="flex gap-4 text-[12px] text-body flex-wrap">
                    <span>Employees: <span className="font-medium">{meta?.count ?? rows.length}</span></span>
                    {regView === 'register' && meta?.totals && <><span>PF (EE+ER): <span className="font-medium">{money(meta.totals.pf_ee + meta.totals.pf_er)}</span></span>
                    <span>ESI (EE+ER): <span className="font-medium">{money(meta.totals.esi_ee + meta.totals.esi_er)}</span></span></>}
                    {regView === 'pf-ecr' && meta?.totals && <><span>EPF Wages: <span className="font-medium">{money(meta.totals.epf_wages)}</span></span>
                    <span>EE Share: <span className="font-medium">{money(meta.totals.ee_share)}</span></span>
                    <span>ER Share: <span className="font-medium">{money(meta.totals.er_share)}</span></span>
                    <span>EPS: <span className="font-medium">{money(meta.totals.eps)}</span></span>
                    <span>EDLI: <span className="font-medium">{money(meta.totals.edli)}</span></span></>}
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => downloadCsv(rows, `staffsway-${regView}-${year}-${String(month).padStart(2, '0')}`)}>
                    <Download className="w-3.5 h-3.5" /> Export CSV
                  </Button>
                </div>
                <Table
                  columns={regView === 'register' ? [
                    { key: 'employee_code', header: 'Code', className: 'font-mono text-[11px]' },
                    { key: 'name', header: 'Name', render: (r: any) => <span className="text-[13px] font-medium text-ink">{r.name}</span> },
                    { key: 'uan', header: 'UAN', render: (r: any) => <span className="font-mono text-[11px]">{r.uan || '—'}</span> },
                    { key: 'gross', header: 'Gross', render: (r: any) => money(r.gross) },
                    { key: 'epf_wages', header: 'PF Wages', hideSm: true, render: (r: any) => money(r.epf_wages) },
                    { key: 'pf_ee', header: 'PF EE', render: (r: any) => money(r.pf_ee) },
                    { key: 'pf_er', header: 'PF ER', hideSm: true, render: (r: any) => money(r.pf_er) },
                    { key: 'esi_ee', header: 'ESI EE', render: (r: any) => money(r.esi_ee) },
                    { key: 'esi_er', header: 'ESI ER', hideSm: true, render: (r: any) => money(r.esi_er) },
                    { key: 'pt', header: 'PT', render: (r: any) => money(r.pt) },
                    { key: 'lwf', header: 'LWF', hideSm: true, render: (r: any) => money(r.lwf) },
                    { key: 'tds', header: 'TDS', render: (r: any) => money(r.tds) },
                  ] : [
                    { key: 'uan', header: 'UAN', render: (r: any) => <span className="font-mono text-[11px]">{r.uan || <span className="text-error">Missing</span>}</span> },
                    { key: 'member_name', header: 'Member Name', render: (r: any) => <span className="text-[13px] font-medium text-ink">{r.member_name}</span> },
                    { key: 'gross', header: 'Gross', render: (r: any) => money(r.gross) },
                    { key: 'epf_wages', header: 'EPF Wages', render: (r: any) => money(r.epf_wages) },
                    { key: 'ee_share', header: 'EE Share', render: (r: any) => money(r.ee_share) },
                    { key: 'er_share', header: 'ER Share', hideSm: true, render: (r: any) => money(r.er_share) },
                    { key: 'eps', header: 'EPS', render: (r: any) => money(r.eps) },
                    { key: 'edli', header: 'EDLI', hideSm: true, render: (r: any) => money(r.edli) },
                    { key: 'ncp_days', header: 'NCP Days' },
                  ]}
                  data={rows}
                  keyFn={(r: any) => String(r.employee_id ?? r.uan)}
                />
              </div>
            )
          })()}
        </>
      )}

      {/* ---------- Minimum Wages ---------- */}
      {active === 'min-wages' && (
        <>
          {monthPicker}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-white card-shadow rounded-md p-4">
              <div className="flex justify-between items-center mb-3 gap-2">
                <h3 className="text-[13px] font-semibold text-ink">Notified Minimum Wages</h3>
                {isHr && <Button variant="secondary" size="sm" onClick={() => setShowAddWage(true)}><Plus className="w-3 h-3" /> Add / Update</Button>}
              </div>
              {isLoading(wagesQ) ? <LoadingState /> : isError(wagesQ) ? <PageError onRetry={() => wagesQ.refetch()} /> : (
                <Table
                  columns={[
                    { key: 'category', header: 'Category', render: (r: any) => <span className="text-[13px] font-medium text-ink">{r.category}</span> },
                    { key: 'basic_monthly', header: 'Basic (₹/mo)', render: (r: any) => money(r.basic_monthly) },
                    { key: 'va_monthly', header: 'VA (₹/mo)', render: (r: any) => money(r.va_monthly) },
                    { key: 'total', header: 'Total', render: (r: any) => <span className="font-medium">{money(r.basic_monthly + r.va_monthly)}</span> },
                    { key: 'effective_from', header: 'Effective', render: (r: any) => r.effective_from },
                    ...(isHr ? [{
                      key: 'actions', header: '', render: (r: any) => (
                        <button onClick={() => wageDelMut.mutate(r.id)} className="p-1 text-error hover:bg-error-soft rounded-xs"><Trash2 className="w-3.5 h-3.5" /></button>
                      ),
                    }] : []),
                  ]}
                  data={wagesQ.data?.data || []}
                  keyFn={(r: any) => String(r.id)}
                />
              )}
              <p className="text-[11px] text-mute mt-2">Sample figures seeded for demo purposes — replace with your state's current notification.</p>
            </div>

            <div className="bg-white card-shadow rounded-md p-4">
              <h3 className="text-[13px] font-semibold text-ink mb-1">Wage Compliance Check — {monthYear(month, year)}</h3>
              <p className="text-[11px] text-mute mb-3">Compares fixed pay (Basic + Other Allowance) against the notified minimum for each employee's skill category.</p>
              {(() => {
                const meta: any = wageCheckQ.data?.meta
                const rows = ((wageCheckQ.data?.data || []) as any[]).filter(r => r.compliant === false)
                if (wageCheckQ.isLoading) return <LoadingState />
                if (wageCheckQ.isError) return <PageError onRetry={() => wageCheckQ.refetch()} />
                return (
                  <>
                    <div className="flex gap-4 text-[12px] text-body mb-3">
                      <span>Checked: <span className="font-medium">{meta?.checked}</span></span>
                      <span>{(meta?.violations ?? 0) === 0
                        ? <span className="text-success font-medium">All compliant</span>
                        : <span className="text-error font-medium">{meta.violations} below minimum</span>}</span>
                      {(meta?.total_shortfall ?? 0) > 0 && <span>Total shortfall: <span className="font-medium text-error">{money(meta.total_shortfall)}</span></span>}
                    </div>
                    {rows.length === 0
                      ? <EmptyState icon={CheckCircle2} title="All good" description="Every employee's fixed pay meets or exceeds the state minimum." />
                      : (
                        <Table
                          columns={[
                            { key: 'employee_code', header: 'Code', className: 'font-mono text-[11px]' },
                            { key: 'name', header: 'Name', render: (r: any) => <span className="text-[13px] font-medium text-ink">{r.name}</span> },
                            { key: 'skill_category', header: 'Category' },
                            { key: 'paid_fixed', header: 'Paid Fixed', render: (r: any) => money(r.paid_fixed) },
                            { key: 'state_min_total', header: 'Min Required', render: (r: any) => money(r.state_min_total) },
                            { key: 'shortfall', header: 'Shortfall', render: (r: any) => <span className="text-error font-medium">{money(r.shortfall)}</span> },
                          ]}
                          data={rows}
                          keyFn={(r: any) => String(r.employee_id)}
                        />
                      )}
                  </>
                )
              })()}
            </div>
          </div>

          <Modal open={showAddWage} onClose={() => setShowAddWage(false)} title="Add / Update Minimum Wage" size="sm">
            <div className="space-y-3">
              <Select label="Category" options={['Unskilled', 'Semi-skilled', 'Skilled', 'Highly Skilled'].map(c => ({ value: c, label: c }))} value={wageForm.category} onChange={e => setWageForm(f => ({ ...f, category: e.target.value }))} />
              <Input label="Basic (₹/month)" type="number" value={wageForm.basic_monthly} onChange={e => setWageForm(f => ({ ...f, basic_monthly: e.target.value }))} />
              <Input label="Variable Allowance / DA (₹/month)" type="number" value={wageForm.va_monthly} onChange={e => setWageForm(f => ({ ...f, va_monthly: e.target.value }))} />
              <Input label="Effective From" type="date" value={wageForm.effective_from} onChange={e => setWageForm(f => ({ ...f, effective_from: e.target.value }))} />
              <p className="text-[11px] text-mute">Saved against the configured state (Settings → Payroll Config). Existing entries for the same category are updated.</p>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setShowAddWage(false)}>Cancel</Button>
                <Button
                  loading={wageSaveMut.isPending}
                  onClick={() => {
                    const basic = Number(wageForm.basic_monthly), va = Number(wageForm.va_monthly)
                    if (!basic || basic <= 0) { toast.error('Enter a positive Basic amount.'); return }
                    wageSaveMut.mutate({ category: wageForm.category, basic_monthly: basic, va_monthly: va || 0, effective_from: wageForm.effective_from || `${year}-01-01`, state: undefined })
                  }}
                >Save</Button>
              </div>
            </div>
          </Modal>
        </>
      )}

      {/* ---------- Bonus ---------- */}
      {active === 'bonus' && (
        <>
          <div className="flex gap-2 mt-4 mb-4 items-center">
            <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="w-24 h-9 px-2 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink" />
            <span className="text-[12px] text-mute">Accounting year</span>
          </div>
          <div className="bg-white card-shadow rounded-md p-4">
            {bonusQ.isLoading ? <LoadingState /> : bonusQ.isError ? <PageError onRetry={() => bonusQ.refetch()} /> : (() => {
              const rows = (bonusQ.data?.data || []) as any[]
              const meta: any = bonusQ.data?.meta
              return (
                <>
                  <div className="flex justify-between items-center mb-3 gap-2 flex-wrap">
                    <div className="flex gap-4 text-[12px] text-body flex-wrap">
                      <span>Ceiling: <span className="font-medium">{money(meta?.wage_ceiling || 0)}/mo</span></span>
                      <span>Rate: <span className="font-medium">{meta?.min_percent}%</span> (max {meta?.max_percent}%)</span>
                      <span>Eligible: <span className="font-medium">{meta?.eligible_count}</span></span>
                      <span>Total provision: <span className="font-medium">{money(meta?.total_bonus || 0)}</span></span>
                      <span className="text-mute">{meta?.note}</span>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => downloadCsv(rows, `staffsway-bonus-${year}`)}><Download className="w-3.5 h-3.5" /> Export CSV</Button>
                  </div>
                  <Table
                    columns={[
                      { key: 'employee_code', header: 'Code', className: 'font-mono text-[11px]' },
                      { key: 'name', header: 'Name', render: (r: any) => <span className="text-[13px] font-medium text-ink">{r.name}</span> },
                      { key: 'monthly_basic', header: 'Monthly Basic', render: (r: any) => money(r.monthly_basic) },
                      { key: 'eligible', header: 'Eligible', render: (r: any) => <Badge className={r.eligible ? 'bg-success-soft text-success' : 'bg-canvas-soft-2 text-mute'}>{r.eligible ? 'Yes' : 'Above ceiling'}</Badge> },
                      { key: 'applied_percent', header: 'Rate %', render: (r: any) => r.applied_percent != null ? `${r.applied_percent}%` : '—' },
                      { key: 'annual_basic', header: 'Annual Basic', hideSm: true, render: (r: any) => money(r.annual_basic) },
                      { key: 'bonus_amount', header: 'Bonus Provision', render: (r: any) => <span className="font-medium">{r.bonus_amount ? money(r.bonus_amount) : '—'}</span> },
                    ]}
                    data={rows}
                    keyFn={(r: any) => String(r.employee_id)}
                  />
                </>
              )
            })()}
          </div>
        </>
      )}

      {/* ---------- Gratuity ---------- */}
      {active === 'gratuity' && (
        <div className="mt-4 bg-white card-shadow rounded-md p-4">
          {gratuityQ.isLoading ? <LoadingState /> : gratuityQ.isError ? <PageError onRetry={() => gratuityQ.refetch()} /> : (() => {
            const rows = (gratuityQ.data?.data || []) as any[]
            const eligibleCount = rows.filter(r => r.eligible).length
            return (
              <>
                <div className="flex justify-between items-center mb-3 gap-2">
                  <div className="text-[12px] text-body">
                    Eligible (5+ yrs): <span className="font-medium">{eligibleCount}</span>
                    <span className="text-mute ml-3">Formula: 15/26 × last drawn Basic × completed years</span>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => downloadCsv(rows, `staffsway-gratuity`)}><Download className="w-3.5 h-3.5" /> Export CSV</Button>
                </div>
                <Table
                  columns={[
                    { key: 'employee_code', header: 'Code', className: 'font-mono text-[11px]' },
                    { key: 'name', header: 'Name', render: (r: any) => <span className="text-[13px] font-medium text-ink">{r.name}</span> },
                    { key: 'joining_date', header: 'Joined', render: (r: any) => r.joining_date },
                    { key: 'service_years', header: 'Service', render: (r: any) => `${r.service_years} yr${r.service_years === 1 ? '' : 's'}` },
                    { key: 'latest_basic', header: 'Latest Basic', render: (r: any) => money(r.latest_basic) },
                    { key: 'eligible', header: 'Eligible', render: (r: any) => <Badge className={r.eligible ? 'bg-success-soft text-success' : 'bg-canvas-soft-2 text-mute'}>{r.eligible ? `Yes (${r.service_years}y)` : 'Under 5 yrs'}</Badge> },
                    { key: 'gratuity_amount', header: 'Provision', render: (r: any) => r.gratuity_amount ? <span className="font-medium">{money(r.gratuity_amount)}</span> : '—' },
                    { key: 'status', header: 'Status' },
                  ]}
                  data={rows}
                  keyFn={(r: any) => String(r.employee_id)}
                />
              </>
            )
          })()}
        </div>
      )}

      {/* ---------- Calendar ---------- */}
      {active === 'calendar' && (
        <>
          <div className="flex gap-2 mt-4 mb-4 items-center">
            <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="w-24 h-9 px-2 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink" />
            {(() => {
              const meta: any = calQ.data?.meta
              if (!meta) return null
              return (
                <div className="flex gap-4 text-[12px] text-body ml-2">
                  <span>Done: <span className="font-medium text-success">{meta.done}</span></span>
                  <span>Pending: <span className="font-medium">{meta.pending}</span></span>
                  {meta.overdue > 0 && <span className="text-error font-medium">{meta.overdue} overdue</span>}
                </div>
              )
            })()}
          </div>
          <div className="bg-white card-shadow rounded-md p-4">
            {calQ.isLoading ? <LoadingState /> : calQ.isError ? <PageError onRetry={() => calQ.refetch()} /> : (() => {
              const rows = ((calQ.data?.data || []) as any[])
              if (!rows.length) return <EmptyState icon={ShieldCheck} title="Nothing scheduled" description={`No compliance obligations generated for ${year}.`} />
              return (
                <Table
                  columns={[
                    { key: 'due_date', header: 'Due Date', render: (r: any) => <span className="font-mono text-[12px]">{r.due_date}</span> },
                    { key: 'label', header: 'Obligation', render: (r: any) => <span className="text-[13px] font-medium text-ink">{r.label || r.obligation}</span> },
                    { key: 'period', header: 'Period', render: (r: any) => r.month ? monthYear(r.month, r.year) : String(r.year) },
                    { key: 'status', header: 'Status', render: (r: any) => {
                      const overdue = r.status === 'pending' && r.due_date < new Date().toISOString().slice(0, 10)
                      return <Badge className={r.status === 'done' ? 'bg-success-soft text-success' : overdue ? 'bg-error-soft text-error' : 'bg-warning-soft text-warning-deep'}>{r.status === 'done' ? 'Filed' : overdue ? 'Overdue' : 'Pending'}</Badge>
                    } },
                    { key: 'done_by', header: 'Filed By', render: (r: any) => r.status === 'done' ? <span><span className="block text-[12px]">{r.done_by}</span><span className="text-[11px] text-mute">{r.done_at?.slice(0, 16)}</span></span> : (r.remarks || '—') },
                    ...(isHr ? [{
                      key: 'actions', header: '', render: (r: any) => (
                        <div className="flex justify-end gap-1.5">
                          {r.status !== 'done'
                            ? <Button variant="secondary" size="sm" onClick={() => { setDoneTarget(r); setDoneRemarks('') }}><CheckCircle2 className="w-3.5 h-3.5" /> Mark Filed</Button>
                            : <Button variant="secondary" size="sm" onClick={() => calMut.mutate({ id: r.id, status: 'pending' })}><RotateCcw className="w-3.5 h-3.5" /> Reopen</Button>}
                        </div>
                      ),
                    }] : []),
                  ]}
                  data={rows}
                  keyFn={(r: any) => String(r.id)}
                />
              )
            })()}
          </div>

          <Modal open={!!doneTarget} onClose={() => setDoneTarget(null)} title={`Mark filed — ${doneTarget?.label || doneTarget?.obligation || ''}`} size="sm">
            <div className="space-y-3">
              <p className="text-[12px] text-mute">Due {doneTarget?.due_date}. Filing records who marked it and when.</p>
              <Input label="Remarks / Challan reference (optional)" value={doneRemarks} onChange={e => setDoneRemarks(e.target.value)} />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setDoneTarget(null)}>Cancel</Button>
                <Button loading={calMut.isPending} onClick={() => { calMut.mutate({ id: doneTarget.id, status: 'done', remarks: doneRemarks || undefined }); setDoneTarget(null) }}>Mark Filed</Button>
              </div>
            </div>
          </Modal>
        </>
      )}
    </div>
  )
}

function isLoading(q: any) { return q.isLoading }
function isError(q: any) { return q.isError }

function SummaryCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-md p-3 border ${highlight ? 'bg-navy text-white border-navy' : 'bg-white border-hairline card-shadow'}`}>
      <p className={`text-[11px] ${highlight ? 'text-white/70' : 'text-mute'}`}>{label}</p>
      <p className="text-[15px] font-semibold mt-0.5">{value}</p>
      {sub && <p className={`text-[11px] mt-0.5 ${highlight ? 'text-white/60' : 'text-mute'}`}>{sub}</p>}
    </div>
  )
}
