import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { attendanceApi, clientApi, siteApi } from '@/services/api'
import { Button } from '@/components/ui/fields'
import { Badge } from '@/components/ui/data'
import { PageHeader, LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { toast } from 'sonner'
import { Save, Lock, Search } from 'lucide-react'
import { monthYear, statusColor, statusLabel } from '@/utils/format'
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
  const sites = (allSites?.data || []).filter((s: any) => !clientFilter || String(s.client_id) === clientFilter)

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

  const getValue = (row: AttendanceSheetRow, field: string): number => {
    const dirtyVal = dirty.get(row.employee_id)
    if (dirtyVal && (dirtyVal as any)[field] !== undefined) return (dirtyVal as any)[field]
    if (row.attendance_id) return (row as any)[field] || 0
    return 0
  }

  const sortedSites = (sites as any[]).sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div>
      <PageHeader
        title="Monthly Attendance"
        subtitle={`${monthYear(month, year)}${isLocked ? ' — Locked' : ''}`}
        actions={
          <div className="flex items-center gap-2">
            {isLocked ? (
              <Button variant="secondary" onClick={() => finalizeMut.mutate(false)} loading={finalizeMut.isPending}><Lock className="w-3.5 h-3.5" /> Unlock Month</Button>
            ) : (
              <Button variant="secondary" onClick={() => finalizeMut.mutate(true)} loading={finalizeMut.isPending}><Lock className="w-3.5 h-3.5" /> Lock Month</Button>
            )}
            <Button onClick={handleSave} loading={bulkMut.isPending}><Save className="w-3.5 h-3.5" /> Save Changes</Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="flex items-center gap-1.5">
          <select value={month} onChange={e => setMonth(Number(e.target.value))} className="h-9 px-2 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{new Date(2000, m - 1).toLocaleDateString('en-US', { month: 'long' })}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="h-9 px-2 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <select value={clientFilter} onChange={e => { setClientFilter(e.target.value); setSiteFilter('') }} className="h-9 px-2 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink w-full sm:w-36">
          <option value="">All Clients</option>
          {(clients?.data || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={siteFilter} onChange={e => setSiteFilter(e.target.value)} className="h-9 px-2 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink w-full sm:w-36">
          <option value="">All Sites</option>
          {sortedSites.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-mute" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee..." className="w-full h-9 pl-8 pr-3 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink" />
        </div>
      </div>

      {/* Attendance Sheet */}
      <div className="bg-white card-shadow rounded-md">
        {isLoading ? <LoadingState /> : error ? <PageError onRetry={() => refetch()} /> : rows.length === 0 ? <EmptyState title="No employees" description="Add employees first, then enter attendance." /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-hairline bg-canvas-soft/50">
                  <th className="px-3 py-2 text-left text-[11px] font-medium font-mono text-mute uppercase tracking-[0.04em]">Employee</th>
                  <th className="px-3 py-2 text-left text-[11px] font-medium font-mono text-mute uppercase tracking-[0.04em] hidden md:table-cell">Site</th>
                  <th className="px-3 py-2 text-center text-[11px] font-medium font-mono text-mute uppercase tracking-[0.04em]">Present</th>
                  <th className="px-3 py-2 text-center text-[11px] font-medium font-mono text-mute uppercase tracking-[0.04em]">Absent</th>
                  <th className="px-3 py-2 text-center text-[11px] font-medium font-mono text-mute uppercase tracking-[0.04em]">Paid Lv</th>
                  <th className="px-3 py-2 text-center text-[11px] font-medium font-mono text-mute uppercase tracking-[0.04em]">Unpaid Lv</th>
                  <th className="px-3 py-2 text-center text-[11px] font-medium font-mono text-mute uppercase tracking-[0.04em]">OT Hrs</th>
                  <th className="px-3 py-2 text-center text-[11px] font-medium font-mono text-mute uppercase tracking-[0.04em]">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const locked = row.attendance_status === 'finalized'
                  const isModified = dirty.has(row.employee_id)
                  return (
                    <tr key={row.employee_id} className={`border-b border-hairline hover:bg-canvas-soft/40 ${idx % 2 === 1 ? 'bg-canvas-soft/20' : ''} ${isModified ? 'bg-link-soft/30' : ''}`}>
                      <td className="px-3 py-1.5">
                        <p className="text-[13px] font-medium text-ink">{row.first_name} {row.last_name}</p>
                        <p className="text-[11px] text-mute">{row.employee_code} — {row.designation}</p>
                      </td>
                      <td className="px-3 py-1.5 hidden md:table-cell">
                        <span className="text-[12px] text-body">{row.site_name || '—'}</span>
                        <span className="text-[11px] text-mute block">{row.client_name || ''}</span>
                      </td>
                      <td className="px-1 py-1.5">
                        <input type="number" min={0} max={31} value={getValue(row, 'present_days')} onChange={e => updateCell(row.employee_id, 'present_days', Math.min(31, Math.max(0, Number(e.target.value) || 0)))}
                          disabled={locked} className="w-14 h-7 text-center text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink disabled:opacity-50" />
                      </td>
                      <td className="px-1 py-1.5">
                        <input type="number" min={0} max={31} value={getValue(row, 'absent_days')} onChange={e => updateCell(row.employee_id, 'absent_days', Math.min(31, Math.max(0, Number(e.target.value) || 0)))}
                          disabled={locked} className="w-14 h-7 text-center text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink disabled:opacity-50" />
                      </td>
                      <td className="px-1 py-1.5">
                        <input type="number" min={0} max={31} value={getValue(row, 'paid_leave')} onChange={e => updateCell(row.employee_id, 'paid_leave', Math.min(31, Math.max(0, Number(e.target.value) || 0)))}
                          disabled={locked} className="w-14 h-7 text-center text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink disabled:opacity-50" />
                      </td>
                      <td className="px-1 py-1.5">
                        <input type="number" min={0} max={31} value={getValue(row, 'unpaid_leave')} onChange={e => updateCell(row.employee_id, 'unpaid_leave', Math.min(31, Math.max(0, Number(e.target.value) || 0)))}
                          disabled={locked} className="w-14 h-7 text-center text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink disabled:opacity-50" />
                      </td>
                      <td className="px-1 py-1.5">
                        <input type="number" min={0} max={200} step={0.5} value={getValue(row, 'ot_hours')} onChange={e => updateCell(row.employee_id, 'ot_hours', Math.min(200, Math.max(0, Number(e.target.value) || 0)))}
                          disabled={locked} className="w-16 h-7 text-center text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink disabled:opacity-50" />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <Badge className={locked ? 'bg-success-soft text-success' : isModified ? 'bg-link-soft text-link' : row.attendance_id ? 'bg-canvas-soft-2 text-body' : 'bg-canvas-soft-2 text-mute'}>
                          {locked ? 'Locked' : isModified ? 'Unsaved' : row.attendance_id ? 'Draft' : 'No Data'}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-[11px] text-mute mt-2">Employees with changes are highlighted. Click <strong>Save Changes</strong> to persist. Lock a month after finalising attendance.</p>
    </div>
  )
}
