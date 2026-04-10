import { Suspense } from 'react'
import { FadeIn } from '@/components/fade-in'
import { CardsSkeleton, ActionsSkeleton } from './home-skeletons'
import { MobileHeader, HomeBottomBar } from './home-content'
import { HomeContent } from './home-server-content'
import { PageLoader } from '@/components/page-loader'

/**
 * Home page — renders shell instantly, streams data-dependent content.
 *
 * The entire data-dependent section (greeting, cards, actions, empty state,
 * tenant view) is wrapped in a single Suspense boundary because the role
 * check (landlord vs tenant vs empty) determines which layout to render.
 */
export default function AppHomePage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <HomeContent />
    </Suspense>
  )
}
