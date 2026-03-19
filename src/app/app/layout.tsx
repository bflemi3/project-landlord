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

  return (
    <>
      {children}
      <SwUpdateNotifier />
      <InstallPrompt />
    </>
  )
}
