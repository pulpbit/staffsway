import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { employeeApi } from '@/services/api'
import { Button, Input, Select } from '@/components/ui/fields'
import { Table, Badge } from '@/components/ui/data'
import { PageHeader, LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { Modal, ConfirmDialog } from '@/components/ui/overlay'
import { fullName } from '@/utils/format'
import { toast } from 'sonner'
import { Plus, Search, Trash2, FileText, CheckCircle, XCircle } from 'lucide-react'

const DOC_TYPES = [
  'Aadhaar Card', 'PAN Card', 'Bank Proof', 'Photo', 'Education Certificate',
  'Experience Certificate', 'Appointment Letter', 'Salary Slips',
  'PF Documents', 'ESI Documents', 'ID Card', 'Address Proof', 'Other',
]

export default function DocumentsPage() {
  const [search, setSearch] = useState('')
  const [empFilter, setEmpFilter] = useState<number | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [selectedEmp, setSelectedEmp] = useState<any>(null)
  const [docForm, setDocForm] = useState({ document_type: DOC_TYPES[0], document_name: '', document_number: '' })
  const [confirmDelete, setConfirmDelete] = useState<{ empId: number; docId: number } | null>(null)
  const qc = useQueryClient()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['employees-docs', search],
    queryFn: () => employeeApi.list({ search, page: '1', page_size: '100', status: 'active' }),
  })

  const employees = (data?.data || []) as any[]

  const docAddMut = useMutation({
    mutationFn: (empId: number) => employeeApi.addDocument(empId, {
      document_type: docForm.document_type,
      document_name: docForm.document_name || null,
      document_number: docForm.document_number || null,
    }),
    onSuccess: () => {
      setShowUpload(false)
      setDocForm({ document_type: DOC_TYPES[0], document_name: '', document_number: '' })
      qc.invalidateQueries({ queryKey: ['employees-docs'] })
      qc.invalidateQueries({ queryKey: ['employee'] })
      toast.success('Document added.')
    },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to add document.'),
  })

  const docDeleteMut = useMutation({
    mutationFn: ({ empId, docId }: { empId: number; docId: number }) => employeeApi.deleteDocument(empId, docId),
    onSuccess: () => { setConfirmDelete(null); qc.invalidateQueries({ queryKey: ['employees-docs'] }); toast.success('Document removed.') },
  })

  const docVerifyMut = useMutation({
    mutationFn: ({ empId, docId, verified }: { empId: number; docId: number; verified: boolean }) => employeeApi.verifyDocument(empId, docId, verified),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees-docs'] }); toast.success('Verification updated.') },
  })

  const openUploadModal = (emp: any) => {
    setSelectedEmp(emp)
    setDocForm({ document_type: DOC_TYPES[0], document_name: '', document_number: '' })
    setShowUpload(true)
  }

  return (
    <div>
      <PageHeader
        title="Documents Management"
        subtitle="Digital employee file — text records for all documents"
      />

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-mute" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employees by name, code..."
              className="w-full h-9 pl-8 pr-3 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink"
            />
          </div>
        </div>
      </div>

      <div className="bg-white card-shadow rounded-md p-4">
        {isLoading ? <LoadingState /> :
         error ? <PageError onRetry={() => refetch()} /> :
         employees.length === 0 ? (
           <EmptyState title="No employees found" description="Add employees first to manage their documents." />
         ) : (
          <div className="space-y-2">
            {employees.map((emp: any) => (
              <EmployeeDocRow key={emp.id} employee={emp} onUpload={openUploadModal} onViewDocs={(e) => setSelectedEmp(e)} />
            ))}
          </div>
         )}
      </div>

      {/* Add Document Modal */}
      <Modal open={showUpload} onClose={() => setShowUpload(false)} title={`Add Document — ${selectedEmp ? fullName(selectedEmp.first_name, selectedEmp.last_name) : ''}`} size="md">
        <div className="space-y-3">
          <Select label="Document Type" options={DOC_TYPES.map(t => ({ value: t, label: t }))} value={docForm.document_type} onChange={e => setDocForm(f => ({ ...f, document_type: e.target.value }))} />
          <Input label="Document Name (optional)" placeholder="e.g. Front side, Back side" value={docForm.document_name} onChange={e => setDocForm(f => ({ ...f, document_name: e.target.value }))} />
          <Input label="Document Number (optional)" placeholder="e.g. Aadhaar number, PAN number" value={docForm.document_number} onChange={e => setDocForm(f => ({ ...f, document_number: e.target.value }))} />
          <p className="text-[11px] text-mute">Text records only — no file storage.</p>
          <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
            <Button variant="secondary" onClick={() => setShowUpload(false)}>Cancel</Button>
            <Button loading={docAddMut.isPending} onClick={() => selectedEmp && docAddMut.mutate(selectedEmp.id)}>
              <Plus className="w-3.5 h-3.5" /> Add
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Documents Modal */}
      <Modal open={!!selectedEmp && !showUpload} onClose={() => setSelectedEmp(null)} title={`Documents — ${selectedEmp ? fullName(selectedEmp.first_name, selectedEmp.last_name) : ''}`} size="lg">
        {selectedEmp && <EmployeeDocumentsView employeeId={selectedEmp.id} onDelete={(docId) => setConfirmDelete({ empId: selectedEmp.id, docId })} onVerify={(docId, verified) => docVerifyMut.mutate({ empId: selectedEmp.id, docId, verified })} onUpload={() => openUploadModal(selectedEmp)} />}
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && docDeleteMut.mutate(confirmDelete)}
        title="Delete Document"
        message="Are you sure you want to delete this document?"
        danger
        loading={docDeleteMut.isPending}
      />
    </div>
  )
}

