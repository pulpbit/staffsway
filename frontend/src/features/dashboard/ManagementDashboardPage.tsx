import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { dashboardApi } from '@/services/api'
import { LoadingState, PageError } from '@/components/ui/state'
import { Users, UserCheck, UserX, CalendarDays, UserPlus, UserMinus, IndianRupee, Clock, TrendingDown, AlarmClock, AlertTriangle } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { monthYear, fullName } from '@/utils/format'
import { PENDING_LABELS } from '@/utils/pending'

const COLORS = ['#011b3f', '#0a2f66', '#1c56a8', '#7fa3d8', '#fcbd03', '#d99e00', '#16a34a', '#e2e8f2']

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const monthLabel = (m: number, y: number) => `${MONTHS[m - 1] || m} ${y}`

export default function ManagementDashboardPage() {
  const navigate = useNavigate()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['mgmt-dashboard', month, year], queryFn: () => dashboardApi.management(month, year) })
  if (isLoading) return <LoadingState message="Loading dashboard..." />
  if (error) return <PageError onRetry={() => refetch()} />

  const d = data?.data as any
  if (!d) return null

  const attTrend = (d.attendance_trend || []).map((r: any) => ({ ...r, label: monthLabel(r.month, r.year) }))
  const salaryTrend = (d.salary_cost_trend || []).map((r: any) => ({ ...r, label: monthLabel(r.month, r.year) })).reverse()

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-semibold text-ink tracking-[-0.03em]">Dashboard</h1>
          <p className="text-[13px] text-body mt-0.5">Workforce overview &amp; analytics — {monthYear(month, year)}</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={month} onChange={e => setMonth(Number(e.target.value))} className="h-9 px-2 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{new Date(2000, m - 1).toLocaleDateString('en-US', { month: 'long' })}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="h-9 px-2 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink">
            {['2024', '2025', '2026', '2027'].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 mb-6">
        <KPICard icon={Users} label="Active Employees" value={d.employees} color="bg-canvas-soft text-ink" />
        <KPICard icon={UserCheck} label="Present (Month)" value={d.present_subtotal} color="bg-success-soft text-success" sub={`${d.enrolled} in payroll`} />
        <KPICard icon={UserX} label="Absent (Month)" value={d.absent_subtotal} color="bg-error-soft text-error-deep" />
        <KPICard icon={CalendarDays} label="On Leave Today" value={d.on_leave} color="bg-warning-soft text-warning-deep" />
        <KPICard icon={UserPlus} label="New Joinings" value={d.new_joinings} color="bg-link-soft text-link-deep" sub="this month" />
        <KPICard icon={UserMinus} label="Exits" value={d.resignations} color="bg-error-soft text-error-deep" sub="this month" />
      </div>

      {/* Second Row KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-white card-shadow rounded-md p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-success-soft flex items-center justify-center">
            <IndianRupee className="w-5 h-5 text-success" />
          </div>
          <div>
            <p className="text-[11px] text-mute">Payroll Cost ({monthYear(month, year)})</p>
            <p className="text-[18px] font-semibold text-ink">{formatRupees(d.salary_cost)}</p>
          </div>
        </div>
        <div className="bg-white card-shadow rounded-md p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-warning-soft flex items-center justify-center">
            <Clock className="w-5 h-5 text-warning-deep" />
          </div>
          <div>
            <p className="text-[11px] text-mute">Overtime Hours ({monthYear(month, year)})</p>
            <p className="text-[18px] font-semibold text-ink">{d.overtime_hours || 0} hrs</p>
          </div>
        </div>
        <div className="bg-white card-shadow rounded-md p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-error-soft flex items-center justify-center">
            <AlarmClock className="w-5 h-5 text-error" />
          </div>
          <div>
            <p className="text-[11px] text-mute">Late Marks ({monthYear(month, year)})</p>
            <p className="text-[18px] font-semibold text-ink">{d.late_marks || 0}</p>
          </div>
        </div>
        <div className="bg-white card-shadow rounded-md p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-error-soft flex items-center justify-center">
            <TrendingDown className="w-5 h-5 text-error" />
          </div>
          <div>
            <p className="text-[11px] text-mute">Attrition ({year})</p>
            <p className="text-[18px] font-semibold text-ink">{d.attrition_rate}%</p>
          </div>
        </div>
      </div>

      {/* Pending Information */}
      <div className="bg-white card-shadow rounded-md p-4 mb-6 border-l-2 border-l-error">
        <div className="flex items-center justify-between mb-3">
          <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-ink"><AlertTriangle className="w-4 h-4 text-error" /> Pending Information</h3>
          {(d.pending_info || []).length > 0 && <span className="text-[11px] text-error font-medium">{(d.pending_info || []).length} employee(s)</span>}
        </div>
        {(d.pending_info || []).length === 0 ? (
          <p className="text-[12px] text-mute">No pending information — all employee records complete.</p>
        ) : (
          <div className="max-h-[260px] overflow-y-auto">
            <table className="w-full text-[12px]">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-mute border-b border-hairline">
                  <th className="py-2 font-medium">Employee</th>
                  <th className="py-2 font-medium">Missing</th>
                  <th className="py-2 font-medium text-right" />
                </tr>
              </thead>
              <tbody>
                {d.pending_info.map((row: any) => (
                  <tr key={row.id} className="border-b border-hairline last:border-0">
                    <td className="py-2">
                      <span className="font-medium text-ink">{fullName(row.first_name, row.last_name)}</span>
                      <span className="text-[11px] text-mute block">{row.employee_code}{row.designation ? ` · ${row.designation}` : ''}</span>
                    </td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-1">
                        {(row.missing || []).map((k: string) => (
                          <button
                            key={k}
                            onClick={() => navigate(`/employees?focus=${row.id}&field=${k}`)}
                            title="Click to update"
                            className="px-1.5 py-0.5 text-[11px] rounded-sm bg-error-soft text-error font-medium hover:underline cursor-pointer"
                          >
                            {PENDING_LABELS[k] || k}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="py-2 text-right">
                      <button onClick={() => navigate(`/employees?focus=${row.id}`)} className="text-[11px] text-link hover:underline cursor-pointer">Update →</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Attendance Trend */}
        <div className="lg:col-span-2 bg-white card-shadow rounded-md p-4">
          <h3 className="text-[13px] font-semibold text-ink mb-3">Attendance Trend</h3>
          {attTrend.length === 0 ? <p className="text-[12px] text-mute text-center py-8">No data available</p> : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={attTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f2" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#888' }} />
                <YAxis tick={{ fontSize: 11, fill: '#888' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e2e8f2' }} />
                <Line type="monotone" dataKey="present" stroke="#16a34a" strokeWidth={2} name="Present" dot={false} />
                <Line type="monotone" dataKey="absent" stroke="#dc2626" strokeWidth={2} name="Absent" dot={false} />
                <Line type="monotone" dataKey="ot" stroke="#d99e00" strokeWidth={2} name="OT" dot={false} />
                <Line type="monotone" dataKey="paid_leave" stroke="#1c56a8" strokeWidth={2} name="Leave" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Department Manpower */}
        <div className="bg-white card-shadow rounded-md p-4">
          <h3 className="text-[13px] font-semibold text-ink mb-3">Department Manpower</h3>
          {(d.department_manpower || []).length === 0 ? <p className="text-[12px] text-mute text-center py-8">No data</p> : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={d.department_manpower}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={40}
                  paddingAngle={2}
                >
                  {(d.department_manpower || []).map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e2e8f2' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 justify-center">
            {(d.department_manpower || []).map((c: any, i: number) => (
              <span key={c.name} className="text-[10px] text-body flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                {c.name} ({c.value})
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Department Bar Chart */}
        <div className="bg-white card-shadow rounded-md p-4">
          <h3 className="text-[13px] font-semibold text-ink mb-3">Department-wise Headcount</h3>
          {(d.department_manpower || []).length === 0 ? <p className="text-[12px] text-mute text-center py-8">No data</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={(d.department_manpower || []).map((r: any) => ({ ...r, name: r.name?.length > 16 ? r.name.slice(0, 14) + '..' : r.name }))}
                layout="vertical"
                margin={{ left: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f2" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#888' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#33415c' }} width={100} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e2e8f2' }} />
                <Bar dataKey="value" fill="#011b3f" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Salary Cost Trend */}
        <div className="bg-white card-shadow rounded-md p-4">
          <h3 className="text-[13px] font-semibold text-ink mb-3">Salary Cost Trend</h3>
          {salaryTrend.length === 0 ? <p className="text-[12px] text-mute text-center py-8">No data</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={salaryTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f2" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#888' }} />
                <YAxis tick={{ fontSize: 11, fill: '#888' }} tickFormatter={(v: number) => `${(v / 100000).toFixed(1)}L`} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e2e8f2' }} formatter={(v: number) => [formatRupees(v), 'Net Pay']} />
                <Bar dataKey="net_total" fill="#16a34a" radius={[4, 4, 0, 0]} name="Net Pay" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-white card-shadow rounded-md p-4">
        <h3 className="text-[13px] font-semibold text-ink mb-3">Workforce Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {[
            { label: 'Active Employees', value: d.employees },
            { label: 'Present (Month)', value: d.present_subtotal },
            { label: 'Absent (Month)', value: d.absent_subtotal },
            { label: 'On Leave Today', value: d.on_leave },
            { label: 'Late Marks (Month)', value: d.late_marks },
            { label: 'New Joinings (Month)', value: d.new_joinings },
            { label: 'Exits (Month)', value: d.resignations },
            { label: 'Payroll Cost', value: formatRupees(d.salary_cost) },
            { label: 'Attrition (Year)', value: `${d.attrition_rate}%` },
          ].map((s, i) => (
            <div key={i} className="p-3 bg-canvas-soft rounded-sm">
              <p className="text-[11px] text-mute mb-1">{s.label}</p>
              <p className="text-[16px] font-semibold text-ink">{s.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function KPICard({ icon: Icon, label, value, color, sub }: { icon: any; label: string; value: number | string; color?: string; sub?: string }) {
  return (
    <div className="bg-white card-shadow rounded-md p-4 flex flex-col items-center text-center">
      <div className={`w-9 h-9 rounded-md ${color || 'bg-canvas-soft'} flex items-center justify-center mb-2`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <p className="text-[20px] font-semibold text-ink">{value}</p>
      <p className="text-[11px] text-mute">{label}</p>
      {sub && <p className="text-[10px] text-mute">{sub}</p>}
    </div>
  )
}

function formatRupees(v: number): string {
  if (!v) return '₹0'
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`
  if (v >= 100000) return `₹${(v / 100000).toFixed(2)} L`
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`
  return `₹${v.toLocaleString('en-IN')}`
}
