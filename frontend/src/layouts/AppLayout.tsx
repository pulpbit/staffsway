import { useEffect, useState, useRef } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Menu,
  X,
  LayoutDashboard,
  Users,
  Building2,
  MapPin,
  CalendarCheck,
  UserPlus,
  CalendarDays,
  IndianRupee,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
  ShieldCheck,
  UserRound,
  Target,
  FolderOpen,
  Package,
  GraduationCap,
  UserMinus,
  HeadphonesIcon,
  Search as SearchIcon,
  Loader2,
  User as UserIcon,
  Upload,
  Bell,
  Clock,
  Sparkles,
  Phone,
  Mail,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { employeeApi, settingsApi } from '@/services/api'
import { Avatar } from '@/components/ui/actions'
import { StatusBadge } from '@/components/ui/status'
import { fullName, dateDMY } from '@/utils/format'

interface NavItem { to: string; label: string; icon: any; end?: boolean }
interface NavGroup { label: string; items: NavItem[] }
interface NavSubmenu { label: string; icon: any; path?: string; submenu: NavItem[] }
type NavEntry = NavGroup | NavSubmenu

const NAV_GROUPS: NavEntry[] = [
  {
    label: 'Overview',
    items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true }],
  },
  {
    label: 'Employee Management',
    icon: Users,
    path: '/employees',
    submenu: [
      { to: '/employees/new', label: 'Add New Employee', icon: UserPlus },
      { to: '/employees', label: 'Employee Master', icon: Users, end: true },
      { to: '/documents', label: 'Employee Docs', icon: FileText },
      { to: '/employees?import=1', label: 'Bulk Import', icon: Upload },
    ],
  },
  {
    label: 'Attendance & Leaves',
    icon: CalendarCheck,
    path: '/attendance',
    submenu: [
      { to: '/attendance', label: 'Monthly Attendance', icon: CalendarCheck, end: true },
      { to: '/attendance/report', label: 'Attendance Report', icon: BarChart3 },
      { to: '/leaves', label: 'Leave Management', icon: CalendarDays },
    ],
  },
  {
    label: 'Workforce & Payroll',
    items: [
      { to: '/payroll', label: 'Payroll Process', icon: IndianRupee },
      { to: '/slips', label: 'Salary Slips', icon: FileText },
    ],
  },
  {
    label: 'Clients & Sites',
    items: [
      { to: '/clients', label: 'Clients Master', icon: Building2 },
      { to: '/sites', label: 'Client Sites', icon: MapPin },
    ],
  },
  {
    label: 'People Operations',
    items: [
      { to: '/recruitment', label: 'Recruitment', icon: UserPlus },
      { to: '/referrers', label: 'Referrers Intake', icon: Users },
      { to: '/performance', label: 'Performance', icon: Target },
      { to: '/separation', label: 'Exit Management', icon: UserMinus },
      { to: '/helpdesk', label: 'HR Helpdesk', icon: HeadphonesIcon },
    ],
  },
  {
    label: 'Master Data & Assets',
    items: [
      { to: '/assets', label: 'Assets Master', icon: Package },
      { to: '/training', label: 'Training & Skills', icon: GraduationCap },
      { to: '/documents', label: 'Company Documents', icon: FolderOpen },
    ],
  },
  {
    label: 'Governance & Reports',
    items: [
      { to: '/compliance', label: 'Statutory Compliance', icon: ShieldCheck },
      { to: '/reports', label: 'Analytics & Reports', icon: BarChart3 },
    ],
  },
  {
    label: 'Administration',
    items: [{ to: '/settings', label: 'System Settings', icon: Settings }],
  },
]

const EMPLOYEE_GROUPS: NavEntry[] = [
  { label: 'My Workplace', items: [{ to: '/my', label: 'My Space', icon: UserRound }] },
]

const roleLabel: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin / Owner',
  hr: 'HR Manager',
  payroll: 'Payroll Officer',
  finance: 'Finance Officer',
  manager: 'Manager',
  employee: 'Employee',
}

const isGroup = (e: NavEntry): e is NavGroup => 'items' in e

const isItemActive = (item: NavItem, pathname: string, search: string) => {
  const [path, query] = item.to.split('?')
  if (pathname !== path) return false
  if (!query) return search === ''
  const want = new URLSearchParams(query)
  const have = new URLSearchParams(search)
  return [...want.entries()].every(([k, v]) => have.get(k) === v)
}

