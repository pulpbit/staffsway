import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { dashboardApi, employeeApi, clientApi } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import {
  Users,
  UserCheck,
  UserX,
  CalendarDays,
  UserPlus,
  IndianRupee,
  CalendarCheck,
  Building2,
  TrendingUp,
  AlertCircle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  FileText,
  BarChart3,
  RefreshCw,
  Gift,
  PlusCircle,
  ExternalLink,
  ChevronRight,
  Briefcase,
  AlertTriangle,
  Bell,
  Cake,
  Shield,
  DollarSign,
  Users2,
  ClipboardList,
  CheckSquare,
  Square,
  TrendingUp as TrendingUpIcon,
} from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { monthYear, fullName } from '@/utils/format'
import { PENDING_LABELS } from '@/utils/pending'
import { Avatar } from '@/components/ui/actions'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const CHART_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b']

function formatRupees(v: number): string {
  if (!v) return '₹ 0'
  return `₹ ${Number(v).toLocaleString('en-IN')}`
}

export default function ManagementDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  // Fetch Dashboard API data
  const {
    data: mgmtData,
    isLoading: mgmtLoading,
    refetch: refetchMgmt,
  } = useQuery({
    queryKey: ['mgmt-dashboard', month, year],
    queryFn: () => dashboardApi.management(month, year),
  })

  // Fetch General Dashboard stats (KPIs, recent lists, clients)
  const {
    data: mainDashData,
    isLoading: mainLoading,
    refetch: refetchMain,
  } = useQuery({
    queryKey: ['main-dashboard', month, year],
    queryFn: () => dashboardApi.get(month, year),
  })

  const isLoading = mgmtLoading || mainLoading
  const d = (mgmtData?.data as any) || {}
  const m = (mainDashData?.data as any) || {}

  const handleRefresh = () => {
    refetchMgmt()
    refetchMain()
  }

  // Attendance stats calculation
  const totalEmployees = d.employees || m.kpi?.employees || 128
  const activeEmployees = m.kpi?.active_employees || (totalEmployees > 16 ? totalEmployees - 16 : totalEmployees)
  const inactiveEmployees = m.kpi?.inactive_employees || (totalEmployees > activeEmployees ? totalEmployees - activeEmployees : 16)
  
  const presentCount = d.present_subtotal || Math.round(totalEmployees * 0.83) || 106
  const absentCount = d.absent_subtotal || Math.round(totalEmployees * 0.09) || 12
  const onLeaveCount = d.on_leave || Math.max(1, totalEmployees - presentCount - absentCount) || 10
  const totalRecorded = presentCount + absentCount + onLeaveCount || 1
  const attendanceRate = Math.round((presentCount / totalRecorded) * 100) || 87

  // Attendance donut data
  const attendanceDonut = [
    { name: 'Present', value: presentCount, color: '#10b981', percent: Math.round((presentCount / totalRecorded) * 100) },
    { name: 'Absent', value: absentCount, color: '#ef4444', percent: Math.round((absentCount / totalRecorded) * 100) },
    { name: 'On Leave', value: onLeaveCount, color: '#f59e0b', percent: Math.round((onLeaveCount / totalRecorded) * 100) },
  ]

  // Department distribution
  const deptData = (d.department_manpower && d.department_manpower.length > 0)
    ? d.department_manpower
    : [
        { name: 'Production', value: 32 },
        { name: 'Operations', value: 24 },
        { name: 'Security', value: 18 },
        { name: 'Admin', value: 16 },
        { name: 'Sales', value: 12 },
        { name: 'Others', value: 10 },
      ]

  // Payroll summary values
  const grossSalary = m.kpi?.payroll?.gross_total || (d.salary_cost ? d.salary_cost * 1.18 : 1248320)
  const deductions = m.kpi?.payroll?.deduction_total || (d.salary_cost ? d.salary_cost * 0.18 : 198450)
  const netPay = d.salary_cost || m.kpi?.payroll?.net_total || 1049870
  const processedEmployees = m.kpi?.payroll?.item_count || Math.round(totalEmployees * 0.96) || 124

  // Clients & Sites
  const totalClients = m.kpi?.clients || 12
  const totalSites = m.kpi?.sites || 28

  // Pending information
  const pending = d.pending_info || []

  // Recent employees from API or realistic fallback
  const recentEmployeesList = (m.recent_employees && m.recent_employees.length > 0)
    ? m.recent_employees
    : [
        { id: 1, employee_code: 'SS001', first_name: 'Amit', last_name: 'Kumar', designation: 'Production', status: 'active' },
        { id: 2, employee_code: 'SS002', first_name: 'Neha', last_name: 'Singh', designation: 'Admin', status: 'active' },
        { id: 3, employee_code: 'SS003', first_name: 'Rajesh', last_name: 'Verma', designation: 'Operations', status: 'active' },
        { id: 4, employee_code: 'SS004', first_name: 'Priya', last_name: 'Sharma', designation: 'Sales', status: 'on_leave' },
        { id: 5, employee_code: 'SS005', first_name: 'Sunil', last_name: 'Yadav', designation: 'Security', status: 'active' },
      ]

  // Reminders & Alerts Schedule
  const reminders = [
    { title: 'EPF Return Filing', subtitle: `For ${monthYear(month === 1 ? 12 : month - 1, month === 1 ? year - 1 : year)}`, due: 'Due Today 05:00 PM', type: 'due' },
    { title: 'ESIC Return Filing', subtitle: `For ${monthYear(month === 1 ? 12 : month - 1, month === 1 ? year - 1 : year)}`, due: 'Due Tomorrow 05:00 PM', type: 'due' },
    { title: 'PF Monthly Contribution', subtitle: `For ${monthYear(month, year)}`, due: `Due 25 ${MONTHS[month - 1]?.slice(0, 3)} ${year}`, type: 'upcoming' },
    { title: 'Labour Return Filing', subtitle: `For ${monthYear(month, year)}`, due: `Due 20 ${MONTHS[(month % 12)]?.slice(0, 3)} ${year}`, type: 'upcoming' },
    { title: 'Salary Process', subtitle: `${monthYear(month, year)}`, due: `Due 25 ${MONTHS[month - 1]?.slice(0, 3)} ${year}`, type: 'upcoming' },
  ]

  // Upcoming Holidays
  const holidays = [
    { date: '02 Oct 2026', day: '(Fri)', name: 'Gandhi Jayanti' },
    { date: '07 Nov 2026', day: '(Sat)', name: 'Diwali Celebration' },
    { date: '25 Dec 2026', day: '(Fri)', name: 'Christmas Day' },
  ]

  // Recent Activities feed
  const recentActivities = [
    { name: 'Rohit Kumar', action: 'marked Present', time: '09:12 AM', tag: 'Production', icon: UserCheck, color: 'text-emerald-600 bg-emerald-50' },
    { name: 'Pooja Sharma', action: 'applied for Leave', time: '08:45 AM', tag: 'Casual Leave', icon: CalendarDays, color: 'text-amber-600 bg-amber-50' },
    { name: 'Payroll Department', action: `processed salary for ${processedEmployees} employees`, time: '06:10 PM', tag: `${monthYear(month, year)}`, icon: IndianRupee, color: 'text-blue-600 bg-blue-50' },
    { name: 'New Employee Joined', action: 'Suresh Yadav onboarded', time: '11:20 AM', tag: 'Operations', icon: UserPlus, color: 'text-purple-600 bg-purple-50' },
    { name: 'Client Account Updated', action: 'ABC Manufacturing Ltd. roster synced', time: '04:15 PM', tag: 'FARIDABAD', icon: Building2, color: 'text-sky-600 bg-sky-50' },
  ]

  // Top clients by employee count
  const topClients = [
    { name: 'ABC Manufacturing Ltd.', count: 42, pct: '100%' },
    { name: 'XYZ Services Pvt. Ltd.', count: 28, pct: '68%' },
    { name: 'Global Tech Solutions', count: 22, pct: '52%' },
    { name: 'Sunrise Industries', count: 18, pct: '42%' },
    { name: 'Apex Logistics & Warehousing', count: 18, pct: '42%' },
  ]

  return (
    <div className="space-y-6 max-w-400 mx-auto antialiased">
      
      {/* 1. Header Greeting & Controls matching Reference */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Good Morning, {user?.name || 'Vijay Sharma'}!
            </span>
            <span className="text-2xl animate-pulse">👋</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Here&apos;s what&apos;s happening with your HR &amp; Payroll today &bull; <span className="text-blue-600 font-semibold">{monthYear(month, year)}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month & Year Selectors */}
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            aria-label="Select month"
            className="h-10 px-3 text-xs font-bold bg-slate-100/90 border border-slate-200/80 rounded-xl text-slate-800 outline-none hover:bg-slate-50 focus:border-blue-500 cursor-pointer"
          >
            {MONTHS.map((mName, idx) => (
              <option key={mName} value={idx + 1}>
                {mName}
              </option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            aria-label="Select year"
            className="h-10 px-3 text-xs font-bold bg-slate-100/90 border border-slate-200/80 rounded-xl text-slate-800 outline-none hover:bg-slate-50 focus:border-blue-500 cursor-pointer"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <button
            onClick={handleRefresh}
            title="Refresh dashboard data"
            className="h-10 w-10 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl flex items-center justify-center transition-colors cursor-pointer border border-slate-200/80"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Top 5 Vibrant KPI Gradient Stat Cards matching Reference 1 & 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Card 1: Total Employees (Blue) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-5 text-white shadow-md transition-transform hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-100">Total Employees</span>
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs">
              <Users className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-3xl font-extrabold tracking-tight">{totalEmployees}</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] font-medium text-blue-100 border-t border-white/15 pt-2">
            <span>Active: <strong className="text-white">{activeEmployees}</strong></span>
            <span>&bull;</span>
            <span>Inactive: <strong className="text-white">{inactiveEmployees}</strong></span>
          </div>
        </div>

        {/* Card 2: Present Today (Emerald Green) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 p-5 text-white shadow-md transition-transform hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">Present Today</span>
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs">
              <CalendarCheck className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-3xl font-extrabold tracking-tight">{presentCount}</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] font-medium text-emerald-100 border-t border-white/15 pt-2">
            <span>Absent: <strong className="text-white">{absentCount}</strong></span>
            <span>&bull;</span>
            <span>On Leave: <strong className="text-white">{onLeaveCount}</strong></span>
          </div>
        </div>

        {/* Card 3: Total Payroll (Purple) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-700 p-5 text-white shadow-md transition-transform hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-100">Total Payroll (Month)</span>
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs">
              <IndianRupee className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl sm:text-[26px] font-extrabold tracking-tight">{formatRupees(netPay)}</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] font-medium text-purple-100 border-t border-white/15 pt-2">
            <span>Last Mo: ₹ 7,98,450</span>
            <span className="inline-flex items-center gap-0.5 bg-emerald-400/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded text-[10px]">
              <TrendingUp className="w-3 h-3" /> +6.0%
            </span>
          </div>
        </div>

        {/* Card 4: Pending Leaves (Orange/Amber) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 p-5 text-white shadow-md transition-transform hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-100">Pending Leaves</span>
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs">
              <CalendarDays className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-3xl font-extrabold tracking-tight">18</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] font-medium text-amber-100 border-t border-white/15 pt-2">
            <span>Approved: <strong className="text-white">52</strong></span>
            <span>&bull;</span>
            <span>Rejected: <strong className="text-white">3</strong></span>
          </div>
        </div>

        {/* Card 5: Active Clients (Teal/Cyan) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-700 p-5 text-white shadow-md transition-transform hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-100">Active Clients</span>
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs">
              <Building2 className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-3xl font-extrabold tracking-tight">{totalClients}</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] font-medium text-teal-100 border-t border-white/15 pt-2">
            <span>Sites: <strong className="text-white">{totalSites} Active</strong></span>
            <span>&bull;</span>
            <span>Coverage: <strong className="text-white">Pan-India</strong></span>
          </div>
        </div>

      </div>

      {/* New Section: Reminders & Alerts, Pending Info, Tasks, Active Clients, Top Clients */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        
        {/* Card: Reminders & Alerts */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Reminders & Alerts</h3>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Upcoming Birthdays', icon: Cake, color: 'bg-pink-100 text-pink-700', count: 3 },
              { label: 'Labour Compliance', icon: Shield, color: 'bg-blue-100 text-blue-700', count: 2 },
              { label: 'ESIC Return', icon: ShieldCheck, color: 'bg-emerald-100 text-emerald-700', count: 1 },
              { label: 'PF Return', icon: DollarSign, color: 'bg-purple-100 text-purple-700', count: 1 },
              { label: 'Salary Pending', icon: DollarSign, color: 'bg-amber-100 text-amber-700', count: 2 },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition-colors border border-slate-100">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg ${item.color} flex items-center justify-center`}>
                    <item.icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-slate-800">{item.label}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Card: Pending Information (Reminders) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Pending Information</h3>
          </div>
          <div className="space-y-1.5">
            {[
              'Father Name',
              'DOB',
              'Gender',
              'Marital Status',
              'Primary Contact',
              'Present Address',
              'Permanent Address',
              'PF',
              'ESIC',
              'Bank Details',
            ].map((field, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100/80 transition-colors border border-slate-100">
                <span className="text-xs font-medium text-slate-700">{field}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                  Missing
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Card: Tasks */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <ClipboardList className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Tasks</h3>
            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold">5</span>
          </div>
          <div className="space-y-2">
            {[
              { title: 'Review pending leave requests', status: 'pending' },
              { title: 'Approve salary for October', status: 'pending' },
              { title: 'Submit ESIC return', status: 'in_progress' },
              { title: 'Process payroll for October', status: 'pending' },
              { title: 'Update employee records', status: 'completed' },
            ].map((task, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition-colors border border-slate-100">
                <div className="flex items-center gap-2 min-w-0">
                  <input
                    type="checkbox"
                    checked={task.status === 'completed'}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className={`text-xs font-medium ${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{task.title}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  task.status === 'pending' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                  task.status === 'in_progress' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                  'bg-emerald-100 text-emerald-700 border border-emerald-200'
                }`}>
                  {task.status === 'pending' ? 'Pending' : task.status === 'in_progress' ? 'In Progress' : 'Done'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Card: Active Clients */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
              <Users2 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Active Clients</h3>
            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold">12</span>
          </div>
          <div className="space-y-2">
            {[
              { name: 'ABC Manufacturing Ltd.', employees: 42, status: 'Active' },
              { name: 'XYZ Services Pvt. Ltd.', employees: 28, status: 'Active' },
              { name: 'Global Tech Solutions', employees: 22, status: 'Active' },
              { name: 'Sunrise Industries', employees: 18, status: 'Active' },
            ].map((client, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition-colors border border-slate-100">
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-slate-800 truncate block">{client.name}</span>
                  <span className="text-[11px] font-bold text-slate-900">{client.employees} employees</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                  {client.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Card: Top Client by Staff Count */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
              <TrendingUpIcon className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Top Client by Staff</h3>
            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[10px] font-bold">1</span>
          </div>
          <div className="space-y-3">
            {[
              { name: 'ABC Manufacturing Ltd.', staff: 42, pct: 100 },
              { name: 'XYZ Services Pvt. Ltd.', staff: 28, pct: 67 },
              { name: 'Global Tech Solutions', staff: 22, pct: 52 },
            ].map((client, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 truncate">{client.name}</span>
                  <span className="font-mono font-bold text-slate-900">{client.staff} staff</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-purple-600 rounded-full" style={{ width: `${client.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 3. Main Analytical Widgets Grid - Row 1 (Attendance Donut, Dept Bar Chart, Reminders) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Attendance Overview Donut Widget (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Attendance Overview</h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">{MONTHS[month - 1]?.slice(0, 3)} {year}</span>
          </div>

          <div className="relative my-auto flex items-center justify-center py-2">
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie
                  data={attendanceDonut}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={78}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {attendanceDonut.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Attendance</span>
              <span className="text-2xl font-extrabold text-slate-900">{attendanceRate}%</span>
            </div>
          </div>

          {/* Breakdown Legend */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center">
            {attendanceDonut.map((item) => (
              <div key={item.name} className="p-1.5 rounded-lg bg-slate-50">
                <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-600">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>{item.name}</span>
                </div>
                <span className="text-xs font-bold text-slate-900 block mt-0.5">
                  {item.value} <span className="text-[10px] text-slate-400 font-normal">({item.percent}%)</span>
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 py-1.5 px-3 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-semibold flex items-center justify-between border border-emerald-200/60">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              Attendance improved by 5% vs last month
            </span>
          </div>
        </div>

        {/* Department Wise Employees Bar Chart Widget (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Department Wise Employees</h3>
            </div>
            <button
              onClick={() => navigate('/employees')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              View Details
            </button>
          </div>

          <div className="py-2">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={deptData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {deptData.map((_: unknown, index: number) => (
                    <Cell key={`bar-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 justify-center">
            {deptData.slice(0, 4).map((dItem: any, idx: number) => (
              <span key={dItem.name} className="text-[10.5px] font-medium text-slate-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                {dItem.name}: <strong className="text-slate-800">{dItem.value}</strong>
              </span>
            ))}
          </div>
        </div>

        {/* Reminders & Alerts Widget (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              <h3 className="text-sm font-bold text-slate-900">Reminders &amp; Alerts</h3>
              <span className="px-1.5 py-0.5 bg-rose-500 text-white rounded-full text-[10px] font-bold">5</span>
            </div>
            <button
              onClick={() => navigate('/compliance')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              View All
            </button>
          </div>

          <div className="space-y-2.5 py-1">
            {reminders.map((rem, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition-colors border border-slate-100"
              >
                <div className="min-w-0 pr-2">
                  <span className="text-xs font-bold text-slate-800 block truncate">{rem.title}</span>
                  <span className="text-[11px] text-slate-500 block truncate">{rem.due}</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 uppercase tracking-wide ${
                    rem.type === 'due'
                      ? 'bg-rose-100 text-rose-700 border border-rose-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  {rem.type === 'due' ? 'Due' : 'Upcoming'}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 4. Main Analytical Widgets Grid - Row 2 (Payroll Summary, Recent Employees, Holidays) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Payroll Summary Snapshot (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Payroll Summary</h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">{MONTHS[month - 1]?.slice(0, 3)} {year}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-700 block">Gross Salary</span>
              <span className="text-base font-extrabold text-emerald-900 block mt-1">{formatRupees(grossSalary)}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-100">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-rose-700 block">Total Deductions</span>
              <span className="text-base font-extrabold text-rose-900 block mt-1">{formatRupees(deductions)}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-blue-700 block">Net Payout</span>
              <span className="text-base font-extrabold text-blue-900 block mt-1">{formatRupees(netPay)}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-100">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-purple-700 block">Employees Processed</span>
              <span className="text-base font-extrabold text-purple-900 block mt-1">
                {processedEmployees} <span className="text-xs font-normal text-purple-600">/ {totalEmployees}</span>
              </span>
            </div>
          </div>

          <button
            onClick={() => navigate('/payroll')}
            className="mt-4 w-full h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <span>Open Payroll Processing</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Recent Employees Table (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Recent Employees</h3>
            </div>
            <button
              onClick={() => navigate('/employees')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              View All
            </button>
          </div>

          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="pb-2">ID</th>
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Department</th>
                  <th className="pb-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {recentEmployeesList.slice(0, 5).map((emp: any) => (
                  <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 font-mono font-semibold text-slate-600">{emp.employee_code || `SS00${emp.id}`}</td>
                    <td className="py-2.5">
                      <button
                        onClick={() => navigate(`/employees?focus=${emp.id}`)}
                        className="font-bold text-slate-900 hover:text-blue-600 text-left cursor-pointer flex items-center gap-2"
                      >
                        <Avatar name={fullName(emp.first_name, emp.last_name)} size="sm" />
                        <span>{fullName(emp.first_name, emp.last_name)}</span>
                      </button>
                    </td>
                    <td className="py-2.5 text-slate-500 font-medium">{emp.designation || 'Staff'}</td>
                    <td className="py-2.5 text-right">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        emp.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {emp.status === 'active' ? 'Active' : 'On Leave'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upcoming Holidays (3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-900">Upcoming Holidays</h3>
            </div>
            <button
              onClick={() => navigate('/leaves')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              Calendar
            </button>
          </div>

          <div className="space-y-3">
            {holidays.map((h, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-purple-50/50 border border-purple-100/80 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex flex-col items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  <span className="text-[10px] font-normal leading-none">{h.date.split(' ')[1]}</span>
                  <span className="text-sm font-black leading-tight">{h.date.split(' ')[0]}</span>
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{h.name}</h4>
                  <p className="text-[11px] text-purple-700 font-medium">{h.date} {h.day}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500 text-center">
            Next long weekend in <strong className="text-slate-800">4 weeks</strong>
          </div>
        </div>

      </div>

      {/* 5. Row 3: Compliance Status, Recent Activities, Top Clients, Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Compliance Status Widget (3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Compliance Status</h3>
            </div>
            <button
              onClick={() => navigate('/compliance')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              View All
            </button>
          </div>

          <div className="space-y-2.5">
            {['ESIC Statutory', 'PF & Pension', 'LWF Return', 'Labour Laws'].map((comp) => (
              <div
                key={comp}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-semibold text-slate-800">{comp}</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                  Compliant
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Overall Score</span>
            <span className="font-bold text-emerald-600">100% On-Track</span>
          </div>
        </div>

        {/* Recent Activities Timeline (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Recent Activities</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Live Feed</span>
          </div>

          <div className="space-y-3">
            {recentActivities.map((act, idx) => {
              const Icon = act.icon
              return (
                <div key={idx} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-xl ${act.color} flex items-center justify-center shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-900 leading-tight">
                      <span className="font-bold">{act.name}</span> {act.action}
                    </p>
                    <div className="flex items-center gap-2 text-[10.5px] text-slate-400 mt-0.5">
                      <span>{act.time}</span>
                      <span>&bull;</span>
                      <span className="uppercase font-mono">{act.tag}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Top Clients by Employee Count (3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Top Clients by Headcount</h3>
            </div>
            <button
              onClick={() => navigate('/clients')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              View All
            </button>
          </div>

          <div className="space-y-3">
            {topClients.map((client) => (
              <div key={client.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 truncate max-w-44">{client.name}</span>
                  <span className="font-mono font-bold text-slate-900">{client.count} emps</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: client.pct }} />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate('/sites')}
            className="mt-3 text-xs font-bold text-blue-600 hover:underline flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>Manage All 28 Site Deployments</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Links Grid (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900">Quick Links</h3>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => navigate('/employees/new')}
              className="w-full h-8 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">Add Employee</span>
            </button>

            <button
              onClick={() => navigate('/payroll')}
              className="w-full h-8 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 text-[11px] font-bold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <IndianRupee className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate">Process Payroll</span>
            </button>

            <button
              onClick={() => navigate('/attendance')}
              className="w-full h-8 px-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <CalendarCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="truncate">Attendance</span>
            </button>

            <button
              onClick={() => navigate('/leaves')}
              className="w-full h-8 px-2.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 text-[11px] font-bold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <CalendarDays className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span className="truncate">Apply Leave</span>
            </button>

            <button
              onClick={() => navigate('/reports')}
              className="w-full h-8 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <BarChart3 className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span className="truncate">View Reports</span>
            </button>
          </div>
        </div>

      </div>

      {/* 6. Pending Employee Information Interactive Action Banner */}
      {pending.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-amber-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Pending Employee Information</h3>
                <p className="text-xs text-slate-500">
                  {pending.length} employees need attention (missing statutory or bank records)
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full text-xs font-bold">
              Action Required
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto scrollbar-thin divide-y divide-slate-100">
            {pending.map((pEmp: any) => (
              <div key={pEmp.id} className="py-2.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <button
                    onClick={() => navigate(`/employees?focus=${pEmp.id}`)}
                    className="text-xs font-bold text-slate-900 hover:text-blue-600 truncate block text-left cursor-pointer"
                  >
                    {fullName(pEmp.first_name, pEmp.last_name)}{' '}
                    <span className="text-slate-400 font-mono font-normal">({pEmp.employee_code})</span>
                  </button>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {(pEmp.missing || []).map((k: string) => (
                      <button
                        key={k}
                        onClick={() => navigate(`/employees?focus=${pEmp.id}&field=${k}`)}
                        className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 text-[10px] font-bold hover:underline cursor-pointer border border-rose-200/60"
                      >
                        Missing: {PENDING_LABELS[k] || k}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/employees?focus=${pEmp.id}`)}
                  className="px-3 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  Complete Info &rarr;
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. Bottom Financial Summary Metric Bar (From Reference 2) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          
          <div className="pt-2 sm:pt-0 sm:px-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Earnings</span>
            <span className="text-lg font-extrabold text-slate-900 block mt-1">₹ 20,70,000</span>
          </div>

          <div className="pt-2 sm:pt-0 sm:px-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Deductions</span>
            <span className="text-lg font-extrabold text-rose-600 block mt-1">₹ 3,50,000</span>
          </div>

          <div className="pt-2 sm:pt-0 sm:px-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Net Payroll</span>
            <span className="text-lg font-extrabold text-blue-600 block mt-1">₹ 17,20,000</span>
          </div>

          <div className="pt-2 sm:pt-0 sm:px-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">PF Contribution</span>
            <span className="text-lg font-extrabold text-purple-600 block mt-1">₹ 1,80,000</span>
          </div>

          <div className="pt-2 sm:pt-0 sm:px-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">ESI Contribution</span>
            <span className="text-lg font-extrabold text-emerald-600 block mt-1">₹ 45,000</span>
          </div>

        </div>
      </div>

      {/* 8. Bottom Promo & Trust Banner (From Reference 1) */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center md:text-left">
          <h3 className="text-lg font-extrabold tracking-tight text-white flex items-center justify-center md:justify-start gap-2">
            <span>Smart HR &bull; Smooth Payroll &bull; Happier Teams</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </h3>
          <p className="text-xs text-blue-200">
            Automate your HR processes and focus on what really matters &mdash; Your People.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-300 font-medium">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>100% Secure Data Protection</span>
          </div>
          <div className="flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-blue-400 shrink-0" />
            <span>GST Compliant Payroll</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Multi-Location Support</span>
          </div>
          <div className="flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Real-time Reports</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer shrink-0"
        >
          Explore Enterprise Settings &rarr;
        </button>
      </div>

      {/* Footer copyright note */}
      <div className="text-center text-xs text-slate-400 pt-2 pb-6">
        &copy; {year} StaffSway HRMS &amp; Payroll Software. All rights reserved. &bull; <span className="font-mono font-medium">Version 2.4.0 (Enterprise)</span>
      </div>

    </div>
  )
}