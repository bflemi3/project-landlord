'use client'

import { FadeIn } from '@/components/fade-in'
import { CreatePropertyFlow } from './create-property-flow'

export default function NewPropertyPage() {
  return (
    <FadeIn className="h-full">
      <CreatePropertyFlow />
    </FadeIn>
  )
}
