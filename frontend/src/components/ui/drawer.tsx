import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
}

export function Drawer({ open, onClose, title, children, footer }: DrawerProps) {
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <aside
        role="dialog"
        aria-label={title || 'Details'}
        className="fixed inset-y-0 right-0 w-full max-w-md flex flex-col bg-white shadow-2xl"
      >
        {title && (
          <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 border-b border-hairline">
            <h3 className="text-[15px] font-semibold text-ink tracking-[-0.02em] truncate">{title}</h3>
            <button onClick={onClose} className="p-1 rounded-sm hover:bg-canvas-soft text-mute hover:text-ink transition-colors" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">{children}</div>
        {footer && <div className="shrink-0 px-4 py-3 border-t border-hairline">{footer}</div>}
      </aside>
    </div>
  )
}