'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'

interface StepProgressProps {
  current: number
  total: number
  className?: string
}

export function StepProgress({ current, total, className }: StepProgressProps) {
  const steps = useMemo(() => Array.from({ length: total }, (_, i) => i), [total])

  return (
    <div className={cn('flex gap-1.5', className)}>
      {steps.map((i) => (
        <div
          key={i}
          className={cn(
            'h-1 flex-1 rounded-full transition-colors duration-300',
            i < current ? 'bg-primary' : 'bg-border',
          )}
        />
      ))}
    </div>
  )
}
