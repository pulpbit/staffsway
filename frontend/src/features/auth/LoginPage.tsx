import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('admin@staffsway.in')
  const [password, setPassword] = useState('Demo@123')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err: any) {
      toast.error(err?.error?.message || 'Invalid credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy px-4 bg-gradient-to-br from-navy-deep via-navy-mid to-navy-deep">
      <div className="w-full max-w-sm">
        <div className="bg-white card-shadow-lg rounded-md p-6">
          <div className="flex items-center gap-2.5 mb-6">
            <img src="/images/logo.png" alt="Logo" className="w-9 h-9 rounded-xs" />
            <div>
              <h1 className="text-[16px] font-semibold text-ink tracking-[-0.02em]">Staffsway</h1>
              <p className="text-[11px] text-mute">Manpower Staffing &amp; HR Services</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[12px] font-medium text-body mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-9 px-2.5 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink transition-colors"
                placeholder="admin@staffsway.in"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-body mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full h-9 px-2.5 pr-8 text-[13px] bg-white border border-hairline rounded-sm outline-none focus:border-ink transition-colors"
                  placeholder="Enter your password"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2 top-1/2 -translate-y-1/2 text-mute hover:text-ink">
                  {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-9 bg-gold text-navy text-[13px] font-semibold rounded-sm hover:bg-gold-bright transition-colors disabled:opacity-40"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
        <p className="text-center text-[11px] text-white/60 mt-4">
          Demo credentials are pre-filled. Use <strong className="text-white/80">admin@staffsway.in</strong> / <strong className="text-white/80">Demo@123</strong>
        </p>
      </div>
    </div>
  )
}
