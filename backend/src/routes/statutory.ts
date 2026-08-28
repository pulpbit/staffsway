import { Hono } from 'hono'
import { z } from 'zod'
import type { Env } from '../types'
import { getDb } from '../utils/db'
import { r2 } from '../utils/money'
import { requireRole, STAFF_ROLES } from '../middleware/auth'

export const statutoryRoutes = new Hono<{ Bindings: Env }>()

// All statutory reads/writes are staff-only; employee logins use My Space.
statutoryRoutes.use('*', requireRole(...STAFF_ROLES))

const HR_ONLY = ['super_admin', 'admin', 'hr'] as const

const hrOnly = (c: any) => {
  const caller = c.get('user')
  if (!caller || !HR_ONLY.includes(caller.role as any)) {
    return c.json({ error: { code: 'forbidden', message: 'Only HR/Admin can perform this action.' } }, 403)
  }
  return null
}

const LATEST_STRUCT = `JOIN salary_structures st ON st.id = (
  SELECT st2.id FROM salary_structures st2
  WHERE st2.employee_id = e.id
  ORDER BY st2.effective_from DESC, st2.id DESC LIMIT 1)`

async function monthItems(db: any, month: number, year: number) {
  const res = await db.prepare(
    `SELECT pi.*, e.employee_code, e.first_name, e.last_name, e.uan, e.pan,
      e.skill_category, st.basic AS cur_basic, st.hra AS cur_hra
     FROM payroll_items pi
     JOIN payroll p ON p.id = pi.payroll_id AND p.month = ? AND p.year = ?
     JOIN employees e ON e.id = pi.employee_id
     LEFT JOIN salary_structures st ON st.id = (
       SELECT st2.id FROM salary_structures st2 WHERE st2.employee_id = e.id
       ORDER BY st2.effective_from DESC, st2.id DESC LIMIT 1)
     ORDER BY e.first_name`
  ).bind(month, year).all()
  return res.results as any[]
}

function pfWages(item: any, s: any): number {
  if (!item.pf || Number(item.pf) <= 0) return 0
  const wage = Number(item.basic) + Number(item.hra)
  return r2(Math.min(wage, Number(s?.pf_eligibility) || 15000))
}

// ---------- Registers ----------
statutoryRoutes.get('/register', async (c) => {
  const month = Number(c.req.query('month'))
  const year = Number(c.req.query('year'))
  if (!(month >= 1 && month <= 12) || !year) {
    return c.json({ error: { code: 'validation_error', message: 'month and year are required.' } }, 400)
  }
  const db = getDb(c.env)
  const [itemsRes, settings] = await Promise.all([
    monthItems(db, month, year),
    db.prepare('SELECT * FROM settings WHERE id = 1').first(),
  ])
  const items = itemsRes as any[]
  const rows = items.map((it) => {
    const w = pfWages(it, settings)
    const esiEr = it.esic && Number(it.esic) > 0 ? r2(Number(it.gross) * 3.25 / 100) : 0
    return {
      employee_id: it.employee_id,
      employee_code: it.employee_code,
      name: `${it.first_name} ${it.last_name}`,
      uan: it.uan,
      pan: it.pan,
      gross: Number(it.gross),
      epf_wages: w,
      pf_ee: Number(it.pf),
      pf_er: Number(it.pf),
      esi_gross: it.esic && Number(it.esic) > 0 ? Number(it.gross) : 0,
      esi_ee: Number(it.esic),
      esi_er: esiEr,
      pt: Number(it.professional_tax),
      lwf: Number(it.lwf),
      tds: Number(it.tds),
    }
  })
  const totals = rows.reduce(
    (a, x) => ({
      pf_ee: r2(a.pf_ee + x.pf_ee), pf_er: r2(a.pf_er + x.pf_er),
      esi_ee: r2(a.esi_ee + x.esi_ee), esi_er: r2(a.esi_er + x.esi_er),
      pt: r2(a.pt + x.pt), lwf: r2(a.lwf + x.lwf), tds: r2(a.tds + x.tds),
    }),
    { pf_ee: 0, pf_er: 0, esi_ee: 0, esi_er: 0, pt: 0, lwf: 0, tds: 0 },
  )
  return c.json({ data: rows, meta: { month, year, count: rows.length, totals } })
})

