import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { TableSkeleton } from './skeleton'
import { type Tone } from './status'

// ---------- Badge ----------
export function Badge({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap shadow-2xs ${className}`}>{children}</span>
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

const statCardGradients: Record<Tone, string> = {
  primary: 'from-blue-600 to-indigo-700 text-white',
  success: 'from-emerald-600 to-teal-700 text-white',
  warning: 'from-amber-500 to-orange-600 text-white',
  danger: 'from-rose-600 to-red-700 text-white',
  info: 'from-sky-500 to-blue-600 text-white',
  neutral: 'from-slate-700 to-slate-800 text-white',
}

export function StatCard({ icon: Icon, label, value, sub, tone = 'primary' }: StatCardProps) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${statCardGradients[tone]} p-5 shadow-sm transition-transform hover:-translate-y-0.5`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">{label}</span>
        {Icon && (
          <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs text-white">
            <Icon className="w-4.5 h-4.5" />
          </div>
        )}
      </div>
      <div className="mt-2.5">
        <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums truncate block text-white">{value}</span>
      </div>
      {sub && <div className="mt-2 text-[11px] font-medium text-white/80 border-t border-white/15 pt-1.5 truncate">{sub}</div>}
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
  hideMd?: boolean
  sticky?: 'left' | 'right'
  /** 1 = always show (mobile), 2 = tablet+, 3 = desktop only */
  priority?: 1 | 2 | 3
  /** Custom card rendering for mobile card view */
  cardRender?: (row: T, idx: number) => ReactNode
}

/** Sticky cells must be fully opaque, otherwise scrolled content bleeds through. */
const stickyClass = (side: 'left' | 'right', bg: string) =>
  side === 'left'
    ? `sticky z-10 ${bg}`
    : `sticky z-10 ${bg} shadow-[-1px_0_0_0_rgba(15,23,42,0.08)]`

const stickyHeadClass = (side: 'left' | 'right') =>
  side === 'left'
    ? 'sticky z-30 bg-slate-100'
    : 'sticky z-30 bg-slate-100 shadow-[-1px_0_0_0_rgba(15,23,42,0.08)]'

function shallowEqualOffsets(a: Record<string, number>, b: Record<string, number>) {
  const ka = Object.keys(a)
  if (ka.length !== Object.keys(b).length) return false
  return ka.every(k => a[k] === b[k])
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
  bare?: boolean
  maxHeight?: string
}

export function Table<T>({ columns, data, keyFn, sortKey, sortDir, onSort, emptyMessage = 'No data found.', emptyState, loading, rowClick, minWidth = '640px', expandedKey, renderExpanded, bare = false, maxHeight = 'max-h-[calc(100vh-16rem)] min-h-[420px]' }: TableProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const [barLeft, setBarLeft] = useState(0)
  const [barRight, setBarRight] = useState(0)
  const [scrollWidth, setScrollWidth] = useState(0)
  const [canHoriz, setCanHoriz] = useState(false)
  const headRefs = useRef<Record<string, HTMLTableCellElement>>({})
  const [leftOffsets, setLeftOffsets] = useState<Record<string, number>>({})
  const [rightOffsets, setRightOffsets] = useState<Record<string, number>>({})

  // Sticky columns must be offset cumulatively, otherwise they stack on top of
  // each other. Widths are measured because content decides them, not a class.
  useEffect(() => {
    const leftCols = columns.filter(c => c.sticky === 'left')
    const rightCols = columns.filter(c => c.sticky === 'right')
    if (leftCols.length === 0 && rightCols.length === 0) return

    const measure = () => {
      const nextLeft: Record<string, number> = {}
      let acc = 0
      for (const c of leftCols) {
        const el = headRefs.current[c.key]
        if (!el) continue
        nextLeft[c.key] = acc
        acc += el.offsetWidth
      }
      const nextRight: Record<string, number> = {}
      let racc = 0
      for (const c of [...rightCols].reverse()) {
        const el = headRefs.current[c.key]
        if (!el) continue
        nextRight[c.key] = racc
        racc += el.offsetWidth
      }
      setLeftOffsets(prev => (shallowEqualOffsets(prev, nextLeft) ? prev : nextLeft))
      setRightOffsets(prev => (shallowEqualOffsets(prev, nextRight) ? prev : nextRight))
    }

    measure()
    const ro = new ResizeObserver(measure)
    for (const c of leftCols) { const el = headRefs.current[c.key]; if (el) ro.observe(el) }
    for (const c of rightCols) { const el = headRefs.current[c.key]; if (el) ro.observe(el) }
    window.addEventListener('resize', measure)
    return () => { ro.disconnect(); window.removeEventListener('resize', measure) }
  }, [columns])

  const stickyStyle = (col: { key: string; sticky?: 'left' | 'right' }): CSSProperties | undefined => {
    if (!col.sticky) return undefined
    const offsets = col.sticky === 'left' ? leftOffsets : rightOffsets
    const v = offsets[col.key]
    if (v === undefined) return col.sticky === 'left' ? { left: 0 } : { right: 0 }
    return col.sticky === 'left' ? { left: v } : { right: v }
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const update = () => {
      setCanHoriz(el.scrollWidth > el.clientWidth + 1)
      setScrollWidth(el.scrollWidth)
      const r = el.getBoundingClientRect()
      setBarLeft(r.left)
      setBarRight(window.innerWidth - r.right)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener('resize', update)
    return () => { ro.disconnect(); window.removeEventListener('resize', update) }
  }, [data.length])

  const syncFromMain = () => {
    if (barRef.current && scrollRef.current) barRef.current.scrollLeft = scrollRef.current.scrollLeft
  }
  const syncFromBar = () => {
    if (scrollRef.current && barRef.current) scrollRef.current.scrollLeft = barRef.current.scrollLeft
  }

  if (loading) {
    return (
      <div className="overflow-x-auto scrollbar-thin">
        <TableSkeleton rows={5} columns={Math.min(columns.length, 5)} />
      </div>
    )
  }

  return (
    <Fragment>
      <div ref={scrollRef} onScroll={syncFromMain} className={bare ? `overflow-auto scrollbar-thin ${maxHeight}` : `overflow-auto scrollbar-thin ${maxHeight} -mx-4 sm:mx-0 rounded-2xl border border-slate-200/80 bg-white shadow-xs`}>
        <table className="w-full text-left" style={{ minWidth }}>
          <thead className="sticky top-0 z-20">
            <tr className="border-b border-slate-200/80 bg-slate-100">
              {columns.map((col) => (
                <th
                  key={col.key}
                  ref={col.sticky === 'left' ? (el) => { if (el) headRefs.current[col.key] = el } : undefined}
                  style={stickyStyle(col)}
                  className={`px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none whitespace-nowrap ${col.sortable ? 'cursor-pointer hover:text-slate-900' : ''} ${col.hideSm ? 'hidden md:table-cell' : ''} ${col.sticky ? stickyHeadClass(col.sticky) : ''} ${col.className || ''}`}
                  onClick={() => col.sortable && onSort?.(col.key)}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.header}
                    {col.sortable && sortKey === col.key && (sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />)}
                    {col.sortable && sortKey !== col.key && <ArrowUpDown className="w-3.5 h-3.5 opacity-30" />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs sm:text-[13px]">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-400 font-medium">
                  {emptyState ?? emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => {
                const isExpanded = expandedKey === keyFn(row)
                // Sticky cells need opaque equivalents of the row's own background.
                const rowBg = isExpanded ? 'bg-blue-50' : idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'
                return (
                  <Fragment key={keyFn(row)}>
                    <tr onClick={() => rowClick?.(row)} className={`transition-colors ${rowClick ? 'cursor-pointer' : ''} ${isExpanded ? 'bg-blue-50' : idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'} hover:bg-blue-50`}>
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          style={stickyStyle(col)}
                          className={`px-4 py-3 align-middle ${col.hideSm ? 'hidden md:table-cell' : ''} ${col.sticky ? stickyClass(col.sticky, rowBg) : ''} ${col.className || ''}`}
                        >
                          {col.render ? col.render(row, idx) : String((row as Record<string, unknown>)[col.key] ?? '')}
                        </td>
                      ))}
                    </tr>
                    {isExpanded && renderExpanded && (
                      <tr className="border-b border-slate-200/80">
                        <td colSpan={columns.length} className="px-5 py-4 bg-slate-50">
                          {renderExpanded(row)}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      {!bare && canHoriz && scrollWidth > 0 && (
        <div
          ref={barRef}
          onScroll={syncFromBar}
          style={{ left: barLeft, right: barRight }}
          className="fixed z-30 bottom-2 overflow-x-auto scrollbar-thin h-3 bg-white/95 backdrop-blur-md rounded-md border border-slate-200/80 shadow-lg"
          aria-hidden="true"
        >
          <div style={{ width: scrollWidth }} className="h-0.5" />
        </div>
      )}
    </Fragment>
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
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 text-xs">
      <span className="text-slate-500 font-medium tabular-nums">Showing <strong className="text-slate-800">{start}–{end}</strong> of <strong className="text-slate-800">{total}</strong> records</span>
      <div className="flex items-center gap-1.5">
        <button onClick={() => onPage(page - 1)} disabled={page <= 1} className="inline-flex items-center gap-1 px-3 h-8 rounded-xl bg-white border border-slate-200/80 text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs">
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
              className={`w-8 h-8 text-xs font-bold rounded-xl transition-all ${p === page ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-200/80 text-slate-700 hover:bg-slate-50'}`}
            >
              {p}
            </button>
          )
        })}
        <button onClick={() => onPage(page + 1)} disabled={page >= totalPages} className="inline-flex items-center gap-1 px-3 h-8 rounded-xl bg-white border border-slate-200/80 text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs">
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
      <div role="tablist" className={`flex ${scrollable ? 'overflow-x-auto scrollbar-thin' : 'flex-wrap'} gap-2 border-b border-slate-200`}>
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={active === t.key}
            onClick={() => onChange(t.key)}
            className={`px-4 pb-2.5 pt-2 text-xs sm:text-[13px] font-bold whitespace-nowrap transition-all -mb-px border-b-2 cursor-pointer ${active === t.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={`ml-2 inline-flex items-center px-2 h-4.5 rounded-full text-[10.5px] font-bold align-middle ${active === t.key ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'}`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>
    )
  }
  return (
    <div role="tablist" className="inline-flex flex-wrap gap-1 bg-slate-100/90 rounded-xl p-1 w-full sm:w-auto border border-slate-200/70">
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={active === t.key}
          onClick={() => onChange(t.key)}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${active === t.key ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          {t.label}
          {t.count !== undefined && <span className="ml-1.5 text-[10.5px] font-semibold opacity-70">({t.count})</span>}
        </button>
      ))}
    </div>
  )
}

export { CardTable } from './CardTable'
export type { CardColumn } from './CardTable'