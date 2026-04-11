import { Suspense } from 'react'
import { HomeRouter } from './home-router'
import { PageLoader } from '@/components/page-loader'

/**
 * Home page — renders instantly, streams content.
 *
 * The only blocking query is the router's role check (SELECT DISTINCT role
 * FROM memberships) which is near-instant. Once the role is determined,
 * the appropriate view renders with sections streaming independently.
 */
export default function AppHomePage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <HomeRouter />
    </Suspense>
  )
}
