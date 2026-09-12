import { Fragment, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { TableSkeleton } from './skeleton'
import { type Tone } from './status'

// ---------- Badge ----------
export function Badge({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center px-2 h-5 rounded-full text-[11px] font-medium whitespace-nowrap ${className}`}>{children}</span>
  )
}

// ---------- StatCard ----------
interface StatCardProps {
  icon?: React.ElementType
  label: string
  value: string | number
  sub?: string
  tone?: Tone
}

const statIconTone: Record<Tone, string> = {
  success: 'bg-success-soft text-success-deep',
  warning: 'bg-warning-soft text-warning-deep',
  danger: 'bg-error-soft text-error-deep',
  info: 'bg-info-soft text-info-deep',
  neutral: 'bg-neutral-soft text-neutral-deep',
  primary: 'bg-navy-soft text-navy-mid',
}

export function StatCard({ icon: Icon, label, value, sub, tone = 'primary' }: StatCardProps) {
  return (
    <div className="bg-white card-shadow rounded-md p-4 flex gap-3">
      {Icon && (
        <span className={`inline-flex w-9 h-9 shrink-0 items-center justify-center rounded-sm ${statIconTone[tone]}`}>
          <Icon className="w-4.5 h-4.5" />
        </span>
      )}
      <div className="min-w-0 flex flex-col">
        <span className="mono-label">{label}</span>
        <span className="text-[22px] leading-7 font-semibold text-ink tracking-[-0.03em] tabular-nums mt-0.5 truncate">{value}</span>
        {sub && <span className="text-[11px] text-mute truncate mt-0.5">{sub}</span>}
      </div>
    </div>
  )
}

// ---------- Column def for Table ----------
export interface Column<T> {
  key: string
  header: string
  render?: (row: T, idx: number) => ReactNode
  sortable?: boolean
  className?: string
  hideSm?: boolean
}

// ---------- Table ----------
interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyFn: (row: T) => string | number
  sortKey?: string
  sortDir?: 'asc' | 'desc'
  onSort?: (key: string) => void
  emptyMessage?: string
  emptyState?: ReactNode
  loading?: boolean
  rowClick?: (row: T) => void
  minWidth?: string
  expandedKey?: string | number | null
  renderExpanded?: (row: T) => ReactNode
}

export function Table<T>({ columns, data, keyFn, sortKey, sortDir, onSort, emptyMessage = 'No data found.', emptyState, loading, rowClick, minWidth = '640px', expandedKey, renderExpanded }: TableProps<T>) {
  if (loading) {
    return (
      <div className="overflow-x-auto scrollbar-thin">
        <TableSkeleton rows={5} columns={Math.min(columns.length, 5)} />
      </div>
    )
  }

  return (
    <div className="overflow-x-auto scrollbar-thin -mx-4 sm:mx-0">
      <table className="w-full" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-hairline bg-canvas-soft/60">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-3 py-2.5 text-left text-[11px] font-medium font-mono text-mute uppercase tracking-[0.04em] select-none whitespace-nowrap ${col.sortable ? 'cursor-pointer hover:text-ink' : ''} ${col.hideSm ? 'hidden md:table-cell' : ''} ${col.className || ''}`}
                onClick={() => col.sortable && onSort?.(col.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && sortKey === col.key && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  {col.sortable && sortKey !== col.key && <ArrowUpDown className="w-3 h-3 opacity-30" />}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-10 text-center text-[13px] text-mute">
                {emptyState ?? emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <Fragment key={keyFn(row)}>
                <tr onClick={() => rowClick?.(row)} className={`border-b border-hairline transition-colors ${rowClick ? 'cursor-pointer' : ''} ${idx % 2 === 1 ? 'bg-canvas-soft/40' : ''} ${expandedKey === keyFn(row) ? 'bg-canvas-soft/60' : ''} hover:bg-canvas-soft/70`}>
                  {columns.map((col) => (
                    <td key={col.key} className={`px-3 py-2.5 text-[13px] align-middle ${col.hideSm ? 'hidden md:table-cell' : ''} ${col.className || ''}`}>
                      {col.render ? col.render(row, idx) : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
                {expandedKey === keyFn(row) && renderExpanded && (
                  <tr className="border-b border-hairline">
                    <td colSpan={columns.length} className="px-4 py-4 bg-canvas-soft/40">
                      {renderExpanded(row)}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

// ---------- Pagination ----------
interface PaginationProps {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPage: (p: number) => void
}

export function Pagination({ page, totalPages, total, pageSize, onPage }: PaginationProps) {
  if (totalPages <= 1) return null
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 text-[12px]">
      <span className="text-mute tabular-nums">{start}–{end} of {total}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page <= 1} className="inline-flex items-center gap-1 px-2 h-7 rounded-sm text-body hover:text-ink hover:bg-canvas-soft disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" /> Prev
        </button>
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
          let p = i + 1
          if (totalPages > 7 && page > 4) p = page - 3 + i
          if (p > totalPages) return null
          return (
            <button
              key={p}
              onClick={() => onPage(p)}
              aria-current={p === page ? 'page' : undefined}
              className={`w-7 h-7 text-[12px] font-medium rounded-sm transition-colors ${p === page ? 'bg-ink text-white' : 'text-body hover:bg-canvas-soft'}`}
            >
              {p}
            </button>
          )
        })}
        <button onClick={() => onPage(page + 1)} disabled={page >= totalPages} className="inline-flex items-center gap-1 px-2 h-7 rounded-sm text-body hover:text-ink hover:bg-canvas-soft disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          Next <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ---------- Tabs ----------
interface Tab {
  key: string
  label: string
  count?: number
}

export function Tabs({ tabs, active, onChange, variant = 'pill', scrollable = false }: { tabs: Tab[]; active: string; onChange: (key: string) => void; variant?: 'pill' | 'underline'; scrollable?: boolean }) {
  if (variant === 'underline') {
    return (
      <div role="tablist" className={`flex ${scrollable ? 'overflow-x-auto scrollbar-thin' : 'flex-wrap'} gap-1 border-b border-hairline`}>
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={active === t.key}
            onClick={() => onChange(t.key)}
            className={`px-3 pb-2 pt-1.5 text-[13px] font-medium whitespace-nowrap transition-colors -mb-px border-b-2 ${active === t.key ? 'border-navy-mid text-ink' : 'border-transparent text-mute hover:text-body'}`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={`ml-1.5 inline-flex items-center px-1.5 h-4 rounded-full text-[10px] font-semibold align-middle ${active === t.key ? 'bg-navy-soft text-navy-mid' : 'bg-canvas-soft-2 text-mute'}`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>
    )
  }
  return (
    <div role="tablist" className="inline-flex flex-wrap gap-0.5 bg-canvas-soft-2 rounded-sm p-0.5 w-full sm:w-auto">
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={active === t.key}
          onClick={() => onChange(t.key)}
          className={`px-3 h-7 text-[12px] font-medium rounded-xs transition-colors ${active === t.key ? 'bg-white text-ink card-shadow' : 'text-mute hover:text-body'}`}
        >
          {t.label}
          {t.count !== undefined && <span className="ml-1 text-[10px] opacity-60">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}