import { Suspense } from 'react'

import { Wordmark } from '@/components/wordmark'
import { FocusCloseButton } from '@/components/focus-close-button'

/**
 * Focused detail layout — wordmark + fixed corner close (both desktop-only; on
 * mobile the page header carries its own in-flow close so nothing floats over
 * scrolling content). It OWNS the outside spacing + scroll — except the mobile
 * top padding, which the page's sticky header owns so scrolled content can't
 * peek above it in the scrollport. Full-screen flows that manage their own
 * chrome (the creation wizard) live in (focused) instead.
 */
export default function FocusedScrollLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="fixed top-5 left-8 z-30 hidden md:block">
        <Wordmark className="text-[20px]" href="/app" />
      </div>
      <Suspense fallback={null}>
        <FocusCloseButton />
      </Suspense>
      {/* scrollbar-gutter keeps content width stable when the scrollbar
          appears/disappears (e.g. expanding ledger months). */}
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-8 [scrollbar-gutter:stable] md:pt-4">
        {children}
      </div>
    </>
  )
}
