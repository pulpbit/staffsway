import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { dashboardApi } from '@/services/api'
import { PageHeader, SectionCard, Metric } from '@/components/ui/layout'
import { StatCard } from '@/components/ui/data'
import { NativeSelect } from '@/components/ui/actions'
import { StatusBadge } from '@/components/ui/status'
import { Users, UserCheck, UserX, CalendarDays, UserPlus, UserMinus, IndianRupee, Clock, TrendingDown, AlarmClock, AlertTriangle, BarChart3 } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { monthYear, fullName } from '@/utils/format'
import { PENDING_LABELS } from '@/utils/pending'

const COLORS = ['#011b3f', '#0a2f66', '#1c56a8', '#7fa3d8', '#fcbd03', '#d99e00', '#16a34a', '#e2e8f2']

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const monthLabel = (m: number, y: number) => `${MONTHS[m - 1] || m} ${y}`
const TOOLTIP_STYLE = { fontSize: 12, borderRadius: 6, border: '1px solid #e2e8f2' }

function formatRupees(v: number): string {
  if (!v) return '₹0'
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`
  if (v >= 100000) return `₹${(v / 100000).toFixed(2)} L`
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`
  return `₹${v.toLocaleString('en-IN')}`
}

export default function ManagementDashboardPage() {
  const navigate = useNavigate()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['mgmt-dashboard', month, year], queryFn: () => dashboardApi.management(month, year) })

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Workforce overview & analytics" />
        <div className="animate-pulse">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-24 bg-canvas-soft-2 rounded-md" />)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-20 bg-canvas-soft-2 rounded-md" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="lg:col-span-2 h-72 bg-canvas-soft-2 rounded-md" />
            <div className="h-72 bg-canvas-soft-2 rounded-md" />
          </div>
        </div>
      </div>
    )
  }
  if (error) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Workforce overview & analytics" />
        <div className="bg-white rounded-md card-shadow p-10 text-center">
          <p className="text-[13px] text-error mb-3">Couldn't load dashboard data.</p>
          <button onClick={() => refetch()} className="h-9 px-4 rounded-sm bg-navy text-white text-[12px] font-medium hover:opacity-90 transition-opacity cursor-pointer">Retry</button>
        </div>
      </div>
    )
  }

  const d = data?.data as any
  if (!d) return null

  const attTrend = (d.attendance_trend || []).map((r: any) => ({ ...r, label: monthLabel(r.month, r.year) }))
  const salaryTrend = (d.salary_cost_trend || []).map((r: any) => ({ ...r, label: monthLabel(r.month, r.year) })).reverse()
  const pending = d.pending_info || []
  const dept = d.department_manpower || []

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Workforce overview & analytics — ${monthYear(month, year)}`}
        actions={
          <>
            <NativeSelect
              className="w-40"
              value={String(month)}
              onChange={(v) => setMonth(Number(v))}
              options={Array.from({ length: 12 }, (_, i) => i + 1).map((m) => ({ value: String(m), label: new Date(2000, m - 1).toLocaleDateString('en-US', { month: 'long' }) }))}
            />
            <NativeSelect
              className="w-24"
              value={String(year)}
              onChange={(v) => setYear(Number(v))}
              options={['2024', '2025', '2026', '2027'].map((y) => ({ value: y, label: y }))}
            />
          </>
        }
      />

      {/* KPI row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
        <StatCard icon={Users} label="Active Employees" value={d.employees} tone="primary" />
        <StatCard icon={UserCheck} label="Present (Month)" value={d.present_subtotal} tone="success" sub={`${d.enrolled} in payroll`} />
        <StatCard icon={UserX} label="Absent (Month)" value={d.absent_subtotal} tone="danger" />
        <StatCard icon={CalendarDays} label="On Leave Today" value={d.on_leave} tone="warning" />
        <StatCard icon={UserPlus} label="New Joinings" value={d.new_joinings} tone="info" sub="this month" />
        <StatCard icon={UserMinus} label="Exits" value={d.resignations} tone="danger" sub="this month" />
      </div>

      {/* KPI row 2 */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={IndianRupee} label={`Payroll Cost · ${monthYear(month, year)}`} value={formatRupees(d.salary_cost)} tone="success" />
        <StatCard icon={Clock} label={`Overtime Hours · ${monthYear(month, year)}`} value={`${d.overtime_hours || 0} hrs`} tone="warning" />
        <StatCard icon={AlarmClock} label={`Late Marks · ${monthYear(month, year)}`} value={d.late_marks || 0} tone="warning" />
        <StatCard icon={TrendingDown} label={`Attrition (YTD ${year})`} value={`${d.attrition_rate}%`} tone="danger" />
      </div>

      {/* Pending information */}
      <SectionCard
        title="Pending Employee Information"
        subtitle="Click an item to open the employee record and fill it in"
        icon={AlertTriangle}
        className="mb-6"
        bodyClassName="p-0"
        action={
          pending.length > 0 ? (
            <span className="text-[11px] font-medium text-error">{pending.length} employee{pending.length > 1 ? 's' : ''}</span>
          ) : undefined
        }
      >
        {pending.length === 0 ? (
          <p className="text-[12px] text-mute text-center py-8">No pending information — all employee records complete.</p>
        ) : (
          <div className="max-h-[300px] overflow-y-auto scrollbar-thin">
            <table className="w-full min-w-160">
              <thead className="sticky top-0 bg-canvas-soft z-10">
                <tr className="text-left border-b border-hairline bg-canvas-soft/60">
                  <th className="px-4 py-2.5 text-[11px] font-medium font-mono text-mute uppercase tracking-[0.04em]">Employee</th>
                  <th className="px-4 py-2.5 text-[11px] font-medium font-mono text-mute uppercase tracking-[0.04em]">Missing</th>
                  <th className="px-4 py-2.5 text-[11px] font-medium font-mono text-mute uppercase tracking-[0.04em] text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((row: any) => (
                  <tr key={row.id} className="border-b border-hairline last:border-0 hover:bg-canvas-soft/40 transition-colors">
                    <td className="px-4 py-3">
                      <button onClick={() => navigate(`/employees?focus=${row.id}`)} className="text-left cursor-pointer group">
                        <span className="font-medium text-ink group-hover:underline">{fullName(row.first_name, row.last_name)}</span>
                        <span className="text-[11px] text-mute block font-mono">{row.employee_code}{row.designation ? ` · ${row.designation}` : ''}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {(row.missing || []).map((k: string) => (
                          <button
                            key={k}
                            onClick={() => navigate(`/employees?focus=${row.id}&field=${k}`)}
                            title="Click to update"
                            className="px-2 py-0.5 text-[11px] rounded-sm bg-error-soft text-error-deep font-medium hover:underline cursor-pointer"
                          >
                            {PENDING_LABELS[k] || k}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <StatusBadge status={row.status} dot={false} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <SectionCard title="Attendance Trend" subtitle="Present, absent, overtime & paid leave per month" className="lg:col-span-2" icon={UserCheck} bodyClassName="p-4">
          {attTrend.length === 0 ? (
            <p className="text-[12px] text-mute text-center py-10">No attendance data available for this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={attTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f2" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8896ab' }} />
                <YAxis tick={{ fontSize: 11, fill: '#8896ab' }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="present" stroke="#16a34a" strokeWidth={2} name="Present" dot={false} />
                <Line type="monotone" dataKey="absent" stroke="#dc2626" strokeWidth={2} name="Absent" dot={false} />
                <Line type="monotone" dataKey="ot" stroke="#d99e00" strokeWidth={2} name="Overtime" dot={false} />
                <Line type="monotone" dataKey="paid_leave" stroke="#1c56a8" strokeWidth={2} name="Paid Leave" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard title="Department Manpower" subtitle="Current headcount by department" className="lg:col-span-1" icon={Users} bodyClassName="p-4">
          {dept.length === 0 ? (
            <p className="text-[12px] text-mute text-center py-10">No department data available.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={dept} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={78} innerRadius={42} paddingAngle={2}>
                    {dept.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 justify-center">
                {dept.map((c: any, i: number) => (
                  <span key={c.name} className="text-[11px] text-body flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    {c.name}
                    <span className="font-mono text-mute">{c.value}</span>
                  </span>
                ))}
              </div>
            </>
          )}
        </SectionCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <SectionCard title="Department-wise Headcount" subtitle="Workforce distribution across departments" icon={BarChart3} bodyClassName="p-4">
          {dept.length === 0 ? (
            <p className="text-[12px] text-mute text-center py-10">No department data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={dept.map((r: any) => ({ ...r, name: r.name?.length > 16 ? r.name.slice(0, 14) + '..' : r.name }))} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f2" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#8896ab' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#33415c' }} width={100} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="value" fill="#011b3f" radius={[0, 4, 4, 0]} name="Headcount" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard title="Salary Cost Trend" subtitle="Net payroll per month" icon={IndianRupee} bodyClassName="p-4">
          {salaryTrend.length === 0 ? (
            <p className="text-[12px] text-mute text-center py-10">No payroll data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={salaryTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f2" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8896ab' }} />
                <YAxis tick={{ fontSize: 11, fill: '#8896ab' }} tickFormatter={(v: number) => `${(v / 100000).toFixed(1)}L`} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [formatRupees(v), 'Net Pay']} />
                <Bar dataKey="net_total" fill="#16a34a" radius={[4, 4, 0, 0]} name="Net Pay" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      {/* Workforce summary */}
      <SectionCard title="Workforce Summary" subtitle="Month snapshot" icon={CalendarDays} bodyClassName="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <Metric label="Active Employees" value={d.employees} />
          <Metric label="Present (Month)" value={d.present_subtotal} />
          <Metric label="Absent (Month)" value={d.absent_subtotal} />
          <Metric label="On Leave Today" value={d.on_leave} />
          <Metric label="Late Marks (Month)" value={d.late_marks} />
          <Metric label="New Joinings (Month)" value={d.new_joinings} />
          <Metric label="Exits (Month)" value={d.resignations} />
          <Metric label="Payroll Cost" value={formatRupees(d.salary_cost)} hint={monthYear(month, year)} />
          <Metric label="Attrition (YTD)" value={`${d.attrition_rate}%`} hint={`${year}`} />
          <Metric label="Overtime Hours" value={`${d.overtime_hours || 0} hrs`} hint={monthYear(month, year)} />
        </div>
      </SectionCard>
    </div>
  )
}