import { Suspense } from 'react'
import { Wordmark } from '@/components/wordmark'
import { UserAvatarMenu } from './user-avatar-menu'
import { MobileHeader } from './mobile-header'
import { SwUpdateNotifier } from '@/components/sw-update-notifier'
import { InstallPrompt } from '@/components/install-prompt'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Desktop header — fixed positioning, hidden on mobile */}
      <div className="fixed top-5 left-8 z-30 hidden md:block">
        <Wordmark className="text-[20px]" href="/app" />
      </div>
      <Suspense fallback={null}>
        <UserAvatarMenu />
      </Suspense>

      {/* Mobile header — inline, hidden on desktop */}
      <Suspense fallback={null}>
        <MobileHeader />
      </Suspense>

      {/* Scrolling content frame. Owns the surrounding gaps — header→content
          (top), bottom, and horizontal — so pages stay consistent and don't
          set their own. min-h-full lets centered pages fill the frame + center. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex min-h-full flex-col px-6 pt-6 pb-8 md:pt-6">{children}</div>
      </div>
      <SwUpdateNotifier />
      <InstallPrompt />
    </>
  )
}
