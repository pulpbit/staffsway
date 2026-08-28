import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env } from './types'
import { authRoutes } from './routes/auth'
import { dashboardRoutes } from './routes/dashboard'
import { employeeRoutes } from './routes/employees'
import { clientRoutes } from './routes/clients'
import { siteRoutes } from './routes/sites'
import { attendanceRoutes } from './routes/attendance'
import { payrollRoutes } from './routes/payroll'
import { advanceRoutes } from './routes/advances'
import { recruitmentRoutes } from './routes/recruitment'
import { leaveRoutes } from './routes/leaves'
import { slipRoutes } from './routes/slips'
import { reportRoutes } from './routes/reports'
import { settingsRoutes } from './routes/settings'
import { statutoryRoutes } from './routes/statutory'
import { essRoutes } from './routes/ess'
import { performanceRoutes } from './routes/performance'
import { assetRoutes } from './routes/assets'
import { trainingRoutes } from './routes/training'
import { separationRoutes } from './routes/separation'
import { helpdeskRoutes } from './routes/helpdesk'
import { authMiddleware, requireRole } from './middleware/auth'

const app = new Hono<{ Bindings: Env }>()

app.use('/api/*', cors({ origin: '*', allowHeaders: ['Content-Type', 'Authorization'], allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] }))

app.get('/api/health', (c) => c.json({ data: { status: 'ok' } }))

// Public routes
app.route('/api/auth', authRoutes)

// Everything else requires auth
app.use('/api/*', authMiddleware)

// Role-based write guards. Reads stay open to any authenticated staff user;
// writes are restricted per module. Registered before the routers mount.
const MASTERDATA_WRITE = ['super_admin', 'admin', 'hr'] as const
const ATTENDANCE_WRITE = ['super_admin', 'admin', 'hr', 'payroll'] as const
const PAYROLL_WRITE = ['super_admin', 'admin', 'payroll'] as const
for (const base of ['/api/employees', '/api/clients', '/api/sites']) {
  app.on(['POST', 'PUT', 'PATCH'], [base, `${base}/*`], requireRole(...MASTERDATA_WRITE))
  app.on('DELETE', [base, `${base}/*`], requireRole('super_admin', 'admin'))
}
app.on(['POST', 'PUT', 'PATCH'], ['/api/attendance', '/api/attendance/*'], requireRole(...ATTENDANCE_WRITE))
app.on(['POST', 'PUT', 'PATCH', 'DELETE'], ['/api/payroll', '/api/payroll/*'], requireRole(...PAYROLL_WRITE))
app.on(['POST', 'PUT', 'PATCH', 'DELETE'], ['/api/slips', '/api/slips/*'], requireRole(...PAYROLL_WRITE))
app.on(['POST', 'DELETE'], ['/api/advances', '/api/advances/*'], requireRole(...PAYROLL_WRITE))
for (const base of ['/api/recruitment', '/api/recruitment/*']) {
  app.on(['POST', 'PUT', 'PATCH'], [base], requireRole(...MASTERDATA_WRITE))
  app.on('DELETE', [base], requireRole('super_admin', 'admin'))
}
// Leave: managers may apply/approve the manager step; holidays, comp-off credits
// and encashment are additionally restricted to HR/Admin inside leaves.ts.
// 'employee' role may apply/cancel its own requests (self-scoped in leaves.ts);
// approvals remain manager/hr/admin only (enforced in the approval handler).
const LEAVE_WRITE = ['super_admin', 'admin', 'hr', 'manager', 'employee'] as const
app.on(['POST', 'PUT', 'PATCH', 'DELETE'], ['/api/leaves', '/api/leaves/*'], requireRole(...LEAVE_WRITE))
// Performance: HR/Admin/Manager can write; employees read-only
const PERF_WRITE = ['super_admin', 'admin', 'hr', 'manager'] as const
app.on(['POST', 'PUT', 'PATCH', 'DELETE'], ['/api/performance', '/api/performance/*'], requireRole(...PERF_WRITE))
const ASSET_WRITE = ['super_admin', 'admin', 'hr'] as const
app.on(['POST', 'PUT', 'PATCH', 'DELETE'], ['/api/assets', '/api/assets/*'], requireRole(...ASSET_WRITE))
const TRAINING_WRITE = ['super_admin', 'admin', 'hr'] as const
app.on(['POST', 'PUT', 'PATCH', 'DELETE'], ['/api/training', '/api/training/*'], requireRole(...TRAINING_WRITE))
const SEPARATION_WRITE = ['super_admin', 'admin', 'hr'] as const
app.on(['POST', 'PUT', 'PATCH', 'DELETE'], ['/api/separation', '/api/separation/*'], requireRole(...SEPARATION_WRITE))
const HELPDESK_WRITE = ['super_admin', 'admin', 'hr', 'manager', 'employee'] as const
app.on(['POST', 'PUT', 'PATCH', 'DELETE'], ['/api/helpdesk', '/api/helpdesk/*'], requireRole(...HELPDESK_WRITE))
// Settings writes are guarded inside settingsRoutes so that self-service
// password change (/settings/password) remains available to every role.

app.route('/api/dashboard', dashboardRoutes)
app.route('/api/employees', employeeRoutes)
app.route('/api/clients', clientRoutes)
app.route('/api/sites', siteRoutes)
app.route('/api/attendance', attendanceRoutes)
app.route('/api/payroll', payrollRoutes)
app.route('/api/advances', advanceRoutes)
app.route('/api/recruitment', recruitmentRoutes)
app.route('/api/leaves', leaveRoutes)
app.route('/api/slips', slipRoutes)
app.route('/api/reports', reportRoutes)
app.route('/api/settings', settingsRoutes)
app.route('/api/statutory', statutoryRoutes)
app.route('/api/ess', essRoutes)
app.route('/api/performance', performanceRoutes)
app.route('/api/assets', assetRoutes)
app.route('/api/training', trainingRoutes)
app.route('/api/separation', separationRoutes)
app.route('/api/helpdesk', helpdeskRoutes)

// 404 for unknown API routes
app.all('/api/*', (c) => c.json({ error: { code: 'not_found', message: 'API route not found.' } }, 404))

// Global error handler
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: { code: 'internal_error', message: 'Something went wrong. Please try again.' } }, 500)
})

app.notFound((c) => c.json({ error: { code: 'not_found', message: 'Not found.' } }, 404))

export default app
