import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/server'
import { SignOutButton } from './sign-out-button'

export default async function AppDashboard() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const email = data?.claims?.email as string | undefined

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-6">
      <AppContent email={email} />
    </div>
  )
}

function AppContent({ email }: { email?: string }) {
  const t = useTranslations('auth')

  return (
    <>
      <h1 className="text-2xl font-bold">{t('welcome')}</h1>
      {email && <p className="text-muted-foreground">{email}</p>}
      <SignOutButton />
    </>
  )
}
