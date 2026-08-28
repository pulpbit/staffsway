import type { AuthUser } from '../types'

const enc = new TextEncoder()

const b64url = (bytes: Uint8Array): string => {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const unb64urlToString = (s: string): string => {
  const pad = '='.repeat((4 - (s.length % 4)) % 4)
  return atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad)
}

export const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

interface JwtPayload {
  sub: number
  name: string
  email: string
  role: string
  employee_id?: number | null
  iat: number
  exp: number
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

export async function signJwt(user: AuthUser, secret: string, ttl = TOKEN_TTL_SECONDS): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))
  const payload: JwtPayload = { sub: user.id, name: user.name, email: user.email, role: user.role, employee_id: user.employee_id ?? null, iat: now, exp: now + ttl }
  const body = b64url(enc.encode(JSON.stringify(payload)))
  const key = await hmacKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${header}.${body}`))
  return `${header}.${body}.${b64url(new Uint8Array(sig))}`
}

export async function verifyJwt(token: string, secret: string): Promise<AuthUser | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [header, body, sig] = parts
  let alg: string | null = null
  try {
    alg = JSON.parse(unb64urlToString(header))?.alg ?? null
  } catch {
    return null
  }
  if (alg !== 'HS256') return null
  try {
    const key = await hmacKey(secret)
    const sigBytes = Uint8Array.from(unb64urlToString(sig), (ch) => ch.charCodeAt(0))
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes as BufferSource, enc.encode(`${header}.${body}`))
    if (!valid) return null
    const payload = JSON.parse(unb64urlToString(body)) as JwtPayload
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null
    if (typeof payload.sub !== 'number' || typeof payload.email !== 'string' || typeof payload.role !== 'string') return null
    return { id: payload.sub, name: String(payload.name ?? ''), email: payload.email, role: payload.role, employee_id: payload.employee_id ?? null }
  } catch {
    return null
  }
}

export function getSecret(env: { SESSION_SECRET?: string; AUTH_SECRET?: string }): string {
  if (env.SESSION_SECRET && env.SESSION_SECRET.length >= 32) return env.SESSION_SECRET
  if (env.AUTH_SECRET && env.AUTH_SECRET.length >= 32) return env.AUTH_SECRET
  console.warn('[auth] SESSION_SECRET missing or too short — using insecure development fallback.')
  return 'staffsway-dev-only-secret-min-32-chars-change-me!!'
}
