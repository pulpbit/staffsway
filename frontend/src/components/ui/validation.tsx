import { useState } from 'react'
import { Modal } from './overlay'
import { AlertTriangle } from 'lucide-react'

export interface FieldRule {
  key: string
  label: string
  required?: boolean
  requiredWhen?: (form: any) => boolean
  test?: (value: any, form: any) => string | null
}

const isEmpty = (v: any): boolean => {
  if (v === null || v === undefined) return true
  if (typeof v === 'string') return v.trim() === ''
  if (typeof v === 'number') return Number.isNaN(v) || v <= 0
  return false
}

export function runValidation(rules: FieldRule[], form: any): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const rule of rules) {
    const required = rule.requiredWhen ? rule.requiredWhen(form) : !!rule.required
    const value = form[rule.key]
    let message = ''
    if (required && isEmpty(value)) message = `${rule.label} is required.`
    else if (rule.test) {
      const t = rule.test(value, form)
      if (t) message = t
    }
    if (message) errors[rule.key] = message
  }
  return errors
}

export function useFormValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [popupOpen, setPopupOpen] = useState(false)

  const validate = (rules: FieldRule[], form: any): boolean => {
    const next = runValidation(rules, form)
    setErrors(next)
    if (Object.keys(next).length) setPopupOpen(true)
    return Object.keys(next).length === 0
  }

  const applyServerErrors = (fields: Record<string, any>) => {
    const next: Record<string, string> = {}
    for (const [key, raw] of Object.entries(fields)) {
      const msg = Array.isArray(raw) ? raw[0] : raw
      if (typeof msg === 'string' && msg) next[key] = msg
    }
    setErrors(next)
    if (Object.keys(next).length) setPopupOpen(true)
  }

  const clear = (key: string) => setErrors(prev => {
    if (!(key in prev)) return prev
    const next = { ...prev }
    delete next[key]
    return next
  })

  const clearAll = () => { setErrors({}); setPopupOpen(false) }

  const closePopup = () => setPopupOpen(false)

  const invalidLabels = (rules: FieldRule[]) => {
    const byKey = new Map(rules.map(r => [r.key, r.label]))
    return Object.keys(errors)
      .filter(k => errors[k])
      .map(k => byKey.get(k) ?? k.replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
  }

  return { errors, validate, applyServerErrors, clear, clearAll, closePopup, popupOpen, invalidLabels }
}

export function FieldErrorsDialog({ open, labels, onClose }: { open: boolean; labels: string[]; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="flex flex-col">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-9 h-9 rounded-full bg-error/10 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-error" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-ink tracking-[-0.02em]">Please correct the highlighted fields</h3>
            <p className="text-[12px] text-mute mt-0.5">The fields marked red in the form need attention before saving.</p>
          </div>
        </div>
        <ul className="mt-4 space-y-1.5">
          {labels.map(label => (
            <li key={label} className="flex items-start gap-2 text-[13px] text-error">
              <span className="w-1.5 h-1.5 rounded-full bg-error shrink-0 mt-1.5" />
              {label}
            </li>
          ))}
        </ul>
        <div className="flex justify-end mt-5">
          <button onClick={onClose} className="inline-flex items-center justify-center px-3 h-8 text-[13px] font-medium rounded-sm bg-ink text-white hover:bg-ink/90 transition-colors">Got it</button>
        </div>
      </div>
    </Modal>
  )
}