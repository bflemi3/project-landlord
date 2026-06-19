'use client'

import { useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'

import { Accordion } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import {
  ExplainerCard,
  ExplainerCardAction,
  ExplainerCardContent,
  ExplainerCardDescription,
  ExplainerCardList,
  ExplainerCardListItem,
  ExplainerCardTitle,
} from '@/components/explainer-card'
import { useDelayedRemoval } from '@/lib/hooks/use-delayed-removal'
import { useRecentlyAdded } from '@/lib/hooks/use-recently-added'

import {
  defaultExpenseRow,
  EXPENSE_ROW_FIELD_NAMES,
  type ExpenseRow as ExpenseRowType,
} from './schemas'
import {
  usePropertyCreationActions,
  usePropertyCreationState,
} from '../../../../state/use-property-creation'
import { clearRowServerErrors, type ExpensesTouched } from './state'
import { ExpenseRow } from './expense-row'

export function ExpenseList() {
  const t = useTranslations('propertyCreation.checkout.expenses')
  const { setSectionData, setExpensesListUI, setTouched, setServerErrors } =
    usePropertyCreationActions()
  const expenseIds = usePropertyCreationState(
    useShallow((s) => (s.sectionData.expenses as ExpenseRowType[]).map((row) => row.id)),
  )
  const activeExpenseId = usePropertyCreationState((s) => s.expensesListUI.activeExpenseId)
  const { markAdded, isJustAdded } = useRecentlyAdded()
  const { isRemoving, remove } = useDelayedRemoval()

  const handleAdd = useCallback(() => {
    const newRow = defaultExpenseRow()
    setSectionData<ExpenseRowType[]>('expenses', (prev) => [...prev, newRow])
    // Switching the active id collapses every other row and opens the new
    // one, which is what the spec asks for: adding an expense should jump
    // straight into editing it.
    setExpensesListUI({ activeExpenseId: newRow.id })
    markAdded(newRow.id)
  }, [markAdded, setSectionData, setExpensesListUI])

  const handleRemove = useCallback(
    (id: string) => {
      remove(id, () => {
        setSectionData<ExpenseRowType[]>('expenses', (prev) => prev.filter((row) => row.id !== id))
        setServerErrors('expenses', clearRowServerErrors(id))
        setExpensesListUI((current) =>
          current.activeExpenseId === id ? { activeExpenseId: null } : {},
        )
      })
    },
    [remove, setSectionData, setExpensesListUI, setServerErrors],
  )

  const handleActiveChange = useCallback(
    (value: string[]) => {
      // Tap-to-toggle: pressing the open row's header closes it (`value[]`
      // empty), pressing a closed row opens it (and replaces any prior open
      // id since this list is single-active). The id leaving the open slot
      // gets every field marked touched — its inline errors and badge can
      // surface on next expand.
      const nextActive = value[0] ?? null
      if (activeExpenseId && activeExpenseId !== nextActive) {
        const closingId = activeExpenseId
        setTouched<ExpensesTouched>('expenses', (prev) => {
          const existing = prev[closingId]
          if (existing && EXPENSE_ROW_FIELD_NAMES.every((f) => existing.has(f))) {
            return prev
          }
          return { ...prev, [closingId]: new Set(EXPENSE_ROW_FIELD_NAMES) }
        })
      }
      setExpensesListUI({ activeExpenseId: nextActive })
    },
    [activeExpenseId, setExpensesListUI, setTouched],
  )

  if (expenseIds.length === 0) {
    return <ExpenseListEmptyState onAdd={handleAdd} />
  }

  return (
    <div className="flex flex-col gap-6">
      <Accordion
        className="divide-border/60 divide-y"
        value={activeExpenseId ? [activeExpenseId] : []}
        onValueChange={handleActiveChange}
      >
        {expenseIds.map((id) => (
          <ExpenseRow
            key={id}
            id={id}
            isRemoving={isRemoving(id)}
            animateEntrance={isJustAdded(id)}
            onRemove={() => handleRemove(id)}
          />
        ))}
      </Accordion>
      <Button variant="secondary" onClick={handleAdd}>
        <Plus />
        {t('addAnotherExpense')}
      </Button>
    </div>
  )
}

function ExpenseListEmptyState({ onAdd }: { onAdd: () => void }) {
  const t = useTranslations('propertyCreation.checkout.expenses')
  const tEmpty = useTranslations('propertyCreation.checkout.expenses.emptyState')

  const bullets = useMemo(
    () => [tEmpty('bulletTracking'), tEmpty('bulletPayments'), tEmpty('bulletResponsibility')],
    [tEmpty],
  )

  return (
    <ExplainerCard>
      <ExplainerCardTitle>{tEmpty('title')}</ExplainerCardTitle>
      <ExplainerCardDescription>{tEmpty('leadIn')}</ExplainerCardDescription>
      <ExplainerCardContent>
        <ExplainerCardList>
          {bullets.map((bullet) => (
            <ExplainerCardListItem key={bullet}>{bullet}</ExplainerCardListItem>
          ))}
        </ExplainerCardList>
      </ExplainerCardContent>
      <ExplainerCardAction>
        <Button onClick={onAdd}>
          <Plus />
          {t('addExpense')}
        </Button>
      </ExplainerCardAction>
    </ExplainerCard>
  )
}
