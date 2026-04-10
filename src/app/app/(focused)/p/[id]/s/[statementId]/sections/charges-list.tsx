import { getStatement, getStatementCharges, getMissingCharges } from '@/data/statements/server'
import { formatCurrency } from '@/lib/format-currency'
import { ChargesListInteractive } from './charges-list-actions'

export async function ChargesList({ statementId }: { statementId: string }) {
  const statement = await getStatement(statementId)
  const [charges, missingCharges] = await Promise.all([
    getStatementCharges(statementId),
    getMissingCharges(
      statement.unitId, statementId, statement.periodYear, statement.periodMonth,
    ),
  ])

  const totalFormatted = formatCurrency(statement.totalAmountMinor, statement.currency)

  return (
    <ChargesListInteractive
      charges={charges}
      missingCharges={missingCharges}
      totalFormatted={totalFormatted}
      chargesCount={charges.length}
      totalCount={charges.length + missingCharges.length}
      hasMissing={missingCharges.length > 0}
    />
  )
}
