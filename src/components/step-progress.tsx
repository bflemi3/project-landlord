'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'

export type StepProgressSegmentState =
  | 'done'
  | 'active'
  | 'upcoming'
  | 'skipped'
  | 'invalid'

interface StepProgressCurrentProps {
  current: number
  total: number
  segments?: never
  labels?: never
  hideLabelsOnMobile?: never
  className?: string
}

interface StepProgressSegmentsProps {
  current?: never
  total?: never
  segments: StepProgressSegmentState[]
  labels?: string[]
  hideLabelsOnMobile?: boolean
  className?: string
}

type StepProgressProps = StepProgressCurrentProps | StepProgressSegmentsProps

const SEGMENT_CLASS: Record<StepProgressSegmentState, string> = {
  done: 'bg-primary',
  active: 'bg-primary/50',
  upcoming: 'bg-border',
  skipped: 'bg-secondary',
  invalid: 'bg-destructive',
}

export function StepProgress(props: StepProgressProps) {
  const { className } = props
  const { segments: segmentsProp, current, total } = props

  const segments = useMemo<StepProgressSegmentState[]>(() => {
    if (segmentsProp) return segmentsProp
    return Array.from({ length: total }, (_, i) =>
      i < current ? 'done' : 'upcoming',
    )
  }, [segmentsProp, current, total])

  const labels = segmentsProp ? props.labels : undefined
  const hideLabelsOnMobile = segmentsProp
    ? (props.hideLabelsOnMobile ?? true)
    : true
  const doneCount = useMemo(
    () => segments.filter((s) => s === 'done').length,
    [segments],
  )

  return (
    <div
      data-slot="step-progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={segments.length}
      aria-valuenow={doneCount}
      className={cn('flex flex-col gap-2', className)}
    >
      <div className="flex gap-1">
        {segments.map((state, i) => (
          <div
            key={i}
            data-segment-state={state}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors duration-300',
              SEGMENT_CLASS[state],
            )}
          />
        ))}
      </div>
      {labels && labels.length > 0 && (
        <div
          data-slot="step-progress-labels"
          className={cn(
            'flex gap-1',
            hideLabelsOnMobile && 'hidden md:flex',
          )}
        >
          {segments.map((state, i) => (
            <span
              key={i}
              data-segment-state={state}
              className={cn(
                'flex-1 text-center text-xs',
                state === 'active'
                  ? 'font-semibold text-foreground'
                  : 'text-muted-foreground',
              )}
            >
              {labels[i] ?? ''}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
