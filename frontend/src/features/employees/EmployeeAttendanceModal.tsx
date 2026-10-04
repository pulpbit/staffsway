import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Lock } from 'lucide-react'
import { attendanceApi } from '@/services/api'
import { Button } from '@/components/ui/fields'
import { Modal } from '@/components/ui/overlay'
import { LoadingState, ErrorState } from '@/components/ui/state'
import { StatusBadge } from '@/components/ui/status'
import { money, dateShort } from '@/utils/format'
import {
  MARK_CHIP, MARK_LABEL, WEEKDAY_DOW,
  buildGridMarks, summarizeGrid, isOutsideEmployment,
} from '@/features/attendance/attendanceGrid'
import type { AttendanceMark } from '@/types/api'

const WEEKDAY_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const todayISO = () => new Date().toISOString().slice(0, 10)
const monthKey = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`

/** Inclusive list of selectable months, from the joining month to the current month. */
function selectableMonths(joiningDate: string | null | undefined) {
  const now = new Date()
  const out: { y: number; m: number; label: string }[] = []
  let y = now.getFullYear()
  let m = now.getMonth() + 1
  if (joiningDate) {
    const jy = Number(String(joiningDate).slice(0, 4))
    const jm = Number(String(joiningDate).slice(5, 7))
    if (jy && jm) {
      y = jy
      m = jm
    }
  }
  // Guard against a future joining date producing an empty list.
  while (y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth() + 1)) {
    out.unshift({ y, m, label: new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) })
    m += 1
    if (m > 12) { m = 1; y += 1 }
  }
  return out
}

interface Props {
  open: boolean
  onClose: () => void
  employeeId: number | null
  employeeName?: string
  employeeCode?: string
  joiningDate?: string | null
  status?: string
}

export default function EmployeeAttendanceModal({
  open, onClose, employeeId, employeeName, employeeCode, joiningDate, status,
}: Props) {
  const now = new Date()
  const [ym, setYm] = useState(() => monthKey(now.getFullYear(), now.getMonth() + 1))

  const months = useMemo(() => selectableMonths(joiningDate), [joiningDate])
  const y = Number(ym.slice(0, 4))
  const m = Number(ym.slice(5, 7))

  const { data, isLoading, error } = useQuery({
    queryKey: ['employee-attendance', employeeId, y, m],
    queryFn: () => attendanceApi.sheet(m, y, { employee_id: String(employeeId) }),
    enabled: open && !!employeeId,
  })

  const row = useMemo(
    () => (data?.data?.rows || []).find((r) => r.employee_id === employeeId),
    [data, employeeId]
  ) as any
  const holidays: Set<string> = useMemo(
    () => new Set((data?.data?.holidays || []).map((h) => h.date)),
    [data]
  )

  // Only an active employee can have their attendance edited. Deactivated and
  // exited employees stay viewable, but the grid is read-only. A month the
  // server has already finalized is read-only too — it answers 409 on save.
  const { data: recData } = useQuery({
    queryKey: ['employee-attendance-months', employeeId],
    queryFn: () => attendanceApi.months({ employee_id: String(employeeId) }),
    enabled: open && !!employeeId,
  })

  /** Months this employee actually has a record for, newest first. */
  const recordedMonths = useMemo(() => {
    const list = (recData?.data || []) as any[]
    return list
      .map((r) => monthKey(Number(r.year), Number(r.month)))
      .filter((k) => months.some((o) => monthKey(o.y, o.m) === k))
  }, [recData, months])
  const recordedSet = useMemo(() => new Set(recordedMonths), [recordedMonths])

  // Open on the newest month that has data, not blindly the current month —
  // payroll is often recorded a month behind, and landing on an empty month
  // made every employee except the most recent one look blank.
  useEffect(() => {
    if (open) setYm(recordedMonths[0] || monthKey(now.getFullYear(), now.getMonth() + 1))
  }, [open, employeeId, recordedMonths])

  const weeklyOffDow = WEEKDAY_DOW[row?.weekly_off || 'Sun'] ?? 0
  const totalDays = new Date(y, m, 0).getDate()
  const monthlyEarnings = Number(row?.monthly_earnings ?? 0)
  const workingHours = Number(row?.working_hours ?? 8)
  const exitDate = row?.exit_date ?? null
  const ot = Number(row?.ot_hours ?? 0) || 0

  const dayDates = useMemo(
    () => Array.from({ length: totalDays }, (_, i) => `${ym}-${String(i + 1).padStart(2, '0')}`),
    [totalDays, ym]
  )

  /* Exactly the grid the monthly Attendance page builds: a stored mark wins,
     otherwise the default for that day. Nothing here reads the month summary
     columns, so the quick action and the Attendance page cannot disagree. */
  const grid = useMemo(
    () =>
      buildGridMarks(dayDates, row?.marks, undefined, {
        weeklyOffDow,
        holidays,
        joiningDate: row?.joining_date ?? joiningDate,
        exitDate,
      }),
    [dayDates, row, weeklyOffDow, holidays, joiningDate, exitDate]
  )

  const summary = useMemo(
    () =>
      summarizeGrid(grid, {
        weeklyOffDow,
        holidays,
        monthlyEarnings,
        workingHours,
        otHours: ot,
        totalDays,
      }),
    [grid, weeklyOffDow, holidays, monthlyEarnings, workingHours, ot, totalDays]
  )

  const hasRecord = row?.attendance_id != null
  const hasStoredMarks = Object.keys(row?.marks || {}).length > 0

  const chips = [
    { k: 'P' as AttendanceMark, n: summary.p },
    { k: 'A' as AttendanceMark, n: summary.a },
    { k: 'R' as AttendanceMark, n: summary.r },
    { k: 'HD' as AttendanceMark, n: summary.hd },
    { k: 'HF' as AttendanceMark, n: summary.hf },
    { k: 'L' as AttendanceMark, n: summary.l },
  ]

  return (
    <Modal open={open} onClose={onClose} size="xl" title={`Attendance — ${employeeName || ''}`}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[12px] text-slate-500">{employeeCode}</span>
            <StatusBadge status={status} />
            {row?.attendance_status && <StatusBadge status={row.attendance_status} />}
            <span className="inline-flex items-center gap-1 text-[12px] text-slate-500">
              <Lock className="w-3 h-3" /> View only &mdash; edit in Attendance
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-slate-500" />
            <select
              value={ym}
              onChange={(e) => setYm(e.target.value)}
              className="h-8 px-2 text-[13px] bg-white border border-slate-200 rounded-lg text-slate-900"
            >
              {months.length === 0 && <option value={ym}>No months available</option>}
              {months.map((o) => {
                const k = monthKey(o.y, o.m)
                return (
                  <option key={k} value={k}>
                    {o.label}{recordedSet.has(k) ? ' — recorded' : ''}
                  </option>
                )
              })}
            </select>
          </div>
        </div>

        {isLoading && <LoadingState message="Loading attendance..." />}
        {!!error && <ErrorState message={(error as any)?.error?.message || 'Could not load attendance.'} />}

        {!isLoading && !error && row && (
          <>
            {/* Where the grid comes from, so a default-filled month is not
                mistaken for entered data. */}
            {!hasStoredMarks && (
              <div className="px-3 py-2 text-[12px] leading-relaxed text-slate-600 bg-slate-50 border border-slate-200 rounded-lg">
                {hasRecord ? (
                  <>
                    No day-wise marks stored for this month. Showing the same default grid as
                    monthly Attendance &mdash; P on working days, R on the weekly off
                    {holidays.size ? ', HD on holidays' : ''}. Edit it in Attendance to change it.
                  </>
                ) : (
                  <>
                    No day-wise marks stored and no monthly record for this month. Showing the
                    same default grid as monthly Attendance.
                  </>
                )}
              </div>
            )}

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {chips.map((c) => (
                <div key={c.k} className="flex items-center gap-1.5 px-2 py-1.5 border border-slate-200 rounded-lg">
                  <span className={`px-1.5 py-0.5 text-[11px] font-medium rounded-lg ${MARK_CHIP[c.k]}`}>{c.k}</span>
                  <span className="text-[13px] font-medium text-slate-900 tabular-nums">{c.n}</span>
                </div>
              ))}
            </div>

            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-2 py-1.5 text-left text-[11px] font-medium font-mono text-slate-500 uppercase">Day</th>
                    {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => {
                      const date = `${ym}-${String(d).padStart(2, '0')}`
                      const dow = new Date(`${date}T00:00:00`).getDay()
                      return (
                        <th key={d} className={`px-1 py-1.5 text-center text-[11px] font-medium font-mono uppercase ${dow === weeklyOffDow ? 'text-slate-500' : 'text-slate-600'}`}>
                          {WEEKDAY_SHORT[dow]}
                          <div className="text-[10px] opacity-70">{d}</div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-2 py-2 text-[11px] font-medium font-mono text-slate-500 uppercase whitespace-nowrap">Mark</td>
                    {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => {
                      const date = `${ym}-${String(d).padStart(2, '0')}`
                      const mark = grid[date]
                      const outside = isOutsideEmployment(date, row.joining_date, exitDate)
                      return (
                        <td key={d} className="px-0.5 py-2 text-center">
                          <span
                            title={outside ? (date > (exitDate || '') ? 'After exit date' : 'Before joining date') : MARK_LABEL[mark]}
                            className={`inline-flex items-center justify-center w-6 h-6 text-[11px] font-medium rounded-lg ${
                              mark ? MARK_CHIP[mark] : 'bg-slate-50 text-slate-500'
                            }`}
                          >
                            {mark || '·'}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex items-end gap-2">
                <div>
                  <div className="block mb-1 text-[11px] font-medium font-mono text-slate-500 uppercase">OT hours</div>
                  <div className="h-8 flex items-center px-2 text-[13px] border border-slate-200 rounded-lg bg-slate-50 text-slate-900 tabular-nums w-28">
                    {summary.ot_hours}
                  </div>
                </div>
                <div className="pb-1.5 text-[12px] text-slate-500">
                  Payable <span className="font-medium text-slate-900 tabular-nums">{summary.payable_days}</span> of {summary.total_days}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-mono text-slate-500 uppercase">Actual salary</div>
                <div className="text-[15px] font-semibold text-slate-900 tabular-nums">{money(summary.actual_salary)}</div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="text-[12px] text-slate-500">
                {row.joining_date && <>Joined {dateShort(String(row.joining_date).slice(0, 10))}</>}
                {exitDate && <> · Exited {dateShort(String(exitDate).slice(0, 10))}</>}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
