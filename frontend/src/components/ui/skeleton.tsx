import { type ReactNode } from 'react'

export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden="true" />
}

export function SkeletonRow({ className = '' }: { className?: string }) {
  return <Skeleton className={`h-4 w-full ${className}`} />
}

export function TableSkeleton({ rows = 6, columns = 5, className = '' }: { rows?: number; columns?: number; className?: string }) {
  return (
    <div className={`p-4 ${className}`} aria-busy="true" aria-label="Loading">
      <div className="flex items-center gap-3 py-2 border-b border-hairline px-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3" style={{ width: `${70 - i * 6}%` }} />
        ))}
      </div>
      <div className="divide-y divide-hairline">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-3 py-3 px-3">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton key={c} className="h-3.5" style={{ width: `${80 - ((r + c) % 4) * 12}%` }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function CardGridSkeleton({ count = 4, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-md card-shadow p-4">
          <Skeleton className="h-3 w-20 mb-3" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-3 w-24 mt-2" />
        </div>
      ))}
    </div>
  )
}

export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-md card-shadow p-5 ${className}`}>
      <Skeleton className="h-4 w-40 mb-1" />
      <Skeleton className="h-3 w-56 mb-6" />
      <div className="space-y-4">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow className="w-3/4" />
      </div>
    </div>
  )
}

export function FormSkeleton({ fields = 8, className = '' }: { fields?: number; className?: string }) {
  return (
    <div className={`space-y-6 ${className}`}>
      <div className="bg-white rounded-md card-shadow p-5">
        <Skeleton className="h-4 w-40" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          {Array.from({ length: fields }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-3 w-24 mb-1.5" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function withSkeleton(loading: boolean, fallback: ReactNode, content: ReactNode): ReactNode {
  return loading ? fallback : content
}