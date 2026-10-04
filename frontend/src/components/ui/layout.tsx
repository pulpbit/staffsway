import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

// ---------- Breadcrumbs ----------
export interface Crumb {
  label: string
  to?: string
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 min-w-0 font-medium">
      <Link to="/" className="hover:text-blue-600 transition-colors shrink-0 p-1 rounded hover:bg-slate-100" aria-label="Home">
        <Home className="w-3.5 h-3.5 text-slate-400" />
      </Link>
      {items.map((c, i) => {
        const last = i === items.length - 1
        return (
          <span key={c.label} className="flex items-center gap-1.5 min-w-0 whitespace-nowrap">
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            {c.to && !last ? (
              <Link to={c.to} className="hover:text-blue-600 transition-colors truncate">{c.label}</Link>
            ) : (
              <span className={`truncate ${last ? 'text-slate-900 font-bold' : ''}`}>{c.label}</span>
            )}
          </span>
        )
      })}
    </nav>
  )
}

// ---------- PageHeader ----------
interface PageHeaderProps {
  title: string
  description?: string
  crumb?: Crumb[]
  actions?: ReactNode
  children?: ReactNode
}

export function PageHeader({ title, description, crumb, actions, children }: PageHeaderProps) {
  return (
    <div className="mb-6">
      {crumb && crumb.length > 0 && <div className="mb-2"><Breadcrumbs items={crumb} /></div>}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
          {description && <p className="text-xs sm:text-[13px] text-slate-500 font-medium mt-1 max-w-3xl">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2.5 flex-wrap shrink-0">{actions}</div>}
      </div>
      {children}
    </div>
  )
}

// ---------- Card ----------
export function Card({ children, className = '', muted = false }: { children: ReactNode; className?: string; muted?: boolean }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-xs ${muted ? 'bg-slate-50/70' : ''} ${className}`}>
      {children}
    </div>
  )
}

// ---------- SectionCard ----------
interface SectionCardProps {
  title: string
  subtitle?: string
  icon?: React.ElementType
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}

export function SectionCard({ title, subtitle, icon: Icon, action, children, className = '', bodyClassName = 'p-5' }: SectionCardProps) {
  return (
    <section className={`bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden ${className}`}>
      <header className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100 bg-slate-50/40">
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && (
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <Icon className="w-4 h-4" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">{title}</h3>
            {subtitle && <p className="text-[11px] text-slate-500 truncate mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}

// ---------- Detail rows ----------
export function InfoRow({ label, children, invert = false }: { label: string; children: ReactNode; invert?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className={`text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 ${invert ? 'text-slate-300' : ''}`}>{label}</dt>
      <dd className="text-xs sm:text-[13px] text-slate-900 font-semibold break-words">{children}</dd>
    </div>
  )
}

export function DetailGrid({ children, columns = 2 }: { children: ReactNode; columns?: 1 | 2 | 3 | 4 }) {
  const colClass = { 1: 'grid-cols-1', 2: 'grid-cols-1 sm:grid-cols-2', 3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3', 4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' }[columns]
  return <dl className={`grid ${colClass} gap-x-6 gap-y-4`}>{children}</dl>
}

// ---------- Metric ----------
export function Metric({ label, value, hint, mono = true }: { label: string; value: ReactNode; hint?: ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0 p-3 rounded-xl bg-slate-50 border border-slate-100">
      <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-1">{label}</div>
      <div className={`${mono ? 'font-mono' : ''} text-sm sm:text-base font-extrabold text-slate-900 tabular-nums`}>{value}</div>
      {hint && <div className="text-[11px] text-slate-500 font-medium mt-0.5">{hint}</div>}
    </div>
  )
}