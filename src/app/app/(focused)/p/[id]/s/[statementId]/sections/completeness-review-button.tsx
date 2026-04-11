'use client'

import { scrollToMissingCharges } from './charges-list-actions'

export function ReviewButton({ label }: { label: string }) {
  return (
    <button
      onClick={scrollToMissingCharges}
      className="shrink-0 text-xs font-medium text-amber-700 underline decoration-amber-500/30 underline-offset-2 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
    >
      {label}
    </button>
  )
}
