import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { publicReferrerApi } from '@/services/api'
import { Button, Input, Select, Textarea, FormSection, FormGrid, Toggle } from '@/components/ui/fields'
import { AadhaarBoxes } from '@/components/ui/AadhaarBoxes'
import { toast } from 'sonner'
import { IdCard, User, Phone, MapPin, Landmark, CheckCircle2, AlertTriangle, Briefcase, ShieldCheck } from 'lucide-react'

/**
 * PUBLIC staff-registration intake, served at /apply outside ProtectedRoute.
 *
 * A referrer refers staff to Staffsway and registers them on the company's
 * behalf. This is not a commercial arrangement, so nothing here involves rates,
 * agreements or billing — the referrer is recorded purely as the source of the
 * referral.
 *
 * Three steps: Aadhaar uniqueness gate -> staff essentials -> referrer selection
 * and submit. Reuses the Aadhaar gate pattern from
 * features/employees/EmployeeForm.tsx, but against the public endpoint, which
 * reports only whether a number is free and never returns a matching person.
 *
 * This page intentionally collects NO salary, designation, department, site or
 * joining date. Those are HR inputs at approval time, because a public form
 * that asks for them invites both fraud and pointless negotiation.
 */

const GENDERS = ['Male', 'Female', 'Other']
const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed']
const STATE_OPTIONS = [
  'Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal',
]

type Step = 1 | 2 | 3

const emptyForm = {
  full_name: '', father_name: '', gender: 'Male', dob: '', marital_status: 'Single', nationality: 'Indian',
  mobile: '', alternate_mobile: '', email: '',
  address: '', state: '', district: '', pincode: '',
  permanent_same_as_present: false, permanent_address: '', permanent_state: '', permanent_district: '', permanent_pincode: '',
  emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relation: '',
  bank_name: '', bank_holder_name: '', bank_account: '', bank_ifsc: '',
  pan: '', uan: '', esi_number: '', experience: '', previous_employment: '',
  referrer_id: '',
}

