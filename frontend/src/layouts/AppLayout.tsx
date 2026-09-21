import { useEffect, useState, useRef } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Menu, X, LayoutDashboard, Users, Building2, MapPin, CalendarCheck, UserPlus, CalendarDays, IndianRupee,
  FileText, BarChart3, Settings, LogOut, ChevronDown, ShieldCheck, UserRound, Target, FolderOpen, Package,
  GraduationCap, UserMinus, HeadphonesIcon, Search as SearchIcon, Building2 as OrgIcon,
  Loader2, User as UserIcon, ArrowRightLeft, Upload, ChevronRight, PanelLeft,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { employeeApi, settingsApi } from '@/services/api'
import { Avatar } from '@/components/ui/actions'
import { Breadcrumbs, type Crumb } from '@/components/ui/layout'
import { StatusBadge, formatStatus } from '@/components/ui/status'
import { fullName } from '@/utils/format'

interface NavItem { to: string; label: string; icon: any; end?: boolean }
interface NavGroup { label: string; items: NavItem[] }
interface NavSubmenu { label: string; icon: any; submenu: NavItem[] }
type NavEntry = NavGroup | NavSubmenu

const NAV_GROUPS: NavEntry[] = [
  {
    label: 'Overview',
    items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true }],
  },
  {
    label: 'Employee Management',
    icon: Users,
    submenu: [
      { to: '/employees/new', label: 'Add New Employee', icon: UserPlus },
      { to: '/employees', label: 'Employee Master', icon: Users, end: true },
      { to: '/documents', label: 'Employee Docs', icon: FileText },
      { to: '/employees/transfer', label: 'Employee Transfer', icon: ArrowRightLeft },
      { to: '/employees?import=1', label: 'Bulk Import', icon: Upload },
    ],
  },
  {
    label: 'People',
    items: [
      { to: '/recruitment', label: 'Recruitment', icon: UserPlus },
      { to: '/performance', label: 'Performance', icon: Target },
      { to: '/separation', label: 'Separation', icon: UserMinus },
      { to: '/helpdesk', label: 'HR Helpdesk', icon: HeadphonesIcon },
    ],
  },
  {
    label: 'Workforce',
    items: [
      { to: '/attendance', label: 'Attendance', icon: CalendarCheck },
      { to: '/leaves', label: 'Leave Management', icon: CalendarDays },
      { to: '/payroll', label: 'Payroll', icon: IndianRupee },
      { to: '/slips', label: 'Salary Slips', icon: FileText },
    ],
  },
  {
    label: 'Master Data',
    items: [
      { to: '/clients', label: 'Clients', icon: Building2 },
      { to: '/sites', label: 'Sites', icon: MapPin },
      { to: '/documents', label: 'Documents', icon: FolderOpen },
      { to: '/assets', label: 'Assets', icon: Package },
      { to: '/training', label: 'Training', icon: GraduationCap },
    ],
  },
  {
    label: 'Governance',
    items: [
      { to: '/compliance', label: 'Compliance', icon: ShieldCheck },
      { to: '/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    label: 'System',
    items: [{ to: '/settings', label: 'Settings', icon: Settings }],
  },
]

const EMPLOYEE_GROUPS: NavEntry[] = [
  { label: 'My Workplace', items: [{ to: '/my', label: 'My Space', icon: UserRound }] },
]

const roleLabel: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrator',
  hr: 'HR Manager',
  payroll: 'Payroll',
  finance: 'Finance',
  manager: 'Manager',
  employee: 'Employee',
}

const isGroup = (e: NavEntry): e is NavGroup => 'items' in e

const pathsFor = (item: NavItem) => item.to.split('?')[0]

const isItemActive = (item: NavItem, pathname: string, search: string) => {
  const [path, query] = item.to.split('?')
  if (pathname !== path) return false
  if (!query) return search === ''
  const want = new URLSearchParams(query)
  const have = new URLSearchParams(search)
  return [...want.entries()].every(([k, v]) => have.get(k) === v)
}

function useCrumb(locationPath: string): Crumb[] {
  const groups = NAV_GROUPS
  for (const g of groups) {
    if (isGroup(g)) {
      for (const item of g.items) {
        const to = pathsFor(item)
        if (locationPath === to || locationPath.startsWith(to + '/')) {
          if (g.items.length === 1 && g.label === 'Overview') return []
          return [{ label: g.label, to }, { label: item.label }]
        }
      }
    } else {
      for (const item of g.submenu) {
        const to = pathsFor(item)
        if (locationPath === to || locationPath.startsWith(to + '/')) {
          return [{ label: g.label, to: '/employees' }, { label: item.label }]
        }
      }
    }
  }
  return []
}

