const STOP_WORDS = new Set(['the', 'and', 'of', 'for', '&', 'and the'])

export function baseClientCode(name: string): string {
  const cleaned = (name || '').trim()
  if (!cleaned) return ''
  const words = cleaned
    .split(/[\s\-/&]+/)
    .filter(Boolean)
    .filter((w) => !STOP_WORDS.has(w.toLowerCase()))
  const code = words
    .map((w) => w[0].toUpperCase())
    .join('')
    .slice(0, 4)
  if (code.length >= 2) return code
  // Single word / single letter falls back to the first two characters of the name.
  return cleaned
    .replace(/\s+/g, '')
    .slice(0, 2)
    .toUpperCase()
}

/**
 * Resolves a unique client code for the given name against existing records.
 * Returns the base code if free, otherwise appends a numeric suffix (SE-02, SE-03...).
 * Duplicate resolution is backend/database driven, never frontend only.
 */
export async function resolveClientCode(db: D1Database, name: string, excludeId?: number): Promise<string> {
  const base = baseClientCode(name)
  if (!base) throw new Error('Client name must not be empty.')
  const excludeSql = excludeId ? ' AND id != ?' : ''
  const row = await db
    .prepare(
      `SELECT client_code FROM clients
       WHERE (client_code = ? OR client_code LIKE ? OR client_code LIKE ?)${excludeSql}
       ORDER BY client_code ASC`
    )
    .bind(base, `${base}%`, `${base}-%`, ...(excludeId ? [excludeId] : []))
    .all()
  const existing = (row.results || []).map((r) => String((r as Record<string, unknown>).client_code))
  if (!existing.length || !existing.includes(base)) return base
  let max = 1
  for (const code of existing) {
    const match = code.match(/-(\d+)$/)
    if (match) max = Math.max(max, Number(match[1]))
  }
  const next = String(max + 1).padStart(2, '0')
  return `${base}-${next}`
}