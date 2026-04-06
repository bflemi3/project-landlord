/**
 * Computes the financial summary for a property/unit.
 *
 * Priority:
 * 1. Current statement → exact numbers
 * 2. Rolling average of last 3 statements → historical trend
 * 3. Charge definitions with splits → initial estimate
 */

export interface FinancialSummary {
  tenantTotal: number
  landlordTotal: number
  total: number
  source: 'statement' | 'average' | 'estimate'
}

export interface StatementSummary {
  periodYear: number
  periodMonth: number
  totalAmountMinor: number
  tenantTotalMinor: number
}

export interface ChargeSummary {
  amountMinor: number | null
  split: {
    allocationType: string
    tenantPercent: number
    landlordPercent: number
    tenantFixedMinor: number | null
    landlordFixedMinor: number | null
  }
}

export function computeFinancialSummary(
  statements: StatementSummary[],
  charges: ChargeSummary[],
  currentYear: number,
  currentMonth: number,
): FinancialSummary {
  // 1. Current statement
  const current = statements.find(
    (s) => s.periodYear === currentYear && s.periodMonth === currentMonth,
  )

  if (current) {
    return {
      tenantTotal: current.tenantTotalMinor,
      landlordTotal: current.totalAmountMinor - current.tenantTotalMinor,
      total: current.totalAmountMinor,
      source: 'statement',
    }
  }

  // 2. Rolling average of last 3 past statements
  const past = statements
    .filter((s) => !(s.periodYear === currentYear && s.periodMonth === currentMonth))
    .slice(0, 3)

  if (past.length > 0) {
    const avgTenant = Math.round(
      past.reduce((sum, s) => sum + s.tenantTotalMinor, 0) / past.length,
    )
    const avgTotal = Math.round(
      past.reduce((sum, s) => sum + s.totalAmountMinor, 0) / past.length,
    )
    return {
      tenantTotal: avgTenant,
      landlordTotal: avgTotal - avgTenant,
      total: avgTotal,
      source: 'average',
    }
  }

  // 3. Estimate from charge definitions
  return { ...estimateFromDefinitions(charges), source: 'estimate' }
}

/** Estimate tenant/landlord/total from charge definitions when no statements exist */
export function estimateFromDefinitions(charges: ChargeSummary[]): Omit<FinancialSummary, 'source'> {
  let tenantTotal = 0
  let landlordTotal = 0
  let total = 0

  for (const c of charges) {
    if (!c.amountMinor) continue
    total += c.amountMinor

    if (c.split.allocationType === 'fixed_amount') {
      tenantTotal += c.split.tenantFixedMinor ?? 0
      landlordTotal += c.split.landlordFixedMinor ?? 0
    } else {
      tenantTotal += Math.round(c.amountMinor * c.split.tenantPercent / 100)
      landlordTotal += Math.round(c.amountMinor * c.split.landlordPercent / 100)
    }
  }

  return { tenantTotal, landlordTotal, total }
}
