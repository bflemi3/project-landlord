import { Suspense } from 'react'
import { FrameContent } from './frame-content'

export default function PropertyCardsFrame() {
  return (
    <Suspense>
      <FrameContent />
    </Suspense>
  )
}
