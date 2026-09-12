import { type ReactNode } from 'react'
import { Badge } from './data'

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary'

export const toneClass: Record<Tone, string> = {
  success: 'bg-success-soft text-success-deep',
  warning: 'bg-warning-soft text-warning-deep',
  danger: 'bg-error-soft text-error-deep',
  info: 'bg-info-soft text-info-deep',
  neutral: 'bg-neutral-soft text-neutral-deep',
  primary: 'bg-navy-soft text-navy-mid',
}

export const dotClass: Record<Tone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-error',
  info: 'bg-info',
  neutral: 'bg-neutral',
  primary: 'bg-navy-mid',
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

/**
 * Maps any domain status string to a semantic tone.
 * Handles the shared vocabulary used across employees, payroll, leave,
 * attendance, assets, helpdesk, recruitment, compliance and documents.
 */
export function statusTone(status: string | null | undefined): Tone {
  const s = (status || '').toLowerCase().replace(/[_\-\s]/g, '')
  if (['active', 'approved', 'paid', 'present', 'verified', 'passed', 'selected', 'joined', 'open', 'done', 'available', 'completed', 'success', 'cleared', 'finalized', 'resolved', 'closed', 'eligible', 'compliant', 'assigned', 'returned'].includes(s)) return 'success'
  if (['pending', 'awaiting', 'inprogress', 'waiting', 'screening', 'applied', 'draft', 'computed', 'review', 'scheduled', 'issued', 'processing', 'offer', 'confirmation'].includes(s)) return 'warning'
  if (['rejected', 'inactive', 'terminated', 'resigned', 'unpaid', 'absent', 'failed', 'overdue', 'expired', 'missing', 'lost', 'cancelled', 'canceled', 'notcompliant', 'failedcompliance', 'short', 'no'].includes(s)) return 'danger'
  if (['onleave', 'halfday', 'onsite', 'training', 'interview', 'inreview', 'underreview', 'leave', 'weeklyoff', 'holiday', 'maternity', 'break'].includes(s)) return 'info'
  if (['activeyes', 'applicable'].includes(s)) return 'success'
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
  return <span className={`inline-flex items-center text-[12px] font-medium ${dotClass[tone].replace('bg-', 'text-')} ${className}`}>{formatStatus(status)}</span>
}

export function IconBadge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex w-8 h-8 items-center justify-center rounded-sm ${toneClass[tone]}`}>
      {children}
    </span>
  )
}

export { Badge } from './data'