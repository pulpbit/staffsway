import { type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, forwardRef, type ReactNode } from 'react'

type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success'
type BtnSize = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant
  size?: BtnSize
  loading?: boolean
}

const variantClasses: Record<BtnVariant, string> = {
  primary: 'bg-navy text-white hover:bg-navy-mid',
  secondary: 'bg-white text-ink border border-hairline hover:bg-canvas-soft',
  danger: 'bg-error text-white hover:bg-error-deep',
  success: 'bg-success text-white hover:bg-success-deep',
  ghost: 'bg-transparent text-body hover:bg-canvas-soft',
}

const sizeClasses: Record<BtnSize, string> = {
  sm: 'px-2 h-7 text-[12px] font-medium rounded-sm',
  md: 'px-3.5 h-9 text-[13px] font-medium rounded-sm',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className = '', children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
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
    <label htmlFor={htmlFor} className="block text-[12px] font-medium text-body mb-1 tracking-[-0.01em]">
      {children}
      {required && <span className="text-error ml-0.5" aria-hidden="true">*</span>}
    </label>
  )
}

const inputBase =
  'w-full h-9 px-2.5 text-[13px] bg-white border rounded-sm outline-none transition-colors placeholder:text-mute focus:border-navy-mid'

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
          className={`${inputBase} ${error ? 'border-error bg-error-soft/20' : 'border-hairline'} ${className}`}
          {...props}
        />
        {error && <p className="text-[11px] text-error mt-0.5">{error}</p>}
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
        <select
          ref={ref}
          id={selId}
          aria-invalid={!!error}
          className={`${inputBase} ${error ? 'border-error' : 'border-hairline'}`}
          {...props}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {error && <p className="text-[11px] text-error mt-0.5">{error}</p>}
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
          className={`${inputBase} min-h-20 py-1.5 resize-y ${error ? 'border-error' : 'border-hairline'} ${className}`}
          {...props}
        />
        {error && <p className="text-[11px] text-error mt-0.5">{error}</p>}
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
        <span className="block text-[12px] text-body">{label}</span>
        {hint && <span className="block text-[11px] text-mute mt-0.5">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative w-8 h-[18px] rounded-pill transition-colors shrink-0 ${checked ? 'bg-navy' : 'bg-canvas-soft-2 inset-shadow'}`}
      >
        <span className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-all ${checked ? 'left-[16px] bg-gold' : 'left-[2px]'}`} />
      </button>
    </label>
  )
}

export function Section({ icon: Icon, title, children }: { icon?: React.ElementType; title: string; children: ReactNode }) {
  return (
    <div className="mb-5 last:mb-0">
      <div className="flex items-center gap-1.5 mb-3">
        {Icon && <Icon className="w-4 h-4 text-mute" />}
        <h4 className="text-[12px] font-semibold text-ink uppercase tracking-[0.04em] font-mono">{title}</h4>
      </div>
      <div className="bg-canvas-soft/40 border border-hairline rounded-md p-4 space-y-3">{children}</div>
    </div>
  )
}

// ---------- Form design system ----------
export function FormSection({ icon: Icon, title, subtitle, children, className = '' }: { icon?: React.ElementType; title: string; subtitle?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`bg-white rounded-md card-shadow ${className}`}>
      <header className="px-4 py-3 border-b border-hairline flex items-center gap-2.5">
        {Icon && (
          <span className="inline-flex w-8 h-8 items-center justify-center rounded-sm bg-navy-soft text-navy-mid shrink-0">
            <Icon className="w-4 h-4" />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold text-ink tracking-[-0.01em]">{title}</h3>
          {subtitle && <p className="text-[11px] text-mute truncate">{subtitle}</p>}
        </div>
      </header>
      <div className="p-4 sm:p-5">{children}</div>
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
  if (!label) return <hr className="border-hairline my-1" />
  return (
    <div className="flex items-center gap-3 my-2">
      <span className="mono-label shrink-0">{label}</span>
      <hr className="flex-1 border-hairline" />
    </div>
  )
}