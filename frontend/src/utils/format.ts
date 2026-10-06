export const money = (n: number): string =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n)

export const number = (n: number, decimals = 0): string =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: decimals }).format(n)

export const percent = (n: number, decimals = 1): string =>
  new Intl.NumberFormat('en-IN', { style: 'percent', minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n / 100)

export const monthYear = (month: number, year: number): string => {
  const d = new Date(year, month - 1)
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

export const shortMonth = (month: number): string => {
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month - 1]
}

/**
 * Timestamps coming back from the API are UTC - SQLite's datetime('now') and
 * `new Date().toISOString()` both write UTC - but they arrive without a 'Z', and
 * JavaScript reads an unstamped ISO string as *local* time. Anchoring it to Z
 * here is what makes "11:44" show up as 17:14 for a viewer in IST.
 *
 * Returns null for date-only values ("2026-10-06"), which carry no time and must
 * not be shifted.
 */
const parseTimestamp = (v: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(v)) return null
  const iso = v.trim().replace(' ', 'T')
  const d = new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(iso) ? iso : iso + 'Z')
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * The app-wide date format: dd-mm-yyyy (Indian standard). Every date shown to a
 * person - tables, cards, drawers, letters, the dashboard - goes through this.
 *
 * A value that carries a time is an instant: it is read as UTC and printed as
 * the viewer's local calendar date, so an event at 00:30 IST does not print
 * yesterday's date. Date-only values are split on their own capture groups
 * instead of being handed to `new Date(...)`, which would read them as UTC
 * midnight and drop a day west of UTC.
 */
export const dateDMY = (d: string | number | Date | null | undefined): string => {
  if (d === null || d === undefined || d === '') return '—'
  const s = String(d).trim()
  const pad = (n: number) => String(n).padStart(2, '0')

  const ts = parseTimestamp(s)
  if (ts) return `${pad(ts.getDate())}-${pad(ts.getMonth() + 1)}-${ts.getFullYear()}`

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`

  const t = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(t.getTime())) return '—'
  return `${pad(t.getDate())}-${pad(t.getMonth() + 1)}-${t.getFullYear()}`
}

/** Local wall-clock time for a UTC timestamp from the API, e.g. "17:14". */
export const timeHM = (d: string | null | undefined): string => {
  if (!d) return '—'
  const t = parseTimestamp(String(d)) ?? new Date(String(d))
  if (Number.isNaN(t.getTime())) return '—'
  return t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

/**
 * The name every table and card already imports for a date. It now prints the
 * app-wide dd-mm-yyyy format, so changing the format here changes it everywhere.
 */
export const dateShort = (d: string | null | undefined): string => dateDMY(d)

export const fullName = (first: string, last: string): string => [first, last].filter(Boolean).join(' ')

/**
 * Gross monthly salary from a salary structure: the sum of the fixed
 * components. Mirrors the backend's own definition in routes/employees.ts so
 * the employee table and payroll cannot disagree. Employee rows arrive from
 * the API with these parts already joined in, and each may be null for an
 * employee with no salary structure yet.
 */
export const grossSalary = (structure?: {
  basic?: number | string | null
  hra?: number | string | null
  conveyance?: number | string | null
  other_allowance?: number | string | null
} | null): number => {
  if (!structure) return 0
  return (['basic', 'hra', 'conveyance', 'other_allowance'] as const)
    .reduce((sum, key) => sum + (Number(structure[key]) || 0), 0)
}

export const statusColor = (status: string): string => {
  switch (status) {
    case 'active': return 'bg-success-soft text-success'
    case 'inactive': return 'bg-error-soft text-error-deep'
    case 'exited': return 'bg-canvas-soft-2 text-mute'
    case 'draft': return 'bg-warning-soft text-warning-deep'
    case 'finalized': return 'bg-link-soft text-link-deep'
    case 'paid': return 'bg-success-soft text-success'
    case 'processing': return 'bg-warning-soft text-warning-deep'
    default: return 'bg-canvas-soft-2 text-mute'
  }
}

export const statusLabel = (status: string): string => {
  switch (status) {
    case 'active': return 'Active'
    case 'inactive': return 'Inactive'
    case 'exited': return 'Exited'
    case 'draft': return 'Draft'
    case 'finalized': return 'Finalized'
    case 'paid': return 'Paid'
    case 'processing': return 'Processing'
    default: return status
  }
}

export const designationColor = (idx: number): string => {
  const colors = ['text-link', 'text-success', 'text-warning-deep', 'text-error-deep', 'text-gold-deep', 'text-navy-mid']
  return colors[idx % colors.length]
}
