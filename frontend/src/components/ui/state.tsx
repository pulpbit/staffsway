import { type ReactNode } from 'react'
import { FileX, Loader2, RotateCw, Inbox } from 'lucide-react'

export function EmptyState({ icon: Icon, title, description, action }: { icon?: React.ElementType; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center mb-4">
        {Icon ? <Icon className="w-6 h-6 text-slate-400" /> : <Inbox className="w-6 h-6 text-slate-400" />}
      </div>
      <h3 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h3>
      {description && <p className="text-[13px] text-slate-500 leading-relaxed max-w-sm mt-1.5">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <Loader2 className="w-6 h-6 text-blue-500 animate-spin mb-3" />
      <span className="text-[13px] font-medium text-slate-500">{message}</span>
    </div>
  )
}

export function PageError({ message = 'Something went wrong. Please try again.', onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200/60 flex items-center justify-center mb-4">
        <FileX className="w-6 h-6 text-rose-600" />
      </div>
      <h3 className="text-sm font-bold text-slate-900 tracking-tight">Unable to load data</h3>
      <p className="text-[13px] text-slate-500 leading-relaxed max-w-sm mt-1.5">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-1.5 px-3.5 h-9 text-[13px] font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
        >
          <RotateCw className="w-3.5 h-3.5" /> Retry
        </button>
      )}
    </div>
  )
}

export const ErrorState = PageError

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-[13px] text-slate-500 font-medium mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  )
}