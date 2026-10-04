import { type ReactNode } from 'react'
import { Badge } from './data'

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary'

export const toneClass: Record<Tone, string> = {
  success: 'bg-emerald-50 text-emerald-800 border border-emerald-200/60',
  warning: 'bg-amber-50 text-amber-800 border border-amber-200/60',
  danger: 'bg-rose-50 text-rose-800 border border-rose-200/60',
  info: 'bg-sky-50 text-sky-800 border border-sky-200/60',
  neutral: 'bg-slate-100 text-slate-700 border border-slate-200/60',
  primary: 'bg-blue-50 text-blue-800 border border-blue-200/60',
}

export const dotClass: Record<Tone, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  info: 'bg-sky-500',
  neutral: 'bg-slate-400',
  primary: 'bg-blue-600',
}

const LOWER_WORDS = new Set(['in', 'on', 'off', 'of', 'the', 'vs', '&'])

export function formatStatus(raw: string | null | undefined): string {
  if (!raw) return '—'
  const words = String(raw).split(/[_ -]+/)
  return words
    .map((w) => {
      const lower = w.toLowerCase()
      if (LOWER_WORDS.has(lower)) return lower
      if (w === w.toUpperCase() && w.length > 1) return w.charAt(0) + w.slice(1).toLowerCase()
      return w.charAt(0).toUpperCase() + w.slice(1)
    })
    .join(' ')
}

export function statusTone(status: string | null | undefined): Tone {
  const s = (status || '').toLowerCase().replace(/[_\-\s]/g, '')
  if (['active', 'approved', 'paid', 'present', 'verified', 'passed', 'selected', 'joined', 'open', 'done', 'available', 'completed', 'success', 'cleared', 'finalized', 'resolved', 'closed', 'eligible', 'compliant', 'assigned', 'returned'].includes(s)) return 'success'
  if (['pending', 'awaiting', 'inprogress', 'waiting', 'screening', 'applied', 'draft', 'computed', 'review', 'scheduled', 'issued', 'processing', 'offer', 'confirmation'].includes(s)) return 'warning'
  if (['rejected', 'inactive', 'terminated', 'resigned', 'unpaid', 'absent', 'failed', 'overdue', 'expired', 'missing', 'lost', 'cancelled', 'canceled', 'notcompliant', 'failedcompliance', 'short', 'no'].includes(s)) return 'danger'
  if (['onleave', 'halfday', 'onsite', 'training', 'interview', 'inreview', 'underreview', 'leave', 'weeklyoff', 'holiday', 'maternity', 'break'].includes(s)) return 'info'
  if (['activeyes', 'applicable'].includes(s)) return 'success'
  if (['exited', 'relieved', 'separated'].includes(s)) return 'neutral'
  return 'neutral'
}

export function StatusBadge({ status, dot = true, className = '', tone }: { status?: string | null; dot?: boolean; className?: string; tone?: Tone }) {
  const resolved = tone || statusTone(status)
  return (
    <Badge className={`${toneClass[resolved]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotClass[resolved]} mr-1.5 shrink-0`} />}
      {formatStatus(status)}
    </Badge>
  )
}

export function StatusText({ status, className = '' }: { status?: string | null; className?: string }) {
  const tone = statusTone(status)
  return <span className={`inline-flex items-center text-xs font-semibold ${dotClass[tone].replace('bg-', 'text-')} ${className}`}>{formatStatus(status)}</span>
}

export function IconBadge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex w-8 h-8 items-center justify-center rounded-xl ${toneClass[tone]}`}>
      {children}
    </span>
  )
}

export { Badge } from './data'