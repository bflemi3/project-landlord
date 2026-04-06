import { redirect } from 'next/navigation'
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/server'
import { PostHogIdentify } from '@/components/posthog-identify'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) {
    redirect('/auth/sign-in')
  }

  const userId = data.claims.sub as string
  const email = data.claims.email as string | undefined

  // Check if user has a redeemed invite code
  const { data: invite } = await supabase
    .from('invitations')
    .select('id')
    .eq('accepted_by', userId)
    .eq('status', 'accepted')
    .limit(1)
    .single()

  if (!invite) {
    redirect('/auth/enter-code')
  }

  // Fetch profile for PostHog identify + prefetch for AppBar's useProfile()
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, preferred_locale, avatar_url')
    .eq('id', userId)
    .single()

  // Prefetch profile query so AppBar's useProfile() hydrates instantly
  const queryClient = new QueryClient()
  await queryClient.prefetchQuery({
    queryKey: ['profile'],
    queryFn: async () => ({
      id: userId,
      fullName: profile?.full_name ?? null,
      email: email ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      preferredLocale: profile?.preferred_locale ?? null,
      pixKey: null,
      pixKeyType: null,
    }),
  })

  return (
    <div className="flex h-svh flex-col">
      <PostHogIdentify
        userId={userId}
        email={email}
        name={profile?.full_name ?? undefined}
        locale={profile?.preferred_locale ?? undefined}
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        {children}
      </HydrationBoundary>
    </div>
  )
}
