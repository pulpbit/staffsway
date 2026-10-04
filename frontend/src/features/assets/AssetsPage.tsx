import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { assetApi, employeeApi } from '@/services/api'
import { Button, Input, Textarea, Select } from '@/components/ui/fields'
import { Table, Badge, Tabs } from '@/components/ui/data'
import { PageHeader, LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { Modal, ConfirmDialog } from '@/components/ui/overlay'
import { fullName, dateShort } from '@/utils/format'
import { toast } from 'sonner'
import {
  Plus, Trash2, Search, Package, ArrowRightLeft, RotateCcw, History, Edit,
  Laptop, Smartphone, Wrench, Shield, CheckCircle2, Clock, Sparkles
} from 'lucide-react'

const ASSET_TYPES = ['Laptop', 'Mobile', 'ID Card', 'Uniform', 'Tools', 'Vehicle', 'Other']

const STATUS_MAP: Record<string, { bg: string; text: string; dot: string }> = {
  available: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  assigned: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  maintenance: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  retired: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' }
}

const ACTION_MAP: Record<string, { bg: string; text: string }> = {
  issued: { bg: 'bg-blue-50 text-blue-700', text: 'Issued' },
  returned: { bg: 'bg-emerald-50 text-emerald-700', text: 'Returned' },
  replaced: { bg: 'bg-amber-50 text-amber-700', text: 'Replaced' }
}

const TABS = [
  { key: 'assets', label: 'Company Asset Inventory' },
  { key: 'history', label: 'Asset Custody & Assignment History' },
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
  const empOptions = employees.map((e: any) => ({ value: String(e.id), label: `${e.employee_code} — ${fullName(e.first_name, e.last_name)}` }))

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
    onSuccess: () => { setAssignFor(null); qc.invalidateQueries({ queryKey: ['assets'] }); qc.invalidateQueries({ queryKey: ['asset-summary'] }); toast.success('Asset assigned successfully.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })

  const [returnForm, setReturnForm] = useState({ return_date: new Date().toISOString().slice(0, 10), condition_notes: '', reason: '' })
  const returnMut = useMutation({
    mutationFn: () => assetApi.return(returnFor.id, returnForm),
    onSuccess: () => { setReturnFor(null); qc.invalidateQueries({ queryKey: ['assets'] }); qc.invalidateQueries({ queryKey: ['asset-summary'] }); toast.success('Asset marked as returned.') },
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
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Package className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Enterprise Asset Management</h1>
          </div>
          <p className="text-xs text-slate-500">Inventory tracking, hardware lifecycle, employee allocations & maintenance records</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={openCreate} className="shadow-sm hover:shadow transition-all">
            <Plus className="w-4 h-4 mr-1.5" /> Add New Asset
          </Button>
        </div>
      </div>

      {/* Top Stat Cards */}
      {summary?.data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { label: 'Total Assets', value: summary.data.total, gradient: 'from-slate-700 to-slate-800' },
            { label: 'Available in Stock', value: summary.data.available, gradient: 'from-emerald-600 to-teal-600' },
            { label: 'Assigned to Staff', value: summary.data.assigned, gradient: 'from-blue-600 to-indigo-600' },
            { label: 'Under Maintenance', value: summary.data.maintenance, gradient: 'from-amber-500 to-orange-500' },
            { label: 'Retired Assets', value: summary.data.retired, gradient: 'from-slate-500 to-slate-600' },
          ].map((s, i) => (
            <div key={i} className="relative overflow-hidden bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500">{s.label}</span>
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-white shadow-sm`}>
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 tracking-tight">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter and Tab Section */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 space-y-4">
        {tab === 'assets' && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <div className="w-full sm:w-72 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search code, brand, serial..."
                  className="w-full h-10 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div className="w-full sm:w-36">
                <Select
                  options={[{ value: '', label: 'All Asset Types' }, ...ASSET_TYPES.map(t => ({ value: t, label: t }))]}
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                />
              </div>
              <div className="w-full sm:w-36">
                <Select
                  options={[{ value: '', label: 'All Status' }, { value: 'available', label: 'Available' }, { value: 'assigned', label: 'Assigned' }, { value: 'maintenance', label: 'Maintenance' }, { value: 'retired', label: 'Retired' }]}
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                />
              </div>
              {(search || typeFilter || statusFilter) && (
                <button
                  onClick={() => { setSearch(''); setTypeFilter(''); setStatusFilter('') }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-slate-100">
          <Tabs tabs={TABS} active={tab} onChange={setTab} />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        {tab === 'assets' ? (
          isLoading ? (
            <div className="p-8"><LoadingState /></div>
          ) : error ? (
            <div className="p-8"><PageError onRetry={() => refetch()} /></div>
          ) : assets.length === 0 ? (
            <div className="p-8"><EmptyState title="No Assets in Inventory" description="Add physical equipment, vehicles or IT assets to begin custody tracking." action={<Button onClick={openCreate}><Plus className="w-4 h-4 mr-1.5" /> Add Asset</Button>} /></div>
          ) : (
            <Table
              columns={[
                { key: 'asset_code', header: 'Asset Tag', className: 'font-mono text-xs font-bold text-indigo-600' },
                { key: 'asset_type', header: 'Category', render: (r: any) => (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                    {r.asset_type}
                  </span>
                ) },
                { key: 'brand_model', header: 'Make & Model', render: (r: any) => (
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{r.brand || 'Generic'}</p>
                    <p className="text-[11px] text-slate-500">{r.model || '—'}</p>
                  </div>
                ) },
                { key: 'serial_number', header: 'Serial Number', render: (r: any) => <span className="font-mono text-xs text-slate-600">{r.serial_number || '—'}</span> },
                { key: 'status', header: 'Status', render: (r: any) => {
                  const s = STATUS_MAP[r.status] || STATUS_MAP.available
                  return (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      {r.status}
                    </span>
                  )
                } },
                { key: 'actions', header: '', render: (r: any) => (
                  <div className="flex items-center gap-1.5 justify-end">
                    <button onClick={() => setDetailFor(r)} className="px-2 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1">
                      <History className="w-3.5 h-3.5" /> Logs
                    </button>
                    {r.status === 'available' && (
                      <button onClick={() => { setAssignForm({ employee_id: '', issue_date: new Date().toISOString().slice(0, 10), reason: '' }); setAssignFor(r) }} className="px-2 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1">
                        <ArrowRightLeft className="w-3.5 h-3.5" /> Allocate
                      </button>
                    )}
                    {r.status === 'assigned' && (
                      <>
                        <button onClick={() => { setReturnForm({ return_date: new Date().toISOString().slice(0, 10), condition_notes: '', reason: '' }); setReturnFor(r) }} className="px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1">
                          <RotateCcw className="w-3.5 h-3.5" /> Return
                        </button>
                        <button onClick={() => { setReplaceForm({ employee_id: '', issue_date: new Date().toISOString().slice(0, 10), replacement_asset_id: '', reason: '' }); setReplaceFor(r) }} className="px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors">
                          Replace
                        </button>
                      </>
                    )}
                    <button onClick={() => openEdit(r)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => setConfirmDelete(r.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) },
              ]}
              data={assets}
              keyFn={(r: any) => String(r.id)}
            />
          )
        ) : (
          histLoading ? (
            <div className="p-8"><LoadingState /></div>
          ) : (histData?.data || []).length === 0 ? (
            <div className="p-8"><EmptyState title="No Custody History Logged" description="Every issue, return, or replacement event will appear in this timeline." /></div>
          ) : (
            <Table
              columns={[
                { key: 'asset_code', header: 'Asset Details', render: (r: any) => (
                  <div>
                    <span className="font-mono text-xs font-bold text-indigo-600 block">{r.asset_code}</span>
                    <span className="text-[11px] text-slate-500">{r.asset_type} · {r.brand || ''}</span>
                  </div>
                ) },
                { key: 'employee', header: 'Staff Custodian', render: (r: any) => (
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{fullName(r.first_name, r.last_name)}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{r.employee_code}</p>
                  </div>
                ) },
                { key: 'action', header: 'Action', render: (r: any) => (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${ACTION_MAP[r.action]?.bg || 'bg-slate-100 text-slate-600'}`}>
                    {ACTION_MAP[r.action]?.text || r.action}
                  </span>
                ) },
                { key: 'issue_date', header: 'Issue Date', render: (r: any) => <span className="text-xs text-slate-700 font-medium">{dateShort(r.issue_date)}</span> },
                { key: 'return_date', header: 'Return Date', render: (r: any) => <span className="text-xs text-slate-700 font-medium">{r.return_date ? dateShort(r.return_date) : 'Active Custody'}</span> },
                { key: 'reason', header: 'Allocation Context', render: (r: any) => <p className="text-xs text-slate-600 max-w-[220px] truncate">{r.reason || '—'}</p> },
                { key: 'performed_by', header: 'Authorized By', render: (r: any) => <span className="text-xs text-slate-500">{r.performed_by || 'System'}</span> },
              ]}
              data={histData?.data || []}
              keyFn={(r: any) => String(r.id)}
            />
          )
        )}
      </div>

      {/* Asset Detail & Custody Modal */}
      <Modal open={!!detailFor} onClose={() => setDetailFor(null)} title={`Asset Ledger — ${detailFor?.asset_code || ''}`} size="lg">
        {detailFor && <AssetDetailView assetId={detailFor.id} />}
      </Modal>

      {/* Create / Edit Modal */}
      <Modal open={showForm} onClose={() => { setShowForm(false); setEditAsset(null) }} title={editAsset ? `Edit Asset ${editAsset.asset_code}` : 'Register New Asset'} size="md">
        <div className="space-y-4 pt-1">
          <Select label="Asset Category" options={ASSET_TYPES.map(t => ({ value: t, label: t }))} value={form.asset_type} onChange={e => setForm(f => ({ ...f, asset_type: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Manufacturer / Brand" placeholder="e.g. Dell, Apple, Lenovo" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
            <Input label="Model Specification" placeholder="e.g. Latitude 5440" value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
          </div>
          <Input label="Serial / Hardware Number" placeholder="e.g. CN-0XYZ98-76543" value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Purchase Date" type="date" value={form.purchase_date} onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))} />
            <Input label="Purchase Price (₹)" type="number" placeholder="Cost" value={form.purchase_price} onChange={e => setForm(f => ({ ...f, purchase_price: e.target.value }))} />
          </div>
          <Input label="Warranty Expiry Date" type="date" value={form.warranty_expiry} onChange={e => setForm(f => ({ ...f, warranty_expiry: e.target.value }))} />
          <Textarea label="Condition Notes" placeholder="Cosmetic condition, accessories included..." value={form.condition_notes} onChange={e => setForm(f => ({ ...f, condition_notes: e.target.value }))} />
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => { setShowForm(false); setEditAsset(null) }}>Cancel</Button>
            <Button loading={createMut.isPending || updateMut.isPending} onClick={() => editAsset ? updateMut.mutate() : createMut.mutate()}>
              Save Asset Record
            </Button>
          </div>
        </div>
      </Modal>

      {/* Assign Modal */}
      <Modal open={!!assignFor} onClose={() => setAssignFor(null)} title={`Allocate Asset — ${assignFor?.asset_code || ''}`} size="sm">
        <div className="space-y-4 pt-1">
          <Select label="Assign To Staff" options={[{ value: '', label: 'Select employee...' }, ...empOptions]} value={assignForm.employee_id} onChange={e => setAssignForm(f => ({ ...f, employee_id: e.target.value }))} />
          <Input label="Allocation Date" type="date" value={assignForm.issue_date} onChange={e => setAssignForm(f => ({ ...f, issue_date: e.target.value }))} />
          <Textarea label="Purpose / Project Notes" placeholder="Deployment reason or site allocation..." value={assignForm.reason} onChange={e => setAssignForm(f => ({ ...f, reason: e.target.value }))} />
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setAssignFor(null)}>Cancel</Button>
            <Button loading={assignMut.isPending} onClick={() => assignMut.mutate()}>Confirm Allocation</Button>
          </div>
        </div>
      </Modal>

      {/* Return Modal */}
      <Modal open={!!returnFor} onClose={() => setReturnFor(null)} title={`Receive Returned Asset — ${returnFor?.asset_code || ''}`} size="sm">
        <div className="space-y-4 pt-1">
          <Input label="Return Date" type="date" value={returnForm.return_date} onChange={e => setReturnForm(f => ({ ...f, return_date: e.target.value }))} />
          <Textarea label="Physical Condition" placeholder="Condition upon return, damages if any..." value={returnForm.condition_notes} onChange={e => setReturnForm(f => ({ ...f, condition_notes: e.target.value }))} />
          <Textarea label="Remarks" placeholder="Reason for handover (e.g. exit, upgrade)..." value={returnForm.reason} onChange={e => setReturnForm(f => ({ ...f, reason: e.target.value }))} />
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setReturnFor(null)}>Cancel</Button>
            <Button loading={returnMut.isPending} onClick={() => returnMut.mutate()}>Confirm Return</Button>
          </div>
        </div>
      </Modal>

      {/* Replace Modal */}
      <Modal open={!!replaceFor} onClose={() => setReplaceFor(null)} title={`Replace Asset ${replaceFor?.asset_code || ''}`} size="md">
        <div className="space-y-4 pt-1">
          <p className="text-xs text-slate-600">Swap current asset <strong>{replaceFor?.asset_code}</strong> with an available replacement unit.</p>
          <Select label="Replacement Unit" options={[{ value: '', label: 'Select available replacement...' }, ...availableAssets.map((a: any) => ({ value: String(a.id), label: `${a.asset_code} — ${a.brand || ''} ${a.model || ''}` }))]} value={replaceForm.replacement_asset_id} onChange={e => setReplaceForm(f => ({ ...f, replacement_asset_id: e.target.value }))} />
          <Input label="Swap Date" type="date" value={replaceForm.issue_date} onChange={e => setReplaceForm(f => ({ ...f, issue_date: e.target.value }))} />
          <Textarea label="Reason for Replacement" placeholder="e.g. Hardware defect, memory upgrade..." value={replaceForm.reason} onChange={e => setReplaceForm(f => ({ ...f, reason: e.target.value }))} />
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setReplaceFor(null)}>Cancel</Button>
            <Button loading={replaceMut.isPending} onClick={() => replaceMut.mutate()}>Confirm Swap</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={() => confirmDelete && deleteMut.mutate(confirmDelete)} title="Delete Asset Record" message="Are you sure you want to remove this asset? All custody records tied to it will also be purged." danger loading={deleteMut.isPending} />
    </div>
  )
}

