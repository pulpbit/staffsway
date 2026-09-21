import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { attendanceApi, clientApi, siteApi } from '@/services/api'
import { Button } from '@/components/ui/fields'
import { PageHeader } from '@/components/ui/layout'
import { FilterBar, SearchInput, SelectFilter, NativeSelect } from '@/components/ui/actions'
import { LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { downloadCsv } from '@/utils/csv'
import { toast } from 'sonner'
import { Save, Lock, Download, CalendarCheck, CalendarX2, CalendarDays, Palmtree, Sun, Moon, BadgeCheck, IndianRupee } from 'lucide-react'
import { monthYear, money } from '@/utils/format'
import type { AttendanceSheetRow, AttendanceMark } from '@/types/api'
import { MARK_ORDER, MARK_LABEL, MARK_CHIP, WEEKDAY_DOW, defaultMark, isPreJoining, computeSummary, r2 } from './attendanceGrid'

const MARK_TEXT = { P: 'P', A: 'A', R: 'R', HD: 'HD', HF: 'HF', L: 'L', X: 'X' } as const
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const LEFT_COLS = [
  { label: 'Emp. ID', w: 60 },
  { label: 'Emp. Name', w: 132 },
  { label: 'Father / Spouse', w: 104 },
  { label: 'Designation', w: 96 },
  { label: 'Salary', w: 84 },
]

const DAY_W = 38

const RIGHT_COLS = [
  { key: 'P', label: 'P', w: 46 },
  { key: 'A', label: 'A', w: 46 },
  { key: 'R', label: 'R', w: 46 },
  { key: 'HD', label: 'HD', w: 52 },
  { key: 'HF', label: 'HF', w: 52 },
  { key: 'L', label: 'L', w: 52 },
  { key: 'OT', label: 'OT Hrs', w: 88 },
  { key: 'PD', label: 'Payable Days', w: 60 },
  { key: 'SAL', label: 'Actual Salary', w: 122 },
]

interface CellMenu {
  empId: number
  date: string
  x: number
  y: number
}

export default function AttendancePage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [clientFilter, setClientFilter] = useState('')
  const [siteFilter, setSiteFilter] = useState('')
  const [search, setSearch] = useState('')
  const [changes, setChanges] = useState<Map<number, { marks: Record<string, AttendanceMark>; ot_hours?: number }>>(new Map())
  const [menu, setMenu] = useState<CellMenu | null>(null)
  const queryClient = useQueryClient()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['attendance-sheet', month, year, clientFilter, siteFilter, search],
    queryFn: () => attendanceApi.sheet(month, year, { client_id: clientFilter, site_id: siteFilter, search }),
  })

  const { data: clients } = useQuery({ queryKey: ['clients-select'], queryFn: () => clientApi.list() })
  const { data: allSites } = useQuery({ queryKey: ['sites-select'], queryFn: () => siteApi.list() })
  const sites = ((allSites?.data || []) as any[]).filter((s: any) => !clientFilter || String(s.client_id) === clientFilter).sort((a, b) => a.name.localeCompare(b.name))
  const selectedSite = sites.find((s) => String(s.id) === siteFilter)
  const selectedSiteId = siteFilter ? Number(siteFilter) : null

  const sheet = data?.data
  const rows = (sheet?.rows || []) as AttendanceSheetRow[]
  const days = sheet?.days || []
  const holidaySet = useMemo(() => new Set((sheet?.holidays || []).map((h) => h.date)), [sheet])
  const totalDays = sheet?.total_days || 0
  const anyGrid = !!sheet?.anyGrid
  const finalizedCount = sheet?.finalized_count || 0
  const monthLocked = finalizedCount > 0

  const marksMut = useMutation({
    mutationFn: (items: { employee_id: number; marks: Record<string, string>; ot_hours: number }[]) => attendanceApi.marks(month, year, items),
    onSuccess: (r) => { toast.success(r.message || 'Attendance saved.'); setChanges(new Map()); setMenu(null); queryClient.invalidateQueries({ queryKey: ['attendance-sheet'] }) },
    onError: (e: any) => toast.error(e?.error?.message || 'Save failed.'),
  })

  const finalizeMut = useMutation({
    mutationFn: (locked: boolean) => attendanceApi.finalize(month, year, locked),
    onSuccess: (r) => { toast.success(r.message); queryClient.invalidateQueries({ queryKey: ['attendance-sheet'] }) },
    onError: (e: any) => toast.error(e?.error?.message || 'Action failed.'),
  })

  const weekOffMut = useMutation({
    mutationFn: (weeklyOff: string) => siteApi.update(selectedSiteId!, { weekly_off: weeklyOff }),
    onSuccess: (r: any) => { toast.success(`Weekly rest day set to ${r.data?.weekly_off || 'Sun'} for ${selectedSite?.name || 'site'}.`); queryClient.invalidateQueries({ queryKey: ['sites-select'] }); queryClient.invalidateQueries({ queryKey: ['attendance-sheet'] }) },
    onError: (e: any) => toast.error(e?.error?.message || 'Update failed.'),
  })

  const isLockedRow = (row: AttendanceSheetRow) => monthLocked || row.attendance_status === 'finalized'

  const getChange = (empId: number) => changes.get(empId)
  const otFor = (row: AttendanceSheetRow) => {
    const c = getChange(row.employee_id)
    return c?.ot_hours !== undefined ? c.ot_hours : (row.ot_hours ?? 0)
  }
  const markFor = (row: AttendanceSheetRow, date: string): AttendanceMark => {
    if (isPreJoining(date, row.joining_date)) return 'X'
    const c = getChange(row.employee_id)
    if (c?.marks?.[date]) return c.marks[date]
    if (row.marks?.[date]) return row.marks[date]
    return defaultMark(date, WEEKDAY_DOW[row.weekly_off] ?? 0, holidaySet, row.joining_date)
  }
  const isGridRow = (_row: AttendanceSheetRow) => true

  const gridSummary = (row: AttendanceSheetRow) => {
    const marks: Record<string, AttendanceMark> = {}
    for (const d of days) marks[d.date] = markFor(row, d.date)
    return computeSummary(marks, holidaySet, WEEKDAY_DOW[row.weekly_off] ?? 0, row.monthly_earnings, row.working_hours, otFor(row), totalDays)
  }

  const rowSummary = (row: AttendanceSheetRow) => {
    if (isGridRow(row)) return gridSummary(row)
    return {
      p: row.p ?? 0, a: row.a ?? 0, r: row.r ?? 0, hd: row.hd ?? 0, hf: row.hf ?? 0, l: row.l ?? 0,
      ot_hours: row.ot_hours ?? 0, ot_days: row.ot_days ?? 0, payable_days: row.payable_days ?? 0,
      actual_salary: row.actual_salary ?? 0, total_days: totalDays,
    }
  }

  const setMark = (row: AttendanceSheetRow, date: string, mark: AttendanceMark) => {
    if (isLockedRow(row)) return
    if (isPreJoining(date, row.joining_date)) return
    setChanges((prev) => {
      const next = new Map(prev)
      const cur = next.get(row.employee_id) || { marks: {} }
      next.set(row.employee_id, { ...cur, marks: { ...cur.marks, [date]: mark } })
      return next
    })
    setMenu(null)
  }

  const clearMark = (empId: number, date: string) => {
    setChanges((prev) => {
      const next = new Map(prev)
      const cur = next.get(empId)
      if (!cur) return prev
      const marks = { ...cur.marks }
      delete marks[date]
      if (!Object.keys(marks).length && cur.ot_hours === undefined) next.delete(empId)
      else next.set(empId, { ...cur, marks })
      return next
    })
    setMenu(null)
  }

  const setOt = (row: AttendanceSheetRow, value: number) => {
    if (isLockedRow(row)) return
    setChanges((prev) => {
      const next = new Map(prev)
      const cur = next.get(row.employee_id) || { marks: {} }
      next.set(row.employee_id, { ...cur, ot_hours: value })
      return next
    })
  }

  const handleKey = (row: AttendanceSheetRow, date: string) => (e: React.KeyboardEvent) => {
    if (isLockedRow(row)) return
    if (isPreJoining(date, row.joining_date)) return
    const k = e.key.toLowerCase()
    const map: Record<string, AttendanceMark> = { p: 'P', a: 'A', r: 'R', h: 'HD', f: 'HF', l: 'L' }
    if (map[k]) { e.preventDefault(); setMark(row, date, map[k]) }
    else if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); clearMark(row.employee_id, date) }
  }

  const handleSave = () => {
    if (changes.size === 0) { toast('No changes to save.'); return }
    const items = Array.from(changes.keys())
      .filter((empId) => { const row = rows.find((r) => r.employee_id === empId); return row && !isLockedRow(row) })
      .map((empId) => {
        const row = rows.find((r) => r.employee_id === empId)!
        const marks: Record<string, string> = {}
        for (const d of days) marks[d.date] = markFor(row, d.date)
        return { employee_id: empId, marks, ot_hours: otFor(row) }
      })
    if (!items.length) { toast('Nothing to save for the selected month.'); return }
    marksMut.mutate(items)
  }

  const exportCsv = () => {
    if (rows.length === 0) return
    downloadCsv(
      rows.map((row) => {
        const s = rowSummary(row)
        return {
          employee_code: row.employee_code,
          employee_name: `${row.first_name} ${row.last_name}`,
          father_spouse: [row.father_name, row.spouse_name].filter(Boolean).join(' / '),
          client: row.client_name || '',
          site: row.site_name || '',
          designation: row.designation || '',
          salary: row.monthly_earnings || 0,
          p: s.p, a: s.a, r: s.r, hd: s.hd, hf: s.hf, l: s.l,
          ot_hours: s.ot_hours, ot_days: s.ot_days,
          payable_days: s.payable_days, actual_salary: s.actual_salary,
        }
      }),
      `attendance_${year}-${String(month).padStart(2, '0')}`
    )
    toast.success('Attendance sheet exported.')
  }

  const totals = rows.reduce(
    (acc, row) => {
      const s = rowSummary(row)
      acc.p += s.p; acc.a += s.a; acc.rx += s.r; acc.hd += s.hd; acc.hf += s.hf; acc.l += s.l
      acc.ot += s.ot_hours; acc.otd += s.ot_days; acc.pd += s.payable_days; acc.amt += s.actual_salary
      return acc
    },
    { p: 0, a: 0, rx: 0, hd: 0, hf: 0, l: 0, ot: 0, otd: 0, pd: 0, amt: 0 }
  )
  totals.pd = r2(totals.pd); totals.otd = r2(totals.otd)

  const dayCounts = useMemo(() => {
    const map: Record<string, Record<AttendanceMark, number>> = {}
    for (const row of rows) {
      if (!isGridRow(row)) continue
      for (const d of days) {
        const date = d.date
        const cell = (map[date] || (map[date] = { P: 0, A: 0, R: 0, HD: 0, HF: 0, L: 0, X: 0 }))
        cell[markFor(row, date)]++
      }
    }
    return map
  }, [rows, changes, days, holidaySet])

  const dirtyCount = changes.size

  // Sticky left offsets accumulate.
  let leftAcc = 0
  const leftOffsets = LEFT_COLS.map((c) => { const o = leftAcc; leftAcc += c.w; return o })
  const rightAcc = RIGHT_COLS.reduce((s, c) => s + c.w, 0)

  return (
    <div className="flex flex-col h-full min-h-0">
      <PageHeader
        title="Monthly Attendance"
        description={`${monthYear(month, year)} · ${rows.length} active employee${rows.length === 1 ? '' : 's'} · ${totalDays} calendar days${monthLocked ? ' · month locked' : ''}`}
        actions={
          <>
            <Button variant="secondary" onClick={exportCsv} disabled={rows.length === 0}><Download className="w-3.5 h-3.5" /> Export</Button>
            {monthLocked ? (
              <Button variant="secondary" onClick={() => finalizeMut.mutate(false)} loading={finalizeMut.isPending}><Lock className="w-3.5 h-3.5" /> Unlock Month</Button>
            ) : (
              <Button variant="secondary" onClick={() => finalizeMut.mutate(true)} loading={finalizeMut.isPending}><Lock className="w-3.5 h-3.5" /> Lock Month</Button>
            )}
            <Button onClick={handleSave} loading={marksMut.isPending} disabled={dirtyCount === 0}><Save className="w-3.5 h-3.5" /> Save Changes</Button>
          </>
        }
      />

      <div className="flex-1 min-h-0 bg-white card-shadow rounded-md overflow-hidden flex flex-col">
        <FilterBar className="px-4 py-3 border-b border-hairline shrink-0">
          <NativeSelect className="w-40" value={String(month)} onChange={(v) => { setMonth(Number(v)); setChanges(new Map()) }} options={Array.from({ length: 12 }, (_, i) => i + 1).map((m) => ({ value: String(m), label: new Date(2000, m - 1).toLocaleDateString('en-US', { month: 'long' }) }))} />
          <NativeSelect className="w-24" value={String(year)} onChange={(v) => { setYear(Number(v)); setChanges(new Map()) }} options={[2024, 2025, 2026, 2027].map((y) => ({ value: String(y), label: String(y) }))} />
          <SelectFilter label="Client" value={clientFilter} onChange={(v) => { setClientFilter(v); setSiteFilter(''); setChanges(new Map()) }} options={[{ value: '', label: 'All Clients' }, ...(clients?.data || []).map((c: any) => ({ value: String(c.id), label: c.name }))]} />
          <SelectFilter label="Site" value={siteFilter} onChange={(v) => { setSiteFilter(v); setChanges(new Map()) }} options={[{ value: '', label: 'All Sites' }, ...sites.map((s: any) => ({ value: String(s.id), label: s.name }))]} />
          <SearchInput value={search} onChange={setSearch} placeholder="Search employee..." className="w-full sm:flex-1 sm:min-w-48" />
          {selectedSite && (
            <NativeSelect
              className="w-40"
              label="Week Off"
              value={selectedSite.weekly_off || 'Sun'}
              onChange={(v) => weekOffMut.mutate(v)}
              options={WEEKDAYS.map((d) => ({ value: d, label: d }))}
            />
          )}
        </FilterBar>

        {(isLoading || marksMut.isPending) ? (
          <div className="p-4"><LoadingState /></div>
        ) : error ? (
          <PageError onRetry={() => refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState title="No employees on the sheet" description="Add employees first, then enter their attendance here." />
        ) : (
          <div className="flex-1 min-h-[280px] overflow-auto scrollbar-thin">
            <table className="border-collapse text-[12px]" style={{ width: leftAcc + days.length * DAY_W + rightAcc, minWidth: leftAcc + days.length * DAY_W + rightAcc }}>
              <thead>
                <tr>
                  {LEFT_COLS.map((c, i) => (
                    <th key={c.label} title={c.label} style={{ left: leftOffsets[i], minWidth: c.w, width: c.w, maxWidth: c.w, zIndex: 30 }} className="sticky top-0 px-2 py-1.5 text-left text-[10px] font-medium font-mono text-mute uppercase tracking-[0.04em] bg-canvas-soft border-b border-hairline overflow-hidden">
                      <span className="block truncate">{c.label}</span>
                    </th>
                  ))}
                  {days.map((d) => (
                    <th key={d.date} className="sticky top-0 px-0 py-1 text-center border-l border-b border-hairline bg-canvas-soft" style={{ minWidth: DAY_W, width: DAY_W, zIndex: 20 }}>
                      <span className="block text-[10px] font-medium text-mute leading-tight">{d.label}</span>
                      <span className="block text-[11px] font-semibold text-ink tabular-nums leading-tight">{d.dayNo}</span>
                    </th>
                  ))}
                  {RIGHT_COLS.map((c, i) => (
                    <th key={c.key} className="px-1.5 py-1 text-center text-[10px] font-medium font-mono text-mute uppercase tracking-[0.02em] bg-canvas-soft border-b border-hairline" style={{ minWidth: c.w, width: c.w }}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const locked = isLockedRow(row)
                  const grid = isGridRow(row)
                  const dirty = changes.has(row.employee_id)
                  const s = rowSummary(row)
                  const weeklyOffDow = WEEKDAY_DOW[row.weekly_off] ?? 0
                  const stickyBg = dirty ? 'bg-link-soft' : idx % 2 === 1 ? 'bg-canvas-soft' : 'bg-white'
                  return (
                    <tr key={row.employee_id} className={`border-b border-hairline transition-colors ${idx % 2 === 1 ? 'bg-canvas-soft/40' : ''} ${dirty ? 'bg-link-soft/30' : ''} hover:bg-canvas-soft/70`}>
                      {LEFT_COLS.map((c, i) => (
                        <td key={c.label} style={{ left: leftOffsets[i], minWidth: c.w, width: c.w, maxWidth: c.w, zIndex: 10 }} className={`sticky px-2 py-1.5 overflow-hidden shadow-[1px_0_0_0_rgba(1,27,63,0.06)] ${stickyBg}`}>
                          {i === 0 && <span className="font-mono text-[11px] text-mute">{row.employee_code}</span>}
                          {i === 1 && <span className="block text-[12px] font-medium text-ink leading-tight">{row.first_name} {row.last_name}</span>}
                          {i === 2 && <span className="block text-[11px] text-mute leading-tight truncate" title={[row.father_name, row.spouse_name].filter(Boolean).join(' / ') || ''}>{[row.father_name, row.spouse_name].filter(Boolean).join(' / ') || '—'}</span>}
                          {i === 3 && <span className="block text-[11px] text-body leading-tight truncate" title={row.designation || ''}>{row.designation || '—'}</span>}
                          {i === 4 && <span className="font-mono text-[11px] text-body tabular-nums">₹{money(row.monthly_earnings)}</span>}
                        </td>
                      ))}
                      {days.map((d) => {
                        const date = d.date
                        const mark = markFor(row, date)
                        const isWeekend = weeklyOffDow === d.dow
                        const holiday = holidaySet.has(date)
                        const preJoin = isPreJoining(date, row.joining_date)
                        const isOverride = !preJoin && mark !== null && mark !== defaultMark(date, weeklyOffDow, holidaySet, row.joining_date)
                        return (
                          <td key={date} className="px-0.5 py-1 text-center border-l border-hairline" style={{ minWidth: DAY_W, width: DAY_W }}>
                            <button
                              type="button"
                              disabled={locked || preJoin}
                              aria-label={`${date} ${MARK_LABEL[mark]}`}
                              onClick={(e) => !locked && !preJoin && setMenu({ empId: row.employee_id, date, x: e.clientX, y: e.clientY })}
                              onKeyDown={handleKey(row, date)}
                              title={`${d.label} ${d.dayNo} · ${MARK_LABEL[mark]}${isOverride ? ' (override)' : ''}`}
                              className={`w-full h-7 rounded-sm text-[11px] font-semibold tabular-nums transition-colors relative ${locked || preJoin ? 'cursor-default' : 'cursor-pointer hover:ring-1 hover:ring-navy-mid'} ${MARK_CHIP[mark]} ${isOverride ? 'ring-1 ring-warning/40' : ''}`}
                            >
                              {MARK_TEXT[mark]}
                            </button>
                          </td>
                        )
                      })}
                      {RIGHT_COLS.map((c, i) => (
                        <td key={c.key} className="px-1.5 py-1 text-center" style={{ minWidth: c.w, width: c.w }}>
                          {c.key === 'OT' ? (
                            <input
                              type="number" min={0} max={200} step={0.5}
                              value={otFor(row)}
                              disabled={locked}
                              onChange={(e) => setOt(row, Math.min(200, Math.max(0, Number(e.target.value) || 0)))}
                              aria-label="Overtime hours"
                              className="w-full h-7 text-center text-[11px] bg-white border border-hairline rounded-sm outline-none transition-colors focus:border-navy-mid disabled:opacity-50 disabled:cursor-not-allowed tabular-nums"
                            />
                          ) : c.key === 'SAL' ? (
                            <span className="font-mono text-[11px] font-medium text-ink tabular-nums">₹{money(s.actual_salary)}</span>
                          ) : (
                            <span className={`tabular-nums ${c.key === 'PD' ? 'font-semibold text-ink' : 'text-body'}`}>
                              {c.key === 'PD' ? s.payable_days : (s as any)[String(c.key).toLowerCase()] ?? 0}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-canvas-soft border-t border-hairline shadow-[0_-1px_0_rgba(1,27,63,0.05)]">
                  <td style={{ left: leftOffsets[0], zIndex: 30 }} className="sticky bottom-0 px-2 py-1.5 bg-canvas-soft">
                    <span className="text-[11px] font-semibold text-ink uppercase tracking-wide">Total</span>
                  </td>
                  {LEFT_COLS.slice(1).map((c, i) => (
                    <td key={c.label} style={{ left: leftOffsets[i + 1], zIndex: 30 }} className="sticky bottom-0 px-2 py-1.5 bg-canvas-soft" />
                  ))}
                  {days.map((d) => {
                    const c = dayCounts[d.date]
                    const bits = c ? [c.P && `P${c.P}`, c.A && `A${c.A}`, c.R && `R${c.R}`, c.HD && `HD${c.HD}`, c.HF && `HF${c.HF}`, c.L && `L${c.L}`, c.X && `X${c.X}`].filter(Boolean) : []
                    return (
                      <td key={d.date} className="sticky bottom-0 px-0.5 py-1 text-center border-l border-hairline bg-canvas-soft" style={{ minWidth: DAY_W, width: DAY_W, zIndex: 10 }}>
                        <span className="text-[9px] leading-[1.35] text-mute tabular-nums block">{bits.join(' ')}</span>
                      </td>
                    )
                  })}
                  {RIGHT_COLS.map((c, i) => (
                    <td key={c.key} className="sticky bottom-0 px-1.5 py-1 text-center bg-canvas-soft" style={{ zIndex: 10 }}>
                      <span className="font-mono text-[11px] font-semibold text-ink tabular-nums">
                        {c.key === 'P' ? totals.p : c.key === 'A' ? totals.a : c.key === 'R' ? totals.rx : c.key === 'HD' ? totals.hd : c.key === 'HF' ? totals.hf : c.key === 'L' ? totals.l : c.key === 'OT' ? `${totals.ot}hrs` : c.key === 'PD' ? totals.pd : `₹${money(totals.amt)}`}
                      </span>
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Stat summary cards */}
      <div className="flex gap-2 mt-3 shrink-0 overflow-x-auto scrollbar-thin pb-1">
        <SummaryStat icon={CalendarCheck} tone="text-success bg-success-soft" label="Present" value={String(totals.p)} />
        <SummaryStat icon={CalendarX2} tone="text-error bg-error-soft" label="Absent" value={String(totals.a)} />
        <SummaryStat icon={Palmtree} tone="text-mute bg-neutral-soft" label="Rest" value={String(totals.rx)} />
        <SummaryStat icon={CalendarDays} tone="text-info-deep bg-info-soft" label="Holidays" value={String(totals.hd)} />
        <SummaryStat icon={Moon} tone="text-warning-deep bg-warning-soft" label="Half Days" value={String(totals.hf)} />
        <SummaryStat icon={Sun} tone="text-error-deep bg-error-soft" label="Leave" value={String(totals.l)} />
        <SummaryStat icon={BadgeCheck} tone="text-navy-mid bg-navy-soft" label="Payable Days" value={String(totals.pd)} />
        <SummaryStat icon={IndianRupee} tone="text-success bg-success-soft" label="Actual Salary" value={`₹${money(totals.amt)}`} />
        <SummaryStat icon={CalendarX2} tone="text-mute bg-neutral-soft" label="OT (Hrs/Days)" value={`${r2(totals.ot)} / ${totals.otd}`} />
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-4 py-3 rounded-md bg-white card-shadow mt-3 text-[12px] shrink-0">
        <span className="flex items-center gap-1.5 text-body"><span className="w-3.5 h-3.5 rounded-sm bg-success text-[9px] inline-flex items-center justify-center font-bold text-white">P</span> Present</span>
        <span className="flex items-center gap-1.5 text-body"><span className="w-3.5 h-3.5 rounded-sm bg-error text-[9px] inline-flex items-center justify-center font-bold text-white">A</span> Absent</span>
        <span className="flex items-center gap-1.5 text-body"><span className="w-3.5 h-3.5 rounded-sm bg-neutral text-[9px] inline-flex items-center justify-center font-bold text-white">R</span> Weekly Rest</span>
        <span className="flex items-center gap-1.5 text-body"><span className="w-3.5 h-3.5 rounded-sm bg-info text-[9px] inline-flex items-center justify-center font-bold text-white">HD</span> Holiday</span>
        <span className="flex items-center gap-1.5 text-body"><span className="w-3.5 h-3.5 rounded-sm bg-warning text-[9px] inline-flex items-center justify-center font-bold text-ink">HF</span> Half Day (½ PD)</span>
        <span className="flex items-center gap-1.5 text-body"><span className="w-3.5 h-3.5 rounded-sm bg-error-deep text-[9px] inline-flex items-center justify-center font-bold text-white">L</span> Leave (no pay)</span>
        <span className="flex items-center gap-1.5 text-body"><span className="w-3.5 h-3.5 rounded-sm bg-neutral-soft ring-1 ring-inset ring-hairline text-[9px] inline-flex items-center justify-center font-bold text-mute">X</span> Not Joined (before DOJ)</span>
        <span className="flex items-center gap-1.5 text-body"><span className="w-3.5 h-3.5 rounded-sm bg-warning-soft ring-1 ring-warning/40 text-[9px] inline-flex items-center justify-center font-bold text-warning-deep">A</span> Override</span>
        <span className="text-mute ml-auto">{dirtyCount} unsaved employee{dirtyCount === 1 ? '' : 's'}</span>
      </div>

      <p className="text-[11px] text-mute mt-2 shrink-0">
        Click a day cell to mark an override (A / R / HD / HF / L), Right-click clears it. Keyboard: <b>P A R H F L</b> keys on a focused cell. Rest & holiday days default automatically; days before an employee's joining date are marked <b>X</b> (not payable). <b>Payable Days = P + R + HD + HF/2 + OT days</b>.
      </p>

      {menu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} onContextMenu={(e) => { e.preventDefault(); setMenu(null) }} />
          <div
            className="fixed z-50 w-40 bg-white rounded-md card-shadow-lg border border-hairline py-1"
            style={{ left: Math.min(menu.x, typeof window !== 'undefined' ? window.innerWidth - 168 : menu.x), top: Math.min(menu.y, typeof window !== 'undefined' ? window.innerHeight - 280 : menu.y) }}
          >
            <p className="px-3 py-1.5 text-[10px] font-medium text-mute uppercase tracking-wide border-b border-hairline mb-1">Mark {menu.date}</p>
            {MARK_ORDER.map((m) => (
              <button key={m} onClick={() => { const row = rows.find((r) => r.employee_id === menu.empId); if (row) setMark(row, menu.date, m) }} className="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] text-left hover:bg-canvas-soft">
                <span className={`w-6 h-5 rounded-sm text-[10px] font-bold inline-flex items-center justify-center ${MARK_CHIP[m]}`}>{MARK_TEXT[m]}</span>
                {MARK_LABEL[m]}
              </button>
            ))}
            <button onClick={() => clearMark(menu.empId, menu.date)} className="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] text-left text-mute hover:bg-canvas-soft border-t border-hairline mt-1">
              <span className="w-6 h-5 rounded-sm text-[10px] font-bold inline-flex items-center justify-center bg-neutral-soft text-mute">×</span>
              Reset to default
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function SummaryStat({ icon: Icon, tone, label, value }: { icon: any; tone: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-md bg-white card-shadow px-3 py-2 shrink-0 min-w-[132px]">
      <span className={`w-8 h-8 rounded-sm flex items-center justify-center shrink-0 ${tone}`}><Icon className="w-4 h-4" /></span>
      <span className="min-w-0">
        <span className="block text-[10px] text-mute uppercase tracking-wide font-medium truncate">{label}</span>
        <span className="block text-[15px] font-semibold text-ink tabular-nums leading-tight truncate">{value}</span>
      </span>
    </div>
  )
}