// Global Employee & Master Search
function GlobalSearch({ onNavigate }: { onNavigate: () => void }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const active = q.trim().length >= 2

  const { data, isFetching } = useQuery({
    queryKey: ['global-search', q],
    queryFn: () => employeeApi.list({ search: q, page_size: '6', page: '1' }),
    enabled: active,
    staleTime: 15000,
  })

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const results = (data?.data || []) as any[]

  const go = (id: number) => {
    setOpen(false)
    setQ('')
    onNavigate()
    navigate(`/employees?focus=${id}`)
  }

  return (
    <div ref={ref} className="relative hidden md:block w-72 lg:w-96">
      <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      <input
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search employee, department, client, etc..."
        className="w-full h-10 pl-10 pr-9 text-xs sm:text-[13px] bg-slate-100/90 hover:bg-slate-100 border border-slate-200/80 rounded-full outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
      />
      {(isFetching || (open && active)) && (
        <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
      )}
      {open && active && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 py-2 max-h-80 overflow-y-auto scrollbar-thin">
          {isFetching && <div className="px-4 py-3 text-xs text-slate-400 font-medium">Searching employees…</div>}
          {!isFetching && results.length === 0 && (
            <div className="px-4 py-3 text-xs text-slate-500">No records found for “{q}”.</div>
          )}
          {!isFetching &&
            results.map((r: any) => (
              <button
                key={r.id}
                onClick={() => go(r.id)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-blue-50/70 transition-colors"
              >
                <Avatar name={fullName(r.first_name, r.last_name)} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-slate-900 truncate">
                    {fullName(r.first_name, r.last_name)}
                  </span>
                  <span className="block text-[11px] text-slate-500 font-mono truncate">
                    {r.employee_code} &bull; {r.designation || 'Staff'}
                  </span>
                </span>
                <StatusBadge status={r.status} dot={false} />
              </button>
            ))}
        </div>
      )}
    </div>
  )
}