function AssetDetailView({ assetId }: { assetId: number }) {
  const { data, isLoading } = useQuery({ queryKey: ['asset', assetId], queryFn: () => assetApi.get(assetId) })
  if (isLoading) return <div className="p-6"><LoadingState /></div>
  const asset = data?.data as any
  if (!asset) return null
  const assignments = asset.assignments || []

  return (
    <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div><span className="text-slate-500 block">Asset Tag:</span> <span className="font-mono font-bold text-indigo-600">{asset.asset_code}</span></div>
        <div><span className="text-slate-500 block">Category:</span> <span className="font-semibold text-slate-800">{asset.asset_type}</span></div>
        <div><span className="text-slate-500 block">Brand &amp; Model:</span> <span className="font-semibold text-slate-800">{asset.brand || '—'} {asset.model || ''}</span></div>
        <div><span className="text-slate-500 block">Status:</span> <span className="font-bold text-slate-800 capitalize">{asset.status}</span></div>
        <div><span className="text-slate-500 block">Serial Number:</span> <span className="font-mono text-slate-700">{asset.serial_number || '—'}</span></div>
        <div><span className="text-slate-500 block">Purchase Date:</span> <span className="text-slate-700">{asset.purchase_date ? dateShort(asset.purchase_date) : '—'}</span></div>
        <div><span className="text-slate-500 block">Original Cost:</span> <span className="font-mono font-semibold text-slate-900">{asset.purchase_price ? `₹${Number(asset.purchase_price).toLocaleString('en-IN')}` : '—'}</span></div>
        <div><span className="text-slate-500 block">Warranty Until:</span> <span className="text-slate-700">{asset.warranty_expiry ? dateShort(asset.warranty_expiry) : '—'}</span></div>
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-indigo-600" /> Historical Custody Chain
        </h4>
        {assignments.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-4 text-center">No custody changes recorded yet.</p>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 bg-slate-50 border-b border-slate-200/80">
                  <th className="py-2 px-3 font-semibold">Action</th>
                  <th className="py-2 px-3 font-semibold">Staff Custodian</th>
                  <th className="py-2 px-3 font-semibold">Issue Date</th>
                  <th className="py-2 px-3 font-semibold">Return Date</th>
                  <th className="py-2 px-3 font-semibold">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a: any) => (
                  <tr key={a.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <td className="py-2 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${ACTION_MAP[a.action]?.bg || 'bg-slate-100'}`}>
                        {a.action}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-800">{fullName(a.first_name, a.last_name)} <span className="text-slate-400 font-mono">({a.employee_code})</span></td>
                    <td className="py-2 px-3 text-slate-600">{dateShort(a.issue_date)}</td>
                    <td className="py-2 px-3 text-slate-600">{a.return_date ? dateShort(a.return_date) : 'Current'}</td>
                    <td className="py-2 px-3 text-slate-500 max-w-[200px] truncate">{a.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
