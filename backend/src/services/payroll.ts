import type { AttendanceRow, PayrollSettings } from '../types'
import { r2 } from '../utils/money'

/**
 * Payroll calculation engine.
 *
 * DELIBERATE DESIGN: this is a DEMO configuration. Statutory figures (PF rate,
 * ESIC rate, professional tax, caps) are sample values loaded from the Settings
 * table and are NOT claimed to reflect any client's real statutory obligations.
 *
 * Customization points for the final build:
 *  - Attendance deduction basis (per-day = earnings / salary_basis_days)
 *  - PF: rate, cap, and eligibility threshold
 *  - ESIC: rate and eligibility threshold
 *  - Professional tax: flat amount + minimum gross threshold
 *  - Per-employee overtime rate (from salary_structures)
 *  - Monthly advances (from advances table)
 *  - Per-employee fixed other deduction (from salary_structures)
 */

export interface SalaryLike {
  basic: number
  hra: number
  conveyance: number
  other_allowance: number
  overtime_rate: number
  pf_applicable: number
  esic_applicable: number
  other_deduction: number
}

export interface CalcInput {
  attendance: AttendanceRow | null
  salary: SalaryLike | null
  advance: number
  payrollSettings: PayrollSettings
}

export interface CalcResult {
  earnings: number
  perDay: number
  attendanceDeduction: number
  overtimeEarnings: number
  gross: number
  pf: number
  esic: number
  professionalTax: number
  advance: number
  otherDeduction: number
  totalDeductions: number
  net: number
}

export function calculatePayroll(input: CalcInput): CalcResult | null {
  const { attendance, salary, advance, payrollSettings: s } = input
  if (!attendance || !salary) return null

  const basic = salary.basic
  const hra = salary.hra
  const conveyance = salary.conveyance
  const otherAllowance = salary.other_allowance

  const earnings = basic + hra + conveyance + otherAllowance
  const perDay = r2(earnings / s.salary_basis_days)
  const absentDays = attendance.absent_days + attendance.unpaid_leave
  const attendanceDeduction = r2(perDay * absentDays)
  const overtimeEarnings = r2(attendance.ot_hours * salary.overtime_rate)
  const gross = r2(earnings - attendanceDeduction + overtimeEarnings)

  const pfApplicable = salary.pf_applicable === 1 && basic + hra <= s.pf_eligibility
  const pf = pfApplicable ? Math.min(r2(((basic + hra) * s.pf_rate) / 100), s.pf_cap) : 0

  const esicApplicable = salary.esic_applicable === 1 && gross <= s.esic_eligibility
  const esic = esicApplicable ? r2((gross * s.esic_rate) / 100) : 0

  const professionalTax = gross >= s.professional_tax_min_gross ? s.professional_tax_amount : 0

  const totalDeductions = r2(pf + esic + professionalTax + advance + salary.other_deduction)
  const net = r2(gross - totalDeductions)

  return {
    earnings,
    perDay,
    attendanceDeduction,
    overtimeEarnings,
    gross,
    pf,
    esic,
    professionalTax,
    advance,
    otherDeduction: salary.other_deduction,
    totalDeductions,
    net,
  }
}

export function attendancePercent(att: AttendanceRow): number {
  const total = att.present_days + att.absent_days + att.paid_leave + att.unpaid_leave
  if (total <= 0) return 0
  return r2((att.present_days / total) * 100)
}
