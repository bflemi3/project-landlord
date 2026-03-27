'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { PREVIEW_STATES } from '@/app/preview/mock-data'
import { HomePreview } from '@/app/preview/(shell)/home/home-preview'

function FrameContent() {
  const searchParams = useSearchParams()
  const stateKey = searchParams.get('state') ?? Object.keys(PREVIEW_STATES)[0]
  const current = PREVIEW_STATES[stateKey]

  if (!current) return <p>Unknown state: {stateKey}</p>

  return <HomePreview data={current.data} />
}

export default function PreviewFrame() {
  return (
    <Suspense>
      <FrameContent />
    </Suspense>
  )
}
