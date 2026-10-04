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
              className="flex items-center gap-2 px-3 h-9 text-[13px] font-medium rounded-lg bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 transition-colors"
            >
              <FileText className="w-4 h-4 text-slate-500" /> Download CSV Template
            </button>
            <button
              onClick={() => downloadExcelTemplate()}
              className="flex items-center gap-2 px-3 h-9 text-[13px] font-medium rounded-lg bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-500" /> Download Excel Template
            </button>
          </div>
          <p className="text-[12px] text-slate-600 leading-relaxed">
            Start from a template (CSV or Excel) with all employee fields as headers. Fill in one row per employee, then
            upload it. Rows that match an existing <span className="text-slate-900 font-medium">Employee Code</span> or{' '}
            <span className="text-slate-900 font-medium">Email</span> are updated; everything else is created as a new
            employee.
          </p>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            onClick={() => inputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-2.5 py-12 px-4 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${dragOver ? 'border-blue-500 bg-blue-50/70 scale-[1.01]' : 'border-slate-300 bg-slate-50/40 hover:border-blue-400 hover:bg-blue-50/40'}`}
          >
            <span className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${dragOver ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 border border-blue-100 shadow-xs'}`}>
              <UploadCloud className="w-7 h-7" />
            </span>
            <p className="text-[13px] font-bold text-slate-900">
              {dragOver ? 'Release to upload your file' : 'Drop your CSV / Excel file here'}
            </p>
            <p className="text-[11.5px] text-slate-500 font-medium">or click to browse &middot; .csv, .xlsx, .xls &middot; max 2000 rows</p>
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
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-slate-900 truncate">{fileName}</p>
                <p className="text-[11px] text-slate-500 font-medium">{preview.length} row{preview.length === 1 ? '' : 's'} parsed</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200/60">{validRows.length} valid</Badge>
              {errorRows.length > 0 && <Badge className="bg-rose-50 text-rose-700 border border-rose-200/60">{errorRows.length} with errors</Badge>}
            </div>
          </div>

          {parsed?.headerWarning && (
            <p className="flex items-start gap-2 text-[12px] font-medium text-amber-800 bg-amber-50 border border-amber-200/60 rounded-xl px-3 py-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-px text-amber-600" />
              <span>{parsed.headerWarning}</span>
            </p>
          )}

          {/* Row quality bar */}
          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden flex">
            {validRows.length > 0 && <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(validRows.length / Math.max(1, preview.length)) * 100}%` }} />}
            {errorRows.length > 0 && <div className="h-full bg-rose-400 transition-all" style={{ width: `${(errorRows.length / Math.max(1, preview.length)) * 100}%` }} />}
          </div>

          <div className="max-h-[40vh] overflow-y-auto scrollbar-thin border border-slate-200 rounded-xl">
            <table className="w-full text-[12px]">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="px-3 py-2 font-bold text-[10.5px] uppercase tracking-wider">Row</th>
                  <th className="px-3 py-2 font-bold text-[10.5px] uppercase tracking-wider">Name</th>
                  <th className="px-3 py-2 font-bold text-[10.5px] uppercase tracking-wider">Code</th>
                  <th className="px-3 py-2 font-bold text-[10.5px] uppercase tracking-wider">Email</th>
                  <th className="px-3 py-2 font-bold text-[10.5px] uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.map((p) => (
                  <tr key={p.rowNumber} className={p.valid ? 'bg-white' : 'bg-rose-50/50'}>
                    <td className="px-3 py-2 text-slate-500 tabular-nums">{p.rowNumber}</td>
                    <td className="px-3 py-2 text-slate-900 font-semibold">{p.name}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-600">{p.employeeCode || '—'}</td>
                    <td className="px-3 py-2 text-slate-600">{p.email || '—'}</td>
                    <td className="px-3 py-2">
                      {p.valid
                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60"><CheckCircle2 className="w-3 h-3" /> OK</span>
                        : <span className="inline-flex items-start gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/60"><XCircle className="w-3 h-3 mt-px shrink-0" /><span className="max-w-[220px]">{p.error}</span></span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {importMut.isPending && (
            <div className="rounded-xl border border-blue-200/60 bg-blue-50/50 px-4 py-3">
              <div className="flex items-center justify-between text-[12px] font-bold text-blue-800 mb-2">
                <span>Importing {validRows.length} employee{validRows.length === 1 ? '' : 's'}…</span>
                <span className="tabular-nums">Please wait</span>
              </div>
              <div className="h-2 w-full rounded-full bg-blue-100 overflow-hidden">
                <div className="h-full w-1/3 rounded-full bg-blue-600 animate-pulse" />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <button onClick={() => setPhase('pick')} disabled={importMut.isPending} className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-40 cursor-pointer">
              <ArrowLeft className="w-3.5 h-3.5" /> Choose another file
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
          <div className="grid grid-cols-3 gap-3">
            <ResultTile gradient="from-emerald-600 to-teal-700" label="Created" value={result.created} />
            <ResultTile gradient="from-blue-600 to-indigo-700" label="Updated" value={result.updated} />
            <ResultTile gradient={result.skipped ? 'from-rose-600 to-red-700' : 'from-slate-600 to-slate-700'} label="Skipped" value={result.skipped} />
          </div>

          {result.errors.length > 0 ? (
            <div>
              <p className="text-[12px] font-bold text-slate-900 mb-1.5">Rows skipped — fix these and re-import</p>
              <div className="max-h-[32vh] overflow-y-auto scrollbar-thin border border-slate-200 rounded-xl">
                <table className="w-full text-[12px]">
                  <thead className="sticky top-0 bg-slate-50 z-10">
                    <tr className="text-left text-slate-500 border-b border-slate-200">
                      <th className="px-3 py-2 font-bold text-[10.5px] uppercase tracking-wider">Row</th>
                      <th className="px-3 py-2 font-bold text-[10.5px] uppercase tracking-wider">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.errors.map((e, i) => (
                      <tr key={`${e.row}-${i}`} className="bg-white">
                        <td className="px-3 py-2 text-slate-500 tabular-nums">{e.row}</td>
                        <td className="px-3 py-2 text-slate-700 max-w-[300px]">
                          {e.message}
                          {e.fields && <span className="text-slate-500 block mt-0.5 text-[11px] font-mono">{Object.keys(e.fields).join(', ')}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-[13px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 rounded-xl px-3.5 py-3">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> All {result.total} rows imported successfully.
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={done}>Done</Button>
          </div>
        </div>
      )}
    </div>
  )
}

function ResultTile({ gradient, label, value }: { gradient: string; label: string; value: number }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-4 text-white shadow-sm`}>
      <div className="text-[10.5px] font-bold uppercase tracking-wider text-white/85">{label}</div>
      <div className="mt-1 text-2xl font-extrabold tracking-tight tabular-nums">{value}</div>
    </div>
  )
}