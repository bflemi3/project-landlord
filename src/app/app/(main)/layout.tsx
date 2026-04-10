import { Suspense } from 'react'
import { Wordmark } from '@/components/wordmark'
import { UserAvatarMenu } from './user-avatar-menu'
import { SwUpdateNotifier } from '@/components/sw-update-notifier'
import { InstallPrompt } from '@/components/install-prompt'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="fixed top-5 left-8 z-30 hidden md:block">
        <Wordmark className="h-6" href="/app" />
      </div>
      <Suspense fallback={null}>
        <UserAvatarMenu />
      </Suspense>
      <div className="min-h-0 flex-1">
        {children}
      </div>
      <SwUpdateNotifier />
      <InstallPrompt />
    </>
  )
}
