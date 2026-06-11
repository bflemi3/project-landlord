import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { Suspense } from 'react'

import { FadeIn } from '@/components/fade-in'
import { UserMenuTrigger } from '@/components/user-menu'
import { getProfile } from '@/data/profiles/server'
import { profileQueryKey } from '@/data/profiles/shared'

export async function UserAvatarMenu() {
  // Prefetch + dehydrate so the trigger's `useSuspenseQuery` sees the same
  // profile on server and client. Without this the browser Supabase client
  // runs unauthenticated during SSR (no cookies), the server renders the
  // `?` initials fallback, and the client — which inherits PostHog's
  // dehydrated cache — re-renders with real initials, causing a hydration
  // mismatch. `getProfile` is `React.cache()`-wrapped, so siblings that
  // also call it in the same request share a single DB hit.
  const queryClient = new QueryClient()
  const profile = await getProfile()
  queryClient.setQueryData(profileQueryKey(), profile)

  return (
    <FadeIn>
      <div id="app-avatar" className="fixed top-4 right-8 z-30 hidden md:block">
        <HydrationBoundary state={dehydrate(queryClient)}>
          <Suspense fallback={null}>
            <UserMenuTrigger />
          </Suspense>
        </HydrationBoundary>
      </div>
    </FadeIn>
  )
}
