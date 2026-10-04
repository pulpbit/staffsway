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

export const dateShort = (d: string | null | undefined): string => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

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
