'use client'

import { Wordmark } from '@/components/wordmark'
import { UserMenuTrigger } from '@/components/user-menu'
import { useProfile } from '@/data/profiles/client'

/**
 * Desktop-only floating logo + avatar.
 * On mobile, pages render their own inline header elements.
 * Fetches its own data via useProfile — no props needed.
 */
export function AppBar() {
  const { data: profile } = useProfile()

  return (
    <>
      <div className="fixed top-5 left-8 z-30 hidden md:block">
        <Wordmark className="h-6" href="/app" />
      </div>
      <div id="app-avatar" className="fixed top-4 right-8 z-30 hidden md:block">
        <UserMenuTrigger userName={profile?.fullName ?? undefined} avatarUrl={profile?.avatarUrl ?? undefined} />
      </div>
    </>
  )
}
