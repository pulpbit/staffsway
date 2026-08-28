const enc = new TextEncoder()

const toHex = (buf: ArrayBuffer): string => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

export const sha256Hex = async (input: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return toHex(digest)
}

const randomHex = (bytes: number): string => {
  const buf = new Uint8Array(bytes)
  crypto.getRandomValues(buf)
  return [...buf].map((b) => b.toString(16).padStart(2, '0')).join('')
}

const b64url = (bytes: Uint8Array): string => {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const unb64url = (s: string): Uint8Array => {
  const pad = '='.repeat((4 - (s.length % 4)) % 4)
  const std = s.replace(/-/g, '+').replace(/_/g, '/') + pad
  const raw = atob(std)
  return Uint8Array.from(raw, (ch) => ch.charCodeAt(0))
}

const PBKDF2_ITERATIONS = 100_000
const SALT_BYTES = 16
const HASH_BITS = 256

async function pbkdf2Derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, key, HASH_BITS)
  return new Uint8Array(bits)
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length || a.length === 0) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

// password_hash formats:
//   current: "pbkdf2$<iterations>$<salt_b64url>$<hash_b64url>"  (PBKDF2-SHA256)
//   legacy:  "<salt>$<sha256hex(salt:password)>"                (migrated transparently on next login)
export const hashPassword = async (password: string): Promise<string> => {
  const salt = new Uint8Array(SALT_BYTES)
  crypto.getRandomValues(salt)
  const hash = await pbkdf2Derive(password, salt, PBKDF2_ITERATIONS)
  return `pbkdf2$${PBKDF2_ITERATIONS}$${b64url(salt)}$${b64url(hash)}`
}

export const isLegacyHash = (stored: string): boolean => !stored.startsWith('pbkdf2$')

export const needsRehash = isLegacyHash

export const verifyPassword = async (password: string, stored: string): Promise<boolean> => {
  if (!stored.includes('$')) return false
  if (isLegacyHash(stored)) {
    const idx = stored.indexOf('$')
    const salt = stored.slice(0, idx)
    const expected = stored.slice(idx + 1)
    return sha256Hex(`${salt}:${password}`).then((actual) => actual === expected)
  }
  const [, iterStr, saltB64, hashB64] = stored.split('$')
  const iterations = Number(iterStr)
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > 5_000_000) return false
  try {
    const derived = await pbkdf2Derive(password, unb64url(saltB64), iterations)
    return constantTimeEqual(derived, unb64url(hashB64))
  } catch {
    return false
  }
}
