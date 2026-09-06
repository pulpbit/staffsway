import { type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, forwardRef, type ReactNode } from 'react'

type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type BtnSize = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant
  size?: BtnSize
  loading?: boolean
}

const variantClasses: Record<BtnVariant, string> = {
  primary: 'bg-ink text-white hover:bg-ink/90',
  secondary: 'bg-white text-ink border border-hairline hover:bg-canvas-soft',
  danger: 'bg-error text-white hover:bg-error-deep',
  ghost: 'bg-transparent text-body hover:bg-canvas-soft',
}

const sizeClasses: Record<BtnSize, string> = {
  sm: 'px-2 h-7 text-[13px] font-medium rounded-sm',
  md: 'px-3 h-8 text-[13px] font-medium rounded-sm',
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

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '_')
    return (
      <div className="w-full">
        {label && <label htmlFor={inputId} className="block text-[12px] font-medium text-body mb-1 tracking-[-0.01em]">{label}</label>}
        <input
          ref={ref}
          id={inputId}
          className={`w-full h-9 px-2.5 text-[13px] bg-white border rounded-sm outline-none transition-colors placeholder:text-mute focus:border-ink ${error ? 'border-error' : 'border-hairline'} ${className}`}
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
  options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', id, ...props }, ref) => {
    const selId = id || label?.toLowerCase().replace(/\s+/g, '_')
    return (
      <div className="w-full">
        {label && <label htmlFor={selId} className="block text-[12px] font-medium text-body mb-1 tracking-[-0.01em]">{label}</label>}
        <select
          ref={ref}
          id={selId}
          className={`w-full h-9 px-2.5 text-[13px] bg-white border rounded-sm outline-none transition-colors focus:border-ink ${error ? 'border-error' : 'border-hairline'} ${className}`}
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
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const taId = id || label?.toLowerCase().replace(/\s+/g, '_')
    return (
      <div className="w-full">
        {label && <label htmlFor={taId} className="block text-[12px] font-medium text-body mb-1 tracking-[-0.01em]">{label}</label>}
        <textarea
          ref={ref}
          id={taId}
          className={`w-full min-h-20 px-2.5 py-1.5 text-[13px] bg-white border rounded-sm outline-none transition-colors resize-y placeholder:text-mute focus:border-ink ${error ? 'border-error' : 'border-hairline'} ${className}`}
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
}

export function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5 cursor-pointer select-none">
      <span className="text-[12px] text-body">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
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
