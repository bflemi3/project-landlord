'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Wordmark } from '@/components/wordmark'
import { InfoBox, InfoBoxContent } from '@/components/info-box'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ResetPasswordPage() {
  const t = useTranslations('auth')
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError(t('passwordsDoNotMatch'))
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/app')
    }
  }

  return (
    <>
      {/* Header */}
      <div className="pb-10 text-center">
        <Wordmark />
        <p className="mt-3 text-base text-muted-foreground">{t('tagline')}</p>
      </div>

      <h1 className="mb-2 text-center text-2xl font-bold">{t('setNewPassword')}</h1>
      <p className="mb-8 text-center text-sm text-muted-foreground">
        {t('setNewPasswordDescription')}
      </p>

      {/* Error */}
      {error && (
        <InfoBox variant="destructive" className="mb-6">
          <InfoBoxContent>{error}</InfoBoxContent>
        </InfoBox>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label htmlFor="password" className="mb-2">
            {t('newPassword')}
          </Label>
          <Input
            id="password"
            type="password"
            placeholder={t('passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            disabled={loading}
            autoComplete="new-password"
            autoFocus
          />
        </div>
        <div>
          <Label htmlFor="confirmPassword" className="mb-2">
            {t('confirmPassword')}
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder={t('passwordPlaceholder')}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            disabled={loading}
            autoComplete="new-password"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-2xl"
          size="lg"
        >
          {loading ? <Loader2 className="size-5 animate-spin" /> : null}
          {t('updatePassword')}
        </Button>
      </form>
    </>
  )
}
