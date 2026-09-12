import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi, employeeApi } from '@/services/api'
import { Button, Input, Select } from '@/components/ui/fields'
import { Tabs, Badge, Table } from '@/components/ui/data'
import { PageHeader, LoadingState, PageError } from '@/components/ui/state'
import { Modal } from '@/components/ui/overlay'
import { toast } from 'sonner'
import { Settings, IndianRupee, CalendarCheck, Shield, Users, Plus, Sun } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

const TABS = [
  { key: 'company', label: 'Company' },
  { key: 'payroll', label: 'Payroll Config' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'leave', label: 'Leave Types' },
  { key: 'shift', label: 'Shift Types' },
  { key: 'users', label: 'Users' },
  { key: 'security', label: 'Password' },
]

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  hr: 'HR',
  payroll: 'Payroll',
  finance: 'Finance',
  manager: 'Manager',
  employee: 'Employee (Self Service)',
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); toast.success('Settings saved.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Save failed.'),
  })

  const userMut = useMutation({
    mutationFn: (d: any) => settingsApi.addUser(d),
    onSuccess: () => { setShowAddUser(false); setUserForm({ name: '', email: '', password: '', role: 'hr', employee_id: '' }); qc.invalidateQueries({ queryKey: ['settings'] }); toast.success('User added.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to add user.'),
  })

  const userUpdMut = useMutation({
    mutationFn: ({ id, ...d }: any) => settingsApi.updateUser(id, d),
    onSuccess: (_r: any, v: any) => {
      qc.invalidateQueries({ queryKey: ['settings'] })
      setResetTarget(null); setResetPwd('')
      toast.success(v?.password ? 'Password reset.' : 'User updated.')
    },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to update user.'),
  })

  const leaveMut = useMutation({
    mutationFn: (d: any) => fetch('/api/settings/leave-types', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('staffsway_token')}` }, body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { setShowAddLeave(false); toast.success('Leave type added.'); qc.invalidateQueries({ queryKey: ['settings'] }) },
    onError: () => toast.error('Failed.'),
  })

  const shiftMut = useMutation({
    mutationFn: (d: any) => fetch('/api/settings/shift-types', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('staffsway_token')}` }, body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { setShowAddShift(false); toast.success('Shift type added.'); qc.invalidateQueries({ queryKey: ['settings'] }) },
    onError: () => toast.error('Failed.'),
  })

  const pwMut = useMutation({
    mutationFn: () => settingsApi.changePassword(pwForm.current, pwForm.newPwd),
    onSuccess: () => { setPwForm({ current: '', newPwd: '' }); toast.success('Password updated.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })

  const set = s.settings || {}
  const leaveTypes = s.leave_types || []
  const shiftTypes = s.shift_types || []
  const users = s.users || []

  return (
    <div>
      <PageHeader title="Settings" subtitle="Configure your company and payroll settings" />
      <Tabs tabs={visibleTabs} active={active} onChange={setActive} />

      <div className="bg-white card-shadow rounded-md p-5 mt-3">
        {isLoading ? <LoadingState /> : error ? <PageError onRetry={() => refetch()} /> : (
          <>
            {active === 'company' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl">
                <Input label="Company Name" value={set.company_name || ''} onChange={e => saveMut.mutate({ company_name: e.target.value })} />
                <Input label="Tagline" value={set.company_tagline || ''} onChange={e => saveMut.mutate({ company_tagline: e.target.value })} />
                <Input label="Address" value={set.address || ''} onChange={e => saveMut.mutate({ address: e.target.value })} />
                <Input label="State" value={set.state || ''} onChange={e => saveMut.mutate({ state: e.target.value })} />
                <Input label="Pincode" value={set.pincode || ''} onChange={e => saveMut.mutate({ pincode: e.target.value })} />
                <Input label="Phone" value={set.phone || ''} onChange={e => saveMut.mutate({ phone: e.target.value })} />
                <Input label="Email" value={set.email || ''} onChange={e => saveMut.mutate({ email: e.target.value })} />
                <Input label="GSTIN" value={set.gstin || ''} onChange={e => saveMut.mutate({ gstin: e.target.value })} />
                <Input label="PAN" value={set.pan || ''} onChange={e => saveMut.mutate({ pan: e.target.value })} />
                <Input label="CIN" value={set.cin || ''} onChange={e => saveMut.mutate({ cin: e.target.value })} />
                <Input label="Website" value={set.website || ''} onChange={e => saveMut.mutate({ website: e.target.value })} />
              </div>
            )}

            {active === 'payroll' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-xl">
                <h3 className="mono-label col-span-full">Salary Calculation Basis</h3>
                <Input label="Salary Basis Days" type="number" value={set.salary_basis_days || 26} onChange={e => saveMut.mutate({ salary_basis_days: Number(e.target.value) })} />
                <Input label="Default OT Rate (₹/hr)" type="number" value={set.default_ot_rate || 80} onChange={e => saveMut.mutate({ default_ot_rate: Number(e.target.value) })} />
                <div />
                <h3 className="mono-label col-span-full mt-4">Provident Fund (PF)</h3>
                <Input label="PF Rate (%)" type="number" value={set.pf_rate || 12} onChange={e => saveMut.mutate({ pf_rate: Number(e.target.value) })} />
                <Input label="PF Cap (₹)" type="number" value={set.pf_cap || 1800} onChange={e => saveMut.mutate({ pf_cap: Number(e.target.value) })} />
                <Input label="PF Eligibility (₹)" type="number" value={set.pf_eligibility || 15000} onChange={e => saveMut.mutate({ pf_eligibility: Number(e.target.value) })} />
                <h3 className="mono-label col-span-full mt-4">ESIC</h3>
                <Input label="ESIC Rate (%)" type="number" value={set.esic_rate || 0.75} onChange={e => saveMut.mutate({ esic_rate: Number(e.target.value) })} />
                <Input label="ESIC Eligibility (₹)" type="number" value={set.esic_eligibility || 21000} onChange={e => saveMut.mutate({ esic_eligibility: Number(e.target.value) })} />
                <div />
                <h3 className="mono-label col-span-full mt-4">Professional Tax</h3>
                <Input label="PT Amount (₹)" type="number" value={set.professional_tax_amount || 200} onChange={e => saveMut.mutate({ professional_tax_amount: Number(e.target.value) })} />
                <Input label="PT Min Gross (₹)" type="number" value={set.professional_tax_min_gross || 10000} onChange={e => saveMut.mutate({ professional_tax_min_gross: Number(e.target.value) })} />
                <div />
                <h3 className="mono-label col-span-full mt-4">LWF & TDS</h3>
                <Input label="LWF Employee (₹/month, flat)" type="number" value={set.lwf_employee_amount || 0} onChange={e => saveMut.mutate({ lwf_employee_amount: Number(e.target.value) })} />
                <Input label="LWF Employer (₹/month, flat)" type="number" value={set.lwf_employer_amount || 0} onChange={e => saveMut.mutate({ lwf_employer_amount: Number(e.target.value) })} />
                <Input label="TDS (% of gross)" type="number" value={set.tds_percent || 0} onChange={e => saveMut.mutate({ tds_percent: Number(e.target.value) })} />
                <div />
                <h3 className="mono-label col-span-full mt-4">Statutory Compliance</h3>
                <Input label="State (LWF / Min Wages)" value={set.state_name || 'Haryana'} onChange={e => saveMut.mutate({ state_name: e.target.value })} />
                <Input label="Bonus % (statutory min)" type="number" value={set.bonus_percent ?? 8.33} onChange={e => saveMut.mutate({ bonus_percent: Number(e.target.value) })} />
                <Input label="Bonus Wage Ceiling (₹/month)" type="number" value={set.bonus_wage_ceiling || 21000} onChange={e => saveMut.mutate({ bonus_wage_ceiling: Number(e.target.value) })} />
                <div />
                <p className="text-[11px] text-mute col-span-full mt-2">These values affect payroll calculations. LWF/TDS only apply to employees flagged as applicable. Changes apply to future payroll generation only.</p>
              </div>
            )}

            {active === 'attendance' && (
              <div className="max-w-sm">
                <div className="flex items-center gap-3 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={set.attendance_lock_enabled === 1} onChange={e => saveMut.mutate({ attendance_lock_enabled: e.target.checked })} className="w-4 h-4 rounded border-hairline accent-ink" />
                    <span className="text-[13px] text-body">Enable attendance locking</span>
                  </label>
                </div>
                <p className="text-[12px] text-mute">When enabled, finalized attendance records cannot be edited until unlocked.</p>
              </div>
            )}

            {active === 'leave' && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-[13px] font-semibold text-ink">Leave Types</h3>
                  <Button variant="secondary" onClick={() => setShowAddLeave(true)} size="sm"><Plus className="w-3 h-3" /> Add</Button>
                </div>
                <Table
                  columns={[
                    { key: 'name', header: 'Name' },
                    { key: 'code', header: 'Code', className: 'font-mono text-[12px]' },
                    { key: 'paid', header: 'Paid', render: (r: any) => <Badge className={r.paid_default ? 'bg-success-soft text-success' : 'bg-canvas-soft-2 text-mute'}>{r.paid_default ? 'Yes' : 'No'}</Badge> },
                    { key: 'max_days', header: 'Max Days', render: (r: any) => r.max_days || 'Unlimited' },
                  ]}
                  data={leaveTypes}
                  keyFn={(r) => String(r.id)}
                />
                <Modal open={showAddLeave} onClose={() => setShowAddLeave(false)} title="Add Leave Type" size="sm">
                  <div className="space-y-3">
                    <Input label="Name" value={leaveForm.name} onChange={e => setLeaveForm(f => ({ ...f, name: e.target.value }))} />
                    <Input label="Code" value={leaveForm.code} onChange={e => setLeaveForm(f => ({ ...f, code: e.target.value }))} />
                    <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={leaveForm.paid_default} onChange={e => setLeaveForm(f => ({ ...f, paid_default: e.target.checked }))} className="accent-ink" /> Paid by default</label>
                    <Input label="Max Days" type="number" value={leaveForm.max_days} onChange={e => setLeaveForm(f => ({ ...f, max_days: e.target.value }))} />
                    <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setShowAddLeave(false)}>Cancel</Button><Button onClick={() => leaveMut.mutate(leaveForm)}>Add</Button></div>
                  </div>
                </Modal>
              </div>
            )}

            {active === 'shift' && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-[13px] font-semibold text-ink">Shift Types</h3>
                  <Button variant="secondary" onClick={() => setShowAddShift(true)} size="sm"><Plus className="w-3 h-3" /> Add</Button>
                </div>
                <Table
                  columns={[
                    { key: 'name', header: 'Name' },
                    { key: 'start_time', header: 'Start', render: (r: any) => r.start_time || '—' },
                    { key: 'end_time', header: 'End', render: (r: any) => r.end_time || '—' },
                  ]}
                  data={shiftTypes}
                  keyFn={(r) => String(r.id)}
                />
                <Modal open={showAddShift} onClose={() => setShowAddShift(false)} title="Add Shift Type" size="sm">
                  <div className="space-y-3">
                    <Input label="Name" value={shiftForm.name} onChange={e => setShiftForm(f => ({ ...f, name: e.target.value }))} />
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Start Time" type="time" value={shiftForm.start_time} onChange={e => setShiftForm(f => ({ ...f, start_time: e.target.value }))} />
                      <Input label="End Time" type="time" value={shiftForm.end_time} onChange={e => setShiftForm(f => ({ ...f, end_time: e.target.value }))} />
                    </div>
                    <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setShowAddShift(false)}>Cancel</Button><Button onClick={() => shiftMut.mutate(shiftForm)}>Add</Button></div>
                  </div>
                </Modal>
              </div>
            )}

            {active === 'users' && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-[13px] font-semibold text-ink">System Users</h3>
                  <Button variant="secondary" onClick={() => setShowAddUser(true)} size="sm"><Plus className="w-3 h-3" /> Add User</Button>
                </div>
                <Table
                  columns={[
                    { key: 'name', header: 'Name', render: (r: any) => <span className="text-[13px] font-medium text-ink">{r.name}{r.id === user?.id ? ' (you)' : ''}</span> },
                    { key: 'email', header: 'Email' },
                    { key: 'role', header: 'Role', render: (r: any) => <Badge className={r.role === 'super_admin' || r.role === 'admin' ? 'bg-ink text-white' : 'bg-canvas-soft-2 text-body'}>{ROLE_LABELS[r.role] || r.role}</Badge> },
                    { key: 'employee', header: 'Linked Employee', render: (r: any) => r.role === 'employee' ? (r.employee_name ? `${r.employee_name} (#${r.employee_id})` : <Badge className="bg-error-soft text-error">Not linked</Badge>) : <span className="text-mute">—</span> },
                    { key: 'status', header: 'Status', render: (r: any) => <Badge className={r.status === 'active' ? 'bg-success-soft text-success' : 'bg-error-soft text-error'}>{r.status}</Badge> },
                    {
                      key: 'actions',
                      header: '',
                      render: (r: any) => (
                        <div className="flex justify-end gap-1.5">
                          <Button variant="secondary" size="sm" disabled={r.id === user?.id} onClick={() => userUpdMut.mutate({ id: r.id, status: r.status === 'active' ? 'inactive' : 'active' })}>
                            {r.status === 'active' ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => setResetTarget(r)}>Reset Password</Button>
                        </div>
                      ),
                    },
                  ]}
                  data={users}
                  keyFn={(r) => String(r.id)}
                />
                <Modal open={showAddUser} onClose={() => setShowAddUser(false)} title="Add User" size="sm">
                  <div className="space-y-3">
                    <Input label="Name" value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} />
                    <Input label="Email" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} />
                    <Input label="Password (min 8 chars)" type="password" value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} />
                    <Select label="Role" options={roleOptions} value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))} />
                    {userForm.role === 'employee' && (
                      <Select
                        label="Link to Employee Profile"
                        options={[{ value: '', label: '— Select employee —' }, ...employeeOptions]}
                        value={userForm.employee_id}
                        onChange={e => setUserForm(f => ({ ...f, employee_id: e.target.value }))}
                      />
                    )}
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" onClick={() => setShowAddUser(false)}>Cancel</Button>
                      <Button
                        loading={userMut.isPending}
                        onClick={() => {
                          if (userForm.role === 'employee' && !userForm.employee_id) { toast.error('Employee logins must be linked to an employee profile.'); return }
                          userMut.mutate({ ...userForm, employee_id: userForm.employee_id ? Number(userForm.employee_id) : null })
                        }}
                      >Add</Button>
                    </div>
                  </div>
                </Modal>
                <Modal open={!!resetTarget} onClose={() => setResetTarget(null)} title={`Reset password — ${resetTarget?.name || ''}`} size="sm">
                  <div className="space-y-3">
                    <p className="text-[12px] text-mute">Set a temporary password for {resetTarget?.email}. Share it securely; they should change it after signing in.</p>
                    <Input label="New Password (min 8 chars)" type="password" value={resetPwd} onChange={e => setResetPwd(e.target.value)} />
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" onClick={() => setResetTarget(null)}>Cancel</Button>
                      <Button loading={userUpdMut.isPending} onClick={() => { if (resetPwd.length >= 8 && resetTarget) userUpdMut.mutate({ id: resetTarget.id, password: resetPwd }); else toast.error('Password must be at least 8 characters.') }}>Reset</Button>
                    </div>
                  </div>
                </Modal>
              </div>
            )}

            {active === 'security' && (
              <div className="max-w-sm space-y-3">
                <Input label="Current Password" type="password" value={pwForm.current} onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} />
                <Input label="New Password" type="password" value={pwForm.newPwd} onChange={e => setPwForm(f => ({ ...f, newPwd: e.target.value }))} />
                <Button onClick={() => pwMut.mutate()} loading={pwMut.isPending}>Update Password</Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
