import { Suspense } from 'react'
import { FrameContent } from './frame-content'

export default function PreviewFrame() {
  return (
    <Suspense>
      <FrameContent />
    </Suspense>
  )
}
