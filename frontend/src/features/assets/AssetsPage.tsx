import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { assetApi, employeeApi } from '@/services/api'
import { Button, Input, Textarea, Select } from '@/components/ui/fields'
import { Table, Badge, Tabs } from '@/components/ui/data'
import type { Column } from '@/components/ui/data'
import { PageHeader, LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { Modal, ConfirmDialog } from '@/components/ui/overlay'
import { fullName, dateShort } from '@/utils/format'
import { toast } from 'sonner'
import { Plus, Trash2, Search, Package, ArrowRightLeft, RotateCcw, History, Edit } from 'lucide-react'

const ASSET_TYPES = ['Laptop', 'Mobile', 'ID Card', 'Uniform', 'Tools', 'Vehicle', 'Other']
const STATUS_MAP: Record<string, string> = { available: 'bg-success-soft text-success', assigned: 'bg-link-soft text-link-deep', maintenance: 'bg-warning-soft text-warning-deep', retired: 'bg-canvas-soft-2 text-mute' }
const ACTION_MAP: Record<string, string> = { issued: 'bg-link-soft text-link-deep', returned: 'bg-success-soft text-success', replaced: 'bg-warning-soft text-warning-deep' }

const TABS = [
  { key: 'assets', label: 'Assets' },
  { key: 'history', label: 'Assignment History' },
]

export default function AssetsPage() {
  const [tab, setTab] = useState('assets')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editAsset, setEditAsset] = useState<any>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [assignFor, setAssignFor] = useState<any>(null)
  const [returnFor, setReturnFor] = useState<any>(null)
  const [replaceFor, setReplaceFor] = useState<any>(null)
  const [detailFor, setDetailFor] = useState<any>(null)
  const qc = useQueryClient()

  const params: Record<string, string> = {}
  if (search) params.search = search
  if (typeFilter) params.asset_type = typeFilter
  if (statusFilter) params.status = statusFilter

  const { data: summary } = useQuery({ queryKey: ['asset-summary'], queryFn: () => assetApi.summary() })
  const { data: assetData, isLoading, error, refetch } = useQuery({ queryKey: ['assets', params], queryFn: () => assetApi.list(params) })
  const { data: histData, isLoading: histLoading } = useQuery({ queryKey: ['asset-assignments'], queryFn: () => assetApi.allAssignments(), enabled: tab === 'history' })
  const { data: empData } = useQuery({ queryKey: ['employees-select'], queryFn: () => employeeApi.list({ page: '1', page_size: '200', status: 'active' }) })

  const assets = (assetData?.data || []) as any[]
  const employees = (empData?.data || []) as any[]
  const empOptions = employees.map((e: any) => ({ value: String(e.id), label: `${e.employee_code} - ${fullName(e.first_name, e.last_name)}` }))

  // Asset Form
  const [form, setForm] = useState({ asset_type: 'Laptop', brand: '', model: '', serial_number: '', purchase_date: '', purchase_price: '', warranty_expiry: '', condition_notes: '' })

  const createMut = useMutation({
    mutationFn: () => assetApi.create({ ...form, purchase_price: form.purchase_price ? Number(form.purchase_price) : undefined }),
    onSuccess: () => { setShowForm(false); qc.invalidateQueries({ queryKey: ['assets'] }); qc.invalidateQueries({ queryKey: ['asset-summary'] }); toast.success('Asset added.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })
  const updateMut = useMutation({
    mutationFn: () => assetApi.update(editAsset.id, { ...form, purchase_price: form.purchase_price ? Number(form.purchase_price) : undefined }),
    onSuccess: () => { setShowForm(false); setEditAsset(null); qc.invalidateQueries({ queryKey: ['assets'] }); toast.success('Asset updated.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })
  const deleteMut = useMutation({
    mutationFn: (id: number) => assetApi.delete(id),
    onSuccess: () => { setConfirmDelete(null); qc.invalidateQueries({ queryKey: ['assets'] }); qc.invalidateQueries({ queryKey: ['asset-summary'] }); toast.success('Asset deleted.') },
  })

  // Assign / Return / Replace
  const [assignForm, setAssignForm] = useState({ employee_id: '', issue_date: new Date().toISOString().slice(0, 10), reason: '' })
  const assignMut = useMutation({
    mutationFn: () => assetApi.assign(assignFor.id, { employee_id: Number(assignForm.employee_id), issue_date: assignForm.issue_date, reason: assignForm.reason || undefined }),
    onSuccess: () => { setAssignFor(null); qc.invalidateQueries({ queryKey: ['assets'] }); qc.invalidateQueries({ queryKey: ['asset-summary'] }); toast.success('Asset assigned.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })

  const [returnForm, setReturnForm] = useState({ return_date: new Date().toISOString().slice(0, 10), condition_notes: '', reason: '' })
  const returnMut = useMutation({
    mutationFn: () => assetApi.return(returnFor.id, returnForm),
    onSuccess: () => { setReturnFor(null); qc.invalidateQueries({ queryKey: ['assets'] }); qc.invalidateQueries({ queryKey: ['asset-summary'] }); toast.success('Asset returned.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })

  const [replaceForm, setReplaceForm] = useState({ employee_id: '', issue_date: new Date().toISOString().slice(0, 10), replacement_asset_id: '', reason: '' })
  const replaceMut = useMutation({
    mutationFn: () => assetApi.replace(replaceFor.id, { employee_id: Number(replaceForm.employee_id), issue_date: replaceForm.issue_date, replacement_asset_id: Number(replaceForm.replacement_asset_id), reason: replaceForm.reason || undefined }),
    onSuccess: () => { setReplaceFor(null); qc.invalidateQueries({ queryKey: ['assets'] }); qc.invalidateQueries({ queryKey: ['asset-summary'] }); toast.success('Asset replaced.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })

  const openEdit = (a: any) => {
    setEditAsset(a)
    setForm({ asset_type: a.asset_type, brand: a.brand || '', model: a.model || '', serial_number: a.serial_number || '', purchase_date: a.purchase_date || '', purchase_price: a.purchase_price ? String(a.purchase_price) : '', warranty_expiry: a.warranty_expiry || '', condition_notes: a.condition_notes || '' })
    setShowForm(true)
  }
  const openCreate = () => {
    setEditAsset(null)
    setForm({ asset_type: 'Laptop', brand: '', model: '', serial_number: '', purchase_date: '', purchase_price: '', warranty_expiry: '', condition_notes: '' })
    setShowForm(true)
  }

  const availableAssets = assets.filter((a: any) => a.status === 'available')

  return (
    <div>
      <PageHeader title="Asset Management" subtitle="Track company assets & assignments" actions={<Button onClick={openCreate}><Plus className="w-3.5 h-3.5" /> Add Asset</Button>} />

      {/* Summary Cards */}
      {summary?.data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
          {[
            { label: 'Total Assets', value: summary.data.total },
            { label: 'Available', value: summary.data.available, color: 'text-success' },
            { label: 'Assigned', value: summary.data.assigned, color: 'text-link-deep' },
            { label: 'Maintenance', value: summary.data.maintenance, color: 'text-warning-deep' },
            { label: 'Retired', value: summary.data.retired, color: 'text-mute' },
          ].map((s, i) => (
            <div key={i} className="bg-white card-shadow rounded-md p-3">
              <p className="text-[11px] text-mute">{s.label}</p>
              <p className={`text-[18px] font-semibold ${s.color || 'text-ink'}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        {tab === 'assets' && (
          <>
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-mute" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by code, brand, model..." className="w-full h-9 pl-8 pr-3 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink" />
            </div>
            <Select options={[{ value: '', label: 'All Types' }, ...ASSET_TYPES.map(t => ({ value: t, label: t }))]} value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="w-full sm:w-32" />
            <Select options={[{ value: '', label: 'All Status' }, { value: 'available', label: 'Available' }, { value: 'assigned', label: 'Assigned' }, { value: 'maintenance', label: 'Maintenance' }, { value: 'retired', label: 'Retired' }]} value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full sm:w-32" />
          </>
        )}
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      <div className="bg-white card-shadow rounded-md p-4 mt-4">
        {/* Assets Tab */}
        {tab === 'assets' && (
          isLoading ? <LoadingState /> :
          error ? <PageError onRetry={() => refetch()} /> :
          assets.length === 0 ? <EmptyState title="No assets found" description="Add company assets to track assignments." action={<Button onClick={openCreate}><Plus className="w-3.5 h-3.5" /> Add Asset</Button>} /> : (
            <Table
              columns={[
                { key: 'asset_code', header: 'Code', className: 'font-mono text-[11px] font-medium text-link' },
                { key: 'asset_type', header: 'Type', render: (r: any) => <Badge className="bg-canvas-soft-2 text-body">{r.asset_type}</Badge> },
                { key: 'brand_model', header: 'Brand / Model', render: (r: any) => <div><p className="text-[13px] text-ink">{r.brand || '—'}</p><p className="text-[11px] text-mute">{r.model || '—'}</p></div> },
                { key: 'serial_number', header: 'Serial No.', className: 'font-mono text-[12px]' },
                { key: 'status', header: 'Status', render: (r: any) => <Badge className={STATUS_MAP[r.status] || ''}>{r.status}</Badge> },
                { key: 'actions', header: '', render: (r: any) => (
                  <div className="flex items-center gap-1">
                    <button onClick={() => setDetailFor(r)} className="px-1.5 py-0.5 text-[11px] text-body hover:bg-canvas-soft rounded-xs"><History className="w-3 h-3 inline mr-0.5" />History</button>
                    {r.status === 'available' && <button onClick={() => { setAssignForm({ employee_id: '', issue_date: new Date().toISOString().slice(0, 10), reason: '' }); setAssignFor(r) }} className="px-1.5 py-0.5 text-[11px] text-link hover:bg-link-soft rounded-xs"><ArrowRightLeft className="w-3 h-3 inline mr-0.5" />Assign</button>}
                    {r.status === 'assigned' && <>
                      <button onClick={() => { setReturnForm({ return_date: new Date().toISOString().slice(0, 10), condition_notes: '', reason: '' }); setReturnFor(r) }} className="px-1.5 py-0.5 text-[11px] text-success hover:bg-success-soft rounded-xs"><RotateCcw className="w-3 h-3 inline mr-0.5" />Return</button>
                      <button onClick={() => { setReplaceForm({ employee_id: '', issue_date: new Date().toISOString().slice(0, 10), replacement_asset_id: '', reason: '' }); setReplaceFor(r) }} className="px-1.5 py-0.5 text-[11px] text-warning-deep hover:bg-warning-soft rounded-xs">Replace</button>
                    </>}
                    <button onClick={() => openEdit(r)} className="px-1.5 py-0.5 text-[11px] text-body hover:bg-canvas-soft rounded-xs"><Edit className="w-3 h-3" /></button>
                    <button onClick={() => setConfirmDelete(r.id)} className="px-1 py-0.5 text-[11px] text-error hover:bg-error-soft rounded-xs"><Trash2 className="w-3 h-3" /></button>
                  </div>
                )},
              ]}
              data={assets}
              keyFn={(r: any) => String(r.id)}
              emptyMessage="No assets found."
            />
          )
        )}

        {/* History Tab */}
        {tab === 'history' && (
          histLoading ? <LoadingState /> :
          (histData?.data || []).length === 0 ? <EmptyState title="No assignment history" description="Issue, return, and replacement records will appear here." /> : (
            <Table
              columns={[
                { key: 'asset_code', header: 'Asset', render: (r: any) => <div><p className="text-[12px] font-mono text-link">{r.asset_code}</p><p className="text-[11px] text-mute">{r.asset_type} · {r.brand || ''}</p></div> },
                { key: 'employee', header: 'Employee', render: (r: any) => <div><p className="text-[13px] text-ink">{fullName(r.first_name, r.last_name)}</p><p className="text-[11px] text-mute">{r.employee_code}</p></div> },
                { key: 'action', header: 'Action', render: (r: any) => <Badge className={ACTION_MAP[r.action] || ''}>{r.action}</Badge> },
                { key: 'issue_date', header: 'Issue Date', render: (r: any) => <span className="text-[12px]">{dateShort(r.issue_date)}</span> },
                { key: 'return_date', header: 'Return Date', render: (r: any) => <span className="text-[12px]">{r.return_date ? dateShort(r.return_date) : '—'}</span> },
                { key: 'reason', header: 'Reason', render: (r: any) => <p className="text-[12px] text-body max-w-[200px] truncate">{r.reason || '—'}</p> },
                { key: 'performed_by', header: 'By', render: (r: any) => <span className="text-[11px] text-mute">{r.performed_by || '—'}</span> },
              ]}
              data={histData?.data || []}
              keyFn={(r: any) => String(r.id)}
              emptyMessage="No history found."
            />
          )
        )}
      </div>

      {/* Asset Detail / History Modal */}
      <Modal open={!!detailFor} onClose={() => setDetailFor(null)} title={`Asset History — ${detailFor?.asset_code || ''}`} size="lg">
        {detailFor && <AssetDetailView assetId={detailFor.id} />}
      </Modal>

      {/* Create / Edit Modal */}
      <Modal open={showForm} onClose={() => { setShowForm(false); setEditAsset(null) }} title={editAsset ? `Edit Asset — ${editAsset.asset_code}` : 'Add New Asset'} size="md">
        <div className="space-y-3">
          <Select label="Asset Type" options={ASSET_TYPES.map(t => ({ value: t, label: t }))} value={form.asset_type} onChange={e => setForm(f => ({ ...f, asset_type: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Brand" placeholder="e.g. Dell, Apple" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
            <Input label="Model" placeholder="e.g. Latitude 5540" value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
          </div>
          <Input label="Serial Number" placeholder="e.g. SN-12345678" value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Purchase Date" type="date" value={form.purchase_date} onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))} />
            <Input label="Purchase Price (₹)" type="number" value={form.purchase_price} onChange={e => setForm(f => ({ ...f, purchase_price: e.target.value }))} />
          </div>
          <Input label="Warranty Expiry" type="date" value={form.warranty_expiry} onChange={e => setForm(f => ({ ...f, warranty_expiry: e.target.value }))} />
          <Textarea label="Condition Notes" value={form.condition_notes} onChange={e => setForm(f => ({ ...f, condition_notes: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
            <Button variant="secondary" onClick={() => { setShowForm(false); setEditAsset(null) }}>Cancel</Button>
            <Button loading={createMut.isPending || updateMut.isPending} onClick={() => editAsset ? updateMut.mutate() : createMut.mutate()}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* Assign Modal */}
      <Modal open={!!assignFor} onClose={() => setAssignFor(null)} title={`Assign Asset — ${assignFor?.asset_code || ''}`} size="sm">
        <div className="space-y-3">
          <Select label="Assign To" options={[{ value: '', label: 'Select employee...' }, ...empOptions]} value={assignForm.employee_id} onChange={e => setAssignForm(f => ({ ...f, employee_id: e.target.value }))} />
          <Input label="Issue Date" type="date" value={assignForm.issue_date} onChange={e => setAssignForm(f => ({ ...f, issue_date: e.target.value }))} />
          <Textarea label="Reason (optional)" value={assignForm.reason} onChange={e => setAssignForm(f => ({ ...f, reason: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
            <Button variant="secondary" onClick={() => setAssignFor(null)}>Cancel</Button>
            <Button loading={assignMut.isPending} onClick={() => assignMut.mutate()}>Assign</Button>
          </div>
        </div>
      </Modal>

      {/* Return Modal */}
      <Modal open={!!returnFor} onClose={() => setReturnFor(null)} title={`Return Asset — ${returnFor?.asset_code || ''}`} size="sm">
        <div className="space-y-3">
          <Input label="Return Date" type="date" value={returnForm.return_date} onChange={e => setReturnForm(f => ({ ...f, return_date: e.target.value }))} />
          <Textarea label="Condition Notes" value={returnForm.condition_notes} onChange={e => setReturnForm(f => ({ ...f, condition_notes: e.target.value }))} />
          <Textarea label="Reason (optional)" value={returnForm.reason} onChange={e => setReturnForm(f => ({ ...f, reason: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
            <Button variant="secondary" onClick={() => setReturnFor(null)}>Cancel</Button>
            <Button loading={returnMut.isPending} onClick={() => returnMut.mutate()}>Return</Button>
          </div>
        </div>
      </Modal>

      {/* Replace Modal */}
      <Modal open={!!replaceFor} onClose={() => setReplaceFor(null)} title={`Replace Asset — ${replaceFor?.asset_code || ''}`} size="md">
        <div className="space-y-3">
          <p className="text-[13px] text-body">Replace <strong>{replaceFor?.asset_code}</strong> with a different asset.</p>
          <Select label="Replacement Asset" options={[{ value: '', label: 'Select asset...' }, ...availableAssets.map((a: any) => ({ value: String(a.id), label: `${a.asset_code} — ${a.brand || ''} ${a.model || ''}` }))]} value={replaceForm.replacement_asset_id} onChange={e => setReplaceForm(f => ({ ...f, replacement_asset_id: e.target.value }))} />
          <Input label="Date" type="date" value={replaceForm.issue_date} onChange={e => setReplaceForm(f => ({ ...f, issue_date: e.target.value }))} />
          <Textarea label="Reason (optional)" value={replaceForm.reason} onChange={e => setReplaceForm(f => ({ ...f, reason: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
            <Button variant="secondary" onClick={() => setReplaceFor(null)}>Cancel</Button>
            <Button loading={replaceMut.isPending} onClick={() => replaceMut.mutate()}>Replace</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={() => confirmDelete && deleteMut.mutate(confirmDelete)} title="Delete Asset" message="Are you sure you want to delete this asset? This cannot be undone." danger loading={deleteMut.isPending} />
    </div>
  )
}

function AssetDetailView({ assetId }: { assetId: number }) {
  const { data, isLoading } = useQuery({ queryKey: ['asset', assetId], queryFn: () => assetApi.get(assetId) })
  if (isLoading) return <LoadingState />
  const asset = data?.data as any
  if (!asset) return null
  const assignments = asset.assignments || []
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px]">
        <div><span className="text-mute">Code:</span> <span className="font-mono font-medium">{asset.asset_code}</span></div>
        <div><span className="text-mute">Type:</span> <span>{asset.asset_type}</span></div>
        <div><span className="text-mute">Brand:</span> <span>{asset.brand || '—'}</span></div>
        <div><span className="text-mute">Model:</span> <span>{asset.model || '—'}</span></div>
        <div><span className="text-mute">Serial:</span> <span className="font-mono">{asset.serial_number || '—'}</span></div>
        <div><span className="text-mute">Status:</span> <Badge className={STATUS_MAP[asset.status] || ''}>{asset.status}</Badge></div>
        <div><span className="text-mute">Purchase:</span> <span>{asset.purchase_date ? dateShort(asset.purchase_date) : '—'}</span></div>
        <div><span className="text-mute">Price:</span> <span>{asset.purchase_price ? `₹${Number(asset.purchase_price).toLocaleString('en-IN')}` : '—'}</span></div>
      </div>
      {assignments.length === 0 ? (
        <p className="text-[13px] text-mute text-center py-4">No assignment history.</p>
      ) : (
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-left text-mute border-b border-hairline">
              <th className="py-1.5 font-medium">Action</th>
              <th className="py-1.5 font-medium">Employee</th>
              <th className="py-1.5 font-medium">Issue Date</th>
              <th className="py-1.5 font-medium">Return Date</th>
              <th className="py-1.5 font-medium">Reason</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a: any) => (
              <tr key={a.id} className="border-b border-hairline last:border-0">
                <td className="py-1.5"><Badge className={ACTION_MAP[a.action] || ''}>{a.action}</Badge></td>
                <td className="py-1.5">{fullName(a.first_name, a.last_name)} <span className="text-mute">({a.employee_code})</span></td>
                <td className="py-1.5">{dateShort(a.issue_date)}</td>
                <td className="py-1.5">{a.return_date ? dateShort(a.return_date) : '—'}</td>
                <td className="py-1.5 text-body max-w-[200px] truncate">{a.reason || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
