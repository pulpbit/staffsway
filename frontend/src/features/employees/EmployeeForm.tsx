import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { employeeApi, clientApi, siteApi } from '@/services/api'
import { Button, Input, Select, Textarea } from '@/components/ui/fields'
import { LoadingState } from '@/components/ui/state'
import { toast } from 'sonner'

interface Props {
  employeeId: number | null
  onClose: () => void
  onSaved: () => void
}

export default function EmployeeForm({ employeeId, onClose, onSaved }: Props) {
  const isEdit = !!employeeId
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<Record<string, any>>({
    first_name: '', last_name: '', gender: 'Male', dob: '', mobile: '', email: '',
    address: '', city: '', state: '', pincode: '',
    bank_name: '', bank_account: '', bank_ifsc: '', pan: '', uan: '',
    joining_date: new Date().toISOString().slice(0, 10), designation: '', department: '',
    employee_type: 'permanent', shift_type: 'General', site_id: '', status: 'active',
    salary: { basic: 0, hra: 0, conveyance: 0, other_allowance: 0, overtime_rate: 0, pf_applicable: true, esic_applicable: true, other_deduction: 0 },
  })

  const { data: emp, isLoading: empLoading } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => employeeApi.get(employeeId!),
    enabled: isEdit,
  })

  const { data: clients } = useQuery({ queryKey: ['clients-select'], queryFn: () => clientApi.list() })
  const { data: allSitesRes } = useQuery({ queryKey: ['sites-select'], queryFn: () => siteApi.list() })
  const allSites = (allSitesRes?.data || []) as any[]

  useEffect(() => {
    if (emp?.data) {
      const e: any = emp.data
      const s = e.salary || {}
      setForm({
        first_name: e.first_name || '', last_name: e.last_name || '', gender: e.gender || 'Male', dob: e.dob || '', mobile: e.mobile || '', email: e.email || '',
        address: e.address || '', city: e.city || '', state: e.state || '', pincode: e.pincode || '',
        bank_name: e.bank_name || '', bank_account: e.bank_account || '', bank_ifsc: e.bank_ifsc || '', pan: e.pan || '', uan: e.uan || '',
        joining_date: e.joining_date || '', designation: e.designation || '', department: e.department || '',
        employee_type: e.employee_type || 'permanent', shift_type: e.shift_type || 'General', site_id: e.site_id ?? '', status: e.status || 'active',
        salary: { basic: s.basic || 0, hra: s.hra || 0, conveyance: s.conveyance || 0, other_allowance: s.other_allowance || 0, overtime_rate: s.overtime_rate || 0, pf_applicable: s.pf_applicable !== 0, esic_applicable: s.esic_applicable !== 0, other_deduction: s.other_deduction || 0 },
      })
    }
  }, [emp])

  const update = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }))

  const sites = allSites.filter((s: any) => !form.site_id || true)

  const handleSubmit = async () => {
    if (!form.first_name || !form.last_name) { toast.error('First and last name are required.'); return }
    setLoading(true)
    try {
      const payload = { ...form, site_id: form.site_id ? Number(form.site_id) : null }
      if (isEdit) await employeeApi.update(employeeId!, payload)
      else await employeeApi.create(payload)
      onSaved()
    } catch (err: any) {
      toast.error(err?.error?.message || 'Failed to save employee.')
    } finally {
      setLoading(false)
    }
  }

  if (isEdit && empLoading) return <LoadingState />

  const fieldClass = 'grid grid-cols-3 gap-3'

  return (
    <div className="max-h-[65vh] overflow-y-auto space-y-5">
      <div>
        <h3 className="mono-label mb-2">Personal Information</h3>
        <div className={fieldClass}>
          <Input label="First Name" value={form.first_name} onChange={e => update('first_name', e.target.value)} />
          <Input label="Last Name" value={form.last_name} onChange={e => update('last_name', e.target.value)} />
          <Select label="Gender" options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }, { value: 'Other', label: 'Other' }]} value={form.gender} onChange={e => update('gender', e.target.value)} />
        </div>
        <div className={`${fieldClass} mt-2`}>
          <Input label="Date of Birth" type="date" value={form.dob} onChange={e => update('dob', e.target.value)} />
          <Input label="Mobile" value={form.mobile} onChange={e => update('mobile', e.target.value)} />
          <Input label="Email" type="email" value={form.email} onChange={e => update('email', e.target.value)} />
        </div>
        <div className="mt-2">
          <Input label="Address" value={form.address} onChange={e => update('address', e.target.value)} />
        </div>
        <div className={`${fieldClass} mt-2`}>
          <Input label="City" value={form.city} onChange={e => update('city', e.target.value)} />
          <Input label="State" value={form.state} onChange={e => update('state', e.target.value)} />
          <Input label="Pincode" value={form.pincode} onChange={e => update('pincode', e.target.value)} />
        </div>
      </div>

      <div>
        <h3 className="mono-label mb-2">Employment Information</h3>
        <div className={fieldClass}>
          <Input label="Joining Date" type="date" value={form.joining_date} onChange={e => update('joining_date', e.target.value)} />
          <Input label="Designation" value={form.designation} onChange={e => update('designation', e.target.value)} />
          <Input label="Department" value={form.department} onChange={e => update('department', e.target.value)} />
        </div>
        <div className={`${fieldClass} mt-2`}>
          <Select label="Employee Type" options={[{ value: 'permanent', label: 'Permanent' }, { value: 'contract', label: 'Contract' }, { value: 'temporary', label: 'Temporary' }, { value: 'probation', label: 'Probation' }]} value={form.employee_type} onChange={e => update('employee_type', e.target.value)} />
          <Select label="Shift" options={[{ value: 'General', label: 'General' }, { value: 'Morning', label: 'Morning' }, { value: 'Evening', label: 'Evening' }, { value: 'Night', label: 'Night' }, { value: 'Rotational', label: 'Rotational' }, { value: 'Split', label: 'Split' }]} value={form.shift_type} onChange={e => update('shift_type', e.target.value)} />
          <Select label="Status" options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} value={form.status} onChange={e => update('status', e.target.value)} />
        </div>
        <div className={`${fieldClass} mt-2`}>
          <Select label="Client / Site" options={[{ value: '', label: 'None' }, ...sites.map((s: any) => ({ value: String(s.id), label: `${s.client_name || ''} — ${s.name}` }))]} value={form.site_id !== null ? String(form.site_id) : ''} onChange={e => update('site_id', e.target.value)} />
        </div>
      </div>

      <div>
        <h3 className="mono-label mb-2">Bank & Documents</h3>
        <div className={fieldClass}>
          <Input label="Bank Name" value={form.bank_name} onChange={e => update('bank_name', e.target.value)} />
          <Input label="Account No." value={form.bank_account} onChange={e => update('bank_account', e.target.value)} />
          <Input label="IFSC" value={form.bank_ifsc} onChange={e => update('bank_ifsc', e.target.value)} />
        </div>
        <div className={`${fieldClass} mt-2`}>
          <Input label="PAN" value={form.pan} onChange={e => update('pan', e.target.value)} />
          <Input label="UAN" value={form.uan} onChange={e => update('uan', e.target.value)} />
        </div>
      </div>

      <div>
        <h3 className="mono-label mb-2">Salary Structure</h3>
        <div className={fieldClass}>
          <Input label="Basic" type="number" value={form.salary.basic} onChange={e => update('salary', { ...form.salary, basic: Number(e.target.value) })} />
          <Input label="HRA" type="number" value={form.salary.hra} onChange={e => update('salary', { ...form.salary, hra: Number(e.target.value) })} />
          <Input label="Conveyance" type="number" value={form.salary.conveyance} onChange={e => update('salary', { ...form.salary, conveyance: Number(e.target.value) })} />
        </div>
        <div className={`${fieldClass} mt-2`}>
          <Input label="Other Allowance" type="number" value={form.salary.other_allowance} onChange={e => update('salary', { ...form.salary, other_allowance: Number(e.target.value) })} />
          <Input label="OT Rate (per hour)" type="number" value={form.salary.overtime_rate} onChange={e => update('salary', { ...form.salary, overtime_rate: Number(e.target.value) })} />
          <Input label="Other Deduction" type="number" value={form.salary.other_deduction} onChange={e => update('salary', { ...form.salary, other_deduction: Number(e.target.value) })} />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-hairline sticky bottom-0 bg-white py-3">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} loading={loading}>{isEdit ? 'Update Employee' : 'Add Employee'}</Button>
      </div>
    </div>
  )
}
