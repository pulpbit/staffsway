# Payroll Rules

Implemented in `backend/src/services/payroll.ts` (`calculatePayroll`). Pure function —
same inputs always produce same outputs; every output value is persisted to `payroll_items`.

## Inputs
- Attendance row: present, absent, paid_leave, unpaid_leave, ot_hours.
- Salary components: basic, hra, conveyance, other_allowance, overtime_rate.
- **Statutory flags (per employee)**: pf_applicable, esi_applicable, lwf_applicable,
  pt_applicable, tds_applicable — from `employee_statutory`.
- Settings: salary_basis_days, pf_rate/pf_cap/pf_eligibility, esic_rate/esic_eligibility,
  professional_tax_amount/min_gross, lwf_employee_amount, tds_percent.

## Formulas
```
earned        = basic + hra + conveyance + other_allowance
per_day       = round2(earned / salary_basis_days)
lop           = round2(per_day × (absent + unpaid_leave))
ot_earnings   = round2(ot_hours × overtime_rate)
gross         = round2(earned − lop + ot_earnings)

pf            = pf_flag AND (basic+hra) ≤ pf_eligibility
                  ? min(round2((basic+hra) × pf_rate/100), pf_cap) : 0
esic          = esi_flag AND gross ≤ esic_eligibility ? round2(gross × esic_rate/100) : 0
pt            = pt_flag AND gross ≥ pt_min_gross ? pt_amount : 0
lwf           = lwf_flag ? lwf_employee_amount : 0        (flat until state slabs confirmed)
tds           = tds_flag ? round2(gross × tds_percent/100) : 0

total_deductions = round2(pf + esic + pt + lwf + tds + advance + other_deduction)
net              = round2(gross − total_deductions)
```

## Mandatory regression matrix (test on every payroll change)
| Employee profile | Expected |
|---|---|
| A: PF ✓ ESI ✗ LWF ✗ | PF only (+PT if enabled & eligible) |
| B: PF ✗ ESI ✓ LWF ✓ | ESIC + LWF, no PF |
| C: all off | Only advance + other deduction; net = gross − those |
| D: all on | Every component applied per thresholds |

Verify each against a hand-computed payslip before merging payroll changes.

## Traceability
`payroll_items` stores: days breakdown, OT hours/earnings, LOP amount, gross, each statutory
deduction, advance, other deduction, net. A payslip dispute is answered by reading the row —
never by re-running math.

## Lifecycle
preview (no writes) → generate (draft items) → finalize (lock run) → mark paid.
Attendance must be finalized for the month before the run can be finalized.
