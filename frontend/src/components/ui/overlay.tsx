import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useScrollLock } from './scrollLock'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  useScrollLock(open)

  // Escape closes the topmost modal. A modal is now reachable from a quick
  // action while the drawer stays open behind it, so dismissing one must not
  // require reaching for the X and must never take the drawer down with it.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  // z-[60] sits above Drawer (z-50) so a modal opened from a quick action
  // layers on top of the drawer instead of behind it.
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Dialog'}
        className={`relative w-full ${sizes[size]} max-h-[88vh] flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-2xl z-10 overflow-hidden`}
      >
        {title && (
          <div className="flex shrink-0 items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
            <h3 className="text-[15px] font-bold text-slate-900 tracking-tight truncate">{title}</h3>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="p-5 overflow-y-auto scrollbar-thin">{children}</div>
      </div>
    </div>
  )
}

interface ConfirmProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  loading?: boolean
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', danger, loading }: ConfirmProps) {
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div>
        <h3 className="text-[15px] font-bold text-slate-900 tracking-tight">{title}</h3>
        <p className="text-[13px] text-slate-600 mt-2 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-3.5 h-9 text-[13px] font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-3.5 h-9 text-[13px] font-semibold rounded-xl text-white transition-colors disabled:opacity-40 cursor-pointer ${danger ? 'bg-rose-600 hover:bg-rose-700 shadow-sm' : 'bg-blue-600 hover:bg-blue-700 shadow-sm'}`}
          >
            {loading ? 'Please wait...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  )
}