import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, MoreHorizontal, Search, X } from 'lucide-react'

// ---------- Avatar ----------
const avatarTones = {
  navy: 'bg-slate-800 text-white',
  blue: 'bg-blue-600 text-white',
  emerald: 'bg-emerald-600 text-white',
  amber: 'bg-amber-500 text-white',
  rose: 'bg-rose-600 text-white',
  violet: 'bg-violet-600 text-white',
  indigo: 'bg-indigo-600 text-white',
  slate: 'bg-slate-200 text-slate-700',
}

const avatarSizes = { sm: 'w-8 h-8 text-[11px]', md: 'w-10 h-10 text-[13px]', lg: 'w-14 h-14 text-lg' }

export function Avatar({
  name,
  size = 'sm',
  tone = 'navy',
  className = '',
  rounded = true,
}: {
  name?: string | null
  size?: keyof typeof avatarSizes
  tone?: keyof typeof avatarTones
  className?: string
  rounded?: boolean
}) {
  const initials = (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center shrink-0 font-bold ${avatarTones[tone]} ${avatarSizes[size]} ${rounded ? 'rounded-full' : 'rounded-xl'} ${className}`}
    >
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
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-colors cursor-pointer"
      >
        {trigger ?? <MoreHorizontal className="w-4 h-4" />}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-slate-200/80 z-30 py-1.5 px-1.5">
          {items.map((item, i) =>
            item.divider ? (
              <div key={i} className="my-1 border-t border-slate-100" />
            ) : (
              <button
                key={i}
                role="menuitem"
                disabled={item.disabled}
                onClick={(e) => { e.stopPropagation(); setOpen(false); item.onClick?.() }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-[12.5px] font-medium text-left rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${item.danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'}`}
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
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full h-9 pl-9 pr-8 text-[13px] bg-white border border-slate-200 rounded-xl outline-none transition-all duration-150 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
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
    <label className="flex flex-col gap-1.5 min-w-36">
      {label && <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className="h-9 w-full pl-3 pr-8 text-[13px] font-medium text-slate-700 bg-white border border-slate-200 rounded-xl outline-none appearance-none cursor-pointer transition-all duration-150 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
      </div>
    </label>
  )
}

// ---------- Toolbar ----------
export function Toolbar({ left, right }: { left?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 px-5 py-3.5 border-b border-slate-100 bg-slate-50/40">
      <div className="flex flex-wrap items-center gap-2.5 min-w-0">{left}</div>
      {right && <div className="flex flex-wrap items-center gap-2 shrink-0">{right}</div>}
    </div>
  )
}

// ---------- SegmentedControl ----------
export function Segmented<T extends string>({ options, value, onChange, size = 'md' }: { options: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void; size?: 'sm' | 'md' }) {
  const h = size === 'sm' ? 'h-7 text-[11px]' : 'h-8 text-[12px]'
  return (
    <div role="tablist" className="inline-flex items-center gap-1 p-1 bg-slate-100/90 border border-slate-200/70 rounded-xl w-full sm:w-auto">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 ${h} font-bold rounded-lg transition-all cursor-pointer ${value === o.value ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          {o.label}
          {o.count !== undefined && <span className="ml-1.5 text-[10.5px] font-semibold opacity-70">{o.count}</span>}
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
        aria-label={label}
        className="h-9 w-full pl-3 pr-8 text-[13px] font-medium text-slate-700 bg-white border border-slate-200 rounded-xl outline-none appearance-none cursor-pointer transition-all duration-150 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
    </div>
  )
  if (!label) return field
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      {field}
    </label>
  )
}