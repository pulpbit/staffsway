import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, MoreHorizontal, Search, X } from 'lucide-react'

// ---------- Avatar ----------
const avatarSizes = { sm: 'w-7 h-7 text-[11px]', md: 'w-9 h-9 text-[13px]', lg: 'w-12 h-12 text-[16px]' }

export function Avatar({ name, size = 'sm', tone = 'navy', className = '', rounded = true }: { name?: string | null; size?: keyof typeof avatarSizes; tone?: 'navy' | 'gold'; className?: string; rounded?: boolean }) {
    const initials = (name || '?')
      .split(/\s+/)
      .map((p) => p.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase()
    return (
      <span className={`inline-flex items-center justify-center shrink-0 font-semibold ${tone === 'gold' ? 'bg-gold text-navy' : 'bg-navy text-white'} ${avatarSizes[size]} ${rounded ? 'rounded-full' : 'rounded-sm'} ${className}`}>
      {initials || '?'}
    </span>
  )
}

// ---------- ActionMenu ----------
export interface ActionItem {
  label?: string
  icon?: React.ElementType
  onClick?: () => void
  danger?: boolean
  disabled?: boolean
  divider?: boolean
}

export function ActionMenu({ items, trigger }: { items: ActionItem[]; trigger?: ReactNode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-label="Actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        className="inline-flex items-center justify-center w-7 h-7 rounded-sm text-mute hover:text-ink hover:bg-canvas-soft border border-transparent hover:border-hairline transition-colors"
      >
        {trigger ?? <MoreHorizontal className="w-4 h-4" />}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md card-shadow-lg border border-hairline z-30 py-1">
          {items.map((item, i) =>
            item.divider ? (
              <div key={i} className="my-1 border-t border-hairline" />
            ) : (
              <button
                key={i}
                role="menuitem"
                disabled={item.disabled}
                onClick={(e) => { e.stopPropagation(); setOpen(false); item.onClick?.() }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-[12px] text-left transition-colors disabled:opacity-40 ${item.danger ? 'text-error hover:bg-error-soft/50' : 'text-body hover:bg-canvas-soft'}`}
              >
                {item.icon && <item.icon className="w-3.5 h-3.5 shrink-0" />}
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}

// ---------- SearchInput ----------
interface SearchInputProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}

export function SearchInput({ value, onChange, placeholder = 'Search...', className = '' }: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-mute pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 pl-8 pr-8 text-[13px] bg-white border border-hairline rounded-sm outline-none transition-colors placeholder:text-mute focus:border-navy-mid"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-sm text-mute hover:text-ink"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

// ---------- FilterBar ----------
export function FilterBar({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <div className={`flex flex-wrap items-end gap-2.5 ${className}`}>{children}</div>
}

export function SelectFilter({ label, value, onChange, options }: { label?: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="flex flex-col gap-1 min-w-36">
      {label && <span className="mono-label">{label}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 px-2.5 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-navy-mid"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  )
}

// ---------- Toolbar ----------
export function Toolbar({ left, right }: { left?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-3 border-b border-hairline">
      <div className="flex flex-wrap items-center gap-2.5 min-w-0">{left}</div>
      {right && <div className="flex flex-wrap items-center gap-2 shrink-0">{right}</div>}
    </div>
  )
}

// ---------- SegmentedControl ----------
export function Segmented<T extends string>({ options, value, onChange, size = 'md' }: { options: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void; size?: 'sm' | 'md' }) {
  const h = size === 'sm' ? 'h-6 text-[11px]' : 'h-7 text-[12px]'
  return (
    <div role="tablist" className="inline-flex items-center gap-0.5 p-0.5 bg-canvas-soft-2 rounded-sm w-full sm:w-auto">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 ${h} font-medium rounded-xs transition-colors ${value === o.value ? 'bg-white text-ink card-shadow' : 'text-mute hover:text-body'}`}
        >
          {o.label}
          {o.count !== undefined && <span className="ml-1 text-[10px] opacity-60">{o.count}</span>}
        </button>
      ))}
    </div>
  )
}

// ---------- Select (native, styled) ----------
export function NativeSelect({ value, onChange, options, className = '', label }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; className?: string; label?: string }) {
  const field = (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full pl-2.5 pr-8 text-[13px] bg-white border border-hairline rounded-sm outline-none appearance-none focus:border-navy-mid"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-mute pointer-events-none" />
    </div>
  )
  if (!label) return field
  return (
    <label className="flex flex-col gap-1">
      <span className="mono-label">{label}</span>
      {field}
    </label>
  )
}