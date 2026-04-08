import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/server'
import { redeemInviteByCodeCore } from '@/app/actions/redeem-invite-by-code'
import { PostHogIdentify } from '@/components/posthog-identify'

export const metadata: Metadata = {
  title: {
    absolute: 'mabenn',
    template: '%s | mabenn',
  },
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) {
    redirect('/auth/sign-in')
  }

  const userId = data.claims.sub as string
  const email = data.claims.email as string | undefined

  // Fetch profile — single query covers auth gate + PostHog + AppBar
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, preferred_locale, avatar_url, has_redeemed_invite, acquisition_channel')
    .eq('id', userId)
    .single()

  // Check for pending invite code cookie (set during sign-in with code)
  const cookieStore = await cookies()
  const pendingCode = cookieStore.get('pending_invite_code')?.value

  if (pendingCode && !profile?.has_redeemed_invite) {
    const inviteCode = decodeURIComponent(pendingCode)
    await redeemInviteByCodeCore(supabase, userId, inviteCode)

    // Re-fetch profile to check has_redeemed_invite after redemption
    const { data: updatedProfile } = await supabase
      .from('profiles')
      .select('has_redeemed_invite')
      .eq('id', userId)
      .single()

    if (!updatedProfile?.has_redeemed_invite) {
      redirect('/auth/enter-code')
    }
    // Cookie will be stale but harmless since invite is already redeemed
  }

  if (!profile?.has_redeemed_invite && !pendingCode) {
    redirect('/auth/enter-code')
  }

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
        acquisitionChannel={profile?.acquisition_channel ?? undefined}
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        {children}
      </HydrationBoundary>
    </div>
  )
}
