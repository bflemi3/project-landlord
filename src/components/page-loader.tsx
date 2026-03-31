import { cn } from '@/lib/utils'

/**
 * Universal page loader — replaces per-page skeleton screens.
 *
 * Renders the mabenn "m" mark centered on screen with an orbital
 * ring animation. Drop into any loading.tsx or Suspense fallback.
 */
export function PageLoader({ className }: { className?: string }) {
  return (
    <div className={cn('flex h-full items-center justify-center', className)}>
      <div className="relative flex items-center justify-center">
        {/* Orbital ring — SVG circle track + animated arc */}
        <svg
          className="absolute size-16 animate-spin"
          style={{ animationDuration: '1.8s' }}
          viewBox="0 0 64 64"
          fill="none"
        >
          {/* Muted track */}
          <circle
            cx="32"
            cy="32"
            r="30"
            stroke="currentColor"
            strokeWidth="2"
            className="text-border"
          />
          {/* Teal arc — 90° segment */}
          <circle
            cx="32"
            cy="32"
            r="30"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="47.1 141.4"
            className="text-primary"
          />
        </svg>

        {/* m glyph */}
        <span
          className="select-none text-2xl font-extrabold text-primary"
          aria-hidden="true"
        >
          m
        </span>
      </div>
    </div>
  )
}
