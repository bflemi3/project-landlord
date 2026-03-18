'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Loader2, ChevronLeft, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ForgotPasswordPage() {
  const t = useTranslations('auth')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    })

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="pb-10">
          <img src="/brand/wordmark-light.svg" alt="mabenn" className="mx-auto h-10 dark:hidden" />
          <img src="/brand/wordmark-dark.svg" alt="mabenn" className="mx-auto hidden h-10 dark:block" />
          <p className="mt-3 text-base text-muted-foreground">{t('tagline')}</p>
        </div>

        <div className="mx-auto mb-8 flex size-12 items-center justify-center rounded-full bg-primary/10">
          <Mail className="size-6 text-primary" />
        </div>

        <h1 className="mb-6 text-2xl font-bold">{t('checkEmail')}</h1>

        <div className="rounded-2xl border border-border bg-secondary/50 px-5 py-5 text-sm text-muted-foreground">
          <p>
            {t.rich('checkEmailReset', {
              email,
              strong: (chunks) => <strong className="text-foreground">{chunks}</strong>,
            })}
          </p>
          <div className="my-4 h-px bg-border" />
          <p>
            {t.rich('checkEmailGoogle', {
              continueWithGoogle: t('continueWithGoogle'),
              strong: (chunks) => <strong className="text-foreground">{chunks}</strong>,
            })}
          </p>
        </div>

        <Link
          href="/auth/sign-in"
          className="mt-10 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ChevronLeft className="size-4" /> {t('backToSignIn')}
        </Link>
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="pb-10 text-center">
        <img src="/brand/wordmark-light.svg" alt="mabenn" className="mx-auto h-10 dark:hidden" />
        <img src="/brand/wordmark-dark.svg" alt="mabenn" className="mx-auto hidden h-10 dark:block" />
        <p className="mt-3 text-base text-muted-foreground">{t('tagline')}</p>
      </div>

      <h1 className="mb-2 text-center text-2xl font-bold">{t('resetPassword')}</h1>
      <p className="mb-8 text-center text-sm text-muted-foreground">
        {t('resetPasswordDescription')}
      </p>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label htmlFor="email" className="mb-2">
            {t('email')}
          </Label>
          <Input
            id="email"
            type="email"
            placeholder={t('emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
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
          {t('sendResetLink')}
        </Button>

        <div className="text-center">
          <Link
            href="/auth/sign-in"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" /> {t('backToSignIn')}
          </Link>
        </div>
      </form>
    </>
  )
}
