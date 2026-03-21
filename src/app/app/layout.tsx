import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SwUpdateNotifier } from '@/components/sw-update-notifier'
import { InstallPrompt } from '@/components/install-prompt'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) {
    redirect('/auth/sign-in')
  }

  const userId = data.claims.sub as string

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

  return (
    <>
      {children}
      <SwUpdateNotifier />
      <InstallPrompt />
    </>
  )
}
