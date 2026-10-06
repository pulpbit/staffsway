import type { ReactNode } from 'react'
import type { Employee, Settings } from '@/types/api'
import { dateDMY } from '@/utils/format'

export type LetterType = 'offer' | 'appointment'

export interface LetterForm {
  type: LetterType
  issue_date: string
  accept_by: string
  joining_date: string
  probation_months: number | null
  designation: string
  department: string
  grade: string
  reporting_manager: string
  employment_type: string
  shift_type: string
  basic: number | null
  hra: number | null
  conveyance: number | null
  other_allowance: number | null
  ctc: number | null
  working_hours: number | null
  working_days_week: number | null
  notice_period_days: number | null
  signatory_name: string
  signatory_designation: string
  additional_notes: string
}

const dash = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v).trim()
  return s || '—'
}

const yesNo = (v: unknown) => (Number(v) === 1 ? 'Yes' : 'No')

/** Letters print dates in the same dd-mm-yyyy format as the rest of the app. */
function prettyDate(v?: string | null) {
  if (!v) return ''
  return dateDMY(v)
}

function Block({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="mt-3.5">
      <h3 className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-900 border-b border-slate-300 pb-1 mb-1.5">
        {n}. {title}
      </h3>
      <div className="text-justify leading-[1.5]">{children}</div>
    </section>
  )
}

