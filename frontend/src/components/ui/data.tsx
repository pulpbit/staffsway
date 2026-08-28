import { type ReactNode, type MouseEvent } from 'react'
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

// ---------- Badge ----------
export function Badge({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center px-2 h-5 rounded-full text-[11px] font-medium ${className}`}>{children}</span>
  )
}

// ---------- StatCard ----------
export function StatCard({ icon: Icon, label, value, sub }: { icon?: React.ElementType; label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white card-shadow rounded-md p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-mute" />}
        <span className="text-[11px] text-mute uppercase tracking-[0.04em] font-medium font-mono">{label}</span>
      </div>
      <span className="text-[22px] font-semibold text-ink tracking-[-0.03em]">{value}</span>
      {sub && <span className="text-[11px] text-mute">{sub}</span>}
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
}

export function Table<T>({ columns, data, keyFn, sortKey, sortDir, onSort, emptyMessage = 'No data found.' }: TableProps<T>) {
  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <table className="w-full min-w-[600px]">
        <thead>
          <tr className="border-b border-hairline">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-3 py-2 text-left text-[11px] font-medium font-mono text-mute uppercase tracking-[0.04em] select-none ${col.sortable ? 'cursor-pointer hover:text-ink' : ''} ${col.hideSm ? 'hidden md:table-cell' : ''} ${col.className || ''}`}
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
              <td colSpan={columns.length} className="px-3 py-12 text-center text-[13px] text-mute">{emptyMessage}</td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr key={keyFn(row)} className={`border-b border-hairline hover:bg-canvas-soft/60 transition-colors ${idx % 2 === 1 ? 'bg-canvas-soft/30' : ''}`}>
                {columns.map((col) => (
                  <td key={col.key} className={`px-3 py-2.5 text-[13px] ${col.hideSm ? 'hidden md:table-cell' : ''} ${col.className || ''}`}>
                    {col.render ? col.render(row, idx) : String((row as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
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
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)
  return (
    <div className="flex items-center justify-between pt-3">
      <span className="text-[11px] text-mute">{start}–{end} of {total}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page <= 1} className="p-1 rounded-sm text-mute hover:text-ink hover:bg-canvas-soft disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
          let p = i + 1
          if (totalPages > 7 && page > 4) p = page - 3 + i
          if (p > totalPages) return null
          return (
            <button
              key={p}
              onClick={() => onPage(p)}
              className={`w-7 h-7 text-[12px] font-medium rounded-sm transition-colors ${p === page ? 'bg-ink text-white' : 'text-body hover:bg-canvas-soft'}`}
            >
              {p}
            </button>
          )
        })}
        <button onClick={() => onPage(page + 1)} disabled={page >= totalPages} className="p-1 rounded-sm text-mute hover:text-ink hover:bg-canvas-soft disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronRight className="w-4 h-4" />
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

export function Tabs({ tabs, active, onChange }: { tabs: Tab[]; active: string; onChange: (key: string) => void }) {
  return (
    <div className="flex flex-wrap gap-0.5 bg-canvas-soft-2 rounded-sm p-0.5 w-full max-w-full">
      {tabs.map((t) => (
        <button
          key={t.key}
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
