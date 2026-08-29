import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { employeeApi, siteApi } from '@/services/api'
import type { EmployeeImportResult } from '@/services/api'
import { Button } from '@/components/ui/fields'
import { Badge } from '@/components/ui/data'
import { toast } from 'sonner'
import {
  UploadCloud, Download, FileSpreadsheet, FileText, ArrowLeft, CheckCircle2, XCircle, AlertTriangle, ChevronRight,
} from 'lucide-react'
import {
  parseImportFile, buildImportPreview, downloadCsvTemplate, downloadExcelTemplate,
  type ParsedFile, type ParsedRow,
} from './importUtils'

interface Props {
  onClose: () => void
  onImported: () => void
}

type Phase = 'pick' | 'preview' | 'done'

export default function BulkEmployeeImport({ onClose, onImported }: Props) {
  const [phase, setPhase] = useState<Phase>('pick')
  const [fileName, setFileName] = useState('')
  const [parsed, setParsed] = useState<ParsedFile | null>(null)
  const [preview, setPreview] = useState<ParsedRow[]>([])
  const [result, setResult] = useState<EmployeeImportResult | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const { data: sitesRes } = useQuery({ queryKey: ['sites-select'], queryFn: () => siteApi.list() })
  const sites = (sitesRes?.data || []).map((s: any) => ({ id: Number(s.id), name: s.name }))

  const importMut = useMutation({
    mutationFn: (payloads: Record<string, unknown>[]) => employeeApi.importEmployees(payloads),
    onSuccess: (res) => { setResult(res.data); setPhase('done') },
    onError: (e: any) => toast.error(e?.error?.message || 'Import failed. Please try again.'),
  })

  const validRows = preview.filter((p) => p.valid)
  const errorRows = preview.filter((p) => !p.valid)

  const handleFile = async (file: File) => {
    if (!/\.(csv|xlsx|xls)$/i.test(file.name)) {
      toast.error('Please choose a .csv or .xlsx file.')
      return
    }
    const res = await parseImportFile(file)
    if (res.error) { toast.error(res.error); return }
    if (res.rows.length > 2000) { toast.error('The file has more than 2000 rows. Please split it into smaller files.'); return }
    const previewRows = buildImportPreview(res.rows, sites)
    setParsed(res)
    setPreview(previewRows)
    setFileName(file.name)
    setPhase('preview')
  }

  const startImport = () => {
    if (!validRows.length) return
    importMut.mutate(validRows.map((r) => r.payload as Record<string, unknown>))
  }

  const done = () => {
    if (importMut.isSuccess) onImported()
    onClose()
  }

  return (
    <div className="min-h-[320px] flex flex-col">
      {phase === 'pick' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => downloadCsvTemplate()}
              className="flex items-center gap-2 px-3 h-9 text-[13px] font-medium rounded-sm bg-white border border-hairline text-ink hover:bg-canvas-soft transition-colors"
            >
              <FileText className="w-4 h-4 text-mute" /> Download CSV Template
            </button>
            <button
              onClick={() => downloadExcelTemplate()}
              className="flex items-center gap-2 px-3 h-9 text-[13px] font-medium rounded-sm bg-white border border-hairline text-ink hover:bg-canvas-soft transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-mute" /> Download Excel Template
            </button>
          </div>
          <p className="text-[12px] text-body leading-relaxed">
            Start from a template (CSV or Excel) with all employee fields as headers. Fill in one row per employee, then
            upload it. Rows that match an existing <span className="text-ink font-medium">Employee Code</span> or{' '}
            <span className="text-ink font-medium">Email</span> are updated; everything else is created as a new
            employee.
          </p>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            onClick={() => inputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-2 py-10 px-4 rounded-md border-2 border-dashed cursor-pointer transition-colors ${dragOver ? 'border-ink bg-canvas-soft' : 'border-hairline hover:border-mute'}`}
          >
            <UploadCloud className="w-6 h-6 text-mute" />
            <p className="text-[13px] font-medium text-ink">Drop your CSV / Excel file here</p>
            <p className="text-[11px] text-mute">or click to browse. Max 2000 rows.</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
          />
          <div className="flex justify-end">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      )}

      {phase === 'preview' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-[13px] font-medium text-ink">{fileName}</p>
              {parsed?.headerWarning && <p className="text-[11px] text-mute flex items-center gap-1 mt-0.5"><AlertTriangle className="w-3 h-3" /> {parsed.headerWarning}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-success-soft text-success">{validRows.length} valid</Badge>
              {errorRows.length > 0 && <Badge className="bg-error-soft text-error">{errorRows.length} with errors</Badge>}
            </div>
          </div>

          <div className="max-h-[40vh] overflow-y-auto border border-hairline rounded-sm">
            <table className="w-full text-[12px]">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-mute border-b border-hairline">
                  <th className="px-3 py-2 font-medium">Row</th>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Code</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((p) => (
                  <tr key={p.rowNumber} className={`border-b border-hairline last:border-0 ${p.valid ? '' : 'bg-error-soft/40'}`}>
                    <td className="px-3 py-2 text-mute tabular-nums">{p.rowNumber}</td>
                    <td className="px-3 py-2 text-ink font-medium">{p.name}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-body">{p.employeeCode || '—'}</td>
                    <td className="px-3 py-2 text-body">{p.email || '—'}</td>
                    <td className="px-3 py-2">
                      {p.valid
                        ? <span className="inline-flex items-center gap-1 text-[11px] text-success"><CheckCircle2 className="w-3 h-3" /> OK</span>
                        : <span className="inline-flex items-start gap-1 text-[11px] text-error"><XCircle className="w-3 h-3 mt-px shrink-0" /><span className="max-w-[220px]">{p.error}</span></span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button onClick={() => setPhase('pick')} className="inline-flex items-center gap-1 text-[12px] text-body hover:text-ink transition-colors">
              <ArrowLeft className="w-3 h-3" /> Choose another file
            </button>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button loading={importMut.isPending} disabled={!validRows.length} onClick={startImport}>
                Import {validRows.length} Employee{validRows.length === 1 ? '' : 's'} <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {phase === 'done' && result && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className={`rounded-md border p-3 ${result.created ? 'border-hairline' : 'border-hairline bg-canvas-soft/50'}`}>
              <p className="text-[11px] text-mute font-mono uppercase tracking-wide">Created</p>
              <p className="text-[22px] font-semibold text-ink">{result.created}</p>
            </div>
            <div className={`rounded-md border p-3 ${result.updated ? 'border-hairline' : 'border-hairline bg-canvas-soft/50'}`}>
              <p className="text-[11px] text-mute font-mono uppercase tracking-wide">Updated</p>
              <p className="text-[22px] font-semibold text-ink">{result.updated}</p>
            </div>
            <div className={`rounded-md border p-3 ${result.skipped ? 'border-hairline' : 'border-hairline bg-canvas-soft/50'}`}>
              <p className="text-[11px] text-mute font-mono uppercase tracking-wide">Skipped</p>
              <p className={`text-[22px] font-semibold ${result.skipped ? 'text-error' : 'text-ink'}`}>{result.skipped}</p>
            </div>
          </div>

          {result.errors.length > 0 ? (
            <div>
              <p className="text-[12px] font-medium text-ink mb-1.5">Rows skipped — fix these and re-import</p>
              <div className="max-h-[32vh] overflow-y-auto border border-hairline rounded-sm">
                <table className="w-full text-[12px]">
                  <thead className="sticky top-0 bg-white">
                    <tr className="text-left text-mute border-b border-hairline">
                      <th className="px-3 py-2 font-medium">Row</th>
                      <th className="px-3 py-2 font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.map((e, i) => (
                      <tr key={`${e.row}-${i}`} className="border-b border-hairline last:border-0">
                        <td className="px-3 py-2 text-mute tabular-nums">{e.row}</td>
                        <td className="px-3 py-2 text-body max-w-[300px]">
                          {e.message}
                          {e.fields && <span className="text-mute block mt-0.5 text-[11px]">{Object.keys(e.fields).join(', ')}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-success flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> All {result.total} rows imported successfully.</p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={done}>Done</Button>
          </div>
        </div>
      )}
    </div>
  )
}