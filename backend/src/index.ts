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
import { slipRoutes } from './routes/slips'
import { reportRoutes } from './routes/reports'
import { settingsRoutes } from './routes/settings'
import { authMiddleware } from './middleware/auth'

const app = new Hono<{ Bindings: Env }>()

app.use('/api/*', cors({ origin: '*', allowHeaders: ['Content-Type', 'Authorization'], allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] }))

app.get('/api/health', (c) => c.json({ data: { status: 'ok' } }))

// Public routes
app.route('/api/auth', authRoutes)

// Everything else requires auth
app.use('/api/*', authMiddleware)
app.route('/api/dashboard', dashboardRoutes)
app.route('/api/employees', employeeRoutes)
app.route('/api/clients', clientRoutes)
app.route('/api/sites', siteRoutes)
app.route('/api/attendance', attendanceRoutes)
app.route('/api/payroll', payrollRoutes)
app.route('/api/slips', slipRoutes)
app.route('/api/reports', reportRoutes)
app.route('/api/settings', settingsRoutes)

// 404 for unknown API routes
app.all('/api/*', (c) => c.json({ error: { code: 'not_found', message: 'API route not found.' } }, 404))

// Global error handler
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: { code: 'internal_error', message: 'Something went wrong. Please try again.' } }, 500)
})

app.notFound((c) => c.json({ error: { code: 'not_found', message: 'Not found.' } }, 404))

export default app
