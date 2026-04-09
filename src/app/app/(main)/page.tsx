import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/server'
import { FadeIn } from '@/components/fade-in'
import { fetchHomeProperties, homePropertiesQueryKey, fetchHomeActions, homeActionsQueryKey } from '@/data/home/shared'
import { HomeContent } from './home-content'
import { TenantHomeContent } from './tenant-home-content'

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
  const hour = new Date().getHours()
  const greetingKey = hour < 12 ? 'goodMorning' : hour < 18 ? 'goodAfternoon' : 'goodEvening'

  // Prefetch data so client hydration matches server render
  const queryClient = new QueryClient()
  const properties = await fetchHomeProperties(supabase)

  await queryClient.prefetchQuery({
    queryKey: homePropertiesQueryKey(),
    queryFn: () => properties,
  })

  const hasLandlordProperties = properties.some((p) => p.role === 'landlord')

  // Tenant-only users see a separate home page
  if (!hasLandlordProperties && properties.length > 0) {
    return (
      <HydrationBoundary state={dehydrate(queryClient)}>
        <FadeIn className="h-full">
          <TenantHomeContent
            firstName={firstName}
            userName={profile?.full_name ?? undefined}
            avatarUrl={profile?.avatar_url ?? undefined}
            greetingKey={greetingKey}
          />
        </FadeIn>
      </HydrationBoundary>
    )
  }

  // Landlords (or users with no properties) see the full dashboard
  await queryClient.prefetchQuery({
    queryKey: homeActionsQueryKey(),
    queryFn: () => fetchHomeActions(supabase),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FadeIn className="h-full">
        <HomeContent
          firstName={firstName}
          userName={profile?.full_name ?? undefined}
          avatarUrl={profile?.avatar_url ?? undefined}
          greetingKey={greetingKey}
        />
      </FadeIn>
    </HydrationBoundary>
  )
}
