import {
  QueryClient,
  dehydrate,
  HydrationBoundary,
} from '@tanstack/react-query'
import { Suspense } from 'react'

import { FadeIn } from '@/components/fade-in'
import { Wordmark } from '@/components/wordmark'
import { UserMenuTrigger } from '@/components/user-menu'
import { getProfile } from '@/data/profiles/server'
import { profileQueryKey } from '@/data/profiles/shared'

export async function MobileHeader() {
  // Same prefetch + dehydrate pattern as UserAvatarMenu — see the comment
  // there for why this is necessary.
  const queryClient = new QueryClient()
  const profile = await getProfile()
  queryClient.setQueryData(profileQueryKey(), profile)

  return (
    <div className="flex shrink-0 items-center justify-between px-5 pt-4 md:hidden">
      <Wordmark className="text-[20px]" href="/app" />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={null}>
          <FadeIn>
            <UserMenuTrigger />
          </FadeIn>
        </Suspense>
      </HydrationBoundary>
    </div>
  )
}
