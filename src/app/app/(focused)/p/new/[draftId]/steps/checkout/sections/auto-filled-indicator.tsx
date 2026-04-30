'use client'

import { Sparkles } from 'lucide-react'

import {
  useIsExtracted,
  type ExtractedFieldPath,
} from '../../../state/use-property-creation'

export function AutoFilledIndicator({ path }: { path: ExtractedFieldPath }) {
  const isExtracted = useIsExtracted(path)
  if (!isExtracted) return null
  return <Sparkles className="text-primary size-3" />
}
