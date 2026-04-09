'use client'

import { Children, cloneElement, isValidElement } from 'react'
import { FadeUp } from './fade-up'

export function FadeUpGroup({
  children,
  baseDelay = 0,
  stagger = 0.08,
  className,
}: {
  children: React.ReactNode
  baseDelay?: number
  stagger?: number
  className?: string
}) {
  let index = 0
  const indexed = Children.map(children, (child) => {
    if (isValidElement(child) && child.type === FadeUp) {
      return cloneElement(child, { index: index++ } as Record<string, unknown>)
    }
    return child
  })

  return (
    <div
      className={className}
      style={{
        '--base-delay': `${baseDelay}s`,
        '--stagger': `${stagger}s`,
      } as React.CSSProperties}
    >
      {indexed}
    </div>
  )
}