statutoryRoutes.get('/pf-ecr', async (c) => {
  const month = Number(c.req.query('month'))
  const year = Number(c.req.query('year'))
  if (!(month >= 1 && month <= 12) || !year) {
    return c.json({ error: { code: 'validation_error', message: 'month and year are required.' } }, 400)
  }
  const db = getDb(c.env)
  const [itemsRes, settings] = await Promise.all([
    monthItems(db, month, year),
    db.prepare('SELECT * FROM settings WHERE id = 1').first(),
  ])
  const rows = (itemsRes as any[]).map((it) => {
    const w = pfWages(it, settings)
    const eps = it.pf && Number(it.pf) > 0 ? r2(w * 8.33 / 100) : 0
    const edli = it.pf && Number(it.pf) > 0 ? r2(w * 0.5 / 100) : 0
    return {
      uan: it.uan || '',
      member_name: `${it.first_name} ${it.last_name}`,
      gross: Number(it.gross),
      epf_wages: w,
      ee_share: Number(it.pf),
      er_share: Number(it.pf),
      eps: Math.min(eps, Number(it.pf)),
      edli,
      ncp_days: 0,
    }
  })
  const totals = rows.reduce(
    (a, x) => ({
      epf_wages: r2(a.epf_wages + x.epf_wages), ee_share: r2(a.ee_share + x.ee_share),
      er_share: r2(a.er_share + x.er_share), eps: r2(a.eps + x.eps), edli: r2(a.edli + x.edli),
    }),
    { epf_wages: 0, ee_share: 0, er_share: 0, eps: 0, edli: 0 },
  )
  return c.json({
    data: rows,
    meta: {
      month, year, count: rows.length, totals,
      wage_ceiling: Number(settings?.pf_eligibility) || 15000,
      note: 'Demo ECR — EPS capped to EE share; EDLI at 0.5% of PF wages.',
    },
  })
})

statutoryRoutes.get('/challan', async (c) => {
  const month = Number(c.req.query('month'))
  const year = Number(c.req.query('year'))
  if (!(month >= 1 && month <= 12) || !year) {
    return c.json({ error: { code: 'validation_error', message: 'month and year are required.' } }, 400)
  }
  const db = getDb(c.env)
  const [itemsRes, settings] = await Promise.all([
    monthItems(db, month, year),
    db.prepare('SELECT * FROM settings WHERE id = 1').first(),
  ])
  const items = itemsRes as any[]
  let pfEe = 0, pfEr = 0, pfWagesTotal = 0, esiEe = 0, esiGross = 0, pt = 0, lwf = 0, lwfEr = 0, tds = 0
  for (const it of items) {
    const w = pfWages(it, settings)
    pfWagesTotal += w
    pfEe += Number(it.pf)
    pfEr += Number(it.pf)
    if (it.esic && Number(it.esic) > 0) { esiGross += Number(it.gross); esiEe += Number(it.esic) }
    pt += Number(it.professional_tax)
    lwf += Number(it.lwf)
    tds += Number(it.tds)
  }
  const lwfSettings = Number(settings?.lwf_employer_amount) || 0
  const coveredCount = (items as any[]).filter(i => i.lwf && Number(i.lwf) > 0).length
  lwfEr = r2(lwfSettings * coveredCount)
  const pfTotal = r2(pfEe + pfEr)
  const edli = r2(pfWagesTotal * 0.5 / 100)
  const admin = r2(pfWagesTotal * 0.5 / 100)
  const esiEr = r2(esiEe * 325 / 75)
  return c.json({
    data: {
      pf: {
        epf_wages: r2(pfWagesTotal),
        a_c_01_ee: r2(pfEe),
        a_c_02_er: r2(r2(pfEr) - r2(Math.min(r2(pfEr * 8.33 / 100), pfEe))),
        a_c_10_eps: r2(Math.min(r2(pfEr * 8.33 / 100), pfEe)),
        a_c_21_edli: edli,
        a_c_22_admin: admin,
        total_pf: r2(pfTotal + edli + admin),
      },
      esi: {
        applicable_gross: r2(esiGross),
        ee_share: r2(esiEe),
        er_share: esiEr,
        total_esi: r2(esiEe + esiEr),
      },
      pt: r2(pt),
      lwf: r2(lwf + lwfEr),
      lwf_employee: r2(lwf),
      lwf_employer: lwfEr,
      tds: r2(tds),
      grand_total: r2(pfTotal + edli + admin + esiEe + esiEr + pt + lwf + lwfEr + tds),
    },
    meta: { month, year, employee_count: items.length, note: 'Demo challan split — EPS/EDLI/Admin computed on PF wages ceiling.' },
  })
})

