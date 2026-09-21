import type { AttendanceMark } from '@/types/api'

export const WEEKDAY_DOW: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

export const MARK_ORDER: AttendanceMark[] = ['P', 'A', 'R', 'HD', 'HF', 'L']

export const MARK_LABEL: Record<AttendanceMark, string> = {
  P: 'Present',
  A: 'Absent',
  R: 'Rest',
  HD: 'Holiday',
  HF: 'Half Day',
  L: 'Leave (LOP)',
}

export const MARK_CHIP: Record<AttendanceMark, string> = {
  P: 'bg-success text-white',
  A: 'bg-error text-white',
  R: 'bg-neutral text-white',
  HD: 'bg-info text-white',
  HF: 'bg-warning text-ink',
  L: 'bg-error-deep text-white',
}

export const r2 = (n: number) => Math.round(n * 100) / 100

export function defaultMark(date: string, weeklyOffDow: number, holidays: Set<string>): AttendanceMark {
  const dow = new Date(`${date}T00:00:00`).getDay()
  if (dow === weeklyOffDow) return 'R'
  if (holidays.has(date)) return 'HD'
  return 'P'
}

export interface GridSummary {
  p: number
  a: number
  r: number
  hd: number
  hf: number
  l: number
  ot_hours: number
  ot_days: number
  payable_days: number
  actual_salary: number
  total_days: number
}

export function computeSummary(
  marks: Record<string, AttendanceMark>,
  holidays: Set<string>,
  weeklyOffDow: number,
  monthlyEarnings: number,
  workingHours: number,
  otHours: number,
  totalDays: number
): GridSummary {
  const counts = { P: 0, A: 0, R: 0, HD: 0, HF: 0, L: 0 }
  for (const [date, mark] of Object.entries(marks)) {
    counts[mark as keyof typeof counts]++
  }
  const wHrs = workingHours > 0 ? workingHours : 8
  const otDays = r2(otHours / wHrs)
  const payable = counts.P + counts.R + counts.HD + counts.HF / 2 + otDays
  const actual = monthlyEarnings > 0 && totalDays > 0 ? r2((monthlyEarnings / totalDays) * payable) : 0
  return {
    p: counts.P, a: counts.A, r: counts.R, hd: counts.HD, hf: counts.HF, l: counts.L,
    ot_hours: otHours, ot_days: otDays, payable_days: payable, actual_salary: actual, total_days: totalDays,
  }
}

export interface EffectiveSheetRow {
  marks: Record<string, AttendanceMark>
  summary: GridSummary
  dirtyMarks: boolean
  dirtyOt: boolean
}