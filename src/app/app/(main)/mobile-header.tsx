import { Suspense } from 'react'
import { FadeIn } from '@/components/fade-in'
import { Wordmark } from '@/components/wordmark'
import { UserMenuTrigger } from '@/components/user-menu'
import { getProfile } from '@/data/profiles/server'

async function MobileAvatar() {
  const profile = await getProfile()
  return (
    <FadeIn>
      <UserMenuTrigger
        userName={profile?.fullName ?? undefined}
        avatarUrl={profile?.avatarUrl ?? undefined}
      />
    </FadeIn>
  )
}

export function MobileHeader() {
  return (
    <div className="flex shrink-0 items-center justify-between px-5 pt-4 md:hidden">
      <Wordmark className="h-5" href="/app" />
      <Suspense fallback={null}>
        <MobileAvatar />
      </Suspense>
    </div>
  )
}
