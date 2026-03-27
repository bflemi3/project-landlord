'use client'

import { Wordmark } from '@/components/wordmark'
import { UserMenuTrigger } from '@/components/user-menu'

interface AppBarProps {
  userName?: string
  avatarUrl?: string
}

/**
 * Floating nav overlay — wordmark top-left, avatar top-right.
 * No bar, no border. Content scrolls behind with a subtle fade.
 */
export function AppBar({ userName, avatarUrl }: AppBarProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-30 flex items-start justify-between px-5 pt-4 md:px-8 md:pt-5">
      {/* Fade gradient so elements stay readable over scrolling content */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-background via-background/80 to-transparent" />

      {/* Left — wordmark */}
      <div className="pointer-events-auto relative">
        <Wordmark className="h-5 md:h-6" href="/app" />
      </div>

      {/* Right — avatar */}
      <div className="pointer-events-auto relative">
        <UserMenuTrigger userName={userName} avatarUrl={avatarUrl} />
      </div>
    </div>
  )
}
