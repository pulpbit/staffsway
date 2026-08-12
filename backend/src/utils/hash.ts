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

// password_hash format: "<salt>$<sha256hex(salt:password)>"
export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomHex(16)
  const hash = await sha256Hex(`${salt}:${password}`)
  return `${salt}$${hash}`
}

export const verifyPassword = async (password: string, stored: string): Promise<boolean> => {
  const idx = stored.indexOf('$')
  if (idx <= 0) return false
  const salt = stored.slice(0, idx)
  const expected = stored.slice(idx + 1)
  const actual = await sha256Hex(`${salt}:${password}`)
  return actual === expected
}
