import { createMiddleware } from 'hono/factory'
import type { Env, AuthUser } from '../types'
import { verifyJwt, getSecret } from '../utils/jwt'

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser
  }
}

export const ROLES = ['super_admin', 'admin', 'hr', 'payroll', 'finance', 'manager', 'employee'] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  hr: 'HR',
  payroll: 'Payroll',
  finance: 'Finance',
  manager: 'Manager',
  employee: 'Employee (Self Service)',
}

export const STAFF_ROLES = ['super_admin', 'admin', 'hr', 'payroll', 'finance', 'manager'] as const

export const authMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const header = c.req.header('Authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) {
    return c.json({ error: { code: 'unauthorized', message: 'Authentication required.' } }, 401)
  }
  const user = await verifyJwt(token, getSecret(c.env))
  if (!user) {
    return c.json({ error: { code: 'unauthorized', message: 'Session expired or invalid. Please sign in again.' } }, 401)
  }
  c.set('user', user)
  await next()
})

export function requireRole(...allowed: readonly Role[]) {
  return createMiddleware<{ Bindings: Env }>(async (c, next) => {
    const user = c.get('user')
    if (!user || !allowed.includes(user.role as Role)) {
      return c.json({ error: { code: 'forbidden', message: 'You do not have permission to perform this action.' } }, 403)
    }
    await next()
  })
}
