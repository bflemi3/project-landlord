'use client'

import { createContext, useContext } from 'react'
import type { ChargeInstance, MissingCharge } from '@/data/statements/shared'

interface StatementSheetContextValue {
  onAddCharge: () => void
  onAddMissingCharge: (missing: MissingCharge) => void
  onEditCharge: (charge: ChargeInstance) => void
}

const StatementSheetContext = createContext<StatementSheetContextValue | null>(null)

export function useStatementSheet() {
  const ctx = useContext(StatementSheetContext)
  if (!ctx) throw new Error('useStatementSheet must be used within StatementSheetController')
  return ctx
}

export { StatementSheetContext }
