import { createMiddleware } from 'hono/factory'
import type { Env, AuthUser } from '../types'
import { verifyToken, getSecret } from '../utils/token'

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser
  }
}

export const authMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const header = c.req.header('Authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) {
    return c.json({ error: { code: 'unauthorized', message: 'Authentication required.' } }, 401)
  }
  const user = await verifyToken(token, getSecret(c.env))
  if (!user) {
    return c.json({ error: { code: 'unauthorized', message: 'Session expired or invalid. Please sign in again.' } }, 401)
  }
  c.set('user', user)
  await next()
})
