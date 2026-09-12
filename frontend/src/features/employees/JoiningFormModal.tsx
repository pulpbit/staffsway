import { Fragment, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { employeeApi, settingsApi } from '@/services/api'
import { Modal } from '@/components/ui/overlay'
import { Button } from '@/components/ui/fields'
import { LoadingState } from '@/components/ui/state'
import { Printer, X } from 'lucide-react'
import { fullName, dateShort, money } from '@/utils/format'
import type { Employee, Settings } from '@/types/api'

interface Props {
  employeeId: number | null
  onClose: () => void
}

export default function JoiningFormModal({ employeeId, onClose }: Props) {
  const { data: emp } = useQuery({
    queryKey: ['employee-joining', employeeId],
    queryFn: () => employeeApi.get(employeeId!),
    enabled: !!employeeId,
  })
  const { data: settingsRes } = useQuery({ queryKey: ['settings'], queryFn: () => settingsApi.get() })

  const employee = emp?.data
  const settings = settingsRes?.data?.settings

  const content = useMemo(
    () => (employee && settings ? <JoiningFormBody employee={employee} settings={settings} /> : null),
    [employee, settings],
  )

  if (!employeeId) return null

  if (!content) {
    return (
      <Modal open onClose={onClose} title="Joining Form">
        <LoadingState />
      </Modal>
    )
  }

  return (
    <>
      <Modal open onClose={onClose} title="Joining Form" size="lg">
        <div>
          <div className="flex items-center justify-between gap-2 mb-3 print:hidden">
            <p className="text-[12px] text-mute">
              Generated on {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => window.print()}><Printer className="w-3.5 h-3.5" /> Print / Save as PDF</Button>
              <Button variant="secondary" onClick={onClose}><X className="w-3.5 h-3.5" /> Close</Button>
            </div>
          </div>
          <div className="max-h-[58vh] overflow-y-auto bg-white border border-hairline rounded-sm p-6 print:hidden">
            {content}
          </div>
        </div>
      </Modal>
      {createPortal(<div className="print-join">{content}</div>, document.body)}
    </>
  )
}

type FieldRow = [string, string]

function Section({ title, rows }: { title: string; rows: FieldRow[] }) {
  const chunked: FieldRow[][] = []
  for (let i = 0; i < rows.length; i += 2) chunked.push(rows.slice(i, i + 2))
  return (
    <div className="mb-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] border-b-2 border-neutral-400 pb-1 mb-1.5">{title}</p>
      <table className="w-full border-collapse">
        <tbody>
          {chunked.map((pair, i) => (
            <tr key={i}>
              {pair.map(([k, v]) => (
                <Fragment key={k}>
                  <td className="border border-neutral-300 bg-neutral-100/70 px-2 py-1.5 font-medium w-44 text-[11.5px]">{k}</td>
                  <td className="border border-neutral-300 px-2 py-1.5 text-[12px] w-1/2 break-words">{v}</td>
                </Fragment>
              ))}
              {pair.length === 1 && (
                <>
                  <td className="border border-neutral-300 bg-neutral-100/70 w-44" />
                  <td className="border border-neutral-300" />
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const titleCase = (s?: string | null) =>
  s ? s.split('_').map(w => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ') : '—'

function JoiningFormBody({ employee: e, settings }: { employee: Employee; settings: Settings }) {
  const gross = e.salary
    ? Number(e.salary.basic || 0) + Number(e.salary.hra || 0) + Number(e.salary.conveyance || 0) + Number(e.salary.other_allowance || 0)
    : 0
  const stat = e.statutory
  const yesNo = (v?: number | boolean | null) => (v ? 'Yes' : 'No')
  const nominee = e.nominees && e.nominees.length ? e.nominees[0] : null

  const presentAddr = [e.address, e.district, e.state, e.pincode].filter(Boolean).join(', ') || '—'
  const permAddr = e.permanent_same_as_present
    ? 'Same as Present Address'
    : [e.permanent_address, e.permanent_district, e.permanent_state, e.permanent_pincode].filter(Boolean).join(', ') || '—'

  const companyLine1 = [settings.address, [settings.state, settings.pincode].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  const companyLine2 = [settings.phone && `Ph: ${settings.phone}`, settings.email, settings.website].filter(Boolean).join('  ·  ')
  const companyLine3 = [settings.gstin && `GSTIN: ${settings.gstin}`, settings.pan && `PAN: ${settings.pan}`, settings.cin && `CIN: ${settings.cin}`].filter(Boolean).join('   |   ')

  const name = fullName(e.first_name, e.last_name)

  return (
    <div className="text-[12px] text-neutral-900 leading-relaxed">
      <div className="text-center mb-5">
        <p className="text-[20px] font-bold tracking-tight uppercase">{settings.company_name}</p>
        {settings.company_tagline && <p className="text-[11px] text-neutral-600">{settings.company_tagline}</p>}
        {companyLine1 && <p className="text-[11px] text-neutral-600">{companyLine1}</p>}
        {companyLine2 && <p className="text-[11px] text-neutral-600">{companyLine2}</p>}
        {companyLine3 && <p className="text-[11px] text-neutral-600">{companyLine3}</p>}
        <hr className="mt-3 border-t-2 border-neutral-300" />
        <p className="text-[16px] font-bold tracking-[0.12em] mt-2">JOINING FORM</p>
        <p className="text-[11px] text-neutral-600 mt-0.5">Employee Joining Details &amp; Declaration</p>
      </div>

      <Section title="1. Personal Details" rows={[
        ['Employee Code', e.employee_code],
        ['Full Name', name],
        ["Father's Name", e.father_name || '—'],
        ['Spouse Name', e.spouse_name || '—'],
        ['Gender', e.gender || '—'],
        ['Date of Birth', dateShort(e.dob)],
        ['Marital Status', e.marital_status || '—'],
        ['Nationality', e.nationality || '—'],
        ['Mobile No.', e.mobile || '—'],
        ['Alternate Mobile', e.alternate_mobile || '—'],
        ['Email', e.email || '—'],
        ['Aadhaar No.', e.aadhaar || '—'],
        ['PAN No.', e.pan || '—'],
        ['UAN No.', e.uan || '—'],
        ['ESIC No.', e.esi_number || '—'],
      ]} />

      <Section title="2. Address & Emergency Contact" rows={[
        ['Present Address', presentAddr],
        ['Permanent Address', permAddr],
        ['Emergency Contact Name', e.emergency_contact_name || '—'],
        ['Emergency Contact Phone', e.emergency_contact_phone || '—'],
        ['Relation', e.emergency_contact_relation || '—'],
      ]} />

      <Section title="3. Employment Details" rows={[
        ['Client', e.client_name || '—'],
        ['Site', e.site_name || '—'],
        ['Job Title / Designation', e.designation || '—'],
        ['Department', e.department || '—'],
        ['Grade', e.grade || '—'],
        ['Employee Type', titleCase(e.employee_type)],
        ['Shift Type', e.shift_type || '—'],
        ['Reporting Manager', e.reporting_manager || '—'],
        ['Hiring / Joining Date', dateShort(e.joining_date)],
        ['Working Days / Week', e.working_days_week ? `${e.working_days_week}` : '—'],
        ['Notice Period', e.notice_period_days ? `${e.notice_period_days} days` : '—'],
        ['Previous Employment', e.previous_employment || '—'],
        ['Status', titleCase(e.status)],
      ]} />

      <Section title="4. Compensation & Statutory" rows={[
        ['CTC / Gross Salary', e.ctc ? money(Number(e.ctc)) : gross ? money(gross) : '—'],
        ['Basic Pay', e.salary?.basic ? money(Number(e.salary.basic)) : '—'],
        ['HRA', e.salary?.hra ? money(Number(e.salary.hra)) : '—'],
        ['Conveyance', e.salary?.conveyance ? money(Number(e.salary.conveyance)) : '—'],
        [`Other Allowance${e.salary?.other_allowance_label ? ` (${e.salary.other_allowance_label})` : ''}`, e.salary?.other_allowance ? money(Number(e.salary.other_allowance)) : '—'],
        ['PF (Provident Fund) Applicable', yesNo(stat?.pf_applicable)],
        ['ESIC Applicable', yesNo(stat?.esi_applicable)],
        ['LWF Applicable', yesNo(stat?.lwf_applicable)],
        ['Professional Tax Applicable', yesNo(stat?.pt_applicable)],
      ]} />

      <Section title="5. Bank Details" rows={[
        ['Account Holder Name', e.bank_holder_name || '—'],
        ['Bank Name', e.bank_name || '—'],
        ['Account No.', e.bank_account || '—'],
        ['IFSC Code', e.bank_ifsc || '—'],
      ]} />

      <Section title="6. Nominee Details" rows={[
        ['Nominee Name', nominee?.name || '—'],
        ['Relation', nominee?.relation || '—'],
        ['Share (%)', nominee?.share ? `${nominee.share}` : '—'],
        ['Contact', nominee?.contact || '—'],
      ]} />

      <div className="mb-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] border-b-2 border-neutral-400 pb-1 mb-1.5">7. Declaration</p>
        <p className="text-justify text-[12px]">
          I, <strong>{name}</strong>, hereby declare that the particulars furnished in this form are true, complete and
          correct to the best of my knowledge. I have read and understood the terms and conditions of my employment and
          agree to abide by the rules, regulations and policies of the company as amended from time to time. I authorize
          the company to verify the information provided and to register me under applicable statutory schemes (EPF,
          ESIC, LWF, PT, TDS) as per applicable law.
        </p>
      </div>

      <div className="mt-10 flex items-end justify-between">
        <div>
          <p>____________________________</p>
          <p className="mt-1 font-medium">Signature of Employee</p>
          <p className="mt-1 text-neutral-500">Date: ________________</p>
        </div>
        <div className="text-right">
          <p>For &amp; on behalf of <strong>{settings.company_name}</strong></p>
          <p className="mt-10 font-medium">Authorized Signatory / HR</p>
          <p className="mt-1 text-neutral-500">Date: ________________</p>
        </div>
      </div>
      <p className="mt-6 text-center text-[10px] text-neutral-400 tracking-wide">This is a computer generated joining form.</p>
    </div>
  )
}