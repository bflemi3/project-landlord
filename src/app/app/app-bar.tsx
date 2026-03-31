'use client'

import { Wordmark } from '@/components/wordmark'
import { UserMenuTrigger } from '@/components/user-menu'

interface AppBarProps {
  userName?: string
  avatarUrl?: string
}

/**
 * Desktop-only floating logo + avatar.
 * On mobile, pages render their own inline header elements.
 */
export function AppBar({ userName, avatarUrl }: AppBarProps) {
  return (
    <>
      <div className="fixed top-5 left-8 z-30 hidden md:block">
        <Wordmark className="h-6" href="/app" />
      </div>
      <div id="app-avatar" className="fixed top-4 right-8 z-30 hidden md:block">
        <UserMenuTrigger userName={userName} avatarUrl={avatarUrl} />
      </div>
    </>
  )
}