// ---------- Gratuity ----------
statutoryRoutes.get('/gratuity', async (c) => {
  const db = getDb(c.env)
  const rows = await db.prepare(
    `SELECT e.id, e.employee_code, e.first_name, e.last_name, e.joining_date, e.status,
      st.basic
     FROM employees e ${LATEST_STRUCT}
     ORDER BY e.first_name`
  ).all()
  const today = new Date()
  const data = (rows.results as any[]).map((e) => {
    const join = new Date(`${String(e.joining_date)}T00:00:00Z`)
    const yearsExact = (today.getTime() - join.getTime()) / (365.25 * 24 * 3600 * 1000)
    const fullYears = Math.floor(yearsExact)
    const eligible = fullYears >= 5
    const amount = eligible ? r2((15 / 26) * Number(e.basic) * fullYears) : 0
    return {
      employee_id: e.id,
      employee_code: e.employee_code,
      name: `${e.first_name} ${e.last_name}`,
      joining_date: e.joining_date,
      service_years: fullYears,
      latest_basic: Number(e.basic),
      status: e.status,
      eligible,
      gratuity_amount: amount,
    }
  })
  return c.json({ data, meta: { eligible_count: data.filter(d => d.eligible).length, formula: '15/26 × last drawn Basic × completed years' } })
})

// ---------- Bonus register ----------
statutoryRoutes.get('/bonus-register', async (c) => {
  const year = Number(c.req.query('year')) || new Date().getFullYear()
  const db = getDb(c.env)
  const [empRes, settings] = await Promise.all([
    db.prepare(`SELECT e.id, e.employee_code, e.first_name, e.last_name, e.status, e.joining_date, st.basic
      FROM employees e ${LATEST_STRUCT} ORDER BY e.first_name`).all(),
    db.prepare('SELECT bonus_percent, bonus_max_percent, bonus_wage_ceiling FROM settings WHERE id = 1').first(),
  ])
  const pctMin = Number(settings?.bonus_percent) || 8.33
  const pctMax = Number(settings?.bonus_max_percent) || 20
  const ceiling = Number(settings?.bonus_wage_ceiling) || 21000
  const data = (empRes.results as any[]).map((e) => {
    const monthlyWage = Number(e.basic)
    const eligible = monthlyWage <= ceiling
    const annualBasic = r2(monthlyWage * 12)
    const amount = eligible ? r2(annualBasic * pctMin / 100) : 0
    return {
      employee_id: e.id,
      employee_code: e.employee_code,
      name: `${e.first_name} ${e.last_name}`,
      status: e.status,
      monthly_basic: monthlyWage,
      eligible,
      applied_percent: eligible ? pctMin : null,
      max_percent_allowed: pctMax,
      annual_basic: annualBasic,
      bonus_amount: amount,
    }
  })
  return c.json({
    data,
    meta: {
      year, wage_ceiling: ceiling, min_percent: pctMin, max_percent: pctMax,
      eligible_count: data.filter(d => d.eligible).length,
      total_bonus: r2(data.reduce((s, d) => s + d.bonus_amount, 0)),
      note: `Payment due by 30 Nov ${year + 1} (Payment of Bonus Act).`,
    },
  })
})

