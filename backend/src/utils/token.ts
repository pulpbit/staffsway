import type { AuthUser } from '../types'

const enc = new TextEncoder()

interface TokenPayload {
  sub: number
  name: string
  email: string
  role: string
  exp: number
}

async function hmacSign(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

const b64 = (s: string): string => btoa(unescape(encodeURIComponent(s)))
const unb64 = (s: string): string => {
  try {
    return decodeURIComponent(escape(atob(s)))
  } catch {
    return ''
  }
}

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

// Demo-grade stateless token (HMAC-signed). Swap this module for a real
// session/JWT provider in production.
export async function createToken(user: AuthUser, secret: string, ttl = TOKEN_TTL_SECONDS): Promise<string> {
  const payload: TokenPayload = { sub: user.id, name: user.name, email: user.email, role: user.role, exp: Math.floor(Date.now() / 1000) + ttl }
  const body = b64(JSON.stringify(payload))
  const sig = await hmacSign(secret, body)
  return `${body}.${sig}`
}

export async function verifyToken(token: string, secret: string): Promise<AuthUser | null> {
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [body, sig] = parts
  const expected = await hmacSign(secret, body)
  if (sig !== expected) return null
  const raw = unb64(body)
  if (!raw) return null
  let payload: TokenPayload
  try {
    payload = JSON.parse(raw) as TokenPayload
  } catch {
    return null
  }
  if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null
  if (typeof payload.sub !== 'number' || typeof payload.email !== 'string') return null
  return { id: payload.sub, name: payload.name, email: payload.email, role: payload.role }
}

export function getSecret(env: { AUTH_SECRET?: string }): string {
  return env.AUTH_SECRET || 'staffsway-demo-secret-do-not-use-in-production'
}
