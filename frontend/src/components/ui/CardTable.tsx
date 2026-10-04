import { useState, type ReactNode } from 'react'
import { Fragment } from 'react'

export interface CardColumn<T> {
  key: string
  header: string
  render?: (row: T, idx: number) => ReactNode
  priority?: 1 | 2 | 3
  cardRender?: (row: T, idx: number) => ReactNode
}

export interface CardTableProps<T> {
  columns: CardColumn<T>[]
  data: T[]
  keyFn: (row: T) => string | number
  emptyMessage?: string
  emptyState?: ReactNode
  loading?: boolean
  rowClick?: (row: T) => void
  bare?: boolean
  cardRender?: (row: T, idx: number, columns: CardColumn<T>[]) => ReactNode
}

function defaultCardRender<T>(row: T, idx: number, cols: CardColumn<T>[]) {
  return (
    <div className="space-y-2">
      {cols
        .filter(c => (c.priority ?? 1) <= 2)
        .map(col => (
          <div key={col.key} className="flex items-start gap-2 text-[13px]">
            <span className="w-[30%] shrink-0 font-medium text-slate-500">{col.header}</span>
            <span className="flex-1 text-slate-900 break-words">
              {col.render ? col.render(row, idx) : String((row as Record<string, unknown>)[col.key] ?? '\u2014')}
            </span>
          </div>
        ))}
    </div>
  )
}

export function CardTable<T>({
  columns,
  data,
  keyFn,
  emptyMessage = 'No data found.',
  emptyState,
  loading,
  rowClick,
  bare = false,
  cardRender,
}: CardTableProps<T>) {
  const [expandedCards, setExpandedCards] = useState<Set<string | number>>(new Set())

  const toggleCard = (key: string | number) => {
    setExpandedCards(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const renderCard = (row: T, idx: number) => {
    const key = keyFn(row)
    const isExpanded = expandedCards.has(key)
    const cardCols = columns.filter(c => (c.priority ?? 1) <= 2)

    return (
      <article
        key={key}
        className={`rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md ${isExpanded ? 'shadow-lg ring-1 ring-blue-200' : ''}`}
      >
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {cardRender
                ? cardRender(row, idx, columns)
                : defaultCardRender(row, idx, cardCols)}
            </div>
            <button
              onClick={() => toggleCard(key)}
              className="shrink-0 p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              )}
            </button>
          </div>
          {isExpanded && (
            <div className="pt-2 border-t border-slate-100">
              {columns
                .filter(c => (c.priority ?? 1) > 1)
                .map(col => (
                  <div key={col.key} className="flex items-start gap-2 py-1.5 text-[13px] border-t border-slate-50/80 first:pt-2 first:border-none">
                    <span className="w-[30%] shrink-0 font-medium text-slate-500">{col.header}</span>
                    <span className="flex-1 text-slate-900 break-words">
                      {col.render ? col.render(row, idx) : String((row as Record<string, unknown>)[col.key] ?? '\u2014')}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </article>
    )
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
            <div className="h-4 bg-slate-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={bare ? 'space-y-3' : 'space-y-3 -mx-4 sm:mx-0'}>
      {data.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          {emptyState || <p>{emptyMessage}</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {data.map((row, idx) => renderCard(row, idx))}
        </div>
      )}
    </div>
  )
}

