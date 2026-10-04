import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi, employeeApi } from '@/services/api'
import { Button, Input, Select } from '@/components/ui/fields'
import { Tabs, Badge, Table } from '@/components/ui/data'
import { PageHeader, LoadingState, PageError } from '@/components/ui/state'
import { Modal } from '@/components/ui/overlay'
import { toast } from 'sonner'
import {
  Settings, IndianRupee, CalendarCheck, Shield, Users, Plus, KeyRound,
  Building2, Sliders, Clock, Lock, Sparkles, CheckCircle2, UserCheck
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

const TABS = [
  { key: 'company', label: 'Company Profile' },
  { key: 'payroll', label: 'Payroll & Statutory Rules' },
  { key: 'attendance', label: 'Attendance Lock' },
  { key: 'leave', label: 'Leave Types' },
  { key: 'shift', label: 'Work Shifts' },
  { key: 'users', label: 'User Roles & Access' },
  { key: 'security', label: 'Security & Password' },
]

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrator',
  hr: 'HR Manager',
  payroll: 'Payroll Officer',
  finance: 'Finance Officer',
  manager: 'Site Manager',
  employee: 'Employee (ESS)',
}

export default function SettingsPage() {
  const { user, hasRole } = useAuth()
  const isAdmin = hasRole('super_admin', 'admin')
  const isSuper = user?.role === 'super_admin'
  const roleOptions = Object.entries(ROLE_LABELS)
    .filter(([key]) => key !== 'super_admin' || isSuper)
    .map(([value, label]) => ({ value, label }))
  const [active, setActive] = useState('company')
  const [showAddUser, setShowAddUser] = useState(false)
  const [showAddLeave, setShowAddLeave] = useState(false)
  const [showAddShift, setShowAddShift] = useState(false)
  const [resetTarget, setResetTarget] = useState<any>(null)
  const [resetPwd, setResetPwd] = useState('')
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'hr', employee_id: '' })
  const [leaveForm, setLeaveForm] = useState({ name: '', code: '', paid_default: true, max_days: '' })
  const [shiftForm, setShiftForm] = useState({ name: '', start_time: '', end_time: '' })
  const [pwForm, setPwForm] = useState({ current: '', newPwd: '' })
  const qc = useQueryClient()

  const empListQ = useQuery({
    queryKey: ['employees', 'options'],
    queryFn: () => employeeApi.list({ status: 'active', page_size: '100', sort: 'name' }),
    enabled: isAdmin,
  })
  const employeeOptions = (empListQ.data?.data || []).map((e: any) => ({ value: String(e.id), label: `${e.employee_code} — ${e.first_name} ${e.last_name}` }))

  const visibleTabs = TABS.filter(t => t.key !== 'users' || isAdmin)

  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['settings'], queryFn: () => settingsApi.get() })
  const s: any = data?.data || {}

  const saveMut = useMutation({
    mutationFn: (d: any) => settingsApi.update(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); toast.success('Settings updated successfully.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Save failed.'),
  })

  const userMut = useMutation({
    mutationFn: (d: any) => settingsApi.addUser(d),
    onSuccess: () => { setShowAddUser(false); setUserForm({ name: '', email: '', password: '', role: 'hr', employee_id: '' }); qc.invalidateQueries({ queryKey: ['settings'] }); toast.success('System user added.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to add user.'),
  })

  const userUpdMut = useMutation({
    mutationFn: ({ id, ...d }: any) => settingsApi.updateUser(id, d),
    onSuccess: (_r: any, v: any) => {
      qc.invalidateQueries({ queryKey: ['settings'] })
      setResetTarget(null); setResetPwd('')
      toast.success(v?.password ? 'Password reset successfully.' : 'User status updated.')
    },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to update user.'),
  })

  const leaveMut = useMutation({
    mutationFn: (d: any) => fetch('/api/settings/leave-types', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('staffsway_token')}` }, body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { setShowAddLeave(false); toast.success('Leave category created.'); qc.invalidateQueries({ queryKey: ['settings'] }) },
    onError: () => toast.error('Failed to create leave category.'),
  })

  const shiftMut = useMutation({
    mutationFn: (d: any) => fetch('/api/settings/shift-types', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('staffsway_token')}` }, body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { setShowAddShift(false); toast.success('Work shift configured.'); qc.invalidateQueries({ queryKey: ['settings'] }) },
    onError: () => toast.error('Failed to configure shift.'),
  })

  const pwMut = useMutation({
    mutationFn: () => settingsApi.changePassword(pwForm.current, pwForm.newPwd),
    onSuccess: () => { setPwForm({ current: '', newPwd: '' }); toast.success('Account password updated.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to update password.'),
  })

  const set = s.settings || {}
  const leaveTypes = s.leave_types || []
  const shiftTypes = s.shift_types || []
  const users = s.users || []

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Settings className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Enterprise &amp; Compliance Configuration</h1>
          </div>
          <p className="text-xs text-slate-500">Statutory rate slabs, corporate identity, user privileges, shift schedules and security policies</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80">
        <Tabs tabs={visibleTabs} active={active} onChange={setActive} />
      </div>

      {/* Main Settings Panel */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6">
        {isLoading ? (
          <div className="p-8"><LoadingState /></div>
        ) : error ? (
          <div className="p-8"><PageError onRetry={() => refetch()} /></div>
        ) : (
          <>
            {/* Company Profile Tab */}
            {active === 'company' && (
              <div className="max-w-3xl space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Corporate Legal Identity</h3>
                  <p className="text-xs text-slate-500">These details appear on salary vouchers, client invoices, and compliance reports.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Registered Entity Name" value={set.company_name || ''} onChange={e => saveMut.mutate({ company_name: e.target.value })} />
                  <Input label="Corporate Tagline" value={set.company_tagline || ''} onChange={e => saveMut.mutate({ company_tagline: e.target.value })} />
                  <div className="col-span-full">
                    <Input label="Registered Office Address" value={set.address || ''} onChange={e => saveMut.mutate({ address: e.target.value })} />
                  </div>
                  <Input label="State Jurisdiction" value={set.state || ''} onChange={e => saveMut.mutate({ state: e.target.value })} />
                  <Input label="PIN Code" value={set.pincode || ''} onChange={e => saveMut.mutate({ pincode: e.target.value })} />
                  <Input label="Corporate Phone" value={set.phone || ''} onChange={e => saveMut.mutate({ phone: e.target.value })} />
                  <Input label="Official Email" type="email" value={set.email || ''} onChange={e => saveMut.mutate({ email: e.target.value })} />
                  <Input label="GSTIN Number" placeholder="15-digit GSTIN" value={set.gstin || ''} onChange={e => saveMut.mutate({ gstin: e.target.value })} />
                  <Input label="Company PAN" placeholder="10-digit PAN" value={set.pan || ''} onChange={e => saveMut.mutate({ pan: e.target.value })} />
                  <Input label="Corporate Identity No. (CIN)" value={set.cin || ''} onChange={e => saveMut.mutate({ cin: e.target.value })} />
                  <Input label="Official Website URL" placeholder="https://..." value={set.website || ''} onChange={e => saveMut.mutate({ website: e.target.value })} />
                </div>
              </div>
            )}

            {/* Payroll & Statutory Rules Tab */}
            {active === 'payroll' && (
              <div className="max-w-4xl space-y-8">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Statutory Computation Parameters</h3>
                  <p className="text-xs text-slate-500">Defines monthly payroll arithmetic, government provident fund ceilings and minimum wage statutes.</p>
                </div>

                {/* Section 1: Salary Basis */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-4">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-indigo-600" /> Wage Calculation Basis
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label="Salary Basis Days (for Encashment)" type="number" value={set.salary_basis_days || 26} onChange={e => saveMut.mutate({ salary_basis_days: Number(e.target.value) })} />
                    <Input label="Fallback Default OT Rate (₹/hr)" type="number" value={set.default_ot_rate || 80} onChange={e => saveMut.mutate({ default_ot_rate: Number(e.target.value) })} />
                  </div>
                  <p className="text-[11px] text-slate-500">Hourly overtime is derived per-employee: (Gross ÷ Month Days ÷ Shift Hours). The default rate acts as fallback when shift hours are unspecified.</p>
                </div>

                {/* Section 2: Statutory Slabs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* PF Box */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-3">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">Employees&apos; Provident Fund (EPF)</span>
                    <Input label="Employee Contribution (%)" type="number" value={set.pf_rate || 12} onChange={e => saveMut.mutate({ pf_rate: Number(e.target.value) })} />
                    <Input label="Monthly PF Deduction Cap (₹)" type="number" value={set.pf_cap || 1800} onChange={e => saveMut.mutate({ pf_cap: Number(e.target.value) })} />
                    <Input label="Statutory Wage Ceiling (₹)" type="number" value={set.pf_eligibility || 15000} onChange={e => saveMut.mutate({ pf_eligibility: Number(e.target.value) })} />
                  </div>

                  {/* ESIC Box */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-3">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">Employee State Insurance (ESIC)</span>
                    <Input label="Employee Contribution (%)" type="number" value={set.esic_rate || 0.75} onChange={e => saveMut.mutate({ esic_rate: Number(e.target.value) })} />
                    <Input label="ESIC Gross Wage Ceiling (₹)" type="number" value={set.esic_eligibility || 21000} onChange={e => saveMut.mutate({ esic_eligibility: Number(e.target.value) })} />
                  </div>

                  {/* PT Box */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-3">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">Professional Tax (PT)</span>
                    <Input label="Monthly PT Amount (₹)" type="number" value={set.professional_tax_amount || 200} onChange={e => saveMut.mutate({ professional_tax_amount: Number(e.target.value) })} />
                    <Input label="Minimum Gross Threshold (₹)" type="number" value={set.professional_tax_min_gross || 10000} onChange={e => saveMut.mutate({ professional_tax_min_gross: Number(e.target.value) })} />
                  </div>

                  {/* LWF & Bonus */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-3">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">LWF, TDS &amp; Statutory Bonus</span>
                    <div className="grid grid-cols-2 gap-2">
                      <Input label="LWF Employee (₹)" type="number" value={set.lwf_employee_amount || 0} onChange={e => saveMut.mutate({ lwf_employee_amount: Number(e.target.value) })} />
                      <Input label="LWF Employer (₹)" type="number" value={set.lwf_employer_amount || 0} onChange={e => saveMut.mutate({ lwf_employer_amount: Number(e.target.value) })} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input label="TDS Rate (%)" type="number" value={set.tds_percent || 0} onChange={e => saveMut.mutate({ tds_percent: Number(e.target.value) })} />
                      <Input label="Statutory Bonus (%)" type="number" value={set.bonus_percent ?? 8.33} onChange={e => saveMut.mutate({ bonus_percent: Number(e.target.value) })} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Attendance Lock Tab */}
            {active === 'attendance' && (
              <div className="max-w-xl space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Attendance Freeze Policy</h3>
                  <p className="text-xs text-slate-500">Prevent retrospective modification of site muster rolls once finalized by supervisors.</p>
                </div>

                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={set.attendance_lock_enabled === 1}
                      onChange={e => saveMut.mutate({ attendance_lock_enabled: e.target.checked })}
                      className="w-5 h-5 rounded accent-indigo-600"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Enable Automated Monthly Attendance Lock</span>
                      <span className="text-[11px] text-slate-500">When enabled, finalized attendance rosters cannot be changed without administrator override.</span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Leave Types Tab */}
            {active === 'leave' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Configured Leave Policies</h3>
                    <p className="text-xs text-slate-500">Manage annual leave quotas, casual leave and statutory maternity/paternity allocations.</p>
                  </div>
                  <Button size="sm" onClick={() => setShowAddLeave(true)}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Leave Category
                  </Button>
                </div>

                <Table
                  columns={[
                    { key: 'name', header: 'Leave Category Name', render: (r: any) => <span className="font-bold text-slate-900 text-xs">{r.name}</span> },
                    { key: 'code', header: 'Category Code', render: (r: any) => <span className="font-mono text-xs font-semibold text-indigo-600">{r.code}</span> },
                    { key: 'paid', header: 'Paid Allowance', render: (r: any) => (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${r.paid_default ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {r.paid_default ? 'Paid Leave' : 'Unpaid (LWP)'}
                      </span>
                    ) },
                    { key: 'max_days', header: 'Annual Entitlement', render: (r: any) => <span className="font-mono text-xs font-bold text-slate-800">{r.max_days ? `${r.max_days} Days / Year` : 'Unlimited'}</span> },
                  ]}
                  data={leaveTypes}
                  keyFn={(r: any) => String(r.id)}
                />

                <Modal open={showAddLeave} onClose={() => setShowAddLeave(false)} title="Create Leave Category" size="sm">
                  <div className="space-y-4 pt-1">
                    <Input label="Leave Category Name" placeholder="e.g. Earned Leave (EL)" value={leaveForm.name} onChange={e => setLeaveForm(f => ({ ...f, name: e.target.value }))} />
                    <Input label="Short Code" placeholder="e.g. EL, CL, SL" value={leaveForm.code} onChange={e => setLeaveForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <input type="checkbox" checked={leaveForm.paid_default} onChange={e => setLeaveForm(f => ({ ...f, paid_default: e.target.checked }))} className="w-4 h-4 rounded accent-indigo-600" />
                      <span>Classified as Paid Leave</span>
                    </label>
                    <Input label="Annual Allowance (Days)" type="number" placeholder="Leave empty for unlimited" value={leaveForm.max_days} onChange={e => setLeaveForm(f => ({ ...f, max_days: e.target.value }))} />
                    <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                      <Button variant="secondary" onClick={() => setShowAddLeave(false)}>Cancel</Button>
                      <Button onClick={() => leaveMut.mutate(leaveForm)}>Create Category</Button>
                    </div>
                  </div>
                </Modal>
              </div>
            )}

            {/* Work Shifts Tab */}
            {active === 'shift' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Work Shift Configurations</h3>
                    <p className="text-xs text-slate-500">Configure standard operating shift timings for deployments and muster roll rosters.</p>
                  </div>
                  <Button size="sm" onClick={() => setShowAddShift(true)}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Shift Timing
                  </Button>
                </div>

                <Table
                  columns={[
                    { key: 'name', header: 'Shift Name', render: (r: any) => <span className="font-bold text-slate-900 text-xs">{r.name}</span> },
                    { key: 'start_time', header: 'Shift Start Time', render: (r: any) => <span className="font-mono text-xs font-semibold text-slate-700">{r.start_time || '09:00'}</span> },
                    { key: 'end_time', header: 'Shift End Time', render: (r: any) => <span className="font-mono text-xs font-semibold text-slate-700">{r.end_time || '18:00'}</span> },
                  ]}
                  data={shiftTypes}
                  keyFn={(r: any) => String(r.id)}
                />

                <Modal open={showAddShift} onClose={() => setShowAddShift(false)} title="Configure Shift" size="sm">
                  <div className="space-y-4 pt-1">
                    <Input label="Shift Label" placeholder="e.g. Night Shift B" value={shiftForm.name} onChange={e => setShiftForm(f => ({ ...f, name: e.target.value }))} />
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Start Time" type="time" value={shiftForm.start_time} onChange={e => setShiftForm(f => ({ ...f, start_time: e.target.value }))} />
                      <Input label="End Time" type="time" value={shiftForm.end_time} onChange={e => setShiftForm(f => ({ ...f, end_time: e.target.value }))} />
                    </div>
                    <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                      <Button variant="secondary" onClick={() => setShowAddShift(false)}>Cancel</Button>
                      <Button onClick={() => shiftMut.mutate(shiftForm)}>Save Shift</Button>
                    </div>
                  </div>
                </Modal>
              </div>
            )}

            {/* User Roles & Access Tab */}
            {active === 'users' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">System Users &amp; Role Permissions</h3>
                    <p className="text-xs text-slate-500">Manage administrator logins, supervisor roles and employee portal linkages.</p>
                  </div>
                  <Button size="sm" onClick={() => setShowAddUser(true)}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add System User
                  </Button>
                </div>

                <Table
                  columns={[
                    { key: 'name', header: 'User Name', render: (r: any) => (
                      <div>
                        <span className="text-xs font-bold text-slate-900">{r.name}</span>
                        {r.id === user?.id && <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700">You</span>}
                      </div>
                    ) },
                    { key: 'email', header: 'Login Email', render: (r: any) => <span className="text-xs text-slate-600">{r.email}</span> },
                    { key: 'role', header: 'Assigned Role', render: (r: any) => (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                        {ROLE_LABELS[r.role] || r.role}
                      </span>
                    ) },
                    { key: 'employee', header: 'Linked Staff Profile', render: (r: any) => r.role === 'employee' ? (
                      r.employee_name ? <span className="text-xs text-slate-800 font-medium">{r.employee_name} <span className="text-slate-400 font-mono font-normal">(#{r.employee_id})</span></span> : <span className="text-xs text-rose-600 font-semibold">Unlinked</span>
                    ) : <span className="text-slate-400 text-xs">—</span> },
                    { key: 'status', header: 'Status', render: (r: any) => (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${r.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {r.status}
                      </span>
                    ) },
                    {
                      key: 'actions',
                      header: '',
                      render: (r: any) => (
                        <div className="flex items-center gap-1.5 justify-end">
                          <button
                            disabled={r.id === user?.id}
                            onClick={() => userUpdMut.mutate({ id: r.id, status: r.status === 'active' ? 'inactive' : 'active' })}
                            className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-40"
                          >
                            {r.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => setResetTarget(r)}
                            className="px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <KeyRound className="w-3.5 h-3.5" /> Reset Key
                          </button>
                        </div>
                      ),
                    },
                  ]}
                  data={users}
                  keyFn={(r: any) => String(r.id)}
                />

                <Modal open={showAddUser} onClose={() => setShowAddUser(false)} title="Create System User" size="sm">
                  <div className="space-y-4 pt-1">
                    <Input label="Full Name" placeholder="e.g. Anand Kumar" value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} />
                    <Input label="Email Address" type="email" placeholder="user@domain.com" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} />
                    <Input label="Initial Password (min 8 characters)" type="password" value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} />
                    <Select label="Role Level" options={roleOptions} value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))} />
                    {userForm.role === 'employee' && (
                      <Select
                        label="Link to Employee Profile"
                        options={[{ value: '', label: 'Select employee profile...' }, ...employeeOptions]}
                        value={userForm.employee_id}
                        onChange={e => setUserForm(f => ({ ...f, employee_id: e.target.value }))}
                      />
                    )}
                    <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                      <Button variant="secondary" onClick={() => setShowAddUser(false)}>Cancel</Button>
                      <Button
                        loading={userMut.isPending}
                        onClick={() => {
                          if (userForm.role === 'employee' && !userForm.employee_id) { toast.error('Employee logins must link to an active employee record.'); return }
                          userMut.mutate({ ...userForm, employee_id: userForm.employee_id ? Number(userForm.employee_id) : null })
                        }}
                      >Create User</Button>
                    </div>
                  </div>
                </Modal>

                <Modal open={!!resetTarget} onClose={() => setResetTarget(null)} title={`Reset Password — ${resetTarget?.name || ''}`} size="sm">
                  <div className="space-y-4 pt-1">
                    <p className="text-xs text-slate-500">Provide a new password for {resetTarget?.email}.</p>
                    <Input label="New Password (min 8 characters)" type="password" value={resetPwd} onChange={e => setResetPwd(e.target.value)} />
                    <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                      <Button variant="secondary" onClick={() => setResetTarget(null)}>Cancel</Button>
                      <Button loading={userUpdMut.isPending} onClick={() => { if (resetPwd.length >= 8 && resetTarget) userUpdMut.mutate({ id: resetTarget.id, password: resetPwd }); else toast.error('Password must be at least 8 characters.') }}>Reset Password</Button>
                    </div>
                  </div>
                </Modal>
              </div>
            )}

            {/* Security & Password Tab */}
            {active === 'security' && (
              <div className="max-w-md space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Change Account Password</h3>
                  <p className="text-xs text-slate-500">Update your current administrator login password.</p>
                </div>

                <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200/80">
                  <Input label="Current Password" type="password" value={pwForm.current} onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} />
                  <Input label="New Password (min 8 characters)" type="password" value={pwForm.newPwd} onChange={e => setPwForm(f => ({ ...f, newPwd: e.target.value }))} />
                  <div className="pt-2">
                    <Button onClick={() => pwMut.mutate()} loading={pwMut.isPending} className="w-full">
                      <Lock className="w-4 h-4 mr-1.5" /> Update My Password
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
