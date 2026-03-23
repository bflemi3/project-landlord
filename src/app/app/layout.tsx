import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SwUpdateNotifier } from '@/components/sw-update-notifier'
import { InstallPrompt } from '@/components/install-prompt'
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

  // Fetch profile for name (used by PostHog identify)
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, preferred_locale')
    .eq('id', userId)
    .single()

  return (
    <>
      <PostHogIdentify
        userId={userId}
        email={email}
        name={profile?.full_name ?? undefined}
        locale={profile?.preferred_locale ?? undefined}
      />
      {children}
      <SwUpdateNotifier />
      <InstallPrompt />
    </>
  )
}
