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
  X: 'Not Joined',
}

export const MARK_CHIP: Record<AttendanceMark, string> = {
  P: 'bg-success text-white',
  A: 'bg-error text-white',
  R: 'bg-neutral text-white',
  HD: 'bg-info text-white',
  HF: 'bg-warning text-ink',
  L: 'bg-error-deep text-white',
  X: 'bg-neutral-soft text-mute ring-1 ring-inset ring-hairline',
}

export const r2 = (n: number) => Math.round(n * 100) / 100

// Days before an employee's joining date are not worked (pre-joining).
export function isPreJoining(date: string, joiningDate?: string | null): boolean {
  if (!joiningDate) return false
  return date < String(joiningDate).slice(0, 10)
}

// Days after the exit date are not worked either — the employee had already
// left, so those days can never hold a real mark.
export function isPostExit(date: string, exitDate?: string | null): boolean {
  if (!exitDate) return false
  return date > String(exitDate).slice(0, 10)
}

/** True when the date falls outside the employee's employment window. */
export function isOutsideEmployment(date: string, joiningDate?: string | null, exitDate?: string | null): boolean {
  return isPreJoining(date, joiningDate) || isPostExit(date, exitDate)
}

export function defaultMark(date: string, weeklyOffDow: number, holidays: Set<string>, joiningDate?: string | null): AttendanceMark {
  if (isPreJoining(date, joiningDate)) return 'X'
  const dow = new Date(`${date}T00:00:00`).getDay()
  if (dow === weeklyOffDow) return 'R'
  if (holidays.has(date)) return 'HD'
  return 'P'
}

/* ------------------------------------------------------------------ *
 * The effective attendance grid.
 *
 * A month rarely has `attendance_daily` rows for every employee, so the grid is
 * never allowed to be blank: a day shows its stored mark when one exists and
 * otherwise falls back to the default for that day (P on a working day, R on
 * the weekly off, HD on a holiday, X outside the employment window). The chips,
 * payable days and salary are then derived from that grid.
 *
 * The monthly Attendance page and the employee quick-action view MUST resolve
 * marks through these helpers, otherwise the same employee shows two different
 * attendance records depending on where you look.
 * ------------------------------------------------------------------ */

export interface GridContext {
  weeklyOffDow: number
  holidays: Set<string>
  joiningDate?: string | null
  exitDate?: string | null
  monthlyEarnings?: number
  workingHours?: number
  otHours?: number
  totalDays: number
}

/** The mark for one day: an override wins, then a stored mark, then the default. */
export function effectiveMark(
  date: string,
  stored: Record<string, AttendanceMark> | null | undefined,
  override: AttendanceMark | undefined,
  ctx: Pick<GridContext, 'weeklyOffDow' | 'holidays' | 'joiningDate' | 'exitDate'>
): AttendanceMark {
  if (override) return override
  if (isOutsideEmployment(date, ctx.joiningDate, ctx.exitDate)) return 'X'
  if (stored?.[date]) return stored[date]
  return defaultMark(date, ctx.weeklyOffDow, ctx.holidays, ctx.joiningDate)
}

/** Builds the full day-by-day mark map for a month. */
export function buildGridMarks(
  dates: string[],
  stored: Record<string, AttendanceMark> | null | undefined,
  overrides: Record<string, AttendanceMark> | undefined,
  ctx: Pick<GridContext, 'weeklyOffDow' | 'holidays' | 'joiningDate' | 'exitDate'>
): Record<string, AttendanceMark> {
  const out: Record<string, AttendanceMark> = {}
  for (const d of dates) out[d] = effectiveMark(d, stored, overrides?.[d], ctx)
  return out
}

/** Summary derived from the effective grid. */
export function summarizeGrid(
  marks: Record<string, AttendanceMark>,
  ctx: Pick<GridContext, 'weeklyOffDow' | 'holidays' | 'monthlyEarnings' | 'workingHours' | 'otHours' | 'totalDays'>
): GridSummary {
  return computeSummary(
    marks,
    ctx.holidays,
    ctx.weeklyOffDow,
    Number(ctx.monthlyEarnings) || 0,
    Number(ctx.workingHours) || 0,
    Number(ctx.otHours) || 0,
    ctx.totalDays
  )
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
  const counts = { P: 0, A: 0, R: 0, HD: 0, HF: 0, L: 0, X: 0 }
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