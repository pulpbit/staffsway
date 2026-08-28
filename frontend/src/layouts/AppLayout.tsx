import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Menu, X, LayoutDashboard, Users, Building2, MapPin, CalendarCheck, UserPlus, CalendarDays, IndianRupee, FileText, BarChart3, Settings, LogOut, ChevronDown, ShieldCheck, UserRound, Target, FolderOpen, Package, GraduationCap, UserMinus, HeadphonesIcon } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

interface NavItem { to: string; icon: any; label: string; roles?: string[] }

const navItems: NavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/employees', icon: Users, label: 'Employees' },
  { to: '/clients', icon: Building2, label: 'Clients' },
  { to: '/sites', icon: MapPin, label: 'Sites' },
  { to: '/attendance', icon: CalendarCheck, label: 'Monthly Attendance' },
  { to: '/recruitment', icon: UserPlus, label: 'Recruitment' },
  { to: '/leaves', icon: CalendarDays, label: 'Leave Management' },
  { to: '/payroll', icon: IndianRupee, label: 'Payroll' },
  { to: '/slips', icon: FileText, label: 'Salary Slips' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/compliance', icon: ShieldCheck, label: 'Compliance' },
  { to: '/performance', icon: Target, label: 'Performance' },
  { to: '/documents', icon: FolderOpen, label: 'Documents' },
  { to: '/assets', icon: Package, label: 'Assets' },
  { to: '/training', icon: GraduationCap, label: 'Training' },
  { to: '/separation', icon: UserMinus, label: 'Separation' },
  { to: '/helpdesk', icon: HeadphonesIcon, label: 'HR Helpdesk' },
  { to: '/my', icon: UserRound, label: 'My Space' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

// Employee logins only get their self-service space; admin/manager/hr see everything except My Space.
const visibleNav = (role?: string): NavItem[] =>
  role === 'employee' ? navItems.filter(i => i.to === '/my') : navItems.filter(i => i.to !== '/my')

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 px-2.5 py-1.5 rounded-sm text-[13px] font-medium transition-colors ${
      isActive ? 'bg-white/10 text-white border-l-[2px] border-gold rounded-l-none -ml-px pl-2' : 'text-white/60 hover:text-white hover:bg-white/5'
    }`

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-navy">
      <div className="px-3 py-3.5 border-b border-white/10 flex items-center gap-2.5">
        <img src="/images/logo.png" alt="Staffsway" className="w-7 h-7 rounded-xs object-contain" />
        <span className="text-[14px] font-semibold text-white tracking-[-0.02em]">Staffsway</span>
      </div>
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {visibleNav(user?.role).map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className={linkClass} onClick={() => setSidebarOpen(false)}>
            <item.icon className="w-4 h-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-3 py-3 border-t border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gold flex items-center justify-center text-[11px] font-semibold text-navy shrink-0">
            {user?.name?.charAt(0) || 'A'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium text-white truncate">{user?.name}</p>
            <p className="text-[11px] text-white/50 truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="h-screen flex overflow-hidden bg-canvas-soft">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-56 xl:w-60 shrink-0 bg-navy border-r border-navy-mid flex-col">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 w-64 border-r border-white/10 z-50 shadow-modal flex flex-col">
            <div className="flex items-center justify-between px-3 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <img src="/images/logo.png" alt="Staffsway" className="w-6 h-6 rounded-xs" />
                <span className="text-[14px] font-semibold text-white">Staffsway</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-sm hover:bg-white/10 text-white/70">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <Sidebar />
            </div>
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-12 shrink-0 bg-white border-b border-hairline flex items-center justify-between px-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1 -ml-1 rounded-sm hover:bg-canvas-soft text-ink">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <div className="relative flex items-center gap-3">
            <span className="text-[12px] text-mute hidden sm:block">{user?.name}</span>
            <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-1.5 p-1 rounded-sm hover:bg-canvas-soft text-body">
              <div className="w-6 h-6 rounded-full bg-gold flex items-center justify-center text-[10px] font-semibold text-navy">
                {user?.name?.charAt(0) || 'A'}
              </div>
              <ChevronDown className="w-3.5 h-3.5 hidden sm:block" />
            </button>
            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-44 bg-white card-shadow-lg rounded-sm z-20 py-1">
                  <button onClick={handleLogout} className="flex items-center gap-2 w-full px-3 py-2 text-[13px] text-body hover:bg-canvas-soft transition-colors">
                    <LogOut className="w-3.5 h-3.5" />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
