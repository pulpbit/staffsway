import { type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useScrollLock } from './scrollLock'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
}

export function Drawer({ open, onClose, title, children, footer }: DrawerProps) {
  useScrollLock(open)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Details'}
        className="fixed inset-y-0 right-0 w-full max-w-md flex flex-col bg-white border-l border-slate-200/80 shadow-2xl"
      >
        {title && (
          <div className="flex shrink-0 items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
            <h3 className="text-[15px] font-bold text-slate-900 tracking-tight truncate">{title}</h3>
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">{children}</div>
        {footer && <div className="shrink-0 px-5 py-4 border-t border-slate-100 bg-slate-50/60">{footer}</div>}
      </aside>
    </div>
  )
}