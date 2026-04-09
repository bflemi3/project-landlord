import { cn } from '@/lib/utils'

export function FadeIn({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn('animate-fade-in', className)}>{children}</div>
}
