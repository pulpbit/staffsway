import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'
import { Eye, EyeOff, ShieldCheck, UserRound } from 'lucide-react'

type Mode = 'staff' | 'employee'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('staff')
  const [email, setEmail] = useState('admin@staffsway.in')
  const [password, setPassword] = useState('Demo@123')
  const [username, setUsername] = useState('')
  const [empPwd, setEmpPwd] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login, loginEmployee } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'staff') {
        await login(email, password)
      } else {
        await loginEmployee(username.trim().toUpperCase(), empPwd.trim())
      }
      navigate('/')
    } catch (err: any) {
      toast.error(err?.error?.message || 'Invalid credentials.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'w-full h-9 px-2.5 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink transition-colors'

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy px-4 bg-gradient-to-br from-navy-deep via-navy-mid to-navy-deep">
      <div className="w-full max-w-sm">
        <div className="bg-white card-shadow-lg rounded-md p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <img src="/images/logo.png" alt="Logo" className="h-12 w-auto object-contain" />
            <div>
              <h1 className="text-[16px] font-semibold text-ink tracking-[-0.02em]">Staffsway</h1>
              <p className="text-[11px] text-mute">Manpower Staffing &amp; HR Services</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1 p-1 bg-canvas-soft-2 rounded-sm mb-4">
            <button
              type="button"
              onClick={() => setMode('staff')}
              className={`flex items-center justify-center gap-1.5 h-8 text-[12px] font-medium rounded-sm transition-colors ${mode === 'staff' ? 'bg-white text-ink shadow-sm' : 'text-mute hover:text-ink'}`}
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Staff
            </button>
            <button
              type="button"
              onClick={() => setMode('employee')}
              className={`flex items-center justify-center gap-1.5 h-8 text-[12px] font-medium rounded-sm transition-colors ${mode === 'employee' ? 'bg-white text-ink shadow-sm' : 'text-mute hover:text-ink'}`}
            >
              <UserRound className="w-3.5 h-3.5" /> Employee (My Space)
            </button>
          </div>

          {mode === 'staff' ? (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[12px] font-medium text-body mb-1">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} placeholder="admin@staffsway.in" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-body mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={`${inputClass} pr-8`}
                    placeholder="Enter your password"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2 top-1/2 -translate-y-1/2 text-mute hover:text-ink">
                    {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full h-9 bg-gold text-navy text-[13px] font-semibold rounded-sm hover:bg-gold-bright transition-colors disabled:opacity-40">
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[12px] font-medium text-body mb-1">Username (Employee ID)</label>
                <input value={username} onChange={(e) => setUsername(e.target.value.toUpperCase())} required className={inputClass} placeholder="e.g. SW0042" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-body mb-1">Password (Date of Birth)</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    inputMode="numeric"
                    value={empPwd}
                    onChange={(e) => setEmpPwd(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    className={`${inputClass} pr-8`}
                    placeholder="DDMMYY"
                    maxLength={6}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2 top-1/2 -translate-y-1/2 text-mute hover:text-ink">
                    {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] text-mute mt-1">Password is your date of birth in DDMMYY format (e.g. 20-06-1996 = 200696).</p>
              </div>
              <button type="submit" disabled={loading} className="w-full h-9 bg-gold text-navy text-[13px] font-semibold rounded-sm hover:bg-gold-bright transition-colors disabled:opacity-40">
                {loading ? 'Signing in...' : 'Enter My Space'}
              </button>
            </form>
          )}
        </div>
        <p className="text-center text-[11px] text-white/60 mt-4">
          Demo credentials are pre-filled. Use <strong className="text-white/80">admin@staffsway.in</strong> / <strong className="text-white/80">Demo@123</strong>
        </p>
      </div>
    </div>
  )
}