// ---------- Global employee search (real data via /employees?search=) ----------
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
    <div ref={ref} className="relative hidden sm:block w-56 lg:w-72">
      <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-mute pointer-events-none" />
      <input
        type="search"
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="Search employees, codes..."
        className="w-full h-9 pl-8 pr-9 text-[13px] bg-canvas-soft border border-hairline rounded-sm outline-none transition-all placeholder:text-mute focus:bg-white focus:border-navy-mid"
      />
      {(isFetching || (open && active)) && (
        <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-mute animate-spin" />
      )}
      {open && active && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-md card-shadow-lg border border-hairline z-40 py-1 max-h-80 overflow-y-auto scrollbar-thin">
          {isFetching && <div className="px-3 py-2.5 text-[12px] text-mute">Searching…</div>}
          {!isFetching && results.length === 0 && <div className="px-3 py-2.5 text-[12px] text-mute">No employees match “{q}”.</div>}
          {!isFetching &&
            results.map((r: any) => (
              <button
                key={r.id}
                onClick={() => go(r.id)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-canvas-soft transition-colors"
              >
                <Avatar name={fullName(r.first_name, r.last_name)} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] text-ink font-medium truncate">{fullName(r.first_name, r.last_name)}</span>
                  <span className="block text-[11px] text-mute font-mono truncate">{r.employee_code} · {r.designation || '—'}</span>
                </span>
                <StatusBadge status={r.status} dot={false} />
              </button>
            ))}
        </div>
      )}
    </div>
  )
}