// ---------- Minimum wages ----------
const minWageSchema = z.object({
  state: z.string().min(1).max(100).optional(),
  category: z.enum(['Unskilled', 'Semi-skilled', 'Skilled', 'Highly Skilled']),
  basic_monthly: z.number().positive(),
  va_monthly: z.number().min(0),
  effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

statutoryRoutes.get('/min-wages', async (c) => {
  const state = c.req.query('state')
  const db = getDb(c.env)
  const rows = state
    ? await db.prepare('SELECT * FROM minimum_wages WHERE state = ? ORDER BY category').bind(state).all()
    : await db.prepare('SELECT * FROM minimum_wages ORDER BY state, category').all()
  return c.json({ data: rows.results })
})

statutoryRoutes.post('/min-wages', async (c) => {
  const denied = hrOnly(c)
  if (denied) return denied
  const body = await c.req.json().catch(() => null)
  const parsed = minWageSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'Category, positive basic and VA amounts required.' } }, 400)
  const d = parsed.data
  const db = getDb(c.env)
  const state = d.state ?? String((await db.prepare("SELECT state_name FROM settings WHERE id = 1").first())?.state_name || 'Haryana')
  await db.prepare(`INSERT INTO minimum_wages (state, category, basic_monthly, va_monthly, effective_from)
    VALUES (?,?,?,?,?)
    ON CONFLICT(state, category) DO UPDATE SET basic_monthly = excluded.basic_monthly,
      va_monthly = excluded.va_monthly, effective_from = excluded.effective_from`)
    .bind(state, d.category, d.basic_monthly, d.va_monthly, d.effective_from).run()
  const rows = await db.prepare('SELECT * FROM minimum_wages WHERE state = ? ORDER BY category').bind(state).all()
  return c.json({ data: rows.results, message: `Minimum wage saved for ${d.category} (${state}).` })
})

statutoryRoutes.delete('/min-wages/:id', async (c) => {
  const denied = hrOnly(c)
  if (denied) return denied
  const id = Number(c.req.param('id'))
  const res = await getDb(c.env).prepare('DELETE FROM minimum_wages WHERE id = ?').bind(id).run()
  if (!res.meta.changes) return c.json({ error: { code: 'not_found', message: 'Minimum wage entry not found.' } }, 404)
  return c.json({ data: { id }, message: 'Minimum wage entry removed.' })
})

statutoryRoutes.get('/wage-check', async (c) => {
  const month = Number(c.req.query('month'))
  const year = Number(c.req.query('year')) || new Date().getFullYear()
  if (!(month >= 1 && month <= 12)) {
    return c.json({ error: { code: 'validation_error', message: 'month is required.' } }, 400)
  }
  const db = getDb(c.env)
  const settings: any = await db.prepare('SELECT state_name FROM settings WHERE id = 1').first()
  const state = String(settings?.state_name || 'Haryana')
  const [empRes, wagesRes] = await Promise.all([
    db.prepare(`SELECT e.id, e.employee_code, e.first_name, e.last_name, e.skill_category, st.basic, st.other_allowance, st.conveyance
      FROM employees e ${LATEST_STRUCT} WHERE e.status = 'active' ORDER BY e.first_name`).all(),
    db.prepare('SELECT * FROM minimum_wages WHERE state = ?').bind(state).all(),
  ])
  const wageMap = new Map<string, number>()
  for (const w of wagesRes.results as any[]) wageMap.set(String(w.category), Number(w.basic) + Number(w.va_monthly))
  const data = (empRes.results as any[]).map((e) => {
    const category = e.skill_category || null
    const minTotal = category ? (wageMap.get(category) ?? null) : null
    const paidFixed = Number(e.basic) + Number(e.other_allowance || 0)
    const shortfall = minTotal != null ? r2(Math.max(0, minTotal - paidFixed)) : null
    return {
      employee_id: e.id,
      employee_code: e.employee_code,
      name: `${e.first_name} ${e.last_name}`,
      skill_category: category,
      paid_fixed: r2(paidFixed),
      state_min_total: minTotal,
      compliant: minTotal == null ? null : shortfall === 0,
      shortfall,
    }
  })
  const flagged = data.filter(d => d.compliant === false)
  return c.json({
    data,
    meta: {
      month, year, state,
      checked: data.filter(d => d.compliant !== null).length,
      unassigned: data.filter(d => d.compliant === null).length,
      violations: flagged.length,
      total_shortfall: r2(flagged.reduce((s, d) => s + (d.shortfall || 0), 0)),
    },
  })
})

