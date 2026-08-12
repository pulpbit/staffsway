import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { siteApi, clientApi } from '@/services/api'
import { Button, Input, Select } from '@/components/ui/fields'
import { Modal, ConfirmDialog } from '@/components/ui/overlay'
import { Table, Badge } from '@/components/ui/data'
import { PageHeader, LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { statusColor, statusLabel } from '@/utils/format'
import { toast } from 'sonner'
import { Plus, MapPin, Trash2 } from 'lucide-react'

export default function SitesPage() {
  const [search, setSearch] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState({ client_id: '', name: '', location: '', supervisor_name: '', shift_type: 'General', status: 'active' })
  const qc = useQueryClient()

  const params: Record<string, string> = {}
  if (search) params.search = search
  if (clientFilter) params.client_id = clientFilter

  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['sites', params], queryFn: () => siteApi.list(params) })
  const { data: clients } = useQuery({ queryKey: ['clients-select'], queryFn: () => clientApi.list() })
  const sites = (data?.data || []) as any[]

  const saveMut = useMutation({
    mutationFn: (d: any) => editId ? siteApi.update(editId, d) : siteApi.create(d),
    onSuccess: () => { setShowForm(false); setEditId(null); qc.invalidateQueries({ queryKey: ['sites'] }); toast.success('Site saved.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to save.'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => siteApi.delete(id),
    onSuccess: () => { setDeleteId(null); qc.invalidateQueries({ queryKey: ['sites'] }); toast.success('Site deleted.') },
  })

  const openEdit = async (id: number) => {
    const r: any = (await siteApi.get(id)).data
    setForm({ client_id: String(r.client_id), name: r.name, location: r.location || '', supervisor_name: r.supervisor_name || '', shift_type: r.shift_type || 'General', status: r.status })
    setEditId(id); setShowForm(true)
  }

  const cols: any[] = [
    { key: 'name', header: 'Site Name', render: (r: any) => (
      <div>
        <p className="text-[13px] font-medium text-ink">{r.name}</p>
        <p className="text-[11px] text-body">{r.client_name}</p>
      </div>
    ) },
    { key: 'location', header: 'Location', hideSm: true, render: (r: any) => <span className="text-[12px] text-body">{r.location || '—'}</span> },
    { key: 'supervisor', header: 'Supervisor', hideSm: true, render: (r: any) => <span className="text-[12px] text-body">{r.supervisor_name || '—'}</span> },
    { key: 'shift', header: 'Shift', hideSm: true, render: (r: any) => <Badge className="bg-canvas-soft-2 text-body">{r.shift_type || 'General'}</Badge> },
    { key: 'employees', header: 'Emp', hideSm: true, render: (r: any) => <span className="text-[12px] text-body">{r.active_employees || 0} active / {r.total_employees || 0} total</span> },
    { key: 'status', header: 'Status', render: (r: any) => <Badge className={statusColor(r.status)}>{statusLabel(r.status)}</Badge> },
    { key: 'actions', header: '', render: (r: any) => (
      <div className="flex items-center gap-1">
        <button onClick={() => openEdit(r.id)} className="px-1.5 py-0.5 text-[11px] text-body hover:bg-canvas-soft rounded-xs">Edit</button>
        <button onClick={() => setDeleteId(r.id)} className="px-1 py-0.5 text-[11px] text-error hover:bg-error-soft rounded-xs"><Trash2 className="w-3 h-3" /></button>
      </div>
    ) },
  ]

  return (
    <div>
      <PageHeader title="Sites" subtitle={`${sites.length} total`} actions={<Button onClick={() => { setEditId(null); setForm({ client_id: '', name: '', location: '', supervisor_name: '', shift_type: 'General', status: 'active' }); setShowForm(true) }}><Plus className="w-3.5 h-3.5" /> Add Site</Button>} />
      <div className="flex gap-2 mb-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sites..." className="flex-1 h-9 px-2.5 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink" />
        <Select options={[{ value: '', label: 'All Clients' }, ...(clients?.data || []).map((c: any) => ({ value: String(c.id), label: c.name }))]} value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="w-40" />
      </div>

      <div className="bg-white card-shadow rounded-md p-4">
        {isLoading ? <LoadingState /> : error ? <PageError onRetry={() => refetch()} /> : sites.length === 0 ? <EmptyState icon={MapPin} title="No sites" action={<Button onClick={() => setShowForm(true)}><Plus className="w-3.5 h-3.5" /> Add Site</Button>} /> : (
          <Table columns={cols} data={sites} keyFn={(r) => String(r.id)} />
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? 'Edit Site' : 'Add Site'} size="md">
        <div className="space-y-3">
          <Select label="Client" options={[{ value: '', label: 'Select client...' }, ...(clients?.data || []).map((c: any) => ({ value: String(c.id), label: c.name }))]} value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} />
          <Input label="Site Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Location" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Supervisor" value={form.supervisor_name} onChange={e => setForm(f => ({ ...f, supervisor_name: e.target.value }))} />
            <Select label="Shift Type" options={[{ value: 'General', label: 'General' }, { value: 'Morning', label: 'Morning' }, { value: 'Evening', label: 'Evening' }, { value: 'Night', label: 'Night' }, { value: 'Rotational', label: 'Rotational' }, { value: 'Split', label: 'Split' }]} value={form.shift_type} onChange={e => setForm(f => ({ ...f, shift_type: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={() => saveMut.mutate({ ...form, client_id: Number(form.client_id) })} loading={saveMut.isPending}>Save</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMut.mutate(deleteId)} title="Delete Site" message="This will remove all employee assignments. Are you sure?" danger loading={deleteMut.isPending} />
    </div>
  )
}