// ---------- Sidebar ----------
function SubmenuNav({ entry, collapsed, onNavigate }: { entry: NavSubmenu; collapsed: boolean; onNavigate: () => void }) {
  const location = useLocation()
  const active = entry.submenu.some((it) => isItemActive(it, location.pathname, location.search))
  const [open, setOpen] = useState(active)
  const isOpen = collapsed ? false : open

  useEffect(() => {
    setOpen(active)
  }, [active])

  return (
    <div>
      <button
        type="button"
        onClick={() => { if (!collapsed) setOpen((v) => !v) }}
        title={collapsed ? entry.label : undefined}
        aria-label={entry.label}
        aria-expanded={isOpen}
        className={`group flex items-center gap-2.5 h-8 px-2.5 rounded-sm text-[13px] font-medium transition-colors relative w-full ${
          active ? 'bg-white/12 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
        }`}
      >
        <entry.icon className="w-4 h-4 shrink-0" />
        {!collapsed && <span className="truncate flex-1 text-left">{entry.label}</span>}
        {!collapsed && (
          <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
        )}
        {collapsed && (
          <span className="pointer-events-none absolute left-full ml-3 z-50 hidden group-hover:block whitespace-nowrap bg-navy text-white text-[12px] px-2 py-1 rounded-sm card-shadow-lg">
            {entry.label}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="mt-0.5 space-y-0.5">
          {entry.submenu.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={() =>
                `group flex items-center gap-2.5 h-7 pl-8 pr-2.5 rounded-sm text-[12.5px] transition-colors relative ${
                  isItemActive(item, location.pathname, location.search)
                    ? 'bg-white/10 text-white'
                    : 'text-white/55 hover:text-white hover:bg-white/5'
                }`
              }
              onClick={onNavigate}
            >
              <item.icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate: () => void }) {
  const { user } = useAuth()
  const groups = user?.role === 'employee' ? EMPLOYEE_GROUPS : NAV_GROUPS

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `group flex items-center gap-2.5 h-8 px-2.5 rounded-sm text-[13px] font-medium transition-colors relative ${
      isActive
        ? 'bg-white/12 text-white'
        : 'text-white/60 hover:text-white hover:bg-white/5'
    }`

  return (
    <nav className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-2 py-3 space-y-4" aria-label="Main navigation">
      {groups.map((g) => {
        if (!isGroup(g)) return <SubmenuNav key={g.label} entry={g} collapsed={collapsed} onNavigate={onNavigate} />
        return (
          <div key={g.label}>
            {!collapsed && (
              <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/30">{g.label}</p>
            )}
            <div className="space-y-0.5">
              {g.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  title={collapsed ? item.label : undefined}
                  aria-label={item.label}
                  className={linkClass}
                  onClick={onNavigate}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {collapsed && (
                    <span className="pointer-events-none absolute left-full ml-3 z-50 hidden group-hover:block whitespace-nowrap bg-navy text-white text-[12px] px-2 py-1 rounded-sm card-shadow-lg">
                      {item.label}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        )
      })}
    </nav>
  )
}

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  return (
    <div className="px-2 py-3 border-t border-white/10">
      {collapsed ? (
        <div className="flex flex-col items-center gap-2">
          <Avatar name={user?.name} size="sm" rounded={false} tone="gold" />
          <button onClick={() => { logout(); navigate('/login') }} title="Sign out" className="p-1.5 rounded-sm text-white/50 hover:text-white hover:bg-white/5 cursor-pointer">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2.5">
          <Avatar name={user?.name} size="sm" rounded={false} tone="gold" />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium text-white truncate">{user?.name}</p>
            <p className="text-[11px] text-white/50 truncate capitalize">{roleLabel[user?.role || ''] || user?.role}</p>
          </div>
          <button onClick={() => { logout(); navigate('/login') }} title="Sign out" className="p-1.5 rounded-sm text-white/50 hover:text-white hover:bg-white/5 cursor-pointer shrink-0">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}

// ---------- Header ----------
function TopBar({ onToggleSidebar, breadcrumb }: { onToggleSidebar: () => void; breadcrumb: Crumb[] }) {
  const { user } = useAuth()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { data: settings } = useQuery({ queryKey: ['app-shell-settings'], queryFn: () => settingsApi.get(), staleTime: 5 * 60 * 1000 })
  const company = (settings?.data as any)?.settings?.company_name || 'Staffsway'
  const navigate = useNavigate()
  const { logout } = useAuth()

  return (
    <header className="h-13 shrink-0 bg-white border-b border-hairline flex items-center gap-3 px-4">
      <button onClick={onToggleSidebar} className="lg:hidden p-1 -ml-1 rounded-sm hover:bg-canvas-soft text-ink" aria-label="Open navigation">
        <Menu className="w-5 h-5" />
      </button>

      <div className="hidden lg:flex min-w-0 items-center gap-2">
        <button onClick={onToggleSidebar} className="p-1.5 -ml-1 rounded-sm hover:bg-canvas-soft text-mute hover:text-ink transition-colors" aria-label="Toggle sidebar">
          <PanelLeft className="w-4.5 h-4.5" />
        </button>
        <Breadcrumbs items={breadcrumb} />
      </div>
      <div className="flex-1" />

      {user?.role !== 'employee' && <GlobalSearch onNavigate={() => {}} />}

      <div className="hidden md:flex items-center gap-1.5 px-2.5 h-9 border border-hairline rounded-sm text-[12px] font-medium text-body max-w-52">
        <OrgIcon className="w-3.5 h-3.5 text-navy-mid shrink-0" />
        <span className="truncate">{company}</span>
      </div>

      <div className="relative flex items-center">
        <button
          onClick={() => setUserMenuOpen((v) => !v)}
          className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-sm hover:bg-canvas-soft text-body"
          aria-haspopup="menu"
          aria-expanded={userMenuOpen}
        >
          <Avatar name={user?.name} size="sm" rounded={false} tone="navy" />
          <span className="hidden sm:flex flex-col items-start leading-tight">
            <span className="text-[12px] font-semibold text-ink truncate max-w-28">{user?.name}</span>
            <span className="text-[10px] text-mute uppercase tracking-wide">{roleLabel[user?.role || ''] || formatStatus(user?.role)}</span>
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-mute hidden sm:block" />
        </button>
        {userMenuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-md card-shadow-lg border border-hairline z-30 py-1">
              <div className="px-3 py-2 border-b border-hairline mb-1">
                <p className="text-[13px] font-semibold text-ink">{user?.name}</p>
                <p className="text-[11px] text-mute truncate">{user?.email}</p>
              </div>
              {user?.role === 'employee' && (
                <button onClick={() => { setUserMenuOpen(false); navigate('/my') }} className="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] text-body hover:bg-canvas-soft">
                  <UserIcon className="w-3.5 h-3.5" /> My Space
                </button>
              )}
              <button
                onClick={() => { setUserMenuOpen(false); logout(); navigate('/login') }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] text-error hover:bg-error-soft/50"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}

// ---------- Layout root ----------
export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try { return localStorage.getItem('staffsway_sidebar_open') !== '0' } catch { return true }
  })
  const location = useLocation()
  const crumb = useCrumb(location.pathname)

  useEffect(() => {
    try { localStorage.setItem('staffsway_sidebar_open', sidebarOpen ? '1' : '0') } catch { /* noop */ }
  }, [sidebarOpen])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const toggleSidebar = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) setSidebarOpen((v) => !v)
    else setMobileOpen(true)
  }

  return (
    <div className="h-screen flex overflow-hidden bg-canvas-soft">
      {/* Desktop sidebar */}
      {sidebarOpen && (
        <aside className="hidden lg:flex shrink-0 flex-col bg-navy w-60">
          <div className="px-3 h-13 border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <img src="/images/logo.png" alt="Staffsway" className="h-12 w-auto max-w-[210px] object-contain shrink-0" />
            </div>
          </div>
          <SidebarNav collapsed={false} onNavigate={() => {}} />
          <SidebarFooter collapsed={false} />
        </aside>
      )}

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 w-72 bg-navy border-r border-white/10 z-50 shadow-modal flex flex-col">
            <div className="flex items-center justify-between px-3 h-13 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <img src="/images/logo.png" alt="Staffsway" className="h-11 w-auto object-contain" />
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-1 rounded-sm hover:bg-white/10 text-white/70" aria-label="Close navigation">
                <X className="w-4 h-4" />
              </button>
            </div>
            <SidebarNav collapsed={false} onNavigate={() => setMobileOpen(false)} />
            <SidebarFooter collapsed={false} />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar onToggleSidebar={toggleSidebar} breadcrumb={crumb} />
        <main className="flex-1 overflow-y-auto scrollbar-thin px-4 py-5 lg:px-6 lg:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}