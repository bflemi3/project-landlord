'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { PreviewOperatingCard, PreviewSetupCard } from '@/app/preview/preview-property-cards'
import { OPERATING_VARIANTS, SETUP_VARIANTS } from '@/app/preview/component-data'

function FrameContent() {
  const searchParams = useSearchParams()
  const type = searchParams.get('type') // 'operating' | 'setup'
  const index = Number(searchParams.get('index') ?? 0)

  if (type === 'operating') {
    const variant = OPERATING_VARIANTS[index]
    if (!variant) return <p className="p-4 text-sm text-muted-foreground">Unknown variant</p>
    return (
      <div className="p-6">
        <PreviewOperatingCard membership={variant.membership} opData={variant.opData} />
      </div>
    )
  }

  if (type === 'setup') {
    const variant = SETUP_VARIANTS[index]
    if (!variant) return <p className="p-4 text-sm text-muted-foreground">Unknown variant</p>
    return (
      <div className="p-6">
        <PreviewSetupCard
          membership={variant.membership}
          progress={variant.progress}
          pendingInvites={variant.pendingInvites}
        />
      </div>
    )
  }

  return <p className="p-4 text-sm text-muted-foreground">Unknown type: {type}</p>
}

export default function PropertyCardsFrame() {
  return (
    <Suspense>
      <FrameContent />
    </Suspense>
  )
}
