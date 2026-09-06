// Employee code generation, per client: <client code><4-digit sequence> (e.g. SE0001, SE0002).
// Employees without a client/site fall back to the company prefix SW + 4-digit sequence.
// Sequences are count-based (number of existing codes under the prefix) so that
// deleted/high-id records never skip the numbering.

export function padCode(n: number): string {
  return String(n).padStart(4, '0')
}

export async function nextEmployeeCode(db: D1Database, siteId?: number | null): Promise<string> {
  if (siteId && Number(siteId) > 0) {
    const site: any = await db
      .prepare(
        `SELECT s.id, c.client_code AS client_code
         FROM sites s
         LEFT JOIN clients c ON c.id = s.client_id
         WHERE s.id = ?`
      )
      .bind(Number(siteId))
      .first()
    if (site?.client_code) {
      const counted: any = await db
        .prepare(
          `SELECT COUNT(*) AS n
           FROM employees e
           JOIN sites s ON s.id = e.site_id
           JOIN clients c ON c.id = s.client_id
           WHERE c.client_code = ?`
        )
        .bind(site.client_code)
        .first()
      return `${site.client_code}${padCode(Number(counted?.n || 0) + 1)}`
    }
  }
  const counted: any = await db
    .prepare("SELECT COUNT(*) AS n FROM employees WHERE employee_code LIKE 'SW%'")
    .first()
  return `SW${padCode(Number(counted?.n || 0) + 1)}`
}