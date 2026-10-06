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
  // 0 is a real value (zero OT hours, zero allowance). Only NaN counts as blank.
  if (typeof v === 'number') return Number.isNaN(v)
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
    // Zod reports nested objects either as flat dotted keys ("salary.basic") or
    // as nested objects, depending on version. Flatten both into one dotted key
    // so a field can always look up its own message.
    const walk = (raw: any, prefix: string) => {
      if (Array.isArray(raw)) {
        const msg = raw.find(m => typeof m === 'string' && m)
        if (typeof msg === 'string' && msg) next[prefix] = msg
        return
      }
      if (raw && typeof raw === 'object') {
        for (const [k, v] of Object.entries(raw)) walk(v, prefix ? `${prefix}.${k}` : k)
        return
      }
      if (typeof raw === 'string' && raw) next[prefix] = raw
    }
    for (const [key, raw] of Object.entries(fields)) walk(raw, key)
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

  const prettyLabel = (key: string) => key.replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  /**
   * Rows for the error dialog. Each row keeps the reason the server gave, so a
   * field the form never rendered (client_code, pincode, ...) is still
   * actionable instead of showing up as a bare, un-highlightable name.
   */
  const invalidLabels = (rules: FieldRule[]) => {
    const byKey = new Map(rules.map(r => [r.key, r.label]))
    const seen = new Set<string>()
    const rows: string[] = []
    for (const [key, message] of Object.entries(errors)) {
      if (!message || seen.has(message)) continue
      seen.add(message)
      const label = byKey.get(key) ?? prettyLabel(key)
      // "Client Name is required." already names the field - do not repeat it.
      rows.push(message.toLowerCase().startsWith(label.toLowerCase()) ? message : `${label} — ${message}`)
    }
    return rows
  }

  return { errors, validate, applyServerErrors, clear, clearAll, closePopup, popupOpen, invalidLabels }
}

export function FieldErrorsDialog({ open, labels, onClose }: { open: boolean; labels: string[]; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="flex flex-col">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[15px] font-bold text-slate-900 tracking-tight">Please correct the highlighted fields</h3>
            <p className="text-[12.5px] text-slate-500 mt-1">The fields marked red in the form need attention before saving.</p>
          </div>
        </div>
        <ul className="mt-4 space-y-1.5">
          {labels.map(label => (
            <li key={label} className="flex items-start gap-2.5 text-[13px] font-medium text-rose-700 bg-rose-50/60 border border-rose-200/50 rounded-lg px-3 py-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
              {label}
            </li>
          ))}
        </ul>
        <div className="flex justify-end mt-5">
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center px-3.5 h-9 text-[13px] font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer shadow-sm"
          >
            Got it
          </button>
        </div>
      </div>
    </Modal>
  )
}