import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'
import {
  Eye,
  EyeOff,
  Shield,
  ShieldCheck,
  User,
  Lock,
  ArrowRight,
  Users,
  CalendarCheck,
  IndianRupee,
  BarChart3,
  Headphones,
  Cloud,
  Sparkles,
  Building2,
  CheckCircle2,
} from 'lucide-react'

type Mode = 'staff' | 'employee'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('staff')
  const [email, setEmail] = useState('admin@staffsway.in')
  const [password, setPassword] = useState('Demo@1992')
  const [username, setUsername] = useState('')
  const [empPwd, setEmpPwd] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
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
      toast.error(err?.error?.message || 'Invalid credentials. Please check your username and password.')
    } finally {
      setLoading(false)
    }
  }

  const fillStaffDemo = () => {
    setMode('staff')
    setEmail('admin@staffsway.in')
    setPassword('Demo@1992')
    toast.info('Staff demo credentials applied')
  }

  const fillEmployeeDemo = () => {
    setMode('employee')
    setUsername('SW0001')
    setEmpPwd('150892')
    toast.info('Employee demo credentials applied (SW0001 / 150892)')
  }

  const features = [
    {
      title: 'Employee Management',
      icon: Users,
      bg: 'bg-blue-500',
      text: 'text-blue-500',
    },
    {
      title: 'Attendance Management',
      icon: CalendarCheck,
      bg: 'bg-emerald-500',
      text: 'text-emerald-500',
    },
    {
      title: 'Payroll Management',
      icon: IndianRupee,
      bg: 'bg-purple-600',
      text: 'text-purple-600',
    },
    {
      title: 'Reports & Analytics',
      icon: BarChart3,
      bg: 'bg-amber-500',
      text: 'text-amber-500',
    },
    {
      title: 'Compliance Management',
      icon: ShieldCheck,
      bg: 'bg-rose-500',
      text: 'text-rose-500',
    },
    {
      title: 'HR Helpdesk',
      icon: Headphones,
      bg: 'bg-sky-500',
      text: 'text-sky-500',
    },
  ]

  const trustBadges = [
    {
      icon: Shield,
      title: 'Data Security',
      desc: 'Your data is safe with us',
    },
    {
      icon: Cloud,
      title: 'Cloud Based',
      desc: 'Access anytime, anywhere',
    },
    {
      icon: Headphones,
      title: '24/7 Support',
      desc: 'We are always here',
    },
    {
      icon: Building2,
      title: 'Trusted by 1000+ Companies',
      desc: 'Across India',
    },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50/40 text-slate-800 antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Top Header Bar matching Reference */}
      <header className="w-full bg-slate-900 text-white px-4 lg:px-12 py-3.5 flex items-center justify-between shadow-md border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <img src="/images/logo.png" alt="StaffSway" className="h-9 w-auto object-contain brightness-110" />
            <div className="leading-tight hidden sm:block">
              <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                StaffSway <span className="text-blue-400 font-semibold text-xs tracking-normal bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/50">HRMS &amp; Payroll</span>
              </span>
              <p className="text-[11px] text-slate-400 font-medium">People &nbsp;|&nbsp; Process &nbsp;|&nbsp; Performance</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-300 font-medium bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700/60 shadow-inner">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Secure &nbsp;•&nbsp; Reliable &nbsp;•&nbsp; Simple</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 flex items-center justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center w-full">
          
          {/* Left Hero Column */}
          <div className="lg:col-span-7 flex flex-col space-y-7">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold mb-3 border border-blue-200/60 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Next-Gen Enterprise Workforce Platform</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                Welcome to <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
                  HRMS &amp; Payroll System
                </span>
              </h1>
              <p className="mt-3 text-sm sm:text-base text-slate-600 font-medium tracking-wide">
                Manage Your People &nbsp;|&nbsp; Simplify Payroll &nbsp;|&nbsp; Build a Better Tomorrow
              </p>
            </div>

            {/* Feature Pills Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {features.map((feat) => {
                const Icon = feat.icon
                return (
                  <div
                    key={feat.title}
                    className="flex items-center gap-3 p-2.5 sm:p-3 bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group"
                  >
                    <div className={`w-9 h-9 rounded-lg ${feat.bg} flex items-center justify-center text-white shadow-sm shrink-0 group-hover:scale-105 transition-transform`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs sm:text-[13px] font-semibold text-slate-800 group-hover:text-blue-900 transition-colors">
                      {feat.title}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Better HR Better Business Banner / Hero illustration area */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-6 text-white shadow-lg flex items-center justify-between">
              <div className="relative z-10 space-y-1.5 max-w-sm">
                <div className="inline-block px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold uppercase tracking-wider backdrop-blur-sm">
                  Smart Solution
                </div>
                <h3 className="text-xl font-bold tracking-tight text-white">Better HR &bull; Better Business</h3>
                <p className="text-xs text-blue-100 leading-relaxed">
                  Automate compliance, biometric attendance, tax deductions, and one-click bank payouts.
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-2 relative z-10">
                <button
                  type="button"
                  onClick={fillStaffDemo}
                  className="px-3.5 py-2 bg-white text-blue-700 hover:bg-blue-50 text-xs font-bold rounded-lg shadow transition-all cursor-pointer"
                >
                  Staff Demo
                </button>
                <button
                  type="button"
                  onClick={fillEmployeeDemo}
                  className="px-3.5 py-2 bg-blue-950/60 hover:bg-blue-950/80 text-white text-xs font-bold rounded-lg border border-white/20 transition-all cursor-pointer"
                >
                  My Space Demo
                </button>
              </div>
              {/* Decorative background glow */}
              <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            </div>
          </div>

          {/* Right Floating Login Card */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-7 sm:p-9 relative">
              
              {/* Header inside card */}
              <div className="text-center mb-6">
                <div className="w-13 h-13 mx-auto rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-inner mb-3">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Login to Your Account</h2>
                <p className="text-xs sm:text-[13px] text-slate-500 mt-1">
                  Enter your credentials to access the HRMS &amp; Payroll system
                </p>
              </div>

              {/* Portal Mode Switcher */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100/90 rounded-xl mb-6 border border-slate-200/70">
                <button
                  type="button"
                  onClick={() => setMode('staff')}
                  className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    mode === 'staff'
                      ? 'bg-white text-blue-700 shadow-sm border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Admin / Staff</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('employee')}
                  className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    mode === 'employee'
                      ? 'bg-white text-blue-700 shadow-sm border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Employee (My Space)</span>
                </button>
              </div>

              {/* Staff Form */}
              {mode === 'staff' ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                      User ID / Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="admin@staffsway.in"
                        className="w-full h-11 pl-10 pr-3.5 text-sm bg-slate-50/50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Password
                      </label>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="Enter your password"
                        className="w-full h-11 pl-10 pr-10 text-sm bg-slate-50/50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(!showPw)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                        aria-label="Toggle password visibility"
                      >
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>Remember Me</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => toast.info('Please contact your HR administrator to reset your password.')}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <span>Signing in...</span>
                    ) : (
                      <>
                        <span>Login</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Employee (My Space) Form */
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Username (Employee ID)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toUpperCase())}
                        required
                        placeholder="e.g. SW0001"
                        className="w-full h-11 pl-10 pr-3.5 text-sm uppercase bg-slate-50/50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition-all font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Password (Date of Birth)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPw ? 'text' : 'password'}
                        inputMode="numeric"
                        value={empPwd}
                        onChange={(e) => setEmpPwd(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        required
                        placeholder="DDMMYY (e.g. 150892)"
                        maxLength={6}
                        className="w-full h-11 pl-10 pr-10 text-sm bg-slate-50/50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(!showPw)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                        aria-label="Toggle password visibility"
                      >
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      Password is your date of birth in <strong>DDMMYY</strong> format (e.g. 15 Aug 1992 = 150892).
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 mt-2"
                  >
                    {loading ? (
                      <span>Signing in...</span>
                    ) : (
                      <>
                        <span>Enter My Space</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* OR Divider */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase font-bold text-slate-400">
                  <span className="bg-white px-3">OR</span>
                </div>
              </div>

              {/* Secondary Demo Quick Access / Google-styled button */}
              <button
                type="button"
                onClick={mode === 'staff' ? fillStaffDemo : fillEmployeeDemo}
                className="w-full h-10 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>Auto-fill Demo Credentials</span>
              </button>

              <p className="text-center text-xs text-slate-500 mt-6">
                Not a member?{' '}
                <button
                  type="button"
                  onClick={() => toast.info('Please reach out to your HR / Admin department for access.')}
                  className="font-semibold text-blue-600 hover:underline cursor-pointer"
                >
                  Contact your administrator
                </button>
              </p>
            </div>
          </div>

        </div>
      </main>

      {/* Bottom Trust & Security Bar matching Reference */}
      <footer className="w-full bg-white border-t border-slate-200/80 py-5 px-4 sm:px-8 mt-auto">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {trustBadges.map((badge) => {
            const Icon = badge.icon
            return (
              <div key={badge.title} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="leading-tight">
                  <h4 className="text-xs sm:text-[13px] font-bold text-slate-800">{badge.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">{badge.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </footer>
    </div>
  )
}