// Submenu Accordion Navigation
function SubmenuNav({ entry, onNavigate }: { entry: NavSubmenu; onNavigate: () => void }) {
  const location = useLocation()
  const active = entry.submenu.some((it) => isItemActive(it, location.pathname, location.search))
  const [open, setOpen] = useState(active)

  useEffect(() => {
    if (active) setOpen(true)
  }, [active])

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`group flex items-center justify-between w-full h-9 px-3 rounded-xl text-xs sm:text-[13px] font-semibold transition-all cursor-pointer ${
          active
            ? 'bg-blue-600/20 text-blue-300 font-bold border border-blue-500/30'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
        }`}
      >
        <div className="flex items-center gap-2.5 truncate">
          <entry.icon className={`w-4 h-4 shrink-0 ${active ? 'text-blue-400' : 'text-slate-400 group-hover:text-white'}`} />
          <span className="truncate">{entry.label}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && (
        <div className="pl-6 pr-1 py-1 space-y-1 border-l border-slate-800 ml-3.5">
          {entry.submenu.map((item) => {
            const isSubActive = isItemActive(item, location.pathname, location.search)
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={`flex items-center gap-2 h-8 px-2.5 rounded-lg text-xs transition-colors ${
                  isSubActive
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 font-medium'
                }`}
              >
                <item.icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Sidebar Navigation
function SidebarContent({ onNavigate }: { onNavigate: () => void }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const groups = user?.role === 'employee' ? EMPLOYEE_GROUPS : NAV_GROUPS

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200 select-none">
      {/* Brand Header */}
      <div className="px-5 py-4 flex items-center gap-3 border-b border-slate-800/80 shrink-0 bg-slate-950/80">
        <img src="/images/logo.png" alt="StaffSway" className="h-10 w-auto object-contain brightness-110" />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-white truncate">StaffSway</span>
          </div>
          <p className="text-[10.5px] font-medium text-blue-400 tracking-wide truncate">Hire &bull; Manage &bull; Grow</p>
        </div>
      </div>

      {/* Main Nav Links */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-3 py-4 space-y-4">
        {groups.map((g) => {
          if (!isGroup(g)) return <SubmenuNav key={g.label} entry={g} onNavigate={onNavigate} />
          return (
            <div key={g.label} className="space-y-1">
              <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-300">{g.label}</p>
              <div className="space-y-1">
                {g.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 h-9 px-3 rounded-xl text-xs sm:text-[13px] font-semibold transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-md shadow-blue-900/30'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`
                    }
                  >
                    <item.icon className="w-4 h-4 shrink-0 text-slate-300" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          )
        })}

        {/* Quick Actions Buttons inside Sidebar (Matching Reference Image 2) */}
        {user?.role !== 'employee' && (
          <div className="pt-2 pb-1 space-y-2">
            <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-300">Quick Actions</p>
            <div className="space-y-1.5 px-1">
              <button
                type="button"
                onClick={() => {
                  navigate('/employees/new')
                  onNavigate()
                }}
                className="w-full h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Add Employee</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  navigate('/payroll')
                  onNavigate()
                }}
                className="w-full h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <IndianRupee className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Process Payroll</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  navigate('/attendance')
                  onNavigate()
                }}
                className="w-full h-8 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <CalendarCheck className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Mark Attendance</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  navigate('/leaves')
                  onNavigate()
                }}
                className="w-full h-8 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Apply Leave</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  navigate('/reports')
                  onNavigate()
                }}
                className="w-full h-8 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 border border-slate-700/60 transition-all cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Generate Report</span>
              </button>
            </div>
          </div>
        )}

        {/* Company Office Footer Badge in Sidebar */}
        <div className="mt-4 p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 text-[11px] text-slate-400 space-y-1.5">
          <div className="flex items-center gap-1.5 text-white font-bold text-xs">
            <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>StaffSway Head Office</span>
          </div>
          <p className="text-[10.5px] leading-relaxed text-slate-400">
            Sector 133, Fatehpur Billoch, Faridabad, Haryana - 121004
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-300 pt-1 border-t border-slate-800">
            <Mail className="w-3 h-3 text-slate-400" />
            <span className="truncate">staffsway.office@gmail.com</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
            <Phone className="w-3 h-3 text-slate-400" />
            <span>+91 9821191143</span>
          </div>
          <p className="text-[10px] italic text-blue-400/90 font-medium pt-1">
            &ldquo;Your Growth, Our Commitment&rdquo;
          </p>
        </div>
      </div>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">{user?.name || 'User'}</p>
            <p className="text-[10px] text-slate-400 capitalize truncate">{roleLabel[user?.role || ''] || user?.role}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            logout()
            navigate('/login')
          }}
          title="Sign out"
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// Top Bar Header
function TopBar({ onToggleSidebar, sidebarOpen }: { onToggleSidebar: () => void; sidebarOpen: boolean }) {
  const { user, logout } = useAuth()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { data: settings } = useQuery({
    queryKey: ['app-shell-settings'],
    queryFn: () => settingsApi.get(),
    staleTime: 5 * 60 * 1000,
  })
  const company = (settings?.data as any)?.settings?.company_name || 'StaffSway'
  const navigate = useNavigate()

  // Live Date / Time formatting
  const [currentTime, setCurrentTime] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formattedDate = `${dateDMY(currentTime)} ${currentTime.toLocaleDateString('en-IN', { weekday: 'short' })}`

  const formattedTime = currentTime.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  return (
    <header className="h-16 shrink-0 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between gap-4 z-30 shadow-xs">
      {/* Left side: Toggle button & Subtitle */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          aria-label="Toggle navigation"
        >
          {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
        </button>

        <div className="hidden sm:flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight">{company}</span>
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
              HRMS &amp; Payroll
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium truncate">
            Smart People &nbsp;|&nbsp; Smart Process &nbsp;|&nbsp; Better Business
          </span>
        </div>
      </div>

      {/* Center Search */}
      {user?.role !== 'employee' && <GlobalSearch onNavigate={() => {}} />}

      {/* Right side widgets: Notifications, Date/Time, Client Dropdown, Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        
        {/* Date / Time Badge matching reference */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-slate-100/90 rounded-xl text-xs font-semibold text-slate-700 border border-slate-200/70">
          <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>{formattedDate}</span>
          <span className="text-slate-400">&bull;</span>
          <span className="text-blue-700 font-mono font-bold">{formattedTime} IST</span>
        </div>

        {/* Client Selector */}
        {user?.role !== 'employee' && (
          <div className="hidden lg:flex items-center">
            <select
              aria-label="Filter client branch"
              className="h-9 px-3 text-xs font-semibold bg-slate-100 border border-slate-200/80 rounded-xl text-slate-700 outline-none hover:bg-slate-50 focus:border-blue-500 cursor-pointer"
            >
              <option>All Clients &bull; Global</option>
            </select>
          </div>
        )}

        {/* Notifications Icon with Badge */}
        <button
          type="button"
          onClick={() => navigate('/compliance')}
          title="5 Active Compliance Notifications"
          className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center ring-2 ring-white">
            5
          </span>
        </button>

        {/* User Profile Pill */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex items-center gap-2.5 p-1.5 pl-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:flex flex-col text-left leading-tight">
              <span className="text-xs font-bold text-slate-900 truncate max-w-32">{user?.name || 'Vijay Sharma'}</span>
              <span className="text-[10px] text-slate-500 font-medium capitalize">
                {roleLabel[user?.role || ''] || user?.role}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {/* User Menu Dropdown */}
          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 py-2">
                <div className="px-4 py-2.5 border-b border-slate-100 mb-1">
                  <p className="text-xs font-bold text-slate-900">{user?.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                </div>
                {user?.role === 'employee' ? (
                  <button
                    onClick={() => {
                      setUserMenuOpen(false)
                      navigate('/my')
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 transition-colors cursor-pointer"
                  >
                    <UserIcon className="w-4 h-4 text-blue-600" />
                    <span>My Space</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setUserMenuOpen(false)
                      navigate('/settings')
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 transition-colors cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-blue-600" />
                    <span>System Settings</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setUserMenuOpen(false)
                    logout()
                    navigate('/login')
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border-t border-slate-100 mt-1"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </header>
  )
}

// Root Layout Component
export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const toggleSidebar = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) {
      setSidebarOpen((v) => !v)
    } else {
      setMobileOpen((v) => !v)
    }
  }

  return (
    <div className="h-screen flex overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden lg:flex flex-col transition-all duration-300 ease-in-out shrink-0 ${
          sidebarOpen ? 'w-64 xl:w-72' : 'w-0 overflow-hidden'
        }`}
      >
        <SidebarContent onNavigate={() => {}} />
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setMobileOpen(false)} />
          <div className="relative w-72 max-w-[80vw] h-full shadow-2xl z-10 flex flex-col">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
        <main className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-4 sm:p-6 lg:p-7 bg-slate-50/80">
          <Outlet />
        </main>
      </div>
    </div>
  )
}