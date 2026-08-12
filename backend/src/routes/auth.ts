import { Hono } from 'hono'
import { z } from 'zod'
import type { Env } from '../types'
import { getDb } from '../utils/db'
import { verifyPassword } from '../utils/hash'
import { createToken, getSecret } from '../utils/token'
import { authMiddleware } from '../middleware/auth'

const loginSchema = z.object({
  email: z.string().email().max(191),
  password: z.string().min(1).max(191),
})

export const authRoutes = new Hono<{ Bindings: Env }>()

authRoutes.post('/login', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: { code: 'validation_error', message: 'Please enter a valid email and password.', fields: parsed.error.flatten().fieldErrors } }, 400)
  }
  const { email, password } = parsed.data
  const user = await getDb(c.env).prepare('SELECT id, name, email, password_hash, role, status FROM users WHERE email = ?').bind(email).first()
  if (!user || user.status !== 'active') {
    return c.json({ error: { code: 'invalid_credentials', message: 'Invalid email or password.' } }, 401)
  }
  const ok = await verifyPassword(password, String(user.password_hash))
  if (!ok) {
    return c.json({ error: { code: 'invalid_credentials', message: 'Invalid email or password.' } }, 401)
  }
  const sessionUser = { id: Number(user.id), name: String(user.name), email: String(user.email), role: String(user.role) }
  const token = await createToken(sessionUser, getSecret(c.env))
  return c.json({ data: { token, user: sessionUser } })
})

authRoutes.use('/me', authMiddleware)
authRoutes.get('/me', (c) => {
  return c.json({ data: { user: c.get('user') } })
})

authRoutes.post('/logout', (c) => {
  return c.json({ data: { ok: true } })
})
