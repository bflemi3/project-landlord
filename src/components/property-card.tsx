'use client'

import type { PropertySetupProgress, PropertyOperationalData } from '@/lib/types/property'

// =============================================================================
// Helpers — shared between home page, property detail, and preview
// =============================================================================

export function getCompletionSteps(progress: PropertySetupProgress): { label: string; key: string; done: boolean; inProgress: boolean }[] {
  return [
    { label: 'propertyCreated', key: 'property', done: progress.propertyCreated, inProgress: false },
    { label: 'tenantsStep', key: 'tenants', done: progress.tenantsAccepted, inProgress: progress.tenantsInvited && !progress.tenantsAccepted },
    { label: 'chargesStep', key: 'charges', done: progress.chargesConfigured, inProgress: false },
    { label: 'firstStatementStep', key: 'statement', done: progress.firstStatementPublished, inProgress: false },
  ]
}

export function isPropertyComplete(progress: PropertySetupProgress): boolean {
  return getCompletionSteps(progress).every((s) => s.done)
}

export interface StatusBadge {
  labelKey: string
  labelParams?: Record<string, number>
  dot: string
  text: string
}

export function getStatusBadge(opData: PropertyOperationalData | undefined): StatusBadge | null {
  if (!opData) return null

  if (opData.unpaidCount > 0) {
    return {
      labelKey: 'statusUnpaid',
      labelParams: { count: opData.unpaidCount },
      dot: 'bg-rose-500',
      text: 'text-rose-600 dark:text-rose-400',
    }
  }

  if (opData.pendingBillCount > 0) {
    return {
      labelKey: 'statusBillsPending',
      labelParams: { count: opData.pendingBillCount },
      dot: 'bg-amber-500',
      text: 'text-amber-600 dark:text-amber-400',
    }
  }

  return {
    labelKey: 'statusAllPaid',
    dot: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
  }
}
