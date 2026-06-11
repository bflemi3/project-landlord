'use client'

import { Sparkles } from 'lucide-react'

import { cn } from '@/lib/utils'

import { useIsExtracted, type ExtractedFieldPath } from '../../../state/use-property-creation'

/** Visual primitive for the "auto-filled from contract" marker. Always
 *  renders. Consumers gate visibility themselves — either via `useIsExtracted`
 *  (path-based, see `AutoFilledIndicator`) or via a row-level boolean flag
 *  (`tenant.isExtracted` / `expense.isExtracted`). */
export function AutoFilledIcon({ className }: { className?: string }) {
  return <Sparkles aria-hidden className={cn('text-primary size-3', className)} />
}

/** Path-gated wrapper: shows the marker iff the field at `path` matches
 *  what extraction produced (and is itself non-empty). */
export function AutoFilledIndicator({ path }: { path: ExtractedFieldPath }) {
  const isExtracted = useIsExtracted(path)
  if (!isExtracted) return null
  return <AutoFilledIcon />
}
