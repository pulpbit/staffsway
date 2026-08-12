import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/services/api'
import { StatCard } from '@/components/ui/data'
import { LoadingState, PageError } from '@/components/ui/state'
import { Badge } from '@/components/ui/data'
import { money, monthYear, fullName, statusLabel, statusColor } from '@/utils/format'
import { Users, Building2, MapPin, CalendarCheck, IndianRupee, Clock, TrendingUp, UserCheck } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { useNavigate } from 'react-router-dom'

const COLORS = ['#171717', '#4d4d4d', '#888888', '#a1a1a1', '#0070f3', '#16a34a', '#f5a623', '#ee0000', '#7928ca']

export default function DashboardPage() {
  const nav = useNavigate()
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['dashboard'], queryFn: () => dashboardApi.get() })

  if (isLoading) return <LoadingState message="Loading dashboard..." />
  if (error) return <PageError onRetry={() => refetch()} />

  const kpi: any = data?.data.kpi || {}
  const totals: any = data?.data.totals || {}
  const charts: any = data?.data.charts || {}

  const recentEmployees = (data?.data.recent_employees || []) as any[]
  const recentPayroll = (data?.data.recent_payroll || []) as any[]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold text-ink tracking-[-0.03em]">Dashboard</h1>
          <p className="text-[13px] text-body mt-0.5">
            {monthYear(kpi.month as number, kpi.year as number)} — Overview
          </p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard icon={Users} label="Total Employees" value={kpi.employees as number} />
        <StatCard icon={UserCheck} label="Active" value={kpi.active_employees as number} sub={`${kpi.inactive_employees} inactive`} />
        <StatCard icon={Building2} label="Clients" value={`${kpi.clients} / ${kpi.sites}`} sub="clients / sites" />
        <StatCard icon={CalendarCheck} label="Present Days" value={kpi.present_days as number} sub={`${kpi.ot_hours} OT hr`} />
        <StatCard icon={Clock} label="OT Hours" value={`${kpi.ot_hours || 0} hr`} sub={`${kpi.absent_days} absent`} />
        <StatCard
          icon={IndianRupee}
          label="Current Payroll"
          value={kpi.payroll ? money(kpi.payroll.net_total as number) : '—'}
          sub={kpi.payroll ? `${kpi.payroll.status}` : 'Not generated'}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 bg-white card-shadow rounded-md p-4">
          <h3 className="text-[13px] font-semibold text-ink mb-3">Attendance Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={(charts.attendance_trend || []).map((r: any) => ({ ...r, label: `${r.year}-${r.month}` }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ebebeb" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#888' }} />
              <YAxis tick={{ fontSize: 11, fill: '#888' }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #ebebeb' }} />
              <Line type="monotone" dataKey="present" stroke="#16a34a" strokeWidth={2} name="Present" />
              <Line type="monotone" dataKey="absent" stroke="#ee0000" strokeWidth={2} name="Absent" />
              <Line type="monotone" dataKey="ot" stroke="#0070f3" strokeWidth={2} name="OT" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white card-shadow rounded-md p-4">
          <h3 className="text-[13px] font-semibold text-ink mb-3">Employees by Client</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={(charts.employees_by_client || [])} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                {(charts.employees_by_client || []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #ebebeb' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {(charts.employees_by_client || []).map((c: any, i: number) => (
              <span key={c.name} className="text-[11px] text-body flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: COLORS[i % COLORS.length] }} />
                {c.name} ({c.value})
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Designations */}
        <div className="bg-white card-shadow rounded-md p-4">
          <h3 className="text-[13px] font-semibold text-ink mb-3">Top Designations</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={(charts.employees_by_designation || []).map((r: any) => ({ ...r, name: r.name?.length > 18 ? r.name.slice(0, 16) + '..' : r.name }))} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ebebeb" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#888' }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#4d4d4d' }} width={120} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #ebebeb' }} />
              <Bar dataKey="value" fill="#171717" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent payroll */}
        <div className="bg-white card-shadow rounded-md p-4">
          <h3 className="text-[13px] font-semibold text-ink mb-3">Payroll History</h3>
          <div className="space-y-0">
            {recentPayroll.length === 0 ? (
              <p className="text-[13px] text-mute py-4 text-center">No payroll records yet.</p>
            ) : (
              recentPayroll.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-hairline last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] font-medium text-ink">{monthYear(p.month, p.year)}</span>
                    <Badge className={statusColor(p.status)}>{statusLabel(p.status)}</Badge>
                  </div>
                  <span className="text-[13px] font-medium text-ink">{money(p.net_total || 0)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Employees */}
      <div className="bg-white card-shadow rounded-md p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-semibold text-ink">Recent Employees</h3>
          <button onClick={() => nav('/employees')} className="text-[12px] font-medium text-link hover:text-link-deep transition-colors">View all</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
          {recentEmployees.map((e: any) => (
            <div key={e.id} className="flex items-center gap-2.5 p-2 rounded-sm hover:bg-canvas-soft transition-colors cursor-pointer" onClick={() => nav(`/employees`)}>
              <div className="w-8 h-8 rounded-full bg-canvas-soft-2 flex items-center justify-center text-[12px] font-semibold text-ink shrink-0">{e.first_name?.charAt(0)}{e.last_name?.charAt(0)}</div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-ink truncate">{fullName(e.first_name, e.last_name)}</p>
                <p className="text-[11px] text-mute truncate">{e.designation}{e.site_name ? ` — ${e.site_name}` : ''}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
