import { type ReactNode } from 'react'
import { FileX, Loader2 } from 'lucide-react'

export function EmptyState({ icon: Icon, title, description, action }: { icon?: React.ElementType; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-canvas-soft-2 flex items-center justify-center mb-3">
        {Icon ? <Icon className="w-5 h-5 text-mute" /> : <FileX className="w-5 h-5 text-mute" />}
      </div>
      <h3 className="text-[15px] font-semibold text-ink mb-1">{title}</h3>
      {description && <p className="text-[13px] text-body leading-relaxed max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
      <Loader2 className="w-6 h-6 text-mute animate-spin mb-2" />
      <span className="text-[13px] text-mute">{message}</span>
    </div>
  )
}

export function PageError({ message = 'Something went wrong. Please try again.', onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-error-soft flex items-center justify-center mb-3">
        <FileX className="w-5 h-5 text-error" />
      </div>
      <h3 className="text-[15px] font-semibold text-ink mb-1">Failed to load</h3>
      <p className="text-[13px] text-body leading-relaxed max-w-xs">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-4 px-3 h-8 text-[13px] font-medium rounded-sm bg-ink text-white hover:bg-ink/90 transition-colors">
          Try again
        </button>
      )}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div>
        <h1 className="text-[20px] font-semibold text-ink tracking-[-0.03em]">{title}</h1>
        {subtitle && <p className="text-[13px] text-body mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  )
}