// ---------- OT double-rate compliance ----------
statutoryRoutes.get('/ot-compliance', async (c) => {
  const month = Number(c.req.query('month'))
  const year = Number(c.req.query('year'))
  if (!(month >= 1 && month <= 12) || !year) {
    return c.json({ error: { code: 'validation_error', message: 'month and year are required.' } }, 400)
  }
  const db = getDb(c.env)
  const setRow: any = await db.prepare('SELECT salary_basis_days FROM settings WHERE id = 1').first()
  const basisDays = Number(setRow?.salary_basis_days) || 26
  const rows = await db.prepare(
    `SELECT a.employee_id, e.employee_code, e.first_name, e.last_name,
      a.ot_hours, st.overtime_rate AS ot_rate, st.basic
     FROM attendance_monthly a
     JOIN employees e ON e.id = a.employee_id
     JOIN salary_structures st ON st.id = (
       SELECT st2.id FROM salary_structures st2 WHERE st2.employee_id = e.id
       ORDER BY st2.effective_from DESC, st2.id DESC LIMIT 1)
     WHERE a.month = ? AND a.year = ? AND a.ot_hours > 0
     ORDER BY e.first_name`
  ).bind(month, year).all()
  const data = (rows.results as any[]).map((r) => {
    const dailyRate = Number(r.basic) / basisDays
    const hourlyRate = dailyRate / 8
    const requiredRate = r2(hourlyRate * 2)
    const actualRate = Number(r.ot_rate)
    const payableRequired = r2(requiredRate * Number(r.ot_hours))
    const payableActual = r2(actualRate * Number(r.ot_hours))
    return {
      employee_id: r.employee_id,
      employee_code: r.employee_code,
      name: `${r.first_name} ${r.last_name}`,
      ot_hours: Number(r.ot_hours),
      actual_rate: actualRate,
      required_double_rate: requiredRate,
      compliant: actualRate >= requiredRate - 0.001,
      short_per_hour: r2(Math.max(0, requiredRate - actualRate)),
      payable_at_required: payableRequired,
      payable_recorded: payableActual,
      gap: r2(payableRequired - payableActual),
    }
  })
  const violations = data.filter(d => !d.compliant)
  return c.json({
    data,
    meta: {
      month, year, basis_days: basisDays,
      ot_workers: data.length,
      violations: violations.length,
      total_gap: r2(violations.reduce((s, d) => s + d.gap, 0)),
      rule: 'OT must be paid at twice the ordinary hourly rate (Basic ÷ basis days ÷ 8 × 2).',
    },
  })
})

// ---------- Compliance calendar ----------
const OBLIGATIONS = [
  { obligation: 'PF', label: 'EPF Monthly Contribution', day: 15, monthly: true },
  { obligation: 'ESI', label: 'ESI Monthly Contribution', day: 15, monthly: true },
  { obligation: 'PT', label: 'Professional Tax (Haryana)', day: 15, monthly: true },
  { obligation: 'TDS', label: 'TDS Deposit (24Q/Challan)', day: 7, monthly: true },
  { obligation: 'LWF', label: 'LWF Half-Yearly Return (Haryana)', monthly: false },
  { obligation: 'BONUS', label: 'Annual Bonus Payment', monthly: false },
]

