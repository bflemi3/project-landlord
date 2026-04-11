import { cn } from '@/lib/utils'

interface FadeUpProps {
  children: React.ReactNode
  delay?: number
  index?: number
  className?: string
}

export function FadeUp({ children, delay, index, className }: FadeUpProps) {
  const resolvedDelay = delay ?? 0
  return (
    <div
      className={cn('animate-fade-up', className)}
      style={{
        animationDelay: index !== undefined
          ? `calc(var(--base-delay, 0s) + ${index} * var(--stagger, 0.08s))`
          : `${resolvedDelay}s`,
      }}
    >
      {children}
    </div>
  )
}
