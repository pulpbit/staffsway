import { Hono } from 'hono'
import { z } from 'zod'
import type { Env } from '../types'
import { getDb } from '../utils/db'

const advanceCreateSchema = z.object({
  employee_id: z.number().int().positive(),
  amount: z.number().positive().max(10_000_000),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  remarks: z.string().max(300).optional().nullable(),
})

const advanceSelect = `
  SELECT a.id, a.employee_id, a.amount, a.month, a.year, a.remarks, a.created_at,
         e.first_name, e.last_name, e.employee_code
  FROM advances a
  JOIN employees e ON e.id = a.employee_id`

export const advanceRoutes = new Hono<{ Bindings: Env }>()

advanceRoutes.get('/', async (c) => {
  const month = Number(c.req.query('month'))
  const year = Number(c.req.query('year'))
  const conds: string[] = []
  const params: number[] = []
  if (Number.isInteger(month) && month >= 1 && month <= 12) {
    conds.push('a.month = ?')
    params.push(month)
  }
  if (Number.isInteger(year) && year >= 2000 && year <= 2100) {
    conds.push('a.year = ?')
    params.push(year)
  }
  const sql = `${advanceSelect}${conds.length ? ' WHERE ' + conds.join(' AND ') : ''} ORDER BY a.year DESC, a.month DESC, a.id DESC`
  const rows = await getDb(c.env).prepare(sql).bind(...params).all()
  return c.json({ data: rows.results })
})

advanceRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = advanceCreateSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const emp = await db.prepare('SELECT id FROM employees WHERE id = ?').bind(d.employee_id).first()
  if (!emp) return c.json({ error: { code: 'not_found', message: 'Employee not found.' } }, 404)
  const info = await db
    .prepare('INSERT INTO advances (employee_id, amount, month, year, remarks) VALUES (?,?,?,?,?)')
    .bind(d.employee_id, Math.round(d.amount * 100) / 100, d.month, d.year, d.remarks ?? null)
    .run()
  const row = await db.prepare(`${advanceSelect} WHERE a.id = ?`).bind(info.meta.last_row_id).first()
  return c.json({ data: row, message: 'Advance recorded.' })
})

advanceRoutes.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) return c.json({ error: { code: 'not_found', message: 'Advance not found.' } }, 404)
  const db = getDb(c.env)
  const res = await db.prepare('DELETE FROM advances WHERE id = ?').bind(id).run()
  if (!res.meta.changes) return c.json({ error: { code: 'not_found', message: 'Advance not found.' } }, 404)
  return c.json({ data: { ok: true }, message: 'Advance deleted.' })
})
