'use client'

import { useState, useMemo, useEffect } from 'react'
import posthog from 'posthog-js'
import { StatementSheetContext } from './statement-sheet-context'
import { AddChargeSheet } from './add-charge-sheet'
import type { ChargeInstance, MissingCharge } from '@/data/statements/shared'

interface StatementSheetControllerProps {
  statementId: string
  unitId: string
  periodYear: number
  periodMonth: number
  currency: string
  children: React.ReactNode
}

export function StatementSheetController({
  statementId,
  unitId,
  periodYear,
  periodMonth,
  currency,
  children,
}: StatementSheetControllerProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingInstance, setEditingInstance] = useState<ChargeInstance | null>(null)
  const [fillingMissing, setFillingMissing] = useState<MissingCharge | null>(null)

  // Fire statement_viewed on mount
  useEffect(() => {
    posthog.capture('statement_viewed', {
      statement_id: statementId,
      viewer_role: 'landlord',
    })
  }, [statementId])

  const contextValue = useMemo(() => ({
    onAddCharge() {
      setEditingInstance(null)
      setFillingMissing(null)
      setSheetOpen(true)
    },
    onAddMissingCharge(missing: MissingCharge) {
      setEditingInstance(null)
      setFillingMissing(missing)
      setSheetOpen(true)
    },
    onEditCharge(charge: ChargeInstance) {
      setFillingMissing(null)
      setEditingInstance(charge)
      setSheetOpen(true)
    },
  }), [])

  return (
    <StatementSheetContext.Provider value={contextValue}>
      {children}
      <AddChargeSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        statementId={statementId}
        unitId={unitId}
        periodYear={periodYear}
        periodMonth={periodMonth}
        currency={currency}
        missingCharge={fillingMissing}
        existingInstance={editingInstance}
      />
    </StatementSheetContext.Provider>
  )
}
