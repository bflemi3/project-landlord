import { Suspense } from 'react'
import { FrameContent } from './frame-content'

export default function UrgentActionsFrame() {
  return (
    <Suspense>
      <FrameContent />
    </Suspense>
  )
}