async function ensureComplianceYear(db: any, year: number) {
  for (const o of OBLIGATIONS) {
    if (o.monthly) {
      for (let m = 1; m <= 12; m++) {
        // Contribution for month m is due the following month.
        const dueMonth = m === 12 ? `${year + 1}-01` : `${year}-${String(m + 1).padStart(2, '0')}`
        const dueDate = `${dueMonth}-${String(o.day).padStart(2, '0')}`
        await db.prepare('INSERT OR IGNORE INTO compliance_records (obligation, year, month, due_date) VALUES (?,?,?,?)')
          .bind(o.obligation, year, m, dueDate).run()
      }
    }
  }
  // Half-yearly LWF: periods ending Jun (due Jul 31) and Dec (due Jan 31 next yr).
  await db.prepare('INSERT OR IGNORE INTO compliance_records (obligation, year, month, due_date) VALUES (?,?,?,?)')
    .bind('LWF', year, 6, `${year}-07-31`).run()
  await db.prepare('INSERT OR IGNORE INTO compliance_records (obligation, year, month, due_date) VALUES (?,?,?,?)')
    .bind('LWF', year, 12, `${year + 1}-01-31`).run()
  // Annual bonus: accounting year ending Mar, payable by Nov 30.
  await db.prepare('INSERT OR IGNORE INTO compliance_records (obligation, year, month, due_date) VALUES (?,?,?,?)')
    .bind('BONUS', year, 3, `${year}-11-30`).run()
}

const LABELS: Record<string, string> = Object.fromEntries(OBLIGATIONS.map(o => [o.obligation, o.label]))

statutoryRoutes.get('/calendar', async (c) => {
  const year = Number(c.req.query('year')) || new Date().getFullYear()
  const db = getDb(c.env)
  await ensureComplianceYear(db, year)
  const rows = await db.prepare('SELECT * FROM compliance_records WHERE year = ? ORDER BY due_date, obligation').bind(year).all()
  const data = (rows.results as any[]).map(r => ({ ...r, label: LABELS[String(r.obligation)] || r.obligation }))
  return c.json({
    data,
    meta: {
      year,
      pending: data.filter(d => d.status === 'pending').length,
      done: data.filter(d => d.status === 'done').length,
      overdue: data.filter(d => d.status === 'pending' && d.due_date < new Date().toISOString().slice(0, 10)).length,
    },
  })
})

statutoryRoutes.patch('/calendar/:id', async (c) => {
  const denied = hrOnly(c)
  if (denied) return denied
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => null)
  const parsed = z.object({
    status: z.enum(['pending', 'done']),
    remarks: z.string().max(300).optional().nullable(),
  }).safeParse(body)
  if (!parsed.success) return c.json({ error: { code: 'validation_error', message: 'status must be pending or done.' } }, 400)
  const db = getDb(c.env)
  const user = c.get('user')
  if (parsed.data.status === 'done') {
    await db.prepare("UPDATE compliance_records SET status='done', done_by=?, done_at=datetime('now'), remarks=? WHERE id=?")
      .bind(user.email, parsed.data.remarks ?? null, id).run()
  } else {
    await db.prepare("UPDATE compliance_records SET status='pending', done_by=NULL, done_at=NULL, remarks=NULL WHERE id=?").bind(id).run()
  }
  const row = await db.prepare('SELECT * FROM compliance_records WHERE id = ?').bind(id).first()
  if (!row) return c.json({ error: { code: 'not_found', message: 'Compliance record not found.' } }, 404)
  return c.json({ data: row, message: parsed.data.status === 'done' ? 'Marked as filed.' : 'Reopened.' })
})
