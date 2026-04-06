'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Wordmark } from '@/components/wordmark'
import { InfoBox, InfoBoxContent } from '@/components/info-box'
import { redeemInviteCode } from '@/app/actions/redeem-invite'
import { createClient } from '@/lib/supabase/client'

export default function EnterCodePage() {
  const t = useTranslations('auth')
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)

  // Redirect unauthenticated users to sign-in, users with access to /app
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.replace('/auth/sign-in')
        return
      }
      // Check if user already has a redeemed invite via profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('has_redeemed_invite')
        .eq('id', user.id)
        .single()
      if (profile?.has_redeemed_invite) {
        router.replace('/app')
        return
      }
      setAuthenticated(true)
    })
  }, [router])

  if (!authenticated) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { success } = await redeemInviteCode(code)

    if (!success) {
      setError(t('invalidInviteCode'))
      setLoading(false)
      return
    }

    window.location.href = '/app'
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/auth/sign-in'
  }

  return (
    <>
      <div className="pb-10 text-center">
        <Wordmark />
        <p className="mt-3 text-base text-muted-foreground">{t('tagline')}</p>
      </div>

      <h1 className="mb-2 text-center text-2xl font-bold">{t('inviteCodeTitle')}</h1>
      <p className="mb-8 text-center text-sm text-muted-foreground">
        {t('inviteCodeDescription')}
      </p>

      {error && (
        <InfoBox variant="destructive" className="mb-6">
          <InfoBoxContent>{error}</InfoBoxContent>
        </InfoBox>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label htmlFor="inviteCode" className="mb-2">
            {t('inviteCode')}
          </Label>
          <Input
            id="inviteCode"
            type="text"
            placeholder={t('inviteCodePlaceholder')}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            disabled={loading}
            autoComplete="off"
            autoFocus
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-2xl"
          size="lg"
        >
          {loading ? <Loader2 className="size-5 animate-spin" /> : null}
          {t('continueWithCode')}
        </Button>
      </form>

      <div className="mt-10 text-center">
        <button
          onClick={handleSignOut}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {t('signOut')}
        </button>
      </div>
    </>
  )
}
