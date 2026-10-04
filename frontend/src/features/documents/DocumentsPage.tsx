import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { employeeApi } from '@/services/api'
import { Button, Input, Select } from '@/components/ui/fields'
import { Table, Badge } from '@/components/ui/data'
import { PageHeader, LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { Modal, ConfirmDialog } from '@/components/ui/overlay'
import { fullName } from '@/utils/format'
import { toast } from 'sonner'
import {
  Plus, Search, Trash2, FileText, CheckCircle2, XCircle, ShieldCheck, FolderLock,
  Sparkles, FileCheck, Eye
} from 'lucide-react'

const DOC_TYPES = [
  'Aadhaar Card', 'PAN Card', 'Bank Proof', 'Photo', 'Education Certificate',
  'Experience Certificate', 'Appointment Letter', 'Salary Slips',
  'PF Documents', 'ESI Documents', 'ID Card', 'Address Proof', 'Other',
]

export default function DocumentsPage() {
  const [search, setSearch] = useState('')
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
      toast.success('Document record added.')
    },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to add document.'),
  })

  const docDeleteMut = useMutation({
    mutationFn: ({ empId, docId }: { empId: number; docId: number }) => employeeApi.deleteDocument(empId, docId),
    onSuccess: () => { setConfirmDelete(null); qc.invalidateQueries({ queryKey: ['employees-docs'] }); toast.success('Document removed.') },
  })

  const docVerifyMut = useMutation({
    mutationFn: ({ empId, docId, verified }: { empId: number; docId: number; verified: boolean }) => employeeApi.verifyDocument(empId, docId, verified),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees-docs'] }); toast.success('Verification status updated.') },
  })

  const openUploadModal = (emp: any) => {
    setSelectedEmp(emp)
    setDocForm({ document_type: DOC_TYPES[0], document_name: '', document_number: '' })
    setShowUpload(true)
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <FolderLock className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Digital Employee File &amp; KYC</h1>
          </div>
          <p className="text-xs text-slate-500">Document registry, compliance verification, and statutory identity records</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:w-80 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee by name, code or title..."
              className="w-full h-10 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              Clear Search
            </button>
          )}
        </div>
      </div>

      {/* Employee Document Cards List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4">
        {isLoading ? (
          <div className="p-8"><LoadingState /></div>
        ) : error ? (
          <div className="p-8"><PageError onRetry={() => refetch()} /></div>
        ) : employees.length === 0 ? (
          <div className="p-8"><EmptyState title="No Employees Found" description="Active workforce records will appear here to manage digital dossiers." /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {employees.map((emp: any) => (
              <EmployeeDocRow key={emp.id} employee={emp} onUpload={openUploadModal} onViewDocs={(e) => setSelectedEmp(e)} />
            ))}
          </div>
        )}
      </div>

      {/* Add Document Modal */}
      <Modal open={showUpload} onClose={() => setShowUpload(false)} title={`Attach KYC Document — ${selectedEmp ? fullName(selectedEmp.first_name, selectedEmp.last_name) : ''}`} size="md">
        <div className="space-y-4 pt-1">
          <Select label="Document Category" options={DOC_TYPES.map(t => ({ value: t, label: t }))} value={docForm.document_type} onChange={e => setDocForm(f => ({ ...f, document_type: e.target.value }))} />
          <Input label="Document Title / Note (optional)" placeholder="e.g. Front &amp; Back Scan, Passbook Copy" value={docForm.document_name} onChange={e => setDocForm(f => ({ ...f, document_name: e.target.value }))} />
          <Input label="Document Number / Identifier (optional)" placeholder="e.g. 1234-5678-9012, ABCDE1234F" value={docForm.document_number} onChange={e => setDocForm(f => ({ ...f, document_number: e.target.value }))} />
          <p className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200/60 leading-relaxed">
            StaffSway records verified text identity identifiers for compliance registers and statutory audits.
          </p>
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setShowUpload(false)}>Cancel</Button>
            <Button loading={docAddMut.isPending} onClick={() => selectedEmp && docAddMut.mutate(selectedEmp.id)}>
              <Plus className="w-4 h-4 mr-1" /> Add Record
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Documents Modal */}
      <Modal open={!!selectedEmp && !showUpload} onClose={() => setSelectedEmp(null)} title={`KYC Dossier — ${selectedEmp ? fullName(selectedEmp.first_name, selectedEmp.last_name) : ''}`} size="lg">
        {selectedEmp && <EmployeeDocumentsView employeeId={selectedEmp.id} onDelete={(docId) => setConfirmDelete({ empId: selectedEmp.id, docId })} onVerify={(docId, verified) => docVerifyMut.mutate({ empId: selectedEmp.id, docId, verified })} onUpload={() => openUploadModal(selectedEmp)} />}
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && docDeleteMut.mutate(confirmDelete)}
        title="Remove Document Record"
        message="Are you sure you want to delete this document from the employee dossier?"
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
  const allVerified = docs.length > 0 && verifiedCount === docs.length

  return (
    <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-slate-200/80 bg-white hover:border-indigo-200 hover:shadow-xs transition-all">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
          {employee.first_name?.[0]}{employee.last_name?.[0]}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-900 truncate">{fullName(employee.first_name, employee.last_name)}</p>
          <p className="text-[11px] text-slate-500 font-mono truncate">{employee.employee_code} · {employee.designation || 'Staff'}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <span className="text-xs font-bold text-slate-800 block">{docs.length} Records</span>
          <span className={`text-[10px] font-semibold ${allVerified ? 'text-emerald-600' : 'text-slate-500'}`}>
            {verifiedCount}/{docs.length} Verified
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onViewDocs(employee)} className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" /> View
          </button>
          <button onClick={() => onUpload(employee)} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Add Document">
            <Plus className="w-4 h-4" />
          </button>
        </div>
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

  if (isLoading) return <div className="p-6"><LoadingState /></div>

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      {docs.length === 0 ? (
        <div className="text-center py-8 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <p className="text-xs text-slate-500">No identity or KYC documents registered in this file yet.</p>
          <Button size="sm" onClick={onUpload}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add First Document
          </Button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 bg-slate-50 border-b border-slate-200/80">
                  <th className="py-2.5 px-3 font-semibold">Document Category</th>
                  <th className="py-2.5 px-3 font-semibold">Title / Description</th>
                  <th className="py-2.5 px-3 font-semibold font-mono">Reference / ID #</th>
                  <th className="py-2.5 px-3 font-semibold">Verification</th>
                  <th className="py-2.5 px-3" />
                </tr>
              </thead>
              <tbody>
                {docs.map((doc: any) => (
                  <tr key={doc.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{doc.document_type}</td>
                    <td className="py-2.5 px-3 text-slate-600">{doc.document_name || '—'}</td>
                    <td className="py-2.5 px-3 text-slate-700 font-mono font-medium">{doc.document_number || '—'}</td>
                    <td className="py-2.5 px-3">
                      <button
                        onClick={() => onVerify(doc.id, !doc.verified)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                          doc.verified ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                        title={doc.verified ? 'Click to revoke verification' : 'Click to verify document'}
                      >
                        {doc.verified ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {doc.verified ? 'Verified' : 'Pending'}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button onClick={() => onDelete(doc.id)} className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">Text records only — statutory compliance registry</span>
            <Button size="sm" onClick={onUpload}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Record
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
