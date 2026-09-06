import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { employeeApi, clientApi, siteApi } from '@/services/api'
import { Button, Input, Select, Textarea, Section, Toggle } from '@/components/ui/fields'
import { LoadingState } from '@/components/ui/state'
import { toast } from 'sonner'
import { IdCard, User, Phone, Briefcase, Wallet, Landmark, FileText, HeartHandshake, Siren, CheckCircle2, AlertTriangle } from 'lucide-react'

interface Props {
  employeeId: number | null
  onClose: () => void
  onSaved: () => void
  onSwitchToEdit?: (id: number) => void
}

const GENDERS = ['Male', 'Female', 'Other']
const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed']
const EMP_TYPES = [
  { value: 'contract', label: 'Contract' },
  { value: 'permanent', label: 'Permanent' },
  { value: 'daily_wages', label: 'Daily Wages' },
]
const SHIFTS = ['General', 'Morning', 'Evening', 'Night', 'Rotational', 'Split']
const NOTICE_PERIODS = [
  { value: '10', label: '10 days' },
  { value: '15', label: '15 days' },
  { value: '20', label: '20 days' },
  { value: '25', label: '25 days' },
  { value: '30', label: '1 Month' },
]
const WEEKDAYS = ['5', '6', '7']

export default function EmployeeForm({ employeeId, onClose, onSaved, onSwitchToEdit }: Props) {
  const isEdit = !!employeeId
  const [loading, setLoading] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [checking, setChecking] = useState(false)
  const [checkAadhaar, setCheckAadhaar] = useState('')
  const [match, setMatch] = useState<any>(null)
  const [form, setForm] = useState<Record<string, any>>({
    first_name: '', last_name: '', father_name: '', spouse_name: '', gender: 'Male', dob: '', marital_status: 'Single', nationality: 'Indian',
    mobile: '', alternate_mobile: '', email: '', aadhaar: '',
    address: '', city: '', state: '', pincode: '',
    permanent_same_as_present: false, permanent_address: '', permanent_city: '', permanent_state: '', permanent_pincode: '',
    emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relation: '',
    bank_name: '', bank_holder_name: '', bank_account: '', bank_ifsc: '', pan: '', uan: '', esi_number: '',
    ctc: '',
    joining_date: new Date().toISOString().slice(0, 10), designation: '', department: '',
    reporting_manager: '', employee_type: 'permanent', shift_type: 'General', working_days_week: '6', notice_period_days: '',
    client_id: '', site_id: '',
    status: 'active', grade: '', previous_employment: '',
    salary: { basic: 0, hra: 0, conveyance: 0, other_allowance: 0 },
    statutory: { pf_applicable: true, esi_applicable: true, lwf_applicable: false, pt_applicable: true },
    nominee: { name: '', relation: '', share: 0, contact: '' },
  })

  const { data: emp, isLoading: empLoading } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => employeeApi.get(employeeId!),
    enabled: isEdit,
  })

  const { data: clients } = useQuery({ queryKey: ['clients-select'], queryFn: () => clientApi.list() })
  const { data: allSitesRes } = useQuery({ queryKey: ['sites-select'], queryFn: () => siteApi.list() })
  const allSites = (allSitesRes?.data || []) as any[]

  const update = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }))
  const updateSalary = (key: string, value: any) => setForm(f => ({ ...f, salary: { ...f.salary, [key]: value } }))
  const updateStatutory = (key: string, value: any) => setForm(f => ({ ...f, statutory: { ...f.statutory, [key]: value } }))
  const updateNominee = (key: string, value: any) => setForm(f => ({ ...f, nominee: { ...f.nominee, [key]: value } }))

  useEffect(() => {
    if (emp?.data) {
      const e: any = emp.data
      const s = e.salary || {}
      setForm(f => ({
        ...f,
        first_name: e.first_name || '', last_name: e.last_name || '', father_name: e.father_name || '', spouse_name: e.spouse_name || '', gender: e.gender || 'Male', dob: e.dob || '', marital_status: e.marital_status || 'Single', nationality: e.nationality || 'Indian',
        mobile: e.mobile || '', alternate_mobile: e.alternate_mobile || '', email: e.email || '', aadhaar: e.aadhaar || '',
        address: e.address || '', city: e.city || '', state: e.state || '', pincode: e.pincode || '',
        permanent_same_as_present: !!e.permanent_same_as_present, permanent_address: e.permanent_address || '', permanent_city: e.permanent_city || '', permanent_state: e.permanent_state || '', permanent_pincode: e.permanent_pincode || '',
        emergency_contact_name: e.emergency_contact_name || '', emergency_contact_phone: e.emergency_contact_phone || '', emergency_contact_relation: e.emergency_contact_relation || '',
        bank_name: e.bank_name || '', bank_holder_name: e.bank_holder_name || '', bank_account: e.bank_account || '', bank_ifsc: e.bank_ifsc || '', pan: e.pan || '', uan: e.uan || '', esi_number: e.esi_number || '',
        ctc: e.ctc !== null && e.ctc !== undefined ? String(e.ctc) : '',
        joining_date: e.joining_date || '', designation: e.designation || '', department: e.department || '',
        reporting_manager: e.reporting_manager || '', employee_type: e.employee_type || 'permanent', shift_type: e.shift_type || 'General', working_days_week: String(e.working_days_week ?? 6), notice_period_days: e.notice_period_days ? String(e.notice_period_days) : '',
        client_id: e.site?.client_id ? String(e.site.client_id) : '', site_id: e.site_id ? String(e.site_id) : '',
        status: e.status || 'active', grade: e.grade || '', previous_employment: e.previous_employment || '',
        salary: { basic: Number(s.basic) || 0, hra: Number(s.hra) || 0, conveyance: Number(s.conveyance) || 0, other_allowance: Number(s.other_allowance) || 0 },
        statutory: {
          pf_applicable: e.statutory ? e.statutory.pf_applicable === 1 : s.pf_applicable !== 0,
          esi_applicable: e.statutory ? e.statutory.esi_applicable === 1 : s.esic_applicable !== 0,
          lwf_applicable: e.statutory ? e.statutory.lwf_applicable === 1 : false,
          pt_applicable: e.statutory ? e.statutory.pt_applicable === 1 : true,
        },
        nominee: (e.nominees && e.nominees.length && e.nominees[0])
          ? { name: e.nominees[0].name || '', relation: e.nominees[0].relation || '', share: Number(e.nominees[0].share) || 0, contact: e.nominees[0].contact || '' }
          : { name: '', relation: '', share: 0, contact: '' },
      }))
    }
  }, [emp])

  const sites = allSites.filter((s: any) => !form.client_id || String(s.client_id) === form.client_id)
  const otherAllowanceOn = Number(form.salary.other_allowance || 0) > 0

  const handleCheck = async () => {
    if (!/^\d{12}$/.test((checkAadhaar || '').trim())) { toast.error('Enter a valid 12-digit Aadhaar number.'); return }
    setChecking(true)
    try {
      const res = await employeeApi.checkAadhaar(checkAadhaar.trim())
      setForm(f => ({ ...f, aadhaar: checkAadhaar.trim() }))
      if (res.data?.exists) {
        setMatch(res.data.employee)
      } else {
        setMatch(null)
        setUnlocked(true)
        toast.success('Verified — Aadhaar is new. Continue with registration.')
      }
    } catch {
      toast.error('Aadhaar check failed. Please try again.')
    } finally {
      setChecking(false)
    }
  }

  const handleSubmit = async () => {
    if (!form.first_name || !form.last_name) { toast.error('First and last name are required.'); return }
    if (!isEdit && !unlocked) { toast.error('Please run the Aadhaar check first.'); return }
    setLoading(true)
    try {
      const sum = (Number(form.salary.basic) || 0) + (Number(form.salary.hra) || 0) + (Number(form.salary.conveyance) || 0) + (Number(form.salary.other_allowance) || 0)
      const ctc = form.ctc !== '' && Number(form.ctc) > 0 ? Number(form.ctc) : sum
      const permOn = !!form.permanent_same_as_present
      const payload = {
        first_name: form.first_name, last_name: form.last_name,
        father_name: form.father_name || null, spouse_name: form.spouse_name || null,
        gender: form.gender, dob: form.dob || null, marital_status: form.marital_status || null, nationality: form.nationality || 'Indian',
        mobile: form.mobile || null, alternate_mobile: form.alternate_mobile || null, email: form.email || null, aadhaar: form.aadhaar || null,
        address: form.address || null, city: form.city || null, state: form.state || null, pincode: form.pincode || null,
        permanent_same_as_present: permOn,
        permanent_address: permOn ? (form.address || null) : (form.permanent_address || null),
        permanent_city: permOn ? (form.city || null) : (form.permanent_city || null),
        permanent_state: permOn ? (form.state || null) : (form.permanent_state || null),
        permanent_pincode: permOn ? (form.pincode || null) : (form.permanent_pincode || null),
        emergency_contact_name: form.emergency_contact_name || null, emergency_contact_phone: form.emergency_contact_phone || null, emergency_contact_relation: form.emergency_contact_relation || null,
        bank_name: form.bank_name || null, bank_holder_name: form.bank_holder_name || null, bank_account: form.bank_account || null, bank_ifsc: form.bank_ifsc || null,
        pan: form.pan || null, uan: form.statutory.pf_applicable ? (form.uan || null) : null, esi_number: form.statutory.esi_applicable ? (form.esi_number || null) : null,
        ctc,
        joining_date: form.joining_date || null, designation: form.designation || null, department: form.department || null,
        grade: form.grade || null, reporting_manager: form.reporting_manager || null, previous_employment: form.previous_employment || null,
        employee_type: form.employee_type || 'permanent', shift_type: form.shift_type || null,
        working_days_week: Number(form.working_days_week) || 6,
        notice_period_days: form.notice_period_days ? Number(form.notice_period_days) : null,
        site_id: form.site_id ? Number(form.site_id) : null,
        status: form.status || 'active',
        salary: {
          basic: Number(form.salary.basic) || 0, hra: Number(form.salary.hra) || 0, conveyance: Number(form.salary.conveyance) || 0,
          other_allowance: otherAllowanceOn ? (Number(form.salary.other_allowance) || 0) : 0,
          overtime_rate: 0, pf_applicable: form.statutory.pf_applicable, esic_applicable: form.statutory.esi_applicable, other_deduction: 0,
        },
        statutory: {
          pf_applicable: form.statutory.pf_applicable, esi_applicable: form.statutory.esi_applicable,
          lwf_applicable: form.statutory.lwf_applicable, pt_applicable: form.statutory.pt_applicable,
        },
        nominee: form.nominee.name ? { name: form.nominee.name, relation: form.nominee.relation || null, share: Number(form.nominee.share) || 0, contact: form.nominee.contact || null } : null,
      }
      if (isEdit) {
        await employeeApi.update(employeeId!, payload)
      } else {
        await employeeApi.create(payload)
      }
      onSaved()
    } catch (err: any) {
      toast.error(err?.error?.message || 'Failed to save employee.')
    } finally {
      setLoading(false)
    }
  }

  if (isEdit && empLoading) return <LoadingState />

  const fieldClass = 'grid grid-cols-3 gap-3'
  const stateOptions = [
    'Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh',
    'Uttarakhand', 'West Bengal',
  ]

  const checkPanel = !isEdit && !unlocked && (
    <Section icon={IdCard} title="Aadhaar Check">
      <p className="text-[12px] text-mute">Verify the employee&apos;s Aadhaar number before registration.</p>
      {!match ? (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input label="Aadhaar Number" placeholder="12-digit Aadhaar" maxLength={12} value={checkAadhaar} onChange={e => setCheckAadhaar(e.target.value.replace(/\D/g, ''))} />
          </div>
          <Button onClick={handleCheck} loading={checking}>Check</Button>
        </div>
      ) : (
        <div className="border border-warning/40 bg-warning/5 rounded-sm p-3">
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-warning"><AlertTriangle className="w-4 h-4" /> Employee already exists</p>
          <p className="text-[12px] text-body mt-1">{match.first_name} {match.last_name} · {match.employee_code}{match.site_name ? ` · ${match.client_name || ''} — ${match.site_name}` : ''}</p>
          <div className="flex items-center gap-2 mt-3">
            <Button size="sm" onClick={() => onSwitchToEdit?.(match.id)}>Open Existing</Button>
            <Button size="sm" variant="secondary" onClick={() => { setMatch(null); setUnlocked(true) }}>Continue New Registration</Button>
            <Button size="sm" variant="ghost" onClick={() => { setMatch(null); setCheckAadhaar('') }}>Cancel</Button>
          </div>
        </div>
      )}
    </Section>
  )

  const checkedBanner = !isEdit && unlocked && (
    <div className="flex items-center justify-between border border-success/40 bg-success/5 rounded-sm px-3 py-2 mb-4">
      <p className="flex items-center gap-1.5 text-[12px] text-success"><CheckCircle2 className="w-4 h-4" /> Aadhaar {form.aadhaar} verified — new employee</p>
      <button type="button" className="text-[11px] text-link underline" onClick={() => onClose()}>Restart</button>
    </div>
  )

  return (
    <div className="max-h-[65vh] overflow-y-auto space-y-5">
      {checkPanel}
      {checkedBanner}

      {unlocked || isEdit ? (
        <>
          <Section icon={User} title="Basic Details">
            <div className={fieldClass}>
              <Input label="First Name" value={form.first_name} onChange={e => update('first_name', e.target.value)} />
              <Input label="Last Name" value={form.last_name} onChange={e => update('last_name', e.target.value)} />
              <Input label="Date of Birth" type="date" value={form.dob} onChange={e => update('dob', e.target.value)} />
            </div>
            <div className={fieldClass}>
              <Select label="Gender" options={GENDERS.map(g => ({ value: g, label: g }))} value={form.gender} onChange={e => update('gender', e.target.value)} />
              <Select label="Marital Status" options={MARITAL_STATUSES.map(m => ({ value: m, label: m }))} value={form.marital_status} onChange={e => update('marital_status', e.target.value)} />
              <Input label="Nationality" value={form.nationality} onChange={e => update('nationality', e.target.value)} />
            </div>
            <div className="border-t border-hairline pt-2">
              <Toggle
                label="Father Name"
                checked={!form.spouse_name}
                onChange={v => { if (v) { update('spouse_name', '') } else { update('father_name', '') } }}
              />
              {!form.spouse_name ? (
                <div className="mt-1">
                  <Input label="" value={form.father_name} onChange={e => update('father_name', e.target.value)} />
                </div>
              ) : (
                <div className="mt-1">
                  <Input label="" value={form.spouse_name} onChange={e => update('spouse_name', e.target.value)} />
                </div>
              )}
            </div>
          </Section>

          <Section icon={Phone} title="Contact Details">
            <div className={fieldClass}>
              <Input label="Primary Contact No." value={form.mobile} onChange={e => update('mobile', e.target.value)} />
              <Input label="Alternate Contact No." value={form.alternate_mobile} onChange={e => update('alternate_mobile', e.target.value)} />
              <Input label="Email (for My Space login)" type="email" value={form.email} onChange={e => update('email', e.target.value)} />
            </div>
            <div>
              <Textarea label="Present Address" value={form.address} onChange={e => update('address', e.target.value)} />
            </div>
            <div className={fieldClass}>
              <Input label="City" value={form.city} onChange={e => update('city', e.target.value)} />
              <Select label="State" options={[{ value: '', label: 'Select state' }, ...stateOptions.map(s => ({ value: s, label: s }))]} value={form.state} onChange={e => update('state', e.target.value)} />
              <Input label="Pincode" value={form.pincode} onChange={e => update('pincode', e.target.value)} />
            </div>
            <div className="border-t border-hairline pt-2">
              <Toggle label="Permanent address same as present" checked={form.permanent_same_as_present} onChange={v => update('permanent_same_as_present', v)} />
            </div>
            {!form.permanent_same_as_present && (
              <>
                <div>
                  <Textarea label="Permanent Address" value={form.permanent_address} onChange={e => update('permanent_address', e.target.value)} />
                </div>
                <div className={fieldClass}>
                  <Input label="City" value={form.permanent_city} onChange={e => update('permanent_city', e.target.value)} />
                  <Select label="State" options={[{ value: '', label: 'Select state' }, ...stateOptions.map(s => ({ value: s, label: s }))]} value={form.permanent_state} onChange={e => update('permanent_state', e.target.value)} />
                  <Input label="Pincode" value={form.permanent_pincode} onChange={e => update('permanent_pincode', e.target.value)} />
                </div>
              </>
            )}
          </Section>

          <Section icon={Briefcase} title="Official Information">
            <div className={fieldClass}>
              <Select
                label="Client"
                options={[{ value: '', label: 'None' }, ...(clients?.data || []).map((c: any) => ({ value: String(c.id), label: c.name }))]}
                value={form.client_id}
                onChange={e => update('client_id', e.target.value)}
              />
              <Select
                label="Site"
                options={[{ value: '', label: 'None' }, ...sites.map((s: any) => ({ value: String(s.id), label: s.name }))]}
                value={form.site_id}
                onChange={e => update('site_id', e.target.value)}
              />
              <Input label="Reporting Manager" value={form.reporting_manager} onChange={e => update('reporting_manager', e.target.value)} />
            </div>
            <div className={fieldClass}>
              <Input label="Department" value={form.department} onChange={e => update('department', e.target.value)} />
              <Input label="Designation" value={form.designation} onChange={e => update('designation', e.target.value)} />
              <Input label="Date of Joining" type="date" value={form.joining_date} onChange={e => update('joining_date', e.target.value)} />
            </div>
            <div className={fieldClass}>
              <Select label="Employment Type" options={EMP_TYPES} value={form.employee_type} onChange={e => update('employee_type', e.target.value)} />
              <Select label="Shift" options={SHIFTS.map(s => ({ value: s, label: s }))} value={form.shift_type} onChange={e => update('shift_type', e.target.value)} />
              <Select label="Working Days in a Week" options={WEEKDAYS.map(d => ({ value: d, label: `${d} days` }))} value={form.working_days_week} onChange={e => update('working_days_week', e.target.value)} />
            </div>
            <div className={fieldClass}>
              <Select label="Notice Period" options={[{ value: '', label: 'Not applicable' }, ...NOTICE_PERIODS]} value={form.notice_period_days} onChange={e => update('notice_period_days', e.target.value)} />
              {isEdit && (
                <Select label="Status" options={['active', 'inactive', 'resigned', 'terminated'].map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))} value={form.status} onChange={e => update('status', e.target.value)} />
              )}
            </div>
          </Section>

          <Section icon={Wallet} title="Salary and Payroll">
            <div className={fieldClass}>
              <Input label="CTC / Gross Salary" type="number" min={0} value={form.ctc} onChange={e => update('ctc', e.target.value)} />
              <Input label="Basic Salary" type="number" min={0} value={form.salary.basic} onChange={e => updateSalary('basic', e.target.value)} />
              <Input label="HRA" type="number" min={0} value={form.salary.hra} onChange={e => updateSalary('hra', e.target.value)} />
            </div>
            <div className={fieldClass}>
              <Input label="Conveyance" type="number" min={0} value={form.salary.conveyance} onChange={e => updateSalary('conveyance', e.target.value)} />
              <div className="col-span-2 flex flex-col justify-end pb-1">
                <p className="text-[11px] text-mute">
                  Computed from components: ₹{(Number(form.salary.basic) || 0) + (Number(form.salary.hra) || 0) + (Number(form.salary.conveyance) || 0) + (Number(form.salary.other_allowance) || 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
            <div className="border-t border-hairline pt-2">
              <Toggle label="Other Allowance Applicable" checked={otherAllowanceOn} onChange={v => { if (!v) updateSalary('other_allowance', 0) }} />
            </div>
            {otherAllowanceOn && (
              <Input label="Other Allowance" type="number" min={0} value={form.salary.other_allowance} onChange={e => updateSalary('other_allowance', e.target.value)} />
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 border-t border-hairline pt-2">
              <Toggle label="PF Applicable" checked={form.statutory.pf_applicable} onChange={v => updateStatutory('pf_applicable', v)} />
              {form.statutory.pf_applicable && (
                <Input label="UAN No." value={form.uan} onChange={e => update('uan', e.target.value)} />
              )}
              <Toggle label="ESIC Applicable" checked={form.statutory.esi_applicable} onChange={v => updateStatutory('esi_applicable', v)} />
              {form.statutory.esi_applicable && (
                <Input label="ESI No." value={form.esi_number} onChange={e => update('esi_number', e.target.value)} />
              )}
              <Toggle label="LWF (Labour Welfare Fund) Applicable" checked={form.statutory.lwf_applicable} onChange={v => updateStatutory('lwf_applicable', v)} />
              <Toggle label="Professional Tax Applicable" checked={form.statutory.pt_applicable} onChange={v => updateStatutory('pt_applicable', v)} />
            </div>
            <p className="text-[11px] text-mute">Other deductions and OT rate are managed via payroll salary revisions.</p>
          </Section>

          <Section icon={Landmark} title="Bank Details">
            <div className={fieldClass}>
              <Input label="Bank Name" value={form.bank_name} onChange={e => update('bank_name', e.target.value)} />
              <Input label="A/C No." value={form.bank_account} onChange={e => update('bank_account', e.target.value)} />
              <Input label="IFSC" value={form.bank_ifsc} onChange={e => update('bank_ifsc', e.target.value)} />
            </div>
            <div className={fieldClass}>
              <Input label="A/C Holder Name" value={form.bank_holder_name} onChange={e => update('bank_holder_name', e.target.value)} />
            </div>
          </Section>

          <Section icon={FileText} title="Documents">
            <div className={fieldClass}>
              <Input label="Aadhaar No." value={form.aadhaar} maxLength={12} onChange={e => update('aadhaar', e.target.value.replace(/\D/g, ''))} />
              <Input label="PAN" value={form.pan} onChange={e => update('pan', e.target.value.toUpperCase())} />
            </div>
          </Section>

          <Section icon={HeartHandshake} title="Nominee Details">
            <div className="text-[12px] text-mute -mt-1">Single nominee per employee.</div>
            <div className={fieldClass}>
              <Input label="Name" value={form.nominee.name} onChange={e => updateNominee('name', e.target.value)} />
              <Input label="Relation" value={form.nominee.relation} onChange={e => updateNominee('relation', e.target.value)} />
              <Input label="Share (%)" type="number" min={0} max={100} value={form.nominee.share} onChange={e => updateNominee('share', e.target.value)} />
            </div>
            <div className={fieldClass}>
              <Input label="Contact No." value={form.nominee.contact} onChange={e => updateNominee('contact', e.target.value)} />
            </div>
          </Section>

          <Section icon={Siren} title="Emergency Contact">
            <div className={fieldClass}>
              <Input label="Contact Person Name" value={form.emergency_contact_name} onChange={e => update('emergency_contact_name', e.target.value)} />
              <Input label="Relation" value={form.emergency_contact_relation} onChange={e => update('emergency_contact_relation', e.target.value)} />
              <Input label="Contact No." value={form.emergency_contact_phone} onChange={e => update('emergency_contact_phone', e.target.value)} />
            </div>
          </Section>

          <div className="flex justify-end gap-2 pt-2 border-t border-hairline sticky bottom-0 bg-white py-3">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} loading={loading}>{isEdit ? 'Update Employee' : 'Add Employee'}</Button>
          </div>
        </>
      ) : (
        <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      )}
    </div>
  )
}