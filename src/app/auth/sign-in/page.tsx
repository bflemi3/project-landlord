'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GoogleIcon } from '@/components/icons/google'
import { Wordmark } from '@/components/wordmark'
import { InfoBox, InfoBoxContent } from '@/components/info-box'

function SignInForm() {
  const t = useTranslations('auth')
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(errorParam ?? '')
  const [loadingEmail, setLoadingEmail] = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)

  async function handleGoogleSignIn() {
    setError('')
    setLoadingGoogle(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError(error.message)
      setLoadingGoogle(false)
    }
  }

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoadingEmail(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoadingEmail(false)
    } else {
      window.location.href = '/app'
    }
  }

  const isLoading = loadingEmail || loadingGoogle

  return (
    <>
      {/* Header */}
      <div className="pb-10 text-center">
        <Wordmark />
        <p className="mt-3 text-base text-muted-foreground">{t('tagline')}</p>
      </div>

      <h1 className="mb-8 text-center text-2xl font-bold">{t('signIn')}</h1>

      {/* Google */}
      <button
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-foreground text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:pointer-events-none disabled:opacity-50"
      >
        {loadingGoogle ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <GoogleIcon className="size-5" />
        )}
        {t('continueWithGoogle')}
      </button>

      {/* Divider */}
      <div className="my-8 flex items-center gap-4">
        <div className="h-px flex-1 bg-border" />
        <span className="text-sm text-muted-foreground">{t('orSignInWithEmail')}</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Email form */}
      <form onSubmit={handleEmailSignIn} className="space-y-5">
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
            disabled={isLoading}
          />
        </div>
        <div>
          <Label htmlFor="password" className="mb-2">
            {t('password')}
          </Label>
          <Input
            id="password"
            type="password"
            placeholder={t('passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        {error && (
          <InfoBox variant="destructive">
            <InfoBoxContent>
              {error === 'Invalid login credentials'
                ? t('invalidCredentials')
                : error}
            </InfoBoxContent>
          </InfoBox>
        )}

        <Button
          type="submit"
          disabled={isLoading}
          className="h-12 w-full rounded-2xl"
          size="lg"
        >
          {loadingEmail ? <Loader2 className="size-5 animate-spin" /> : null}
          {t('signInWithEmail')}
        </Button>
      </form>

      {/* Forgot password */}
      <div className="mt-5 text-center">
        <Link
          href="/auth/forgot-password"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {t('forgotPassword')}
        </Link>
      </div>

      {/* Sign up link */}
      <div className="mt-10 text-center">
        <p className="text-sm text-muted-foreground">
          {t('dontHaveAccount')}{' '}
          <Link href="/auth/sign-up" className="font-semibold text-foreground">
            {t('signUp')}
          </Link>
        </p>
      </div>
    </>
  )
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  )
}
