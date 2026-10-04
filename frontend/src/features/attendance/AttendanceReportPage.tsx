import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { attendanceApi, clientApi, siteApi } from '@/services/api'
import { Button } from '@/components/ui/fields'
import { PageHeader } from '@/components/ui/layout'
import { FilterBar, SelectFilter, NativeSelect } from '@/components/ui/actions'
import { LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { downloadCsv } from '@/utils/csv'
import { toast } from 'sonner'
import { Download, Users, CalendarCheck, CalendarX2, Palmtree, CalendarDays, Moon, Sun, AlarmClock, BadgeCheck, IndianRupee, Table as TableIcon } from 'lucide-react'
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

  const { data, isLoading, error, refetch } = useQuery({
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
    <div className="space-y-5">
      <PageHeader
        title="Attendance Analytics & Report"
        description={`${monthYear(month, year)} &bull; ${employees.length} employee${employees.length === 1 ? '' : 's'} on record &bull; ${rep?.total_days || 0} calendar days`}
        actions={
          <button
            type="button"
            onClick={exportCsv}
            disabled={employees.length === 0}
            className="h-10 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-2 shadow-2xs transition-all cursor-pointer disabled:opacity-40"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>Export CSV</span>
          </button>
        }
      />

      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <FilterBar className="px-4 py-3.5 border-b border-slate-100 bg-slate-50/40">
          <NativeSelect className="w-40" value={String(month)} onChange={(v) => setMonth(Number(v))} options={Array.from({ length: 12 }, (_, i) => i + 1).map((m) => ({ value: String(m), label: new Date(2000, m - 1).toLocaleDateString('en-US', { month: 'long' }) }))} />
          <NativeSelect className="w-24" value={String(year)} onChange={(v) => setYear(Number(v))} options={[2024, 2025, 2026, 2027].map((y) => ({ value: String(y), label: String(y) }))} />
          <SelectFilter label="Client" value={clientFilter} onChange={(v) => { setClientFilter(v); setSiteFilter('') }} options={[{ value: '', label: 'All Clients' }, ...(clients?.data || []).map((c: any) => ({ value: String(c.id), label: c.name }))]} />
          <SelectFilter label="Site" value={siteFilter} onChange={setSiteFilter} options={[{ value: '', label: 'All Sites' }, ...sites.map((s: any) => ({ value: String(s.id), label: s.name }))]} />
        </FilterBar>

        {isLoading ? (
          <div className="p-8"><LoadingState /></div>
        ) : error ? (
          <PageError onRetry={() => refetch()} />
        ) : employees.length === 0 ? (
          <EmptyState title="No data for this month" description="Enter attendance for the selected month first." />
        ) : (
          <>
            {/* Headline stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-10 gap-3 p-4 border-b border-slate-100 bg-slate-50/30">
              <Stat icon={Users} tone="text-blue-700 bg-blue-50 border-blue-200/60" label="Headcount" value={num(totals?.headcount ?? 0)} />
              <Stat icon={CalendarCheck} tone="text-emerald-700 bg-emerald-50 border-emerald-200/60" label="Present" value={num(totals?.p ?? 0)} />
              <Stat icon={CalendarX2} tone="text-rose-700 bg-rose-50 border-rose-200/60" label="Absent" value={num(totals?.a ?? 0)} />
              <Stat icon={Palmtree} tone="text-slate-700 bg-slate-100 border-slate-200/60" label="Rest Days" value={num(totals?.rest ?? 0)} />
              <Stat icon={CalendarDays} tone="text-sky-700 bg-sky-50 border-sky-200/60" label="Holidays" value={num(totals?.hd ?? 0)} />
              <Stat icon={Moon} tone="text-amber-700 bg-amber-50 border-amber-200/60" label="Half Days" value={num(totals?.hf ?? 0)} />
              <Stat icon={Sun} tone="text-rose-700 bg-rose-50 border-rose-200/60" label="Leaves" value={num(totals?.l ?? 0)} />
              <Stat icon={AlarmClock} tone="text-purple-700 bg-purple-50 border-purple-200/60" label="OT Hours" value={`${r2(totals?.ot_hours ?? 0)}`} />
              <Stat icon={BadgeCheck} tone="text-blue-700 bg-blue-50 border-blue-200/60" label="Payable Days" value={num(totals?.payable_days ?? 0)} />
              <Stat icon={IndianRupee} tone="text-emerald-700 bg-emerald-50 border-emerald-200/60" label="Actual Salary" value={`₹${money(totals?.actual_salary ?? 0)}`} />
            </div>

            {/* Client / Site rollup */}
            {groups.length > 0 && (
              <div className="px-5 py-4 border-b border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Client &bull; Site Breakdown</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {groups.map((g, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 truncate">{g.client_name || 'Direct / Head Office'}</span>
                        <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{g.headcount} emps</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{g.site_name || 'Primary Site'}</p>
                      <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100">
                        <span className="text-slate-500">Payable: <strong>{g.payable_days}</strong></span>
                        <span className="text-emerald-700 font-bold font-mono">₹{money(g.actual_salary)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detailed employee table */}
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/70">
                    <th className="px-4 py-3">Emp. ID</th>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Client &bull; Site</th>
                    <th className="px-4 py-3">Designation</th>
                    <th className="px-2 py-3 text-center">P</th>
                    <th className="px-2 py-3 text-center">A</th>
                    <th className="px-2 py-3 text-center">Rest</th>
                    <th className="px-2 py-3 text-center">HD</th>
                    <th className="px-2 py-3 text-center">HF</th>
                    <th className="px-2 py-3 text-center">L</th>
                    <th className="px-2 py-3 text-center">OT Hrs</th>
                    <th className="px-3 py-3 text-right">Payable</th>
                    <th className="px-4 py-3 text-right">Salary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {employees.map((e, idx) => (
                    <tr key={e.employee_id} className={`hover:bg-blue-50/40 transition-colors ${idx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'}`}>
                      <td className="px-4 py-2.5 font-mono font-bold text-blue-700">{e.employee_code}</td>
                      <td className="px-4 py-2.5 font-bold text-slate-900">{e.name}</td>
                      <td className="px-4 py-2.5 text-slate-500 text-[11px]">{e.client_name || '—'} &bull; {e.site_name || '—'}</td>
                      <td className="px-4 py-2.5">{e.designation || '—'}</td>
                      <td className="px-2 py-2.5 text-center font-bold text-emerald-700">{e.p}</td>
                      <td className="px-2 py-2.5 text-center font-bold text-rose-700">{e.a}</td>
                      <td className="px-2 py-2.5 text-center text-slate-500">{e.rest}</td>
                      <td className="px-2 py-2.5 text-center text-sky-700">{e.hd}</td>
                      <td className="px-2 py-2.5 text-center text-amber-700">{e.hf}</td>
                      <td className="px-2 py-2.5 text-center text-rose-600">{e.l}</td>
                      <td className="px-2 py-2.5 text-center font-mono">{r2(e.ot_hours)}</td>
                      <td className="px-3 py-2.5 text-right font-extrabold text-slate-900">{e.payable_days}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-emerald-700 font-mono">₹{money(e.actual_salary)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Stat({ icon: Icon, tone, label, value }: { icon: any; tone: string; label: string; value: string }) {
  return (
    <div className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center ${tone}`}>
      <Icon className="w-4 h-4 mb-1" />
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      <span className="text-sm font-black mt-0.5">{value}</span>
    </div>
  )
}