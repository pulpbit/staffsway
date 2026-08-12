import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientApi } from '@/services/api'
import { Button, Input } from '@/components/ui/fields'
import { Modal, ConfirmDialog } from '@/components/ui/overlay'
import { Table, Badge } from '@/components/ui/data'
import { PageHeader, LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { statusColor, statusLabel, dateShort } from '@/utils/format'
import { toast } from 'sonner'
import { Plus, Building2, Search, Trash2, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function ClientsPage() {
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState({ name: '', contact_person: '', phone: '', email: '', address: '', contract_start: '', contract_end: '', status: 'active' })
  const nav = useNavigate()
  const qc = useQueryClient()

  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['clients', search], queryFn: () => clientApi.list(search ? { search } : undefined) })
  const clients = (data?.data || []) as any[]

  const { data: clientDetail } = useQuery({ queryKey: ['client', editId], queryFn: () => clientApi.get(editId!), enabled: !!editId })
  const { data: clientView } = useQuery({ queryKey: ['client', 'view', deleteId], queryFn: () => clientApi.get(deleteId! + 1 ? -1 : -1), enabled: false })

  const saveMut = useMutation({
    mutationFn: (d: any) => editId ? clientApi.update(editId, d) : clientApi.create(d),
    onSuccess: () => { setShowForm(false); setEditId(null); qc.invalidateQueries({ queryKey: ['clients'] }); toast.success('Client saved.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to save client.'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => clientApi.delete(id),
    onSuccess: () => { setDeleteId(null); qc.invalidateQueries({ queryKey: ['clients'] }); toast.success('Client deleted.') },
  })

  const openEdit = (id: number) => {
    setEditId(id)
    clientApi.get(id).then(r => {
      const c: any = r.data
      setForm({ name: c.name || '', contact_person: c.contact_person || '', phone: c.phone || '', email: c.email || '', address: c.address || '', contract_start: c.contract_start || '', contract_end: c.contract_end || '', status: c.status || 'active' })
      setShowForm(true)
    })
  }

  const cols: any[] = [
    { key: 'name', header: 'Client Name', render: (r: any) => (
      <div>
        <p className="text-[13px] font-medium text-ink">{r.name}</p>
        {r.contact_person && <p className="text-[11px] text-mute">{r.contact_person}</p>}
      </div>
    ) },
    { key: 'phone', header: 'Phone', hideSm: true, render: (r: any) => <span className="text-[12px] text-body">{r.phone || '—'}</span> },
    { key: 'locations', header: 'Sites / Emp', hideSm: true, render: (r: any) => <span className="text-[12px] text-body">{r.site_count || 0} sites / {r.active_employees || 0} active</span> },
    { key: 'contract_start', header: 'Contract', hideSm: true, render: (r: any) => <span className="text-[12px] text-body">{dateShort(r.contract_start)} — {dateShort(r.contract_end)}</span> },
    { key: 'status', header: 'Status', render: (r: any) => <Badge className={statusColor(r.status)}>{statusLabel(r.status)}</Badge> },
    { key: 'actions', header: '', render: (r: any) => (
      <div className="flex items-center gap-1">
        <button onClick={() => nav(`/clients/${r.id}`)} className="px-1.5 py-0.5 text-[11px] text-link hover:bg-link-soft rounded-xs"><Eye className="w-3 h-3 inline mr-0.5" />View</button>
        <button onClick={() => openEdit(r.id)} className="px-1.5 py-0.5 text-[11px] text-body hover:bg-canvas-soft rounded-xs">Edit</button>
        <button onClick={() => setDeleteId(r.id)} className="px-1 py-0.5 text-[11px] text-error hover:bg-error-soft rounded-xs"><Trash2 className="w-3 h-3" /></button>
      </div>
    ) },
  ]

  return (
    <div>
      <PageHeader title="Clients" subtitle={`${clients.length} total`} actions={<Button onClick={() => { setEditId(null); setForm({ name: '', contact_person: '', phone: '', email: '', address: '', contract_start: '', contract_end: '', status: 'active' }); setShowForm(true) }}><Plus className="w-3.5 h-3.5" /> Add Client</Button>} />
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-mute" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients..." className="w-full h-9 pl-8 pr-3 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink" />
        </div>
      </div>

      <div className="bg-white card-shadow rounded-md p-4">
        {isLoading ? <LoadingState /> : error ? <PageError onRetry={() => refetch()} /> : clients.length === 0 ? <EmptyState icon={Building2} title="No clients" action={<Button onClick={() => setShowForm(true)}><Plus className="w-3.5 h-3.5" /> Add Client</Button>} /> : (
          <Table columns={cols} data={clients} keyFn={(r) => String(r.id)} />
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? 'Edit Client' : 'Add Client'} size="md">
        <div className="space-y-3">
          <Input label="Client Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Contact Person" value={form.contact_person} onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            <Input label="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <Input label="Address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Contract Start" type="date" value={form.contract_start} onChange={e => setForm(f => ({ ...f, contract_start: e.target.value }))} />
            <Input label="Contract End" type="date" value={form.contract_end} onChange={e => setForm(f => ({ ...f, contract_end: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={() => saveMut.mutate(form)} loading={saveMut.isPending}>Save</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMut.mutate(deleteId)} title="Delete Client" message="This will also delete all associated sites and employees. Are you sure?" danger loading={deleteMut.isPending} />
    </div>
  )
}
