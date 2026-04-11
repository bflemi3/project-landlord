import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { getProfile } from '@/data/profiles/server'
import { profileQueryKey } from '@/data/profiles/shared'
import { PostHogIdentify } from '@/components/posthog-identify'

/**
 * Server wrapper that prefetches profile for PostHogIdentify.
 * Without this, useProfile()'s useSuspenseQuery fails during SSR
 * because the browser Supabase client has no auth on the server.
 */
export async function PostHogIdentifyWrapper() {
  const queryClient = new QueryClient()
  const profile = await getProfile()
  queryClient.setQueryData(profileQueryKey(), profile)

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PostHogIdentify />
    </HydrationBoundary>
  )
}
