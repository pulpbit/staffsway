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
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[12px] text-mute min-w-0">
      <Link to="/" className="hover:text-body transition-colors shrink-0" aria-label="Home">
        <Home className="w-3.5 h-3.5" />
      </Link>
      {items.map((c, i) => {
        const last = i === items.length - 1
        return (
          <span key={c.label} className="flex items-center gap-1 min-w-0 whitespace-nowrap">
            <ChevronRight className="w-3 h-3 text-hairline-strong shrink-0" />
            {c.to && !last ? (
              <Link to={c.to} className="hover:text-body transition-colors truncate">{c.label}</Link>
            ) : (
              <span className={`truncate ${last ? 'text-body font-medium' : ''}`}>{c.label}</span>
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
    <div className="mb-5">
      {crumb && crumb.length > 0 && <Breadcrumbs items={crumb} />}
      <div className="mt-1.5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="text-[20px] leading-7 font-semibold text-ink tracking-[-0.03em]">{title}</h1>
          {description && <p className="text-[13px] text-body mt-0.5 max-w-2xl">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap shrink-0">{actions}</div>}
      </div>
      {children}
    </div>
  )
}

// ---------- Card ----------
export function Card({ children, className = '', muted = false }: { children: ReactNode; className?: string; muted?: boolean }) {
  return <div className={`bg-white rounded-md card-shadow ${muted ? 'bg-canvas-soft/60' : ''} ${className}`}>{children}</div>
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

export function SectionCard({ title, subtitle, icon: Icon, action, children, className = '', bodyClassName = 'p-4' }: SectionCardProps) {
  return (
    <section className={`bg-white rounded-md card-shadow ${className}`}>
      <header className="flex items-center justify-between gap-2 px-4 py-3 border-b border-hairline">
        <div className="flex items-center gap-2 min-w-0">
          {Icon && <Icon className="w-4 h-4 text-mute shrink-0" />}
          <div className="min-w-0">
            <h3 className="text-[13px] font-semibold text-ink tracking-[-0.01em]">{title}</h3>
            {subtitle && <p className="text-[11px] text-mute truncate">{subtitle}</p>}
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
      <dt className={`mono-label mb-0.5 ${invert ? '' : ''}`}>{label}</dt>
      <dd className="text-[13px] text-ink font-medium break-words">{children}</dd>
    </div>
  )
}

export function DetailGrid({ children, columns = 2 }: { children: ReactNode; columns?: 1 | 2 | 3 | 4 }) {
  const colClass = { 1: 'grid-cols-1', 2: 'grid-cols-1 sm:grid-cols-2', 3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3', 4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' }[columns]
  return <dl className={`grid ${colClass} gap-x-6 gap-y-3.5`}>{children}</dl>
}

// ---------- Metric ----------
export function Metric({ label, value, hint, mono = true }: { label: string; value: ReactNode; hint?: ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="mono-label mb-1">{label}</div>
      <div className={`${mono ? 'font-mono' : ''} text-[13px] text-ink font-medium tabular-nums`}>{value}</div>
      {hint && <div className="text-[11px] text-mute mt-0.5">{hint}</div>}
    </div>
  )
}