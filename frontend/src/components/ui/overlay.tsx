import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [open])

  if (!open) return null

  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className={`relative w-full ${sizes[size]} max-h-[85vh] flex flex-col bg-white rounded-md modal-shadow z-10`}>
        {title && (
          <div className="flex shrink-0 items-center justify-between px-5 py-3.5 border-b border-hairline">
            <h3 className="text-[15px] font-semibold text-ink tracking-[-0.02em]">{title}</h3>
            <button onClick={onClose} className="p-1 rounded-sm hover:bg-canvas-soft text-mute hover:text-ink transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="p-5 overflow-y-auto">{children}</div>
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
  danger?: boolean
  loading?: boolean
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, danger, loading }: ConfirmProps) {
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div>
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        <p className="text-[13px] text-body mt-1.5 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-3 h-8 text-[13px] font-medium rounded-sm bg-white border border-hairline text-ink hover:bg-canvas-soft transition-colors">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className={`px-3 h-8 text-[13px] font-medium rounded-sm ${danger ? 'bg-error text-white hover:bg-error-deep' : 'bg-ink text-white hover:bg-ink/90'} transition-colors disabled:opacity-40`}>
            {loading ? 'Please wait...' : 'Confirm'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
