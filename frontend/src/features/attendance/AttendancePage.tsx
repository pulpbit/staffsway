import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { attendanceApi, clientApi, siteApi } from '@/services/api'
import { Button } from '@/components/ui/fields'
import { PageHeader } from '@/components/ui/layout'
import { StatusBadge } from '@/components/ui/status'
import { FilterBar, SearchInput, SelectFilter, NativeSelect } from '@/components/ui/actions'
import { LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { downloadCsv } from '@/utils/csv'
import { toast } from 'sonner'
import { Save, Lock, Download, AlarmClock, Clock3, CalendarCheck2, CalendarX2 } from 'lucide-react'
import { monthYear } from '@/utils/format'
import type { AttendanceSheetRow } from '@/types/api'

export default function AttendancePage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [clientFilter, setClientFilter] = useState('')
  const [siteFilter, setSiteFilter] = useState('')
  const [search, setSearch] = useState('')
  const [dirty, setDirty] = useState<Map<number, Partial<AttendanceSheetRow>>>(new Map())
  const queryClient = useQueryClient()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['attendance-sheet', month, year, clientFilter, siteFilter, search],
    queryFn: () => attendanceApi.sheet(month, year, { client_id: clientFilter, site_id: siteFilter, search }),
  })

  const { data: clients } = useQuery({ queryKey: ['clients-select'], queryFn: () => clientApi.list() })
  const { data: allSites } = useQuery({ queryKey: ['sites-select'], queryFn: () => siteApi.list() })
  const sites = ((allSites?.data || []) as any[]).filter((s: any) => !clientFilter || String(s.client_id) === clientFilter).sort((a, b) => a.name.localeCompare(b.name))

  const rows = (data?.data.rows || []) as AttendanceSheetRow[]
  const finalizedCount = data?.data.finalized_count || 0
  const isLocked = finalizedCount > 0

  const bulkMut = useMutation({
    mutationFn: (items: any[]) => attendanceApi.bulk(month, year, items),
    onSuccess: (r) => { toast.success(r.message || 'Attendance saved.'); setDirty(new Map()); queryClient.invalidateQueries({ queryKey: ['attendance-sheet'] }) },
    onError: (e: any) => toast.error(e?.error?.message || 'Save failed.'),
  })

  const finalizeMut = useMutation({
    mutationFn: (locked: boolean) => attendanceApi.finalize(month, year, locked),
    onSuccess: (r) => { toast.success(r.message); queryClient.invalidateQueries({ queryKey: ['attendance-sheet'] }) },
    onError: (e: any) => toast.error(e?.error?.message || 'Action failed.'),
  })

  const updateCell = useCallback((empId: number, field: string, value: number) => {
    setDirty(prev => {
      const next = new Map(prev)
      const current = next.get(empId) || {}
      next.set(empId, { ...current, [field]: value })
      return next
    })
  }, [])

  const handleSave = () => {
    if (dirty.size === 0) { toast('No changes to save.'); return }
    const items = Array.from(dirty.entries()).map(([empId, fields]) => ({
      employee_id: empId,
      present_days: fields.present_days,
      absent_days: fields.absent_days,
      paid_leave: fields.paid_leave,
      unpaid_leave: fields.unpaid_leave,
      ot_hours: fields.ot_hours,
    }))
    bulkMut.mutate(items)
  }

  const exportCsv = () => {
    if (rows.length === 0) return
    const totalDays = new Date(year, month, 0).getDate()
    downloadCsv(
      rows.map((row: any) => ({
        employee_code: row.employee_code,
        employee_name: `${row.first_name} ${row.last_name}`,
        client: row.client_name || '',
        site: row.site_name || '',
        designation: row.designation || '',
        total_days: totalDays,
        present_days: row.present_days ?? 0,
        absent_days: row.absent_days ?? 0,
        paid_leave: row.paid_leave ?? 0,
        unpaid_leave: row.unpaid_leave ?? 0,
        ot_hours: row.ot_hours ?? 0,
        status: row.attendance_status || 'pending',
      })),
      `attendance_${year}-${String(month).padStart(2, '0')}`
    )
    toast.success('Attendance sheet exported.')
  }

  const getValue = (row: AttendanceSheetRow, field: string): number => {
    const dirtyVal = dirty.get(row.employee_id)
    if (dirtyVal && (dirtyVal as any)[field] !== undefined) return (dirtyVal as any)[field]
    if (row.attendance_id) return (row as any)[field] || 0
    return 0
  }

  const totals = rows.reduce(
    (acc, r) => ({
      present: acc.present + (r.present_days || 0),
      absent: acc.absent + (r.absent_days || 0),
      paid: acc.paid + (r.paid_leave || 0),
      unpaid: acc.unpaid + (r.unpaid_leave || 0),
      ot: acc.ot + (r.ot_hours || 0),
    }),
    { present: 0, absent: 0, paid: 0, unpaid: 0, ot: 0 }
  )

  return (
    <div>
      <PageHeader
        title="Monthly Attendance"
        description={`${monthYear(month, year)} — ${rows.length} employee${rows.length === 1 ? '' : 's'} on sheet${isLocked ? ' · month locked' : ''}`}
        actions={
          <>
            <Button variant="secondary" onClick={exportCsv} disabled={rows.length === 0}><Download className="w-3.5 h-3.5" /> Export</Button>
            {isLocked ? (
              <Button variant="secondary" onClick={() => finalizeMut.mutate(false)} loading={finalizeMut.isPending}><Lock className="w-3.5 h-3.5" /> Unlock Month</Button>
            ) : (
              <Button variant="secondary" onClick={() => finalizeMut.mutate(true)} loading={finalizeMut.isPending}><Lock className="w-3.5 h-3.5" /> Lock Month</Button>
            )}
            <Button onClick={handleSave} loading={bulkMut.isPending}><Save className="w-3.5 h-3.5" /> Save Changes</Button>
          </>
        }
      />

      <div className="bg-white card-shadow rounded-md overflow-hidden">
        <FilterBar className="px-4 py-3 border-b border-hairline">
          <NativeSelect className="w-40" value={String(month)} onChange={(v) => setMonth(Number(v))} options={Array.from({ length: 12 }, (_, i) => i + 1).map((m) => ({ value: String(m), label: new Date(2000, m - 1).toLocaleDateString('en-US', { month: 'long' }) }))} />
          <NativeSelect className="w-24" value={String(year)} onChange={(v) => setYear(Number(v))} options={[2024, 2025, 2026, 2027].map((y) => ({ value: String(y), label: String(y) }))} />
          <SelectFilter label="Client" value={clientFilter} onChange={(v) => { setClientFilter(v); setSiteFilter('') }} options={[{ value: '', label: 'All Clients' }, ...(clients?.data || []).map((c: any) => ({ value: String(c.id), label: c.name }))]} />
          <SelectFilter label="Site" value={siteFilter} onChange={setSiteFilter} options={[{ value: '', label: 'All Sites' }, ...sites.map((s: any) => ({ value: String(s.id), label: s.name }))]} />
          <SearchInput value={search} onChange={setSearch} placeholder="Search employee..." className="w-full sm:flex-1 sm:min-w-48" />
        </FilterBar>

        {isLoading ? (
          <div className="p-4"><LoadingState /></div>
        ) : error ? (
          <PageError onRetry={() => refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState title="No employees on the sheet" description="Add employees first, then enter their attendance here." />
        ) : (
          <>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[820px]">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-hairline bg-canvas-soft/60">
                    <th className="px-3 py-2.5 text-left text-[11px] font-medium font-mono text-mute uppercase tracking-[0.04em]">Employee</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-medium font-mono text-mute uppercase tracking-[0.04em] hidden md:table-cell">Site</th>
                    <th className="px-2 py-2.5 text-center text-[11px] font-medium font-mono text-mute uppercase tracking-[0.04em]">Present</th>
                    <th className="px-2 py-2.5 text-center text-[11px] font-medium font-mono text-mute uppercase tracking-[0.04em]">Absent</th>
                    <th className="px-2 py-2.5 text-center text-[11px] font-medium font-mono text-mute uppercase tracking-[0.04em]">Paid Lv</th>
                    <th className="px-2 py-2.5 text-center text-[11px] font-medium font-mono text-mute uppercase tracking-[0.04em]">Unpaid Lv</th>
                    <th className="px-2 py-2.5 text-center text-[11px] font-medium font-mono text-mute uppercase tracking-[0.04em]">OT Hrs</th>
                    <th className="px-2 py-2.5 text-center text-[11px] font-medium font-mono text-mute uppercase tracking-[0.04em]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const locked = row.attendance_status === 'finalized'
                    const isModified = dirty.has(row.employee_id)
                    const numClass = 'w-14 h-7 text-center text-[13px] bg-white border border-hairline rounded-sm outline-none transition-colors focus:border-navy-mid disabled:opacity-50 disabled:cursor-not-allowed tabular-nums'
                    return (
                      <tr key={row.employee_id} className={`border-b border-hairline transition-colors ${idx % 2 === 1 ? 'bg-canvas-soft/40' : ''} ${isModified ? 'bg-link-soft/30' : ''} hover:bg-canvas-soft/70`}>
                        <td className="px-3 py-2">
                          <p className="text-[13px] font-medium text-ink">{row.first_name} {row.last_name}</p>
                          <p className="text-[11px] text-mute font-mono">{row.employee_code} — {row.designation}</p>
                        </td>
                        <td className="px-3 py-2 hidden md:table-cell">
                          <span className="text-[12px] text-body">{row.site_name || '—'}</span>
                          <span className="text-[11px] text-mute block">{row.client_name || ''}</span>
                        </td>
                        <td className="px-1 py-2 text-center">
                          <input type="number" min={0} max={31} value={getValue(row, 'present_days')} onChange={e => updateCell(row.employee_id, 'present_days', Math.min(31, Math.max(0, Number(e.target.value) || 0)))}
                            disabled={locked} aria-label="Present days" className={numClass} />
                        </td>
                        <td className="px-1 py-2 text-center">
                          <input type="number" min={0} max={31} value={getValue(row, 'absent_days')} onChange={e => updateCell(row.employee_id, 'absent_days', Math.min(31, Math.max(0, Number(e.target.value) || 0)))}
                            disabled={locked} aria-label="Absent days" className={numClass} />
                        </td>
                        <td className="px-1 py-2 text-center">
                          <input type="number" min={0} max={31} value={getValue(row, 'paid_leave')} onChange={e => updateCell(row.employee_id, 'paid_leave', Math.min(31, Math.max(0, Number(e.target.value) || 0)))}
                            disabled={locked} aria-label="Paid leave days" className={numClass} />
                        </td>
                        <td className="px-1 py-2 text-center">
                          <input type="number" min={0} max={31} value={getValue(row, 'unpaid_leave')} onChange={e => updateCell(row.employee_id, 'unpaid_leave', Math.min(31, Math.max(0, Number(e.target.value) || 0)))}
                            disabled={locked} aria-label="Unpaid leave days" className={numClass} />
                        </td>
                        <td className="px-1 py-2 text-center">
                          <input type="number" min={0} max={200} step={0.5} value={getValue(row, 'ot_hours')} onChange={e => updateCell(row.employee_id, 'ot_hours', Math.min(200, Math.max(0, Number(e.target.value) || 0)))}
                            disabled={locked} aria-label="Overtime hours" className="w-16 h-7 text-center text-[13px] bg-white border border-hairline rounded-sm outline-none transition-colors focus:border-navy-mid disabled:opacity-50 disabled:cursor-not-allowed tabular-nums" />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <StatusBadge
                            status={locked ? 'Finalized' : isModified ? 'Processing' : row.attendance_id ? 'Draft' : 'Pending'}
                            dot={!isModified}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 border-t border-hairline bg-canvas-soft/40 text-[12px]">
              <span className="flex items-center gap-1.5 text-body"><CalendarCheck2 className="w-3.5 h-3.5 text-success" /> Present <b className="text-ink tabular-nums">{totals.present}</b></span>
              <span className="flex items-center gap-1.5 text-body"><CalendarX2 className="w-3.5 h-3.5 text-error" /> Absent <b className="text-ink tabular-nums">{totals.absent}</b></span>
              <span className="flex items-center gap-1.5 text-body"><Clock3 className="w-3.5 h-3.5 text-link" /> Paid <b className="text-ink tabular-nums">{totals.paid}</b> · Unpaid <b className="text-ink tabular-nums">{totals.unpaid}</b></span>
              <span className="flex items-center gap-1.5 text-body"><AlarmClock className="w-3.5 h-3.5 text-warning-deep" /> OT <b className="text-ink tabular-nums">{totals.ot} hrs</b></span>
              <span className="text-mute ml-auto">{dirty.size} unsaved row{dirty.size === 1 ? '' : 's'}</span>
            </div>
          </>
        )}
      </div>
      <p className="text-[11px] text-mute mt-2">Edited rows are highlighted. Click <strong>Save Changes</strong> to persist, then <strong>Lock Month</strong> after finalising to prevent further edits.</p>
    </div>
  )
}