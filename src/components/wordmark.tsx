import Link from 'next/link'
import { cn } from '@/lib/utils'

export function Wordmark({ className, href = '/' }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-block font-display font-semibold tracking-tight text-foreground',
        className ?? 'text-[30px]',
      )}
    >
      mabenn
    </Link>
  )
}
