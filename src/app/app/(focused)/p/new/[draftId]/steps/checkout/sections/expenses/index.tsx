'use client'

import { useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Receipt } from 'lucide-react'

import { type ExpenseRow } from './schemas'
import { setAllTouched, type ExpensesTouched } from './state'
import { validateExpenses } from './validation'
import type { SectionId } from '../../../../state/registry'
import {
  usePropertyCreationActions,
  usePropertyCreationState,
  usePropertyCreationStoreApi,
} from '../../../../state/use-property-creation'
import { useCheckoutContext } from '../../checkout-context'
import { Section } from '../../section'
import { ExpenseList } from './expense-list'
import { SectionSkeleton } from '../section-skeleton'
import { SummaryRow } from '../summary-row'

const SECTION_ID: SectionId = 'expenses'
const ICON = Receipt
const SUMMARY_ROW_LIMIT = 2

export function ExpensesSection() {
  const t = useTranslations('propertyCreation.checkout')
  const tExpenses = useTranslations('propertyCreation.checkout.expenses')
  const tOptions = useTranslations('propertyCreation.checkout.expenses.typeOptions')
  const { registerHeaderRef } = useCheckoutContext()
  const { setTouched } = usePropertyCreationActions()
  const storeApi = usePropertyCreationStoreApi()

  const promoteAllTouched = useCallback(() => {
    const sectionData = storeApi.getState().sectionData.expenses as
      | ExpenseRow[]
      | undefined
    setTouched<ExpensesTouched>(SECTION_ID, (prev) =>
      setAllTouched(prev, sectionData),
    )
  }, [setTouched, storeApi])

  const expenses = usePropertyCreationState((s) => s.sectionData.expenses as ExpenseRow[])

  // Block Continue while any row is incomplete. Empty list is vacuously
  // valid (expenses is optional), so a user with zero rows can still advance.
  // Cached: shares the parse with row badges + section-level isValid checks.
  const continueDisabled = !validateExpenses(expenses).ok
  
  // Section-header recap: every expense type, comma-joined. Has more
  // horizontal room than the desktop summary row, so we don't truncate.
  const sectionSummary = useMemo(
    () =>
      formatExpensesSummary(expenses, {
        verbose: true,
        newExpenseLabel: tExpenses('newExpense'),
        typeLabel: (type) => tOptions(type),
        andMoreLabel: (count) => tExpenses('summaryAndMore', { count }),
      }),
    [expenses, tExpenses, tOptions],
  )

  return (
    <Section
      id={SECTION_ID}
      onFirstVisit={promoteAllTouched}
      onLeave={promoteAllTouched}
    >
      <Section.Header ref={registerHeaderRef(SECTION_ID)}>
        <Section.Icon>
          <ICON />
        </Section.Icon>
        <Section.HeaderContent>
          <Section.Title>{t('expenses.title')}</Section.Title>
          <Section.Subtitle>{t('expenses.subtitle')}</Section.Subtitle>
          <Section.Summary>{sectionSummary}</Section.Summary>
        </Section.HeaderContent>
        <Section.Status
          doneLabel={t('status.done')}
          needsAttentionLabel={t('status.needsAttention')}
          skippedLabel={t('status.skipped')}
          upNextLabel={t('status.upNext')}
        />
      </Section.Header>
      <Section.Body>
        <ExpenseList />
        <Section.Actions
          backLabel={t('actions.back')}
          continueLabel={t('actions.continue')}
          continueDisabled={continueDisabled}
          skipLabel={t('actions.skip')}
        />
      </Section.Body>
    </Section>
  )
}

export function ExpensesSectionSkeleton() {
  return <SectionSkeleton sectionId={SECTION_ID} icon={ICON} />
}

export function ExpensesSummaryRow() {
  const t = useTranslations('propertyCreation.checkout.expenses')
  const tOptions = useTranslations(
    'propertyCreation.checkout.expenses.typeOptions',
  )
  const expenses = usePropertyCreationState(
    (s) => s.sectionData.expenses as ExpenseRow[],
  )
  // Summary card row: tighter horizontal space, so cap at 2 type names and
  // roll the rest into "+N more".
  const detail = useMemo(
    () =>
      formatExpensesSummary(expenses, {
        verbose: false,
        newExpenseLabel: t('newExpense'),
        typeLabel: (type) => tOptions(type),
        andMoreLabel: (count) => t('summaryAndMore', { count }),
      }),
    [expenses, t, tOptions],
  )
  return (
    <SummaryRow
      sectionId={SECTION_ID}
      title={t('title')}
      detail={detail || null}
    />
  )
}

// Builds the recap line shown in `Section.Summary` (verbose: every type
// listed) and `SummaryRow detail` (compact: first 2 + "+N more"). Each row
// renders as its `expense_type` translated label, falling back to "New
// expense" when the user hasn't picked a type yet so partially-filled rows
// still surface meaningfully. Returns an empty string when `expenses` is
// empty so consumers can pass `|| null` to suppress the line.
function formatExpensesSummary(
  expenses: ExpenseRow[],
  options: {
    verbose: boolean
    newExpenseLabel: string
    typeLabel: (type: NonNullable<ExpenseRow['expense_type']>) => string
    andMoreLabel: (count: number) => string
  },
): string {
  if (expenses.length === 0) return ''
  const labels = expenses.map((row) =>
    row.expense_type !== null
      ? options.typeLabel(row.expense_type)
      : options.newExpenseLabel,
  )
  if (options.verbose || labels.length <= SUMMARY_ROW_LIMIT) {
    return labels.join(', ')
  }
  const head = labels.slice(0, SUMMARY_ROW_LIMIT).join(', ')
  return `${head} ${options.andMoreLabel(labels.length - SUMMARY_ROW_LIMIT)}`
}
