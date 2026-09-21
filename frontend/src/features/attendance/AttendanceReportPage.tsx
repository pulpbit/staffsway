import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { attendanceApi, clientApi, siteApi } from '@/services/api'
import { Button } from '@/components/ui/fields'
import { PageHeader } from '@/components/ui/layout'
import { FilterBar, SelectFilter, NativeSelect } from '@/components/ui/actions'
import { LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { downloadCsv } from '@/utils/csv'
import { toast } from 'sonner'
import { Download, Users, CalendarCheck, CalendarX2, Palmtree, CalendarDays, Moon, Sun, AlarmClock, BadgeCheck, IndianRupee } from 'lucide-react'
import { monthYear, money } from '@/utils/format'
import type { AttendanceReport } from '@/types/api'
import { r2 } from './attendanceGrid'

const num = (n: number) => String(n)

export default function AttendanceReportPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [clientFilter, setClientFilter] = useState('')
  const [siteFilter, setSiteFilter] = useState('')

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['attendance-report', month, year, clientFilter, siteFilter],
    queryFn: () => attendanceApi.report(month, year, { client_id: clientFilter, site_id: siteFilter }),
  })

  const { data: clients } = useQuery({ queryKey: ['clients-select'], queryFn: () => clientApi.list() })
  const { data: allSites } = useQuery({ queryKey: ['sites-select'], queryFn: () => siteApi.list() })
  const sites = ((allSites?.data || []) as any[]).filter((s: any) => !clientFilter || String(s.client_id) === clientFilter).sort((a, b) => a.name.localeCompare(b.name))

  const rep: AttendanceReport | undefined = data?.data
  const employees = rep?.employees || []
  const groups = rep?.groups || []
  const totals = rep?.totals

  const exportCsv = () => {
    if (employees.length === 0) return
    downloadCsv(
      employees.map((e) => ({
        employee_code: e.employee_code,
        employee_name: e.name,
        father_name: e.father_name || '',
        client: e.client_name || '',
        site: e.site_name || '',
        designation: e.designation || '',
        status: e.status,
        p: e.p, a: e.a, rest: e.rest, hd: e.hd, hf: e.hf, l: e.l,
        ot_hours: e.ot_hours, ot_days: e.ot_days,
        monthly_salary: e.monthly_earnings,
        payable_days: e.payable_days, actual_salary: e.actual_salary,
      })),
      `attendance_report_${year}-${String(month).padStart(2, '0')}`
    )
    toast.success('Attendance report exported.')
  }

  return (
    <div>
      <PageHeader
        title="Attendance Report"
        description={`${monthYear(month, year)} · ${employees.length} employee${employees.length === 1 ? '' : 's'} · ${rep?.total_days || 0} calendar days`}
        actions={
          <Button variant="secondary" onClick={exportCsv} disabled={employees.length === 0}><Download className="w-3.5 h-3.5" /> Export CSV</Button>
        }
      />

      <div className="bg-white card-shadow rounded-md overflow-hidden">
        <FilterBar className="px-4 py-3 border-b border-hairline">
          <NativeSelect className="w-40" value={String(month)} onChange={(v) => setMonth(Number(v))} options={Array.from({ length: 12 }, (_, i) => i + 1).map((m) => ({ value: String(m), label: new Date(2000, m - 1).toLocaleDateString('en-US', { month: 'long' }) }))} />
          <NativeSelect className="w-24" value={String(year)} onChange={(v) => setYear(Number(v))} options={[2024, 2025, 2026, 2027].map((y) => ({ value: String(y), label: String(y) }))} />
          <SelectFilter label="Client" value={clientFilter} onChange={(v) => { setClientFilter(v); setSiteFilter('') }} options={[{ value: '', label: 'All Clients' }, ...(clients?.data || []).map((c: any) => ({ value: String(c.id), label: c.name }))]} />
          <SelectFilter label="Site" value={siteFilter} onChange={setSiteFilter} options={[{ value: '', label: 'All Sites' }, ...sites.map((s: any) => ({ value: String(s.id), label: s.name }))]} />
        </FilterBar>

        {isLoading ? (
          <div className="p-4"><LoadingState /></div>
        ) : error ? (
          <PageError onRetry={() => refetch()} />
        ) : employees.length === 0 ? (
          <EmptyState title="No data for this month" description="Enter attendance for the selected month first." />
        ) : (
          <>
            {/* Headline stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-10 gap-2 px-4 py-4 border-b border-hairline">
              <Stat icon={Users} tone="text-navy-mid bg-navy-soft" label="Headcount" value={num(totals?.headcount ?? 0)} />
              <Stat icon={CalendarCheck} tone="text-success bg-success-soft" label="Present" value={num(totals?.p ?? 0)} />
              <Stat icon={CalendarX2} tone="text-error bg-error-soft" label="Absent" value={num(totals?.a ?? 0)} />
              <Stat icon={Palmtree} tone="text-mute bg-neutral-soft" label="Rest" value={num(totals?.rest ?? 0)} />
              <Stat icon={CalendarDays} tone="text-info-deep bg-info-soft" label="Holidays" value={num(totals?.hd ?? 0)} />
              <Stat icon={Moon} tone="text-warning-deep bg-warning-soft" label="Half Days" value={num(totals?.hf ?? 0)} />
              <Stat icon={Sun} tone="text-error-deep bg-error-soft" label="Leave" value={num(totals?.l ?? 0)} />
              <Stat icon={AlarmClock} tone="text-mute bg-neutral-soft" label="OT Hrs" value={`${r2(totals?.ot_hours ?? 0)}`} />
              <Stat icon={BadgeCheck} tone="text-navy-mid bg-navy-soft" label="Payable Days" value={num(totals?.payable_days ?? 0)} />
              <Stat icon={IndianRupee} tone="text-success bg-success-soft" label="Actual Salary" value={`₹${money(totals?.actual_salary ?? 0)}`} />
            </div>

            {/* Client / Site rollup */}
            <div className="px-4 py-3 border-b border-hairline">
              <h3 className="text-[13px] font-semibold text-ink mb-2">Client / Site Summary</h3>
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full min-w-[760px] text-[12px]">
                  <thead>
                    <tr className="border-b border-hairline bg-canvas-soft">
                      {['Client', 'Site', 'Headcount', 'P', 'A', 'R', 'HD', 'HF', 'L', 'OT Hrs', 'OT Days', 'PD', 'Salary', 'Actual'].map((h) => (
                        <th key={h} className="px-2 py-2 text-left text-[10px] font-medium font-mono text-mute uppercase tracking-[0.04em] whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((g) => (
                      <tr key={`${g.client_id ?? 0}:${g.site_id ?? 0}`} className="border-b border-hairline hover:bg-canvas-soft/70 text-body">
                        <td className="px-2 py-2 font-medium text-ink">{g.client_name || '—'}</td>
                        <td className="px-2 py-2">{g.site_name || '—'}</td>
                        <td className="px-2 py-2 tabular-nums">{g.headcount}</td>
                        <td className="px-2 py-2 tabular-nums text-success font-medium">{g.p}</td>
                        <td className="px-2 py-2 tabular-nums text-error font-medium">{g.a}</td>
                        <td className="px-2 py-2 tabular-nums">{g.rest}</td>
                        <td className="px-2 py-2 tabular-nums">{g.hd}</td>
                        <td className="px-2 py-2 tabular-nums">{g.hf}</td>
                        <td className="px-2 py-2 tabular-nums">{g.l}</td>
                        <td className="px-2 py-2 tabular-nums">{g.ot_hours}</td>
                        <td className="px-2 py-2 tabular-nums">{g.ot_days}</td>
                        <td className="px-2 py-2 tabular-nums font-semibold text-ink">{g.payable_days}</td>
                        <td className="px-2 py-2 tabular-nums">₹{money(g.monthly_earnings)}</td>
                        <td className="px-2 py-2 tabular-nums font-semibold text-ink">₹{money(g.actual_salary)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-canvas-soft font-semibold text-ink">
                      <td className="px-2 py-2 text-[11px] uppercase tracking-wide">Total</td>
                      <td className="px-2 py-2">—</td>
                      <td className="px-2 py-2 tabular-nums">{totals?.headcount ?? 0}</td>
                      <td className="px-2 py-2 tabular-nums text-success">{totals?.p ?? 0}</td>
                      <td className="px-2 py-2 tabular-nums text-error">{totals?.a ?? 0}</td>
                      <td className="px-2 py-2 tabular-nums">{totals?.rest ?? 0}</td>
                      <td className="px-2 py-2 tabular-nums">{totals?.hd ?? 0}</td>
                      <td className="px-2 py-2 tabular-nums">{totals?.hf ?? 0}</td>
                      <td className="px-2 py-2 tabular-nums">{totals?.l ?? 0}</td>
                      <td className="px-2 py-2 tabular-nums">{totals?.ot_hours ?? 0}</td>
                      <td className="px-2 py-2 tabular-nums">{totals?.ot_days ?? 0}</td>
                      <td className="px-2 py-2 tabular-nums">{totals?.payable_days ?? 0}</td>
                      <td className="px-2 py-2 tabular-nums">₹{money(totals?.monthly_earnings ?? 0)}</td>
                      <td className="px-2 py-2 tabular-nums">₹{money(totals?.actual_salary ?? 0)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Employee detail */}
            <div className="px-4 py-3">
              <h3 className="text-[13px] font-semibold text-ink mb-2">Employee Detail</h3>
              <div className="overflow-x-auto scrollbar-thin max-h-[520px]">
                <table className="w-full min-w-[1000px] text-[12px]">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-hairline bg-canvas-soft">
                      {['Emp ID', 'Employee', 'Client', 'Site', 'P', 'A', 'R', 'HD', 'HF', 'L', 'OT Hrs', 'OT Days', 'Salary', 'PD', 'Actual Salary'].map((h) => (
                        <th key={h} className="px-2 py-2 text-left text-[10px] font-medium font-mono text-mute uppercase tracking-[0.04em] whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((e) => (
                      <tr key={e.employee_id} className="border-b border-hairline hover:bg-canvas-soft/70 text-body">
                        <td className="px-2 py-1.5 font-mono text-[11px] text-mute">{e.employee_code}</td>
                        <td className="px-2 py-1.5">
                          <span className="block font-medium text-ink">{e.name}</span>
                          <span className="block text-[11px] text-mute">{e.designation || '—'}</span>
                        </td>
                        <td className="px-2 py-1.5">{e.client_name || '—'}</td>
                        <td className="px-2 py-1.5">{e.site_name || '—'}</td>
                        <td className="px-2 py-1.5 tabular-nums text-success font-medium">{e.p}</td>
                        <td className="px-2 py-1.5 tabular-nums text-error font-medium">{e.a}</td>
                        <td className="px-2 py-1.5 tabular-nums">{e.rest}</td>
                        <td className="px-2 py-1.5 tabular-nums">{e.hd}</td>
                        <td className="px-2 py-1.5 tabular-nums">{e.hf}</td>
                        <td className="px-2 py-1.5 tabular-nums">{e.l}</td>
                        <td className="px-2 py-1.5 tabular-nums">{e.ot_hours}</td>
                        <td className="px-2 py-1.5 tabular-nums">{e.ot_days}</td>
                        <td className="px-2 py-1.5 tabular-nums">₹{money(e.monthly_earnings)}</td>
                        <td className="px-2 py-1.5 tabular-nums font-semibold text-ink">{e.payable_days}</td>
                        <td className="px-2 py-1.5 tabular-nums font-semibold text-ink">₹{money(e.actual_salary)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {isFetching && <div className="px-4 pb-3 text-[11px] text-mute">Refreshing…</div>}
          </>
        )}
      </div>
    </div>
  )
}

function Stat({ icon: Icon, tone, label, value }: { icon: any; tone: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-md bg-canvas-soft/60 px-2.5 py-2 min-w-0">
      <span className={`w-7 h-7 rounded-sm flex items-center justify-center shrink-0 ${tone}`}><Icon className="w-3.5 h-3.5" /></span>
      <span className="min-w-0">
        <span className="block text-[9.5px] text-mute uppercase tracking-wide font-medium truncate">{label}</span>
        <span className="block text-[14px] font-semibold text-ink tabular-nums leading-tight truncate">{value}</span>
      </span>
    </div>
  )
}