export default function ReferrerApplyPage() {
  const [step, setStep] = useState<Step>(1)
  const [aadhaar, setAadhaar] = useState('')
  const [checking, setChecking] = useState(false)
  const [blocked, setBlocked] = useState<null | 'employee' | 'pending'>(null)
  const [submitting, setSubmitting] = useState(false)
  // Set on success, which short-circuits the whole form below.
  const [reference, setReference] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  // Sent with the submission so the server can reject sub-4-second completions.
  // The Aadhaar check ignores it: typing 12 digits quickly is not bot behaviour.
  const [startedAt] = useState(() => Date.now())
  const [form, setForm] = useState({ ...emptyForm })

  const { data: referrers, isLoading: loadingReferrers, isError: referrersError } = useQuery({
    queryKey: ['public-referrers'],
    queryFn: () => publicReferrerApi.options().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  // Built straight into Select options so the placeholder has a real empty
  // value. Faking a row with id 0 leaves the select showing nothing while the
  // browser has visually selected that row.
  const referrerOptions = useMemo(
    () => [
      { value: '', label: 'Select referrer' },
      ...(referrers || []).map((r) => ({ value: String(r.id), label: `${r.name} (${r.referrer_code})` })),
    ],
    [referrers]
  )

  const update = (k: string, v: string | boolean) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => (e[k] ? { ...e, [k]: '' } : e))
  }

  const runCheck = async () => {
    setErrors((e) => ({ ...e, aadhaar: '' }))
    if (!/^\d{12}$/.test(aadhaar)) {
      setErrors((e) => ({ ...e, aadhaar: 'Enter all 12 digits.' }))
      return
    }
    setChecking(true)
    setBlocked(null)
    try {
      const res = await publicReferrerApi.checkAadhaar(aadhaar, startedAt)
      if (res.data?.available) {
        setStep(2)
      } else {
        setBlocked((res.data?.reason as 'employee' | 'pending') || 'employee')
      }
    } catch (err: any) {
      toast.error(err?.error?.message || 'Could not verify the Aadhaar number. Please try again.')
    } finally {
      setChecking(false)
    }
  }

  const validateEssentials = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.full_name.trim() || form.full_name.trim().length < 2) e.full_name = 'Enter the full name.'
    if (!/^[0-9+\-\s]{7,15}$/.test(form.mobile.trim())) e.mobile = 'Enter a valid phone number.'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Enter a valid email address.'
    if (form.pincode && !/^\d{6}$/.test(form.pincode.trim())) e.pincode = 'PIN code must be 6 digits.'
    if (form.pan && !/^[A-Za-z]{5}\d{4}[A-Za-z]$/.test(form.pan.trim())) e.pan = 'Enter a valid PAN.'
    if (form.bank_ifsc && !/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(form.bank_ifsc.trim())) e.bank_ifsc = 'Enter a valid IFSC.'
    if (form.emergency_contact_phone && !/^[0-9+\-\s]{7,15}$/.test(form.emergency_contact_phone.trim())) {
      e.emergency_contact_phone = 'Enter a valid phone number.'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async () => {
    if (!form.referrer_id) {
      toast.error('Please select the referrer.')
      return
    }
    setSubmitting(true)
    try {
      const res = await publicReferrerApi.submit({
        ...form,
        referrer_id: Number(form.referrer_id),
        aadhaar,
        website: '',
        started_at: startedAt,
      })
      setReference(res.data?.reference || null)
    } catch (err: any) {
      if (err?.error?.code === 'conflict') {
        // Someone else got there first, or HR created this employee meanwhile.
        setBlocked(err?.error?.message?.includes('registered') ? 'employee' : 'pending')
        setStep(1)
        toast.error(err.error.message)
        return
      }
      if (err?.error?.fields) {
        const f = err.error.fields as Record<string, string[]>
        const mapped: Record<string, string> = {}
        for (const [k, v] of Object.entries(f)) if (v?.length) mapped[k] = v[0]
        setErrors(mapped)
        setStep(2)
      }
      toast.error(err?.error?.message || 'Could not submit the registration.')
    } finally {
      setSubmitting(false)
    }
  }

  const stateOptions = [{ value: '', label: 'Select state' }, ...STATE_OPTIONS.map((s) => ({ value: s, label: s }))]

  if (reference) {
    return (
      <div className="min-h-screen bg-canvas-soft flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="bg-white card-shadow-lg rounded-md p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success/10 mb-4">
              <CheckCircle2 className="w-6 h-6 text-success" />
            </div>
            <h1 className="text-[17px] font-semibold text-navy">Registration received</h1>
            <p className="text-[13px] text-body mt-2">
              Your reference is <span className="font-mono font-medium text-navy">{reference}</span>. Keep it for any follow-up with HR.
            </p>
            <p className="text-[12px] text-mute mt-3">
              HR will verify the details and confirm the joining date, site and salary separately. No employee record is created until
              that approval is done.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-canvas-soft py-6 px-4">
      <div className="max-w-3xl mx-auto">
        <header className="mb-5">
          <h1 className="text-[19px] font-semibold text-navy tracking-[-0.01em]">Staffsway — Staff Registration</h1>
          <p className="text-[13px] text-body mt-1">
            Staffsway Manpower Staffing &amp; HR Services. Register a person for review; HR will confirm onboarding details.
          </p>
        </header>

        <div className="flex items-center gap-2 mb-4 text-[12px]">
          {(['Aadhaar', 'Staff Details', 'Referrer & Submit'] as const).map((label, i) => {
            const n = (i + 1) as Step
            const done = step > n
            const active = step === n
            return (
              <div key={label} className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-medium border ${
                    done
                      ? 'bg-success text-white border-success'
                      : active
                        ? 'bg-navy text-white border-navy'
                        : 'bg-white text-mute border-hairline'
                  }`}
                >
                  {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : n}
                </span>
                <span className={active ? 'text-navy font-medium' : 'text-mute'}>{label}</span>
                {i < 2 && <span className="w-6 h-px bg-hairline" />}
              </div>
            )
          })}
        </div>

        {step === 1 && (
          <div className="bg-white card-shadow-lg rounded-md p-5">
            <FormSection icon={IdCard} title="Aadhaar Verification" subtitle="Enter the person's 12-digit Aadhaar number to continue.">
              {blocked ? (
                <div className="border border-warning/40 bg-warning/5 rounded-sm p-3.5">
                  <p className="flex items-center gap-1.5 text-[13px] font-medium text-warning-deep">
                    <AlertTriangle className="w-4 h-4" />
                    {blocked === 'employee' ? 'Already registered with us' : 'Already under review'}
                  </p>
                  <p className="text-[12px] text-body mt-1">
                    {blocked === 'employee'
                      ? 'This Aadhaar number belongs to an existing employee. Please contact HR if this is a correction to an existing record.'
                      : 'A registration for this Aadhaar number is already waiting for review. No need to submit it twice.'}
                  </p>
                  <Button size="sm" variant="secondary" className="mt-3" onClick={() => { setBlocked(null); setAadhaar('') }}>
                    Enter a Different Number
                  </Button>
                </div>
              ) : (
                <>
                  <div className="mb-3">
                    <p className="block text-[12px] font-medium text-body mb-1">Aadhaar Number</p>
                    <AadhaarBoxes value={aadhaar} onChange={(d) => { setAadhaar(d); setErrors((e) => ({ ...e, aadhaar: '' })) }} invalid={!!errors.aadhaar} />
                    <p className="text-[11px] text-mute mt-1.5">
                      The cursor moves automatically. The number is checked against existing employees and pending registrations.
                    </p>
                    {errors.aadhaar && <p className="text-[11px] text-error mt-1">{errors.aadhaar}</p>}
                  </div>
                  <Button onClick={runCheck} loading={checking} disabled={aadhaar.length !== 12}>Check Aadhaar</Button>
                </>
              )}
            </FormSection>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white card-shadow-lg rounded-md p-5">
            <div className="flex items-center justify-between gap-2 rounded-md border border-success/40 bg-success/5 px-3.5 py-2.5 mb-4">
              <p className="flex items-center gap-1.5 text-[12px] text-success font-medium">
                <CheckCircle2 className="w-4 h-4" /> Aadhaar {aadhaar} is available
              </p>
              <button type="button" className="text-[11px] text-link underline hover:text-link-deep cursor-pointer" onClick={() => setStep(1)}>
                Change
              </button>
            </div>

            <FormSection icon={User} title="Staff Details" subtitle="As per the person's identity documents.">
              <FormGrid cols={3}>
                <Input label="Full Name" value={form.full_name} onChange={(e) => update('full_name', e.target.value)} error={errors.full_name} />
                <Input label="Father's Name" value={form.father_name} onChange={(e) => update('father_name', e.target.value)} />
                <Select label="Gender" options={GENDERS.map((g) => ({ value: g, label: g }))} value={form.gender} onChange={(e) => update('gender', e.target.value)} />
              </FormGrid>
              <FormGrid cols={3}>
                <Input label="Date of Birth" type="date" value={form.dob} onChange={(e) => update('dob', e.target.value)} />
                <Select label="Marital Status" options={MARITAL_STATUSES.map((m) => ({ value: m, label: m }))} value={form.marital_status} onChange={(e) => update('marital_status', e.target.value)} />
                <Input label="Nationality" value={form.nationality} onChange={(e) => update('nationality', e.target.value)} />
              </FormGrid>
              <FormGrid cols={3}>
                <Input label="Total Experience" placeholder="e.g. 3 yrs" value={form.experience} onChange={(e) => update('experience', e.target.value)} />
                <Input label="Previous Employer" value={form.previous_employment} onChange={(e) => update('previous_employment', e.target.value)} />
              </FormGrid>
            </FormSection>

            <FormSection icon={Phone} title="Contact" className="mb-4">
              <FormGrid cols={3}>
                <Input label="Primary Mobile" value={form.mobile} onChange={(e) => update('mobile', e.target.value)} error={errors.mobile} />
                <Input label="Alternate Mobile" value={form.alternate_mobile} onChange={(e) => update('alternate_mobile', e.target.value)} />
                <Input label="Email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} error={errors.email} />
              </FormGrid>
              <FormGrid cols={3}>
                <Input label="Emergency Contact Name" value={form.emergency_contact_name} onChange={(e) => update('emergency_contact_name', e.target.value)} />
                <Input label="Emergency Contact No." value={form.emergency_contact_phone} onChange={(e) => update('emergency_contact_phone', e.target.value)} error={errors.emergency_contact_phone} />
                <Input label="Relationship" value={form.emergency_contact_relation} onChange={(e) => update('emergency_contact_relation', e.target.value)} />
              </FormGrid>
            </FormSection>

            <FormSection icon={MapPin} title="Address" className="mb-4">
              <Textarea label="Present Address" rows={2} value={form.address} onChange={(e) => update('address', e.target.value)} />
              <FormGrid cols={3}>
                <Select label="State" options={stateOptions} value={form.state} onChange={(e) => update('state', e.target.value)} />
                <Input label="District" value={form.district} onChange={(e) => update('district', e.target.value)} />
                <Input label="PIN Code" value={form.pincode} onChange={(e) => update('pincode', e.target.value)} error={errors.pincode} />
              </FormGrid>
              <div className="mt-3">
                <Toggle
                  label="Permanent address is the same as present address"
                  checked={form.permanent_same_as_present}
                  onChange={(v) => update('permanent_same_as_present', v)}
                />
              </div>
              {!form.permanent_same_as_present && (
                <div className="mt-3">
                  <Textarea label="Permanent Address" rows={2} value={form.permanent_address} onChange={(e) => update('permanent_address', e.target.value)} />
                  <FormGrid cols={3}>
                    <Select label="Permanent State" options={stateOptions} value={form.permanent_state} onChange={(e) => update('permanent_state', e.target.value)} />
                    <Input label="Permanent District" value={form.permanent_district} onChange={(e) => update('permanent_district', e.target.value)} />
                    <Input label="Permanent PIN Code" value={form.permanent_pincode} onChange={(e) => update('permanent_pincode', e.target.value)} />
                  </FormGrid>
                </div>
              )}
            </FormSection>

            <FormSection icon={Landmark} title="Bank & Statutory Identity" subtitle="Used for salary credit and PF/ESIC registration. Leave blank if not available yet.">
              <FormGrid cols={3}>
                <Input label="Bank Name" value={form.bank_name} onChange={(e) => update('bank_name', e.target.value)} />
                <Input label="Account Holder Name" value={form.bank_holder_name} onChange={(e) => update('bank_holder_name', e.target.value)} />
                <Input label="IFSC Code" value={form.bank_ifsc} onChange={(e) => update('bank_ifsc', e.target.value)} error={errors.bank_ifsc} />
              </FormGrid>
              <FormGrid cols={4}>
                <Input label="Account Number" value={form.bank_account} onChange={(e) => update('bank_account', e.target.value)} />
                <Input label="PAN" value={form.pan} onChange={(e) => update('pan', e.target.value)} error={errors.pan} />
                <Input label="UAN" value={form.uan} onChange={(e) => update('uan', e.target.value)} />
                <Input label="ESIC Number" value={form.esi_number} onChange={(e) => update('esi_number', e.target.value)} />
              </FormGrid>
            </FormSection>

            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
              <Button
                onClick={() => {
                  if (validateEssentials()) setStep(3)
                }}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="bg-white card-shadow-lg rounded-md p-5">
            <FormSection icon={Briefcase} title="Referrer" subtitle="Who referred this person to Staffsway?">
              {loadingReferrers && <p className="text-[12px] text-mute">Loading referrers…</p>}
              {referrersError && (
                <p className="text-[12px] text-error">Could not load the referrer list. Please refresh and try again.</p>
              )}
              {!loadingReferrers && !referrersError && (
                <>
                  {referrers && referrers.length === 0 ? (
                    <p className="text-[12px] text-warning-deep">
                      No referrers are registered yet. Please contact HR before submitting.
                    </p>
                  ) : (
                    <FormGrid cols={2}>
                      <Select
                        label="Referred By"
                        options={referrerOptions}
                        value={form.referrer_id}
                        onChange={(e) => update('referrer_id', e.target.value)}
                      />
                    </FormGrid>
                  )}
                  <p className="text-[11px] text-mute mt-2">
                    The referrer you select is recorded against this registration. HR verifies it during review.
                  </p>
                </>
              )}
            </FormSection>

            <div className="rounded-md border border-hairline bg-canvas-soft-2 p-3.5 mb-4">
              <p className="text-[12px] font-medium text-navy mb-2">Review</p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
                <dt className="text-mute">Aadhaar</dt>
                <dd className="text-body font-mono">{aadhaar}</dd>
                <dt className="text-mute">Name</dt>
                <dd className="text-body">{form.full_name || '—'}</dd>
                <dt className="text-mute">Father</dt>
                <dd className="text-body">{form.father_name || '—'}</dd>
                <dt className="text-mute">Mobile</dt>
                <dd className="text-body">{form.mobile || '—'}</dd>
                <dt className="text-mute">Experience</dt>
                <dd className="text-body">{form.experience || '—'}</dd>
                <dt className="text-mute">Bank</dt>
                <dd className="text-body">{form.bank_name || '—'}</dd>
              </dl>
            </div>

            <p className="flex items-start gap-1.5 text-[11px] text-mute mb-4">
              <ShieldCheck className="w-3.5 h-3.5 mt-px shrink-0" />
              No employee record is created on submission. HR reviews every registration and confirms the site, role, joining date and
              salary before approving.
            </p>

            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={submit} loading={submitting} disabled={!form.referrer_id}>Submit Registration</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
