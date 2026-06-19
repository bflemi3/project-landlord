import Link from 'next/link'
import { cn } from '@/lib/utils'

export function Wordmark({ className, href = '/' }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        'font-display text-foreground inline-block font-semibold tracking-tight',
        className ?? 'text-[30px]',
      )}
    >
      mabenn
    </Link>
  )
}
