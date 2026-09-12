import { useState, useEffect, useRef, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { employeeApi, clientApi, siteApi } from '@/services/api'
import { Button, Input, Select, Textarea, Section, Toggle } from '@/components/ui/fields'
import { LoadingState } from '@/components/ui/state'
import { FieldErrorsDialog, useFormValidation, type FieldRule } from '@/components/ui/validation'
import { toast } from 'sonner'
import { IdCard, User, Phone, Briefcase, Wallet, Landmark, FileText, HeartHandshake, Siren, CheckCircle2, AlertTriangle } from 'lucide-react'

interface Props {
  employeeId: number | null
  onClose: () => void
  onSaved?: (createdId?: number) => void
  onSwitchToEdit?: (id: number) => void
  focusField?: string | null
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

const EMPLOYEE_RULES: FieldRule[] = [
  { key: 'full_name', label: 'Full Name', required: true },
  { key: 'mobile', label: 'Primary Contact No.', test: (v: any) => v && !/^[0-9+\-\s]{7,15}$/.test(v) ? 'Enter a valid phone number.' : null },
  { key: 'email', label: 'Email', test: (v: any) => v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Enter a valid email address.' : null },
]

export default function EmployeeForm({ employeeId, onClose, onSaved, onSwitchToEdit, focusField }: Props) {
  const isEdit = !!employeeId
  const [loading, setLoading] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [checking, setChecking] = useState(false)
  const [checkAadhaar, setCheckAadhaar] = useState('')
  const [match, setMatch] = useState<any>(null)
  const [form, setForm] = useState<Record<string, any>>({
    employee_code: '', full_name: '', father_name: '', spouse_name: '', gender: 'Male', dob: '', marital_status: 'Single', nationality: 'Indian',
    mobile: '', alternate_mobile: '', email: '', aadhaar: '',
    address: '', city: '', state: '', district: '', pincode: '',
    permanent_same_as_present: false, permanent_address: '', permanent_city: '', permanent_state: '', permanent_district: '', permanent_pincode: '',
    emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relation: '',
    bank_name: '', bank_holder_name: '', bank_account: '', bank_ifsc: '', pan: '', uan: '', esi_number: '',
    ctc: '',
    joining_date: new Date().toISOString().slice(0, 10), designation: '', department: '',
    reporting_manager: '', employee_type: 'permanent', shift_type: 'General', working_days_week: '6', notice_period_days: '',
    client_id: '', site_id: '',
    status: 'active', grade: '', previous_employment: '',
    salary: { basic: 0, hra: 0, conveyance: 0, other_allowance: 0, other_allowance_label: '' },
    statutory: { pf_applicable: true, esi_applicable: true, lwf_applicable: false, pt_applicable: true },
    nominee: { name: '', relation: '', share: 0, contact: '' },
  })
  const { errors, validate, applyServerErrors, clear, clearAll, invalidLabels, popupOpen, closePopup } = useFormValidation()
  const [parentType, setParentType] = useState<'father' | 'spouse'>('father')

  const fieldRefs = {
    dob: useRef<HTMLInputElement>(null),
    father_name: useRef<HTMLInputElement>(null),
    uan: useRef<HTMLInputElement>(null),
    esi_number: useRef<HTMLInputElement>(null),
    bank_account: useRef<HTMLInputElement>(null),
    bank_ifsc: useRef<HTMLInputElement>(null),
  }
  const focusedOnce = useRef(false)
  useEffect(() => {
    if (!focusField || focusedOnce.current) return
    if (focusField === 'father_name') setParentType('father')
    const target = focusField as keyof typeof fieldRefs
    const el = fieldRefs[target]?.current
    if (el) {
      focusedOnce.current = true
      el.focus()
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [focusField, form.dob, form.father_name, form.uan, form.esi_number, form.bank_account, form.bank_ifsc, parentType])

  const { data: emp, isLoading: empLoading } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => employeeApi.get(employeeId!),
    enabled: isEdit,
  })

  const [nextCode, setNextCode] = useState('')
  useEffect(() => {
    if (isEdit) return
    employeeApi.nextCode(form.site_id ? Number(form.site_id) : undefined).then((r) => setNextCode(r.data.code)).catch(() => {})
  }, [isEdit, form.site_id])

  const { data: clients } = useQuery({ queryKey: ['clients-select'], queryFn: () => clientApi.list() })
  const { data: allSitesRes } = useQuery({ queryKey: ['sites-select'], queryFn: () => siteApi.list() })
  const allSites = (allSitesRes?.data || []) as any[]

  const update = (key: string, value: any) => { setForm(f => ({ ...f, [key]: value })); clear(key) }
  const updateSalary = (key: string, value: any) => setForm(f => ({ ...f, salary: { ...f.salary, [key]: value } }))
  const updateStatutory = (key: string, value: any) => setForm(f => ({ ...f, statutory: { ...f.statutory, [key]: value } }))
  const updateNominee = (key: string, value: any) => setForm(f => ({ ...f, nominee: { ...f.nominee, [key]: value } }))

  useEffect(() => {
    if (emp?.data) {
      const e: any = emp.data
      const s = e.salary || {}
      setForm(f => ({
        ...f,
        employee_code: e.employee_code || '', full_name: [e.first_name, e.last_name].filter(Boolean).join(' ').trim(), father_name: e.father_name || '', spouse_name: e.spouse_name || '', gender: e.gender || 'Male', dob: e.dob || '', marital_status: e.marital_status || 'Single', nationality: e.nationality || 'Indian',
        mobile: e.mobile || '', alternate_mobile: e.alternate_mobile || '', email: e.email || '', aadhaar: e.aadhaar || '',
        address: e.address || '', city: e.city || '', state: e.state || '', district: e.district || '', pincode: e.pincode || '',
        permanent_same_as_present: !!e.permanent_same_as_present, permanent_address: e.permanent_address || '', permanent_city: e.permanent_city || '', permanent_state: e.permanent_state || '', permanent_district: e.permanent_district || '', permanent_pincode: e.permanent_pincode || '',
        emergency_contact_name: e.emergency_contact_name || '', emergency_contact_phone: e.emergency_contact_phone || '', emergency_contact_relation: e.emergency_contact_relation || '',
        bank_name: e.bank_name || '', bank_holder_name: e.bank_holder_name || '', bank_account: e.bank_account || '', bank_ifsc: e.bank_ifsc || '', pan: e.pan || '', uan: e.uan || '', esi_number: e.esi_number || '',
        ctc: e.ctc !== null && e.ctc !== undefined ? String(e.ctc) : '',
        joining_date: e.joining_date || '', designation: e.designation || '', department: e.department || '',
        reporting_manager: e.reporting_manager || '', employee_type: e.employee_type || 'permanent', shift_type: e.shift_type || 'General', working_days_week: String(e.working_days_week ?? 6), notice_period_days: e.notice_period_days ? String(e.notice_period_days) : '',
        client_id: e.site?.client_id ? String(e.site.client_id) : '', site_id: e.site_id ? String(e.site_id) : '',
        status: e.status || 'active', grade: e.grade || '', previous_employment: e.previous_employment || '',
        salary: { basic: Number(s.basic) || 0, hra: Number(s.hra) || 0, conveyance: Number(s.conveyance) || 0, other_allowance: Number(s.other_allowance) || 0, other_allowance_label: s.other_allowance_label || '' },
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
      setParentType(e.spouse_name && String(e.spouse_name).trim() ? 'spouse' : 'father')
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
    if (!isEdit && !unlocked) { toast.error('Please run the Aadhaar check first.'); return }
    if (!validate(EMPLOYEE_RULES, form)) return
    if (otherAllowanceOn && !String(form.salary.other_allowance_label || '').trim()) { toast.error('Enter the Other Allowance field name.'); return }
    if (otherAllowanceOn && !(Number(form.salary.other_allowance) > 0)) { toast.error('Enter the Other Allowance amount.'); return }
    setLoading(true)
    try {
      const sum = (Number(form.salary.basic) || 0) + (Number(form.salary.hra) || 0) + (Number(form.salary.conveyance) || 0) + (Number(form.salary.other_allowance) || 0)
      const ctc = form.ctc !== '' && Number(form.ctc) > 0 ? Number(form.ctc) : sum
      const permOn = !!form.permanent_same_as_present
      const payload = {
        full_name: form.full_name,
        father_name: form.father_name || null, spouse_name: form.spouse_name || null,
        gender: form.gender, dob: form.dob || null, marital_status: form.marital_status || null, nationality: form.nationality || 'Indian',
        mobile: form.mobile || null, alternate_mobile: form.alternate_mobile || null, email: form.email || null, aadhaar: form.aadhaar || null,
        address: form.address || null, city: form.city || null, state: form.state || null, district: form.district || null, pincode: form.pincode || null,
        permanent_same_as_present: permOn,
        permanent_address: permOn ? (form.address || null) : (form.permanent_address || null),
        permanent_city: permOn ? (form.city || null) : (form.permanent_city || null),
        permanent_state: permOn ? (form.state || null) : (form.permanent_state || null),
        permanent_district: permOn ? (form.district || null) : (form.permanent_district || null),
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
          other_allowance_label: otherAllowanceOn ? (form.salary.other_allowance_label || null) : null,
          overtime_rate: 0, pf_applicable: form.statutory.pf_applicable, esic_applicable: form.statutory.esi_applicable, other_deduction: 0,
        },
        statutory: {
          pf_applicable: form.statutory.pf_applicable, esi_applicable: form.statutory.esi_applicable,
          lwf_applicable: form.statutory.lwf_applicable, pt_applicable: form.statutory.pt_applicable,
        },
        nominee: form.nominee.name ? { name: form.nominee.name, relation: form.nominee.relation || null, share: Number(form.nominee.share) || 0, contact: form.nominee.contact || null } : null,
      }
      let createdId: number | undefined
      if (isEdit) {
        await employeeApi.update(employeeId!, payload)
      } else {
        const res = await employeeApi.create(payload)
        createdId = Number((res as any)?.data?.id) || undefined
      }
      clearAll()
      onSaved?.(createdId)
    } catch (err: any) {
      if (err?.error?.fields) { applyServerErrors(err.error.fields); toast.error('Please correct the highlighted fields.') }
      else toast.error(err?.error?.message || 'Failed to save employee.')
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
            <label className="block text-[12px] font-medium text-body mb-1 tracking-[-0.01em]">Aadhaar Number</label>
            <AadhaarBoxes value={checkAadhaar} onChange={setCheckAadhaar} />
            <p className="text-[11px] text-mute mt-1">Enter 12 digits spread across the boxes — cursor moves automatically.</p>
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
              <Input label="Full Name" value={form.full_name} onChange={e => update('full_name', e.target.value)} error={errors.full_name} />
              <Input label="Date of Birth" type="date" value={form.dob} onChange={e => update('dob', e.target.value)} ref={fieldRefs.dob} />
              <Select label="Gender" options={GENDERS.map(g => ({ value: g, label: g }))} value={form.gender} onChange={e => update('gender', e.target.value)} />
            </div>
            <div className={fieldClass}>
              <div>
                <Input label="Username (for My Space login)" readOnly value={isEdit ? form.employee_code : (nextCode || 'Auto-assigned')} />
                <p className="text-[11px] text-mute mt-1">Employee ID · My Space password = Date of Birth (DDMMYY).</p>
              </div>
              <Select label="Marital Status" options={MARITAL_STATUSES.map(m => ({ value: m, label: m }))} value={form.marital_status} onChange={e => update('marital_status', e.target.value)} />
              <Input label="Nationality" value={form.nationality} onChange={e => update('nationality', e.target.value)} />
            </div>
            <div className="border-t border-hairline pt-2">
              <Toggle
                label="Father Name"
                checked={parentType === 'father'}
                onChange={v => { setParentType(v ? 'father' : 'spouse'); if (v) update('spouse_name', ''); else update('father_name', '') }}
              />
              {parentType === 'father' ? (
                <div className="mt-1">
                  <Input label="Father Name" value={form.father_name} onChange={e => update('father_name', e.target.value)} ref={fieldRefs.father_name} />
                </div>
              ) : (
                <div className="mt-1">
                  <Input label="Husband / Spouse Name" value={form.spouse_name} onChange={e => update('spouse_name', e.target.value)} />
                </div>
              )}
            </div>
          </Section>

          <Section icon={Phone} title="Contact Details">
            <div className={fieldClass}>
              <Input label="Primary Contact No." value={form.mobile} onChange={e => update('mobile', e.target.value)} error={errors.mobile} />
              <Input label="Alternate Contact No." value={form.alternate_mobile} onChange={e => update('alternate_mobile', e.target.value)} />
              <Input label="Email" type="email" value={form.email} onChange={e => update('email', e.target.value)} error={errors.email} />
            </div>
            <div>
              <Textarea label="Present Address" value={form.address} onChange={e => update('address', e.target.value)} />
            </div>
            <div className="grid grid-cols-4 gap-3">
              <Input label="District" value={form.district} onChange={e => update('district', e.target.value)} />
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
                <div className="grid grid-cols-4 gap-3">
                  <Input label="District" value={form.permanent_district} onChange={e => update('permanent_district', e.target.value)} />
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
            <div className="fieldClass">
              <Input label="CTC / Gross Salary" type="number" min={0} value={form.ctc} onChange={e => update('ctc', e.target.value)} />
              <Input label="Basic Salary" type="number" min={0} value={form.salary.basic} onChange={e => updateSalary('basic', e.target.value)} />
              <Input label="HRA" type="number" min={0} value={form.salary.hra} onChange={e => updateSalary('hra', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Conveyance" type="number" min={0} value={form.salary.conveyance} onChange={e => updateSalary('conveyance', e.target.value)} />
            </div>
            <div className="border-t border-hairline pt-2">
              <Toggle label="Other Allowance Applicable" checked={otherAllowanceOn} onChange={v => updateSalary('other_allowance', v ? (Number(form.salary.other_allowance) || 1) : 0)} />
            </div>
            {otherAllowanceOn && (
              <div className="grid grid-cols-2 gap-3">
                <Input label="Other Allowance Field Name" value={form.salary.other_allowance_label} placeholder="e.g. Performance Allowance" onChange={e => updateSalary('other_allowance_label', e.target.value)} />
                <Input label="Other Allowance (₹)" type="number" min={0} value={form.salary.other_allowance} onChange={e => updateSalary('other_allowance', e.target.value)} />
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 border-t border-hairline pt-2">
              <Toggle label="PF Applicable" checked={form.statutory.pf_applicable} onChange={v => updateStatutory('pf_applicable', v)} />
              {form.statutory.pf_applicable && (
                <Input label="UAN No." value={form.uan} onChange={e => update('uan', e.target.value)} ref={fieldRefs.uan} />
              )}
              <Toggle label="ESIC Applicable" checked={form.statutory.esi_applicable} onChange={v => updateStatutory('esi_applicable', v)} />
              {form.statutory.esi_applicable && (
                <Input label="ESI No." value={form.esi_number} onChange={e => update('esi_number', e.target.value)} ref={fieldRefs.esi_number} />
              )}
              <Toggle label="LWF (Labour Welfare Fund) Applicable" checked={form.statutory.lwf_applicable} onChange={v => updateStatutory('lwf_applicable', v)} />
              <Toggle label="Professional Tax Applicable" checked={form.statutory.pt_applicable} onChange={v => updateStatutory('pt_applicable', v)} />
            </div>
            <p className="text-[11px] text-mute">Other deductions and OT rate are managed via payroll salary revisions.</p>
          </Section>

          <Section icon={Landmark} title="Bank Details">
            <div className={fieldClass}>
              <Input label="Bank Name" value={form.bank_name} onChange={e => update('bank_name', e.target.value)} />
              <Input label="A/C No." value={form.bank_account} onChange={e => update('bank_account', e.target.value)} ref={fieldRefs.bank_account} />
              <Input label="IFSC" value={form.bank_ifsc} onChange={e => update('bank_ifsc', e.target.value)} ref={fieldRefs.bank_ifsc} />
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

      <FieldErrorsDialog open={popupOpen} labels={invalidLabels(EMPLOYEE_RULES)} onClose={closePopup} />
    </div>
  )
}

function AadhaarBoxes({ value, onChange }: { value: string; onChange: (digits: string) => void }) {
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)]
  const digits = (value || '').replace(/\D/g, '').slice(0, 12)

  const handleChange = (i: number, e: ChangeEvent<HTMLInputElement>) => {
    const part = e.target.value.replace(/\D/g, '').slice(0, 4)
    const next = (digits.slice(0, i * 4) + part + digits.slice((i + 1) * 4)).slice(0, 12)
    onChange(next)
    if (part.length === 4 && i < 2) refs[i + 1].current?.focus()
  }

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && i > 0 && e.currentTarget.value === '') {
      e.preventDefault()
      const prev = refs[i - 1].current
      prev?.focus()
      prev?.select()
    }
  }

  const handlePaste = (_i: number, e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 12)
    if (!pasted) return
    onChange(pasted)
    requestAnimationFrame(() => {
      const nextIdx = Math.min(Math.floor(pasted.length / 4), 2)
      refs[nextIdx].current?.focus()
    })
  }

  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <input
          key={i}
          ref={refs[i]}
          value={digits.slice(i * 4, (i + 1) * 4)}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => handlePaste(i, e)}
          onFocus={(e) => e.target.select()}
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          placeholder="____"
          aria-label={`Aadhaar digits ${i + 1} of 3`}
          className="w-[74px] h-10 px-2 text-center text-[15px] tracking-[0.25em] font-mono bg-white border border-hairline rounded-sm outline-none transition-colors placeholder:text-mute focus:border-ink"
        />
      ))}
    </div>
  )
}