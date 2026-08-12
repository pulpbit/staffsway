export const r2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100

export const money = (n: number): string =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n)

export const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n))
