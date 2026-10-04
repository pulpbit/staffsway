import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { publicReferrerApi } from '@/services/api'
import { Button, Input, Select, Textarea, FormSection, FormGrid, Toggle } from '@/components/ui/fields'
import { AadhaarBoxes } from '@/components/ui/AadhaarBoxes'
import { toast } from 'sonner'
import {
  IdCard, User, Phone, MapPin, Landmark, CheckCircle2, AlertTriangle, Briefcase,
  ShieldCheck, Sparkles, Building2, ChevronRight, ArrowLeft
} from 'lucide-react'

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
  const [reference, setReference] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [startedAt] = useState(() => Date.now())
  const [form, setForm] = useState({ ...emptyForm })

  const { data: referrers, isLoading: loadingReferrers, isError: referrersError } = useQuery({
    queryKey: ['public-referrers'],
    queryFn: () => publicReferrerApi.options().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const referrerOptions = useMemo(
    () => [
      { value: '', label: 'Select referrer or agency' },
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
      setErrors((e) => ({ ...e, aadhaar: 'Enter all 12 digits of your Aadhaar number.' }))
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
      toast.error(err?.error?.message || 'Could not verify Aadhaar number. Please try again.')
    } finally {
      setChecking(false)
    }
  }

  const validateEssentials = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.full_name.trim() || form.full_name.trim().length < 2) e.full_name = 'Enter full legal name.'
    if (!/^[0-9+\-\s]{7,15}$/.test(form.mobile.trim())) e.mobile = 'Enter a valid mobile number.'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Enter a valid email address.'
    if (form.pincode && !/^\d{6}$/.test(form.pincode.trim())) e.pincode = 'PIN code must be 6 digits.'
    if (form.pan && !/^[A-Za-z]{5}\d{4}[A-Za-z]$/.test(form.pan.trim())) e.pan = 'Enter a valid 10-digit PAN.'
    if (form.bank_ifsc && !/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(form.bank_ifsc.trim())) e.bank_ifsc = 'Enter a valid 11-digit IFSC.'
    if (form.emergency_contact_phone && !/^[0-9+\-\s]{7,15}$/.test(form.emergency_contact_phone.trim())) {
      e.emergency_contact_phone = 'Enter a valid contact number.'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async () => {
    if (!form.referrer_id) {
      toast.error('Please select the referrer or sourcing agency.')
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
      toast.error(err?.error?.message || 'Could not submit registration.')
    } finally {
      setSubmitting(false)
    }
  }

  const stateOptions = [{ value: '', label: 'Select state' }, ...STATE_OPTIONS.map((s) => ({ value: s, label: s }))]

  if (reference) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Registration Submitted!</h1>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
            <span className="text-xs text-slate-500 block uppercase tracking-wider font-semibold">Application Reference Number</span>
            <span className="text-xl font-mono font-bold text-indigo-600 tracking-wider block mt-1">{reference}</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your profile details have been securely recorded. Our HR Operations team will review your dossier and contact you regarding deployment site, shift schedule, and contract documentation.
          </p>
          <div className="pt-2">
            <Button variant="secondary" onClick={() => window.location.reload()} className="w-full">
              Submit Another Candidate
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold">
            <Building2 className="w-3.5 h-3.5" /> StaffSway Manpower &amp; Staffing
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Staff Registration Portal</h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
            Official candidate intake for verified staff onboarding. Fill in your details below for verification and job deployment.
          </p>
        </div>

        {/* Stepper Wizard */}
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80">
          {(['1. Aadhaar Check', '2. Personal Details', '3. Sourcing & Submit'] as const).map((label, i) => {
            const n = (i + 1) as Step
            const done = step > n
            const active = step === n
            return (
              <div key={label} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                    done
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : active
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                        : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {done ? <CheckCircle2 className="w-4 h-4" /> : n}
                </div>
                <span className={`text-xs font-semibold hidden sm:inline ${active ? 'text-slate-900' : 'text-slate-400'}`}>
                  {label}
                </span>
                {i < 2 && <div className="w-8 sm:w-16 h-0.5 bg-slate-200 mx-1" />}
              </div>
            )
          })}
        </div>

        {/* Step 1: Aadhaar Check */}
        {step === 1 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <IdCard className="w-5 h-5 text-indigo-600" /> Identity Verification
              </h2>
              <p className="text-xs text-slate-500">Enter candidate&apos;s 12-digit Aadhaar number to verify eligibility.</p>
            </div>

            {blocked ? (
              <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/50 space-y-3">
                <p className="flex items-center gap-2 text-xs font-bold text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  {blocked === 'employee' ? 'Candidate Already Active in Database' : 'Registration Pending Review'}
                </p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  {blocked === 'employee'
                    ? 'This Aadhaar number is currently assigned to an active workforce member. For corrections or rejoining, contact your HR supervisor.'
                    : 'A registration submission with this Aadhaar number is currently under review by our onboarding desk.'}
                </p>
                <Button size="sm" variant="secondary" onClick={() => { setBlocked(null); setAadhaar('') }}>
                  Check Another Aadhaar Number
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    12-Digit Aadhaar Number
                  </label>
                  <AadhaarBoxes
                    value={aadhaar}
                    onChange={(d) => { setAadhaar(d); setErrors((e) => ({ ...e, aadhaar: '' })) }}
                    invalid={!!errors.aadhaar}
                  />
                  {errors.aadhaar && <p className="text-xs text-rose-600 mt-1.5 font-medium">{errors.aadhaar}</p>}
                </div>

                <div className="pt-2">
                  <Button onClick={runCheck} loading={checking} disabled={aadhaar.length !== 12} className="w-full sm:w-auto">
                    Verify &amp; Continue <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Full Details */}
        {step === 2 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs">
              <span className="font-semibold text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Aadhaar {aadhaar} Verified
              </span>
              <button type="button" onClick={() => setStep(1)} className="text-xs text-emerald-700 font-bold hover:underline">
                Change Number
              </button>
            </div>

            <div className="space-y-4">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block flex items-center gap-1.5">
                <User className="w-4 h-4 text-indigo-600" /> Personal Particulars
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input label="Full Name (as per Aadhaar)" value={form.full_name} onChange={(e) => update('full_name', e.target.value)} error={errors.full_name} required />
                <Input label="Father's / Guardian's Name" value={form.father_name} onChange={(e) => update('father_name', e.target.value)} />
                <Select label="Gender" options={GENDERS.map((g) => ({ value: g, label: g }))} value={form.gender} onChange={(e) => update('gender', e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input label="Date of Birth" type="date" value={form.dob} onChange={(e) => update('dob', e.target.value)} />
                <Select label="Marital Status" options={MARITAL_STATUSES.map((m) => ({ value: m, label: m }))} value={form.marital_status} onChange={(e) => update('marital_status', e.target.value)} />
                <Input label="Prior Experience (Years)" placeholder="e.g. 2 Years" value={form.experience} onChange={(e) => update('experience', e.target.value)} />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-indigo-600" /> Contact &amp; Emergency Reach
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input label="Primary Mobile" placeholder="10-digit mobile" value={form.mobile} onChange={(e) => update('mobile', e.target.value)} error={errors.mobile} required />
                <Input label="Alternate Mobile" value={form.alternate_mobile} onChange={(e) => update('alternate_mobile', e.target.value)} />
                <Input label="Email Address" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} error={errors.email} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input label="Emergency Contact Name" value={form.emergency_contact_name} onChange={(e) => update('emergency_contact_name', e.target.value)} />
                <Input label="Emergency Contact Phone" value={form.emergency_contact_phone} onChange={(e) => update('emergency_contact_phone', e.target.value)} error={errors.emergency_contact_phone} />
                <Input label="Relationship" placeholder="e.g. Spouse / Brother" value={form.emergency_contact_relation} onChange={(e) => update('emergency_contact_relation', e.target.value)} />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-indigo-600" /> Residential Address
              </span>
              <Textarea label="Present Address" rows={2} value={form.address} onChange={(e) => update('address', e.target.value)} />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Select label="State" options={stateOptions} value={form.state} onChange={(e) => update('state', e.target.value)} />
                <Input label="District / City" value={form.district} onChange={(e) => update('district', e.target.value)} />
                <Input label="PIN Code" value={form.pincode} onChange={(e) => update('pincode', e.target.value)} error={errors.pincode} />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block flex items-center gap-1.5">
                <Landmark className="w-4 h-4 text-indigo-600" /> Bank &amp; Statutory Account Info
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input label="Bank Name" placeholder="e.g. State Bank of India" value={form.bank_name} onChange={(e) => update('bank_name', e.target.value)} />
                <Input label="Account Number" value={form.bank_account} onChange={(e) => update('bank_account', e.target.value)} />
                <Input label="IFSC Code" placeholder="e.g. SBIN0001234" value={form.bank_ifsc} onChange={(e) => update('bank_ifsc', e.target.value)} error={errors.bank_ifsc} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input label="PAN Card" placeholder="10-character PAN" value={form.pan} onChange={(e) => update('pan', e.target.value)} error={errors.pan} />
                <Input label="Universal Account No. (UAN)" value={form.uan} onChange={(e) => update('uan', e.target.value)} />
                <Input label="ESIC IP Number" value={form.esi_number} onChange={(e) => update('esi_number', e.target.value)} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button onClick={() => { if (validateEssentials()) setStep(3) }}>
                Continue to Review <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Sourcing Partner & Submit */}
        {step === 3 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-indigo-600" /> Sourcing Partner / Referrer
              </span>
              <Select
                label="Referred By"
                options={referrerOptions}
                value={form.referrer_id}
                onChange={(e) => update('referrer_id', e.target.value)}
                required
              />
              <p className="text-[11px] text-slate-500">Select the recruitment agency or sourcing contact that referred you.</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3 text-xs">
              <span className="font-bold text-slate-900 uppercase tracking-wider block">Submission Summary</span>
              <div className="grid grid-cols-2 gap-2">
                <p><span className="text-slate-500">Candidate:</span> <span className="font-semibold text-slate-900 ml-1">{form.full_name}</span></p>
                <p><span className="text-slate-500">Aadhaar:</span> <span className="font-mono font-semibold text-slate-800 ml-1">{aadhaar}</span></p>
                <p><span className="text-slate-500">Mobile:</span> <span className="font-semibold text-slate-900 ml-1">{form.mobile}</span></p>
                <p><span className="text-slate-500">Bank:</span> <span className="font-medium text-slate-800 ml-1">{form.bank_name || 'Not provided'}</span></p>
              </div>
            </div>

            <p className="flex items-start gap-2 text-xs text-slate-500 leading-relaxed bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              By submitting, you certify that the provided credentials and Aadhaar identity belong to you. HR will verify documents before issuing onboarding contracts.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Edit Details
              </Button>
              <Button onClick={submit} loading={submitting} disabled={!form.referrer_id}>
                Confirm &amp; Submit Registration
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