function Facts({ rows }: { rows: [string, string][] }) {
  return (
    <table className="w-full border-collapse">
      <tbody>
        {rows.map(([k, v], i) => (
          <tr key={k} className={i % 2 ? 'bg-slate-50/60' : ''}>
            <th className="w-[38%] border border-slate-300 px-2 py-1 text-left align-top text-[9.5px] font-semibold text-slate-700">{k}</th>
            <td className="border border-slate-300 px-2 py-1 align-top text-[9.5px] text-slate-900">{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/**
 * Pure presentational A4 document. Everything it prints comes from the employee
 * record plus the values HR typed, so a letter can never disagree with payroll.
 */
export default function EmployeeLetterTemplate({
  employee,
  settings,
  form,
}: {
  employee: Employee
  settings: Settings
  form: LetterForm
}) {
  const isOffer = form.type === 'offer'
  const sal = employee.salary
  const stat = employee.statutory
  const site = employee.site

  const gross =
    Number(form.basic || 0) + Number(form.hra || 0) + Number(form.conveyance || 0) + Number(form.other_allowance || 0)
  const annual = gross * 12
  const code = employee.employee_code || 'NA'
  const ref = `${isOffer ? 'OFF' : 'APP'}/${code}/${form.issue_date ? dateDMY(form.issue_date) : ''}`

  const companyLine1 = [settings.address, [settings.state, settings.pincode].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  const companyLine2 = [settings.phone && `Ph: ${settings.phone}`, settings.email, settings.website].filter(Boolean).join('   ·   ')
  const companyLine3 = [settings.gstin && `GSTIN: ${settings.gstin}`, settings.pan && `PAN: ${settings.pan}`, settings.cin && `CIN: ${settings.cin}`].filter(Boolean).join('   |   ')

  const who = dash([employee.first_name, employee.last_name].filter(Boolean).join(' '))
  const probation = form.probation_months
  const joining = prettyDate(form.joining_date) || 'as mutually agreed'
  const hours = dash(form.working_hours)
  const days = dash(form.working_days_week)
  const notice = dash(form.notice_period_days)
  const siteName = dash(site?.name)
  const clientName = dash((site as { client_name?: string } | null)?.client_name)

  return (
    <article className="text-[10px] leading-[1.4] text-slate-800 bg-white">
      {/* Letterhead */}
      <header className="border-b-2 border-slate-800 pb-2">
        <h1 className="text-[17px] font-extrabold uppercase tracking-tight text-slate-900">{settings.company_name}</h1>
        {settings.company_tagline && <p className="text-[9.5px] text-slate-600 mt-0.5">{settings.company_tagline}</p>}
        {companyLine1 && <p className="text-[8.5px] text-slate-600 mt-1">{companyLine1}</p>}
        {companyLine2 && <p className="text-[8.5px] text-slate-500 mt-0.5">{companyLine2}</p>}
        {companyLine3 && <p className="text-[8.5px] text-slate-500 mt-0.5">{companyLine3}</p>}
      </header>

      {/* Title + meta */}
      <div className="mt-3 flex items-start justify-between gap-6">
        <div>
          <h2 className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-slate-900">
            {isOffer ? 'Letter of Offer' : 'Letter of Appointment'}
          </h2>
          <p className="text-[9px] text-slate-500 mt-0.5">
            Ref: <span className="font-mono">{ref}</span>
          </p>
        </div>
        <div className="text-[9px] text-slate-600 text-right shrink-0">
          <p>Date: {prettyDate(form.issue_date) || '—'}</p>
          {isOffer && <p className="mt-0.5">Accept by: {prettyDate(form.accept_by) || '—'}</p>}
          {!isOffer && <p className="mt-0.5">Date of joining: {prettyDate(form.joining_date) || '—'}</p>}
        </div>
      </div>

      {/* Addressee */}
      <div className="mt-3.5">
        <p className="text-[9px] uppercase tracking-wider text-slate-500">To</p>
        <p className="text-[11px] font-bold text-slate-900 mt-0.5">{who}</p>
        <p className="text-[9.5px] text-slate-600">Employee Code: {code}</p>
        {employee.address && (
          <p className="text-[9.5px] text-slate-600 mt-0.5">
            {[employee.address, employee.state, employee.pincode].filter(Boolean).join(', ')}
          </p>
        )}
        {employee.mobile && <p className="text-[9.5px] text-slate-600">Contact: {employee.mobile}</p>}
      </div>

      {/* Salutation + intro */}
      <p className="mt-3.5 text-justify">
        <span className="font-semibold">Dear {dash(employee.first_name)},</span>
      </p>
      <p className="mt-2 text-justify">
        {isOffer ? (
          <>
            Further to our discussions, we are pleased to extend you this offer of employment with{' '}
            <strong>{settings.company_name}</strong>. On acceptance you will be appointed as{' '}
            <strong>{dash(form.designation)}</strong> at our <strong>{siteName}</strong> location, on the terms set out below.
          </>
        ) : (
          <>
            We are pleased to confirm your appointment with <strong>{settings.company_name}</strong> in the capacity of{' '}
            <strong>{dash(form.designation)}</strong>, on the terms and conditions detailed in this letter. We are glad to
            have you on the team.
          </>
        )}
      </p>

      {/* Appointment particulars */}
      <Block n={1} title={isOffer ? 'Offer Details' : 'Appointment Details'}>
        <Facts
          rows={[
            ['Position / Designation', dash(form.designation)],
            ['Department', dash(form.department)],
            ['Grade', dash(form.grade)],
            ['Site', `${siteName}${clientName !== '—' ? ` (${clientName})` : ''}`],
            ['Employment Type', dash(form.employment_type)],
            ['Reporting Manager', dash(form.reporting_manager)],
            ['Shift', dash(form.shift_type)],
            [isOffer ? 'Proposed Date of Joining' : 'Date of Joining', joining],
            ...(isOffer ? [['Offer Valid Until', prettyDate(form.accept_by) || '—'] as [string, string]] : []),
            ...(probation ? [['Probation Period', `${probation} months from the date of joining`] as [string, string]] : []),
          ]}
        />
      </Block>

      {/* Personal particulars */}
      <Block n={2} title="Personal Particulars">
        <Facts
          rows={[
            ["Father's / Spouse Name", dash(employee.father_name || employee.spouse_name)],
            ['Date of Birth', prettyDate(employee.dob) || '—'],
            ['Gender', dash(employee.gender)],
            ['Marital Status', dash(employee.marital_status)],
            ['Nationality', dash(employee.nationality)],
            ['Aadhaar No.', dash(employee.aadhaar)],
            ['PAN No.', dash(employee.pan)],
            ['Email', dash(employee.email)],
          ]}
        />
      </Block>

      {/* Compensation */}
      <Block n={3} title="Compensation">
        <Facts
          rows={[
            ['Basic Pay', money(form.basic)],
            ['HRA', money(form.hra)],
            ['Conveyance Allowance', money(form.conveyance)],
            [sal?.other_allowance_label || 'Other Allowance', money(form.other_allowance)],
            ['Gross Monthly Salary', money(gross)],
            ['Annual Gross', money(annual)],
            ['Annual CTC', form.ctc ? money(form.ctc) : 'As per employment contract'],
          ]}
        />
        <p className="mt-1.5 text-[9px] text-slate-600">
          Statutory compliance: Provident Fund {yesNo(stat?.pf_applicable)} · ESI {yesNo(stat?.esi_applicable)} · LWF{' '}
          {yesNo(stat?.lwf_applicable)} · Professional Tax {yesNo(stat?.pt_applicable)} · TDS{' '}
          {yesNo(stat?.tds_applicable)}. Statutory deductions are as per prevailing law and your registered salary structure.
        </p>
      </Block>

      {/* Working terms */}
      <Block n={4} title="Working Hours & Place of Work">
        <p className="text-justify">
          Your normal hours of work will be approximately <strong>{hours} hours per day</strong> spread across{' '}
          <strong>{days} days in a week</strong>, on the shift assigned to you. Weekly off and holidays will be notified
          separately. Your primary place of work is <strong>{siteName}</strong>; the company may require you to work at
          other company or client locations as per operational needs.
        </p>
      </Block>

      {/* Standard terms */}
      <Block n={5} title="Terms & Conditions">
        <p className="text-justify">
          Your employment is subject to the following terms. These form the entire agreement between you and{' '}
          {settings.company_name} and supersede all prior discussions.
        </p>
        <ol className="mt-1.5 list-decimal pl-4 space-y-1 text-justify">
          <li>
            <strong>Probation.</strong>{' '}
            {probation
              ? `You will be on probation for ${probation} months from your date of joining. During probation either party may terminate this employment by giving ${notice} days' written notice or salary in lieu thereof. On satisfactory completion, your employment will be confirmed in writing.`
              : `Your employment is subject to a probationary period as defined in your employment contract, and will be confirmed in writing on satisfactory completion.`}
          </li>
          <li>
            <strong>Notice period.</strong> During probation, {notice} days' written notice or salary in lieu is required
            from either side. On confirmation, the notice period will be as per your employment contract.
          </li>
          <li>
            <strong>Duties.</strong> You will perform the duties of {dash(form.designation)} at {siteName} diligently and
            honestly, including reporting to {dash(form.reporting_manager)}, maintaining discipline and punctuality,
            following the client's site instructions, using company-issued equipment responsibly, and promptly reporting
            any incident, defect or loss.
          </li>
          <li>
            <strong>Leave.</strong> Paid leave is governed by the company leave policy in force from time to time and
            credited against your leave balance. Leave should be applied for in advance through the HR portal. Absence
            without sanctioned leave may result in deduction of pay and disciplinary action.
          </li>
          <li>
            <strong>Overtime.</strong> Overtime is paid only when sanctioned in advance by your reporting manager
            {sal?.overtime_rate ? `, and compensated at ${sal.overtime_rate} per hour` : ''}, or as per the applicable
            statutory requirement, whichever is higher, and is reflected in your salary slip.
          </li>
          <li>
            <strong>Transfer.</strong> You may be transferred to any other location, department, function or client site of
            the company, as operational requirements dictate, on notice and with continuity of service and pay.
          </li>
          <li>
            <strong>Confidentiality.</strong> During and after your employment you must not disclose, publish or otherwise
            make known any confidential information of the company or any client, including pricing, processes, data and
            records. This obligation survives your employment.
          </li>
          <li>
            <strong>Company policies.</strong> You must comply with the company's policies on human resources, attendance
            and timekeeping, disciplinary conduct, information technology and data protection, and prevention of sexual
            harassment, as amended from time to time. Breach may result in disciplinary action up to termination.
          </li>
          <li>
            <strong>Documents.</strong> You must produce your Aadhaar and PAN cards, educational and experience
            certificates, bank account proof and previous employment documents (where applicable) on joining. Failure to
            produce these may delay your joining.
          </li>
          <li>
            <strong>Background verification.</strong> Your {isOffer ? 'offer' : 'appointment'} is subject to satisfactory
            background verification of address, identity, education and previous employment. If any information furnished
            by you is found to be false, this letter stands withdrawn.
          </li>
          <li>
            <strong>Code of conduct.</strong> You are expected to behave professionally and respectfully towards colleagues,
            clients and the public. Acts of violence, harassment, intoxication, or conduct bringing the company or client
            into disrepute are not permitted.
          </li>
          {!isOffer && (
            <li>
              <strong>Termination.</strong> After confirmation, either party may terminate this employment by giving{' '}
              {notice} days' written notice or salary in lieu thereof. The company may terminate for misconduct or breach of
              the terms above, in which case notice may be waived.
            </li>
          )}
          <li>
            <strong>Governing law.</strong> This appointment is governed by the laws of India and the rules applicable at
            your place of work.
          </li>
        </ol>
      </Block>

      {/* Acceptance */}
      <Block n={6} title="Acceptance">
        {isOffer ? (
          <p className="text-justify">
            Please confirm your acceptance of this offer by signing below and returning a scanned copy to the HR department
            on or before <strong>{prettyDate(form.accept_by) || 'the date stated above'}</strong>. This offer lapses
            automatically after that date unless extended to you in writing.
          </p>
        ) : (
          <p className="text-justify">
            Please confirm that you have read, understood and agreed to all the terms and conditions set out in this letter
            by signing below.
          </p>
        )}
      </Block>

      {form.additional_notes && (
        <Block n={7} title="Additional Notes">
          <p className="text-justify whitespace-pre-line">{form.additional_notes}</p>
        </Block>
      )}

      {/* Signature blocks — wet signature */}
      <div className="no-break mt-6 flex items-end justify-between gap-8">
        <div className="w-[45%]">
          <p className="text-[9.5px] mb-7">
            {isOffer ? 'Accepted and agreed:' : 'Agreed and accepted,'}
            <br />
            <span className="italic font-semibold">{who}</span>
          </p>
          <div className="border-t border-slate-700 pt-1">
            <p className="text-[9px] font-semibold">Signature of {isOffer ? 'the Candidate' : 'the Employee'}</p>
            <p className="text-[8px] text-slate-500">Date: ____ / ____ / ________</p>
          </div>
        </div>
        <div className="w-[45%] text-right">
          <p className="text-[9.5px] mb-7">
            For and on behalf of
            <br />
            <span className="font-bold">{dash(settings.company_name)}</span>
          </p>
          <div className="border-t border-slate-700 pt-1">
            <p className="text-[9px] font-semibold">{dash(form.signatory_name)}</p>
            <p className="text-[8.5px] text-slate-600">{dash(form.signatory_designation)}</p>
            <p className="text-[8px] text-slate-500">Authorised Signatory</p>
          </div>
        </div>
      </div>

      <footer className="no-break mt-4 border-t border-slate-300 pt-1 text-center text-[7.5px] text-slate-400">
        {ref} · {dash(settings.company_name)} · This is a computer generated letter. The signed original is the record of
        agreement; this printout is a true copy of it.
      </footer>
    </article>
  )
}

function money(v: number | null | undefined) {
  const n = Number(v || 0)
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}