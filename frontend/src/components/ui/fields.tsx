import { type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, forwardRef, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success'
type BtnSize = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant
  size?: BtnSize
  loading?: boolean
}

const variantClasses: Record<BtnVariant, string> = {
  primary: 'bg-blue-600 text-white shadow-sm hover:bg-blue-700 active:bg-blue-800',
  secondary: 'bg-white text-slate-700 border border-slate-200 shadow-2xs hover:bg-slate-50 hover:border-slate-300',
  danger: 'bg-rose-600 text-white shadow-sm hover:bg-rose-700 active:bg-rose-800',
  success: 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900',
}

const sizeClasses: Record<BtnSize, string> = {
  sm: 'px-2.5 h-8 text-[12px] font-semibold rounded-lg gap-1.5',
  md: 'px-3.5 h-9 text-[13px] font-semibold rounded-xl gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className = '', children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center cursor-pointer transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {loading && <Spinner className="w-3.5 h-3.5" />}
      {children}
    </button>
  )
)
Button.displayName = 'Button'

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

// ---------- Label with required marker ----------
export function Label({ htmlFor, required, children }: { htmlFor?: string; required?: boolean; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
      {children}
      {required && <span className="text-rose-500 ml-0.5" aria-hidden="true">*</span>}
    </label>
  )
}

const inputBase =
  'w-full h-9 px-3 text-[13px] bg-white border rounded-xl outline-none transition-all duration-150 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 disabled:text-slate-400'

const errorRing = 'border-rose-300 bg-rose-50/40 focus:border-rose-500 focus:ring-rose-500/10'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  required?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, required, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '_')
    return (
      <div className="w-full">
        {label && <Label htmlFor={inputId} required={required}>{label}</Label>}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          className={`${inputBase} ${error ? errorRing : 'border-slate-200'} ${className}`}
          {...props}
        />
        {error && <p className="text-[11px] font-medium text-rose-600 mt-1">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  required?: boolean
  options: { value: string; label: string }[]
  wrapperClassName?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, required, options, className = '', wrapperClassName = '', id, ...props }, ref) => {
    const selId = id || label?.toLowerCase().replace(/\s+/g, '_')
    return (
      <div className={`w-full ${wrapperClassName}`}>
        {label && <Label htmlFor={selId} required={required}>{label}</Label>}
        <div className="relative">
          <select
            ref={ref}
            id={selId}
            aria-invalid={!!error}
            className={`${inputBase} cursor-pointer appearance-none pr-9 ${error ? errorRing : 'border-slate-200'} ${className}`}
            {...props}
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
        {error && <p className="text-[11px] font-medium text-rose-600 mt-1">{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  required?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, required, className = '', id, ...props }, ref) => {
    const taId = id || label?.toLowerCase().replace(/\s+/g, '_')
    return (
      <div className="w-full">
        {label && <Label htmlFor={taId} required={required}>{label}</Label>}
        <textarea
          ref={ref}
          id={taId}
          aria-invalid={!!error}
          className={`${inputBase} h-auto min-h-24 py-2.5 leading-relaxed resize-y ${error ? errorRing : 'border-slate-200'} ${className}`}
          {...props}
        />
        {error && <p className="text-[11px] font-medium text-rose-600 mt-1">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

interface ToggleProps {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  hint?: string
}

export function Toggle({ label, checked, onChange, hint }: ToggleProps) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5 cursor-pointer select-none">
      <span className="min-w-0">
        <span className="block text-[12.5px] font-semibold text-slate-700">{label}</span>
        {hint && <span className="block text-[11px] text-slate-500 mt-0.5">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${checked ? 'bg-blue-600' : 'bg-slate-200'}`}
      >
        <span className={`absolute top-[2px] w-4 h-4 rounded-full bg-white shadow-sm transition-all ${checked ? 'left-[18px]' : 'left-[2px]'}`} />
      </button>
    </label>
  )
}

export function Section({ icon: Icon, title, children }: { icon?: React.ElementType; title: string; children: ReactNode }) {
  return (
    <div className="mb-5 last:mb-0">
      <div className="flex items-center gap-2 mb-3">
        {Icon && (
          <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4" />
          </span>
        )}
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</h4>
      </div>
      <div className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-4 space-y-3">{children}</div>
    </div>
  )
}

// ---------- Form design system ----------
export function FormSection({ icon: Icon, title, subtitle, children, className = '', anchor }: { icon?: React.ElementType; title: string; subtitle?: string; children: ReactNode; className?: string; anchor?: string }) {
  return (
    <section id={anchor} className={`bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden scroll-mt-4 ${className}`}>
      <header className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/40 flex items-center gap-3">
        {Icon && (
          <span className="inline-flex w-8 h-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
            <Icon className="w-4 h-4" />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="text-[13px] font-bold text-slate-900 tracking-tight">{title}</h3>
          {subtitle && <p className="text-[11px] text-slate-500 truncate mt-0.5">{subtitle}</p>}
        </div>
      </header>
      <div className="p-5">{children}</div>
    </section>
  )
}

export function FormGrid({ children, cols = 2, className = '' }: { children: ReactNode; cols?: 1 | 2 | 3 | 4; className?: string }) {
  const colsClass = { 1: 'grid-cols-1', 2: 'grid-cols-1 md:grid-cols-2', 3: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3', 4: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4' }[cols]
  return <div className={`grid ${colsClass} gap-4 ${className}`}>{children}</div>
}

export function FormRow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`flex flex-col gap-4 ${className}`}>{children}</div>
}

export function FormDivider({ label }: { label?: string }) {
  if (!label) return <hr className="border-slate-100 my-1" />
  return (
    <div className="flex items-center gap-3 my-2">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0">{label}</span>
      <hr className="flex-1 border-slate-100" />
    </div>
  )
}