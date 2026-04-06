import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/server'
import { FadeIn } from '@/components/fade-in'
import { fetchHomeProperties, homePropertiesQueryKey } from '@/lib/queries/home-properties'
import { fetchHomeActions, homeActionsQueryKey } from '@/lib/queries/home-actions'
import { HomeContent } from './home-content'

export default async function AppHomePage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub as string

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', userId)
    .single()

  const firstName = profile?.full_name?.split(' ')[0] ?? undefined

  // Prefetch data so client hydration matches server render
  const queryClient = new QueryClient()
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: homePropertiesQueryKey(),
      queryFn: () => fetchHomeProperties(supabase),
    }),
    queryClient.prefetchQuery({
      queryKey: homeActionsQueryKey(),
      queryFn: () => fetchHomeActions(supabase),
    }),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FadeIn className="h-full">
        <HomeContent
          firstName={firstName}
          userName={profile?.full_name ?? undefined}
          avatarUrl={profile?.avatar_url ?? undefined}
        />
      </FadeIn>
    </HydrationBoundary>
  )
}
