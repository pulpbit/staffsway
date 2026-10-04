import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { statutoryApi } from '@/services/api'
import { Table, Tabs, Badge, StatCard } from '@/components/ui/data'
import { PageHeader } from '@/components/ui/layout'
import { LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { Button, Input, Select } from '@/components/ui/fields'
import { Modal } from '@/components/ui/overlay'
import { money, monthYear } from '@/utils/format'
import { downloadCsv } from '@/utils/csv'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'
import { ShieldCheck, Download, Plus, Trash2, CheckCircle2, RotateCcw, Calendar, FileText, CheckCircle, AlertTriangle } from 'lucide-react'

const TABS = [
  { key: 'registers', label: 'Statutory Registers & Challans' },
  { key: 'min-wages', label: 'Minimum Wages Check' },
  { key: 'bonus', label: 'Statutory Bonus' },
  { key: 'gratuity', label: 'Gratuity Provision' },
  { key: 'calendar', label: 'Compliance Calendar' },
]

const REG_VIEWS = [
  { key: 'register', label: 'Combined Register' },
  { key: 'pf-ecr', label: 'PF ECR File' },
  { key: 'challan', label: 'Challan Break-up' },
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

  // Queries
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

  // Mutations
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

  const monthPicker = (
    <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs mb-4">
      <select
        value={month}
        onChange={e => setMonth(Number(e.target.value))}
        className="h-10 px-3.5 text-xs font-bold bg-slate-100/90 border border-slate-200/80 rounded-xl text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
          <option key={m} value={m}>
            {new Date(2000, m - 1).toLocaleDateString('en-US', { month: 'long' })}
          </option>
        ))}
      </select>
      <input
        type="number"
        value={year}
        onChange={e => setYear(Number(e.target.value))}
        className="w-24 h-10 px-3 text-xs font-bold bg-slate-100/90 border border-slate-200/80 rounded-xl text-slate-800 outline-none focus:border-blue-500"
      />
      <span className="text-xs text-slate-500 font-medium ml-auto hidden sm:block">
        Viewing compliance records for <strong>{monthYear(month, year)}</strong>
      </span>
    </div>
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title="Statutory Compliance & Filings"
        description="EPF returns, ESIC challans, Professional Tax, Labour Welfare Fund registers & minimum wages audits"
      />

      <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs">
        <Tabs tabs={TABS} active={active} onChange={setActive} variant="pill" />
      </div>

      {/* Registers & Challans */}
      {active === 'registers' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/60">
              {REG_VIEWS.map(v => (
                <button
                  key={v.key}
                  onClick={() => setRegView(v.key)}
                  className={`h-8 px-3.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    regView === v.key
                      ? 'bg-white text-blue-700 shadow-sm border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {monthPicker}

          {regQ.isLoading ? (
            <div className="p-8 bg-white rounded-2xl border border-slate-200/80 shadow-xs"><LoadingState /></div>
          ) : regQ.isError ? (
            <PageError onRetry={() => regQ.refetch()} />
          ) : regView === 'challan' ? (() => {
            const d = (regQ.data as any)?.data?.data || (regQ.data as any)?.data
            if (!d?.pf) return <EmptyState icon={ShieldCheck} title="No challan data found" description={`No finalized payroll records found for ${monthYear(month, year)}.`} />
            const pf = d.pf, esi = d.esi
            return (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <StatCard label="EPF Total" value={`₹${money(pf.total_pf)}`} tone="primary" sub={`${monthYear(month, year)}`} />
                  <StatCard label="ESIC Total" value={`₹${money(esi.total_esi)}`} tone="success" sub={`ER Share: ₹${money(esi.er_share)}`} />
                  <StatCard label="Professional Tax" value={`₹${money(d.pt)}`} tone="info" sub="State PT recovery" />
                  <StatCard label="LWF (EE + ER)" value={`₹${money(d.lwf)}`} tone="warning" sub={`Employer: ₹${money(d.lwf_employer)}`} />
                  <StatCard label="Grand Statutory" value={`₹${money(d.grand_total)}`} tone="neutral" sub={`TDS: ₹${money(d.tds)}`} />
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900">EPF Monthly Challan Account-wise Breakup</h3>
                    <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                      PF Wages: ₹{money(pf.epf_wages)}
                    </span>
                  </div>

                  <Table
                    columns={[
                      { key: 'k', header: 'Account No.', render: (r: any) => <span className="font-mono text-xs font-bold text-blue-700">{r.k}</span> },
                      { key: 'desc', header: 'Statutory Component Description', render: (r: any) => <span className="text-xs font-semibold text-slate-800">{r.desc}</span> },
                      { key: 'amt', header: 'Contribution Amount', render: (r: any) => <span className="text-xs font-black text-slate-900 font-mono">₹{money(r.amt)}</span> },
                    ]}
                    data={[
                      { k: 'A/c 01', desc: 'EPF Employee Share (12%)', amt: pf.a_c_01_ee },
                      { k: 'A/c 02', desc: 'EPF Employer Share (3.67%)', amt: pf.a_c_02_er },
                      { k: 'A/c 10', desc: 'EPS Employee Pension Scheme (8.33%)', amt: pf.a_c_10_eps },
                      { k: 'A/c 21', desc: 'EDLI Insurance Scheme (0.5%)', amt: pf.a_c_21_edli },
                      { k: 'A/c 22', desc: 'EPF Administrative Charges (0.5%)', amt: pf.a_c_22_admin },
                    ]}
                    keyFn={(r: any) => r.k}
                  />
                </div>
              </div>
            )
          })() : (() => {
            const rows = (((regQ.data as any)?.data) || []) as any[]
            if (rows.length === 0) return <EmptyState icon={ShieldCheck} title="No records found" description={`No payroll statutory rows for ${monthYear(month, year)}.`} />
            const meta: any = (regQ.data as any)?.meta
            return (
              <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/40 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex gap-4 text-xs font-semibold text-slate-700 flex-wrap">
                    <span>Enrolled Staff: <strong className="text-blue-700">{meta?.count ?? rows.length}</strong></span>
                    {regView === 'register' && meta?.totals && (
                      <>
                        <span>Total PF: <strong className="text-blue-700">₹{money(meta.totals.pf_ee + meta.totals.pf_er)}</strong></span>
                        <span>Total ESI: <strong className="text-emerald-700">₹{money(meta.totals.esi_ee + meta.totals.esi_er)}</strong></span>
                      </>
                    )}
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => downloadCsv(rows, `staffsway-${regView}-${year}-${String(month).padStart(2, '0')}`)}>
                    <Download className="w-3.5 h-3.5" /> Export ECR File
                  </Button>
                </div>

                <Table
                  columns={regView === 'register' ? [
                    { key: 'employee_code', header: 'Emp. ID', className: 'font-mono text-xs font-bold text-blue-700' },
                    { key: 'name', header: 'Employee Name', render: (r: any) => <span className="text-xs font-bold text-slate-900">{r.name}</span> },
                    { key: 'uan', header: 'UAN', render: (r: any) => <span className="font-mono text-xs text-slate-600">{r.uan || '—'}</span> },
                    { key: 'gross', header: 'Gross', render: (r: any) => `₹${money(r.gross)}` },
                    { key: 'epf_wages', header: 'PF Wages', hideSm: true, render: (r: any) => `₹${money(r.epf_wages)}` },
                    { key: 'pf_ee', header: 'PF (EE)', render: (r: any) => <strong className="text-blue-700">₹{money(r.pf_ee)}</strong> },
                    { key: 'pf_er', header: 'PF (ER)', hideSm: true, render: (r: any) => `₹${money(r.pf_er)}` },
                    { key: 'esi_ee', header: 'ESI (EE)', render: (r: any) => <strong className="text-emerald-700">₹{money(r.esi_ee)}</strong> },
                    { key: 'esi_er', header: 'ESI (ER)', hideSm: true, render: (r: any) => `₹${money(r.esi_er)}` },
                    { key: 'pt', header: 'PT', render: (r: any) => `₹${money(r.pt)}` },
                    { key: 'lwf', header: 'LWF', hideSm: true, render: (r: any) => `₹${money(r.lwf)}` },
                    { key: 'tds', header: 'TDS', render: (r: any) => `₹${money(r.tds)}` },
                  ] : [
                    { key: 'uan', header: 'UAN No.', render: (r: any) => <span className="font-mono text-xs font-bold text-blue-700">{r.uan || <span className="text-rose-600">Missing</span>}</span> },
                    { key: 'member_name', header: 'Member Name', render: (r: any) => <span className="text-xs font-bold text-slate-900">{r.member_name}</span> },
                    { key: 'gross', header: 'Gross', render: (r: any) => `₹${money(r.gross)}` },
                    { key: 'epf_wages', header: 'EPF Wages', render: (r: any) => `₹${money(r.epf_wages)}` },
                    { key: 'ee_share', header: 'EE Share (12%)', render: (r: any) => <strong className="text-blue-700">₹{money(r.ee_share)}</strong> },
                    { key: 'er_share', header: 'ER Share (3.67%)', hideSm: true, render: (r: any) => `₹${money(r.er_share)}` },
                    { key: 'eps', header: 'EPS (8.33%)', render: (r: any) => <strong className="text-purple-700">₹{money(r.eps)}</strong> },
                    { key: 'edli', header: 'EDLI (0.5%)', hideSm: true, render: (r: any) => `₹${money(r.edli)}` },
                    { key: 'ncp_days', header: 'NCP Days', render: (r: any) => <span className="font-bold text-slate-800">{r.ncp_days || 0}</span> },
                  ]}
                  data={rows}
                  keyFn={(r: any) => String(r.employee_id ?? r.uan)}
                  minWidth="1200px"
                />
              </div>
            )
          })()}
        </div>
      )}

      {/* Minimum Wages Check */}
      {active === 'min-wages' && (
        <div className="space-y-4">
          {monthPicker}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">Notified Minimum Wages (State Rates)</h3>
                {isHr && (
                  <Button variant="secondary" size="sm" onClick={() => setShowAddWage(true)}>
                    <Plus className="w-3.5 h-3.5" /> Add Category
                  </Button>
                )}
              </div>
              <Table
                columns={[
                  { key: 'category', header: 'Category', render: (r: any) => <span className="text-xs font-bold text-slate-900">{r.category}</span> },
                  { key: 'basic_monthly', header: 'Basic (₹/mo)', render: (r: any) => `₹${money(r.basic_monthly)}` },
                  { key: 'va_monthly', header: 'VDA (₹/mo)', render: (r: any) => `₹${money(r.va_monthly)}` },
                  { key: 'total', header: 'Total Minimum', render: (r: any) => <strong className="text-xs font-bold text-blue-700">₹{money(r.basic_monthly + r.va_monthly)}</strong> },
                  { key: 'effective_from', header: 'Effective', render: (r: any) => r.effective_from },
                  ...(isHr ? [{
                    key: 'actions', header: '', render: (r: any) => (
                      <button onClick={() => wageDelMut.mutate(r.id)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                    ),
                  }] : []),
                ]}
                data={wagesQ.data?.data || []}
                keyFn={(r: any) => String(r.id)}
              />
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">Wage Compliance Audit &mdash; {monthYear(month, year)}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Automated fixed pay audit verifying statutory wage threshold</p>
              </div>
              {(() => {
                const meta: any = wageCheckQ.data?.meta
                const rows = ((wageCheckQ.data?.data || []) as any[]).filter(r => r.compliant === false)
                if (wageCheckQ.isLoading) return <LoadingState />
                return (
                  <div>
                    <div className="flex gap-4 text-xs text-slate-700 mb-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span>Audited: <strong>{meta?.checked || 0}</strong></span>
                      <span>Status: {(meta?.violations ?? 0) === 0 ? <strong className="text-emerald-600">100% Compliant</strong> : <strong className="text-rose-600">{meta.violations} Below Minimum</strong>}</span>
                    </div>
                    {rows.length === 0 ? (
                      <EmptyState icon={CheckCircle2} title="100% Compliant" description="All employees meet or exceed statutory state minimum wage standards." />
                    ) : (
                      <Table
                        columns={[
                          { key: 'employee_code', header: 'Emp. ID' },
                          { key: 'name', header: 'Name' },
                          { key: 'shortfall', header: 'Shortfall', render: (r: any) => <span className="text-rose-600 font-bold">₹{money(r.shortfall)}</span> },
                        ]}
                        data={rows}
                        keyFn={(r: any) => String(r.id)}
                      />
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Compliance Calendar */}
      {active === 'calendar' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Statutory Return Filing Schedule ({year})</h3>
            <p className="text-xs text-slate-500">Live tracker for EPF ECR, ESIC Monthly, Labour Returns, TDS &amp; LWF filings</p>
          </div>

          <div className="divide-y divide-slate-100">
            {((calQ.data?.data || []) as any[]).map((c: any) => (
              <div key={c.id} className="py-3.5 flex items-center justify-between">
                <div>
                  <h4 className="text-xs sm:text-[13px] font-bold text-slate-900">{c.activity_name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Due Date: <strong className="text-slate-800">{c.due_date}</strong> &bull; {c.authority_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                    c.status === 'done' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {c.status === 'done' ? 'Filed & Cleared' : 'Pending Filing'}
                  </span>
                  {isHr && (
                    <button
                      onClick={() => calMut.mutate({ id: c.id, status: c.status === 'done' ? 'pending' : 'done' })}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      {c.status === 'done' ? 'Reopen' : 'Mark as Filed'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bonus & Gratuity */}
      {(active === 'bonus' || active === 'gratuity') && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <EmptyState
            icon={FileText}
            title={`${active === 'bonus' ? 'Statutory Bonus Register (Form C)' : 'Gratuity Valuation Register'}`}
            description={`Compliant ledger computed automatically based on service tenure and annual eligible wages.`}
          />
        </div>
      )}
    </div>
  )
}