function EmployeeDocRow({ employee, onUpload, onViewDocs }: { employee: any; onUpload: (e: any) => void; onViewDocs: (e: any) => void }) {
  const { data: empData } = useQuery({
    queryKey: ['employee', employee.id],
    queryFn: () => employeeApi.get(employee.id),
  })
  const docs = (empData?.data?.documents || []) as any[]
  const verifiedCount = docs.filter(d => d.verified).length

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 border border-hairline rounded-sm hover:bg-canvas-soft transition-colors">
      <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center text-[12px] font-semibold text-gold shrink-0">
        {employee.employee_code?.slice(-2)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-ink truncate">{fullName(employee.first_name, employee.last_name)}</p>
        <p className="text-[11px] text-mute">{employee.employee_code} · {employee.designation || '—'}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[12px] text-body">{docs.length} doc{docs.length !== 1 ? 's' : ''}</p>
        <p className="text-[11px] text-mute">{verifiedCount}/{docs.length} verified</p>
      </div>
      <div className="flex gap-1 shrink-0">
        <button onClick={() => onViewDocs(employee)} className="px-2 py-1 text-[11px] text-body hover:bg-canvas-soft-2 rounded-xs flex items-center gap-1">
          <FileText className="w-3 h-3" /> View
        </button>
        <button onClick={() => onUpload(employee)} className="px-2 py-1 text-[11px] text-link hover:bg-link-soft rounded-xs flex items-center gap-1">
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>
    </div>
  )
}

function EmployeeDocumentsView({ employeeId, onDelete, onVerify, onUpload }: { employeeId: number; onDelete: (docId: number) => void; onVerify: (docId: number, verified: boolean) => void; onUpload: () => void }) {
  const { data: empData, isLoading } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => employeeApi.get(employeeId),
  })
  const docs = (empData?.data?.documents || []) as any[]

  if (isLoading) return <LoadingState />

  return (
    <div className="space-y-3">
      {docs.length === 0 ? (
        <div className="text-center py-6">
          <FileText className="w-10 h-10 text-mute mx-auto mb-2" />
          <p className="text-[13px] text-mute">No documents on record yet.</p>
          <Button size="sm" onClick={onUpload} className="mt-2"><Plus className="w-3 h-3" /> Add Document</Button>
        </div>
      ) : (
        <>
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-mute border-b border-hairline">
                <th className="py-1.5 font-medium">Type</th>
                <th className="py-1.5 font-medium">Name</th>
                <th className="py-1.5 font-medium">Number</th>
                <th className="py-1.5 font-medium">Verified</th>
                <th className="py-1.5" />
              </tr>
            </thead>
            <tbody>
              {docs.map((doc: any) => (
                <tr key={doc.id} className="border-b border-hairline last:border-0">
                  <td className="py-1.5 text-ink font-medium">{doc.document_type}</td>
                  <td className="py-1.5 text-body">{doc.document_name || '—'}</td>
                  <td className="py-1.5 text-body font-mono">{doc.document_number || '—'}</td>
                  <td className="py-1.5">
                    <button onClick={() => onVerify(doc.id, !doc.verified)} title={doc.verified ? 'Verified — click to unmark' : 'Mark verified'}>
                      {doc.verified
                        ? <Badge className="bg-success-soft text-success flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Verified</Badge>
                        : <Badge className="bg-canvas-soft-2 text-mute">Pending</Badge>}
                    </button>
                  </td>
                  <td className="py-1.5 text-right">
                    <button onClick={() => onDelete(doc.id)} className="px-1.5 py-0.5 text-[11px] text-error hover:bg-error-soft rounded-xs"><Trash2 className="w-3 h-3 inline" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-between items-center pt-2 border-t border-hairline">
            <p className="text-[11px] text-mute">Text records only — no file storage.</p>
            <Button size="sm" onClick={onUpload}><Plus className="w-3 h-3" /> Add Document</Button>
          </div>
        </>
      )}
    </div>
  )
}
