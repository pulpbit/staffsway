import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { payrollApi, clientApi, siteApi } from '@/services/api'
import { Button } from '@/components/ui/fields'
import { Table, Badge, Pagination } from '@/components/ui/data'
import { Modal, ConfirmDialog } from '@/components/ui/overlay'
import { PageHeader, LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { money, monthYear, fullName, statusColor, statusLabel } from '@/utils/format'
import { toast } from 'sonner'
import { IndianRupee, CheckCircle, Play, ExternalLink } from 'lucide-react'

export default function PayrollPage() {
  const [showGenerate, setShowGenerate] = useState(false)
  const [genMonth, setGenMonth] = useState(new Date().getMonth() + 1)
  const [genYear, setGenYear] = useState(new Date().getFullYear())
  const [genClient, setGenClient] = useState('')
  const [genSite, setGenSite] = useState('')
  const [genLoading, setGenLoading] = useState(false)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ id: number; action: string } | null>(null)
  const [showSlips, setShowSlips] = useState(false)
  const qc = useQueryClient()

  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['payroll'], queryFn: () => payrollApi.list() })
  const { data: clients } = useQuery({ queryKey: ['clients-select'], queryFn: () => clientApi.list() })
  const { data: allSites } = useQuery({ queryKey: ['sites-select'], queryFn: () => siteApi.list() })
  const { data: months } = useQuery({ queryKey: ['payroll-months'], queryFn: () => payrollApi.months() })

  const { data: detail } = useQuery({ queryKey: ['payroll', detailId], queryFn: () => payrollApi.get(detailId!), enabled: !!detailId })

  const finalizeMut = useMutation({
    mutationFn: (id: number) => payrollApi.finalize(id),
    onSuccess: (r) => { toast.success(r.message); qc.invalidateQueries({ queryKey: ['payroll'] }); setConfirmAction(null); setDetailId(null); setShowDetail(false) },
    onError: (e: any) => toast.error(e?.error?.message || 'Action failed.'),
  })

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => payrollApi.setStatus(id, status),
    onSuccess: (r) => { toast.success(r.message); qc.invalidateQueries({ queryKey: ['payroll'] }); setConfirmAction(null) },
    onError: (e: any) => toast.error(e?.error?.message || 'Action failed.'),
  })

  const handleGenerate = async () => {
    setGenLoading(true)
    try {
      const payload: any = { month: genMonth, year: genYear }
      if (genClient) payload.client_id = Number(genClient)
      if (genSite) payload.site_id = Number(genSite)
      const r = await payrollApi.generate(payload)
      toast.success(r.message || 'Payroll generated.')
      setShowGenerate(false)
      qc.invalidateQueries({ queryKey: ['payroll'] })
    } catch (e: any) {
      toast.error(e?.error?.message || 'Failed to generate.')
    } finally { setGenLoading(false) }
  }

  const handleConfirm = () => {
    if (!confirmAction) return
    if (confirmAction.action === 'finalize') finalizeMut.mutate(confirmAction.id)
    else if (confirmAction.action === 'paid') statusMut.mutate({ id: confirmAction.id, status: 'paid' })
    else if (confirmAction.action === 'process') statusMut.mutate({ id: confirmAction.id, status: 'processing' })
  }

  const payrolls = (data?.data || []) as any[]
  const availableMonths = (months?.data || []) as any[]
  const sites = (allSites?.data || []).filter((s: any) => !genClient || String(s.client_id) === genClient)

  const cols: any[] = [
    { key: 'month', header: 'Period', render: (r: any) => <span className="text-[13px] font-medium text-ink">{monthYear(r.month, r.year)}</span> },
    { key: 'employees', header: 'Employees', render: (r: any) => <span className="text-[13px] text-body">{r.item_count || r.total_employees || 0}</span> },
    { key: 'gross', header: 'Gross', render: (r: any) => <span className="text-[13px] text-body">{money(r.gross_total)}</span> },
    { key: 'deductions', header: 'Deductions', render: (r: any) => <span className="text-[13px] text-body">{money(r.deduction_total)}</span> },
    { key: 'net', header: 'Net Payable', render: (r: any) => <span className="text-[13px] font-medium text-ink">{money(r.net_total)}</span> },
    { key: 'status', header: 'Status', render: (r: any) => <Badge className={statusColor(r.status)}>{statusLabel(r.status)}</Badge> },
    { key: 'actions', header: '', render: (r: any) => (
      <div className="flex items-center gap-1">
        <button onClick={() => { setDetailId(r.id); setShowDetail(true) }} className="px-1.5 py-0.5 text-[11px] text-link hover:bg-link-soft rounded-xs"><ExternalLink className="w-3 h-3 inline mr-0.5" />Review</button>
        {r.status === 'draft' && <button onClick={() => setConfirmAction({ id: r.id, action: 'finalize' })} className="px-1.5 py-0.5 text-[11px] text-body hover:bg-canvas-soft rounded-xs">Finalize</button>}
        {r.status === 'finalized' && <button onClick={() => setConfirmAction({ id: r.id, action: 'paid' })} className="px-1.5 py-0.5 text-[11px] text-success hover:bg-success-soft rounded-xs">Mark Paid</button>}
      </div>
    ) },
  ]

  const itemCols: any[] = [
    { key: 'name', header: 'Employee', render: (r: any) => (
      <div>
        <p className="text-[13px] font-medium text-ink">{r.first_name} {r.last_name}</p>
        <p className="text-[11px] text-mute">{r.employee_code} — {r.designation}</p>
      </div>
    ) },
    { key: 'attendance', header: 'Attendance', render: (r: any) => <span className="text-[12px] text-body">P:{r.present_days} A:{r.absent_days} OT:{r.ot_hours}</span> },
    { key: 'gross', header: 'Gross', render: (r: any) => <span className="text-[12px] text-body">{money(r.gross)}</span> },
    { key: 'deductions', header: 'Deductions', render: (r: any) => <span className="text-[12px] text-body">{money(r.total_deductions)}</span> },
    { key: 'net', header: 'Net', render: (r: any) => <span className="text-[13px] font-medium text-ink">{money(r.net_salary)}</span> },
  ]

  return (
    <div>
      <PageHeader
        title="Payroll"
        subtitle="Generate, review, and finalize monthly payroll"
        actions={<Button onClick={() => setShowGenerate(true)}><IndianRupee className="w-3.5 h-3.5" /> Generate Payroll</Button>}
      />

      {isLoading ? <LoadingState /> : error ? <PageError onRetry={() => refetch()} /> : (
        <div className="bg-white card-shadow rounded-md p-4">
          {payrolls.length === 0 ? <EmptyState icon={IndianRupee} title="No payroll yet" description="Generate payroll for the first time." action={<Button onClick={() => setShowGenerate(true)}><IndianRupee className="w-3.5 h-3.5" /> Generate Payroll</Button>} /> : (
            <Table columns={cols} data={payrolls} keyFn={(r) => String(r.id)} />
          )}
        </div>
      )}

      {/* Generate Modal */}
      <Modal open={showGenerate} onClose={() => setShowGenerate(false)} title="Generate Payroll" size="sm">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <select value={genMonth} onChange={e => setGenMonth(Number(e.target.value))} className="h-9 px-2 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink flex-1">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{new Date(2000, m - 1).toLocaleDateString('en-US', { month: 'long' })}</option>)}
            </select>
            <select value={genYear} onChange={e => setGenYear(Number(e.target.value))} className="h-9 px-2 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink">
              {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <select value={genClient} onChange={e => { setGenClient(e.target.value); setGenSite('') }} className="w-full h-9 px-2 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink">
            <option value="">All Clients</option>
            {(clients?.data || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <p className="text-[12px] text-mute">
            Payroll will be generated using {monthYear(genMonth, genYear)} attendance records.
            {genClient || genSite ? ' Filtered by selected client/site.' : ' All employees with attendance will be included.'}
          </p>
          {availableMonths.some((m: any) => m.month === genMonth && m.year === genYear && (m.payroll_status === 'finalized' || m.payroll_status === 'paid')) && (
            <p className="text-[12px] text-error">A finalized payroll already exists for this month. It cannot be regenerated.</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowGenerate(false)}>Cancel</Button>
            <Button onClick={handleGenerate} loading={genLoading}>Generate</Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal open={showDetail} onClose={() => { setShowDetail(false); setDetailId(null) }} title={detail?.data ? `Payroll — ${monthYear(detail.data.month, detail.data.year)}` : 'Payroll Details'} size="lg">
        {detail?.data ? (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Badge className={statusColor(detail.data.status)}>{statusLabel(detail.data.status)}</Badge>
              <span className="text-[13px] text-body">{detail.data.total_employees} employees</span>
              <span className="text-[13px] font-medium text-ink ml-auto">Net: {money(detail.data.net_total)}</span>
            </div>
            <div className="max-h-[50vh] overflow-y-auto">
              {detail.data.items && detail.data.items.length > 0 ? (
                <Table columns={itemCols} data={detail.data.items} keyFn={(r) => String(r.id)} />
              ) : (
                <p className="text-[13px] text-mute py-4 text-center">No payroll items found.</p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-hairline mt-4">
              {detail.data.status === 'draft' && <Button onClick={() => { setShowDetail(false); setConfirmAction({ id: detail.data.id, action: 'finalize' }) }}><CheckCircle className="w-3.5 h-3.5" /> Finalize & Generate Slips</Button>}
              {detail.data.status === 'finalized' && <Button onClick={() => { setShowDetail(false); setConfirmAction({ id: detail.data.id, action: 'paid' }) }} variant="secondary"><Play className="w-3.5 h-3.5" /> Mark as Paid</Button>}
            </div>
          </div>
        ) : <LoadingState />}
      </Modal>

      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirm}
        title={confirmAction?.action === 'finalize' ? 'Finalize Payroll' : confirmAction?.action === 'paid' ? 'Mark as Paid' : 'Confirm Action'}
        message={
          confirmAction?.action === 'finalize'
            ? 'This will finalize the payroll and generate salary slips for all employees. This cannot be undone directly. Continue?'
            : confirmAction?.action === 'paid'
            ? 'Mark this payroll as paid? This confirms that all employee salaries have been disbursed.'
            : 'Are you sure?'
        }
        loading={finalizeMut.isPending || statusMut.isPending}
      />
    </div>
  )
}
