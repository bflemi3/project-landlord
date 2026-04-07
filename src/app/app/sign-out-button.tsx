'use client'

import { useTranslations } from 'next-intl'
import posthog from 'posthog-js'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function SignOutButton() {
  const t = useTranslations('auth')

  async function handleSignOut() {
    posthog.reset()
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/auth/sign-in'
  }

  return (
    <Button onClick={handleSignOut} variant="outline" className="rounded-2xl">
      {t('signOut')}
    </Button>
  )
}
