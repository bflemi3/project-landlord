'use client'

import { useState, useRef, useCallback, useEffect, lazy, Suspense, type ReactNode } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { Loader2, Camera, Mail, ChevronLeft } from 'lucide-react'

// Fire import at module parse time — downloads Framer Motion while user fills invite code
const _motionPreload = import('./animated-step-transition')

const LazyAnimatedStepTransition = lazy(() =>
  _motionPreload.then((mod) => ({ default: mod.AnimatedStepTransition }))
)
import posthog from 'posthog-js'
import { createClient } from '@/lib/supabase/client'
import { useEmailVerification } from '@/lib/hooks/use-email-verification'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GoogleIcon } from '@/components/icons/google'
import { Wordmark } from '@/components/wordmark'
import { InfoBox, InfoBoxContent } from '@/components/info-box'
import { validateInviteCode } from '@/app/actions/validate-invite'

export interface SignUpFormProps {
  prevalidatedCode?: string
  invitedEmail?: string
  propertyName?: string
  codeError?: 'invalid' | 'expired'
}

export default function SignUpForm({
  prevalidatedCode,
  invitedEmail,
  propertyName,
  codeError,
}: SignUpFormProps) {
  const t = useTranslations('auth')
  const locale = useLocale()

  // Step 1: Invite code
  const [inviteCode, setInviteCode] = useState(prevalidatedCode ?? '')
  const [codeValidated, setCodeValidated] = useState(!!prevalidatedCode)
  const [validatingCode, setValidatingCode] = useState(false)

  // Step 2: Sign up
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState(invitedEmail ?? '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loadingEmail, setLoadingEmail] = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const signInHref = inviteCode ? `/auth/sign-in?code=${encodeURIComponent(inviteCode)}` : '/auth/sign-in'

  const onVerified = useCallback(() => {
    window.location.href = '/app'
  }, [])

  // Check if user already signed up but hasn't verified email (e.g., page refresh)
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && !user.email_confirmed_at) {
        setEmail(user.email ?? '')
        setSuccess(true)
      }
    })
  }, [])

  useEmailVerification(success, onVerified)

  // Step 1: Validate invite code
  async function handleValidateCode(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setValidatingCode(true)
    const result = await validateInviteCode(inviteCode)
    if (!result.valid) {
      setError(t('invalidInviteCode'))
      setValidatingCode(false)
      return
    }
    setCodeValidated(true)
    setValidatingCode(false)
  }

  // Step 2: Sign up handlers
  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleGoogleSignUp() {
    setError('')
    setLoadingGoogle(true)
    // Store invite code in cookie so callback route can redeem it
    document.cookie = `pending_invite_code=${encodeURIComponent(inviteCode)};path=/;max-age=3600;samesite=lax`
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

  async function handleEmailSignUp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoadingEmail(true)
    const supabase = createClient()

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?type=signup`,
        data: { full_name: fullName, locale, invite_code: inviteCode },
      },
    })

    if (signUpError) {
      // Don't expose internal error messages to the user
      const safeMessage = signUpError.message.includes('User already registered')
        ? t('alreadyRegistered')
        : t('signUpError')
      setError(safeMessage)
      setLoadingEmail(false)
      return
    }

    // Upload avatar if provided and user was created
    if (avatarFile && data.user) {
      const ext = avatarFile.name.split('.').pop()
      const path = `${data.user.id}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true })

      if (!uploadError) {
        const {
          data: { publicUrl },
        } = supabase.storage.from('avatars').getPublicUrl(path)

        await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', data.user.id)
      }
    }

    posthog.capture('signed_up', {
      method: 'email',
      email,
      name: fullName,
      invite_code: inviteCode,
    })

    setSuccess(true)
    setLoadingEmail(false)
  }

  const isLoading = loadingEmail || loadingGoogle

  // Shared header
  const header = (
    <div className="pb-10 text-center">
      <Wordmark />
      <p className="mt-3 text-base text-muted-foreground">{t('tagline')}</p>
    </div>
  )

  // Success state: check your email
  if (success) {
    return (
      <div className="text-center">
        <div className="pb-10">
          <Wordmark />
          <p className="mt-3 text-base text-muted-foreground">{t('tagline')}</p>
        </div>

        <div className="mx-auto mb-8 flex size-12 items-center justify-center rounded-full bg-primary/10">
          <Mail className="size-6 text-primary" />
        </div>

        <h1 className="mb-6 text-2xl font-bold">{t('checkEmail')}</h1>

        <InfoBox>
          <InfoBoxContent>
            <p>{t('checkEmailSignup', { email })}</p>
            <p className="mt-3">{t('checkEmailAutoVerify')}</p>
            <p className="mt-3 text-xs opacity-60">{t('checkEmailSpam')}</p>
          </InfoBoxContent>
        </InfoBox>

        <Link
          href={signInHref}
          className="mt-10 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ChevronLeft className="size-4" /> {t('backToSignIn')}
        </Link>
      </div>
    )
  }

  // Error state: invalid or expired code from server-side validation
  if (codeError) {
    return (
      <>
        {header}
        <InfoBox variant="destructive" className="mb-6">
          <InfoBoxContent>
            {codeError === 'expired' ? t('inviteExpired') : t('inviteInvalid')}
          </InfoBoxContent>
        </InfoBox>
        <div className="text-center">
          <Link href="/auth/sign-in" className="text-sm font-semibold text-primary hover:underline">
            {t('signIn')}
          </Link>
        </div>
      </>
    )
  }

  const inviteCodeStep: ReactNode = (
    <>
      <h1 className="mb-2 text-center text-2xl font-bold">{t('inviteCodeTitle')}</h1>
      <p className="mb-8 text-center text-sm text-muted-foreground">
        {t('inviteCodeDescription')}
      </p>

      {error && (
        <InfoBox variant="destructive" className="mb-6">
          <InfoBoxContent>{error}</InfoBoxContent>
        </InfoBox>
      )}

      <form onSubmit={handleValidateCode} className="space-y-5">
        <div>
          <Label htmlFor="inviteCode" className="mb-2">
            {t('inviteCode')}
          </Label>
          <Input
            id="inviteCode"
            type="text"
            placeholder={t('inviteCodePlaceholder')}
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            required
            disabled={validatingCode}
            autoComplete="off"
            autoFocus
          />
        </div>

        <Button
          type="submit"
          disabled={validatingCode}
          className="h-12 w-full rounded-2xl"
          size="lg"
        >
          {validatingCode ? <Loader2 className="size-5 animate-spin" /> : null}
          {t('continueWithCode')}
        </Button>
      </form>

      <div className="mt-10 text-center">
        <p className="text-sm text-muted-foreground">
          {t('alreadyHaveAccount')}{' '}
          <Link href={signInHref} className="font-semibold text-foreground">
            {t('signIn')}
          </Link>
        </p>
      </div>
    </>
  )

  const signUpStep: ReactNode = (
    <>
      <h1 className="mb-8 text-center text-2xl font-bold">{t('signUp')}</h1>

      {error && (
        <InfoBox variant="destructive" className="mb-6">
          <InfoBoxContent>{error}</InfoBoxContent>
        </InfoBox>
      )}

      {/* Google */}
      <button
        onClick={handleGoogleSignUp}
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
        <span className="text-sm text-muted-foreground">{t('orSignUpWithEmail')}</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Email form */}
      <form onSubmit={handleEmailSignUp} className="space-y-5">
        {/* Avatar upload */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative flex size-20 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border transition-colors hover:border-muted-foreground"
          >
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarPreview} alt={t('avatarPreview')} className="size-full object-cover" />
            ) : (
              <Camera className="size-6 text-muted-foreground" />
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </button>
        </div>

        <div>
          <Label htmlFor="fullName" className="mb-2">
            {t('fullName')}
          </Label>
          <Input
            id="fullName"
            type="text"
            placeholder={t('fullNamePlaceholder')}
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        <div>
          <Label htmlFor="email" className="mb-2">
            {t('email')}
          </Label>
          <Input
            id="email"
            type="email"
            placeholder={t('emailPlaceholder')}
            autoComplete="email"
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
            minLength={6}
            disabled={isLoading}
            autoComplete="new-password"
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="h-12 w-full rounded-2xl"
          size="lg"
        >
          {loadingEmail ? <Loader2 className="size-5 animate-spin" /> : null}
          {t('signUpButton')}
        </Button>
      </form>

      {/* Sign in link */}
      <div className="mt-10 text-center">
        <p className="text-sm text-muted-foreground">
          {t('alreadyHaveAccount')}{' '}
          <Link href={signInHref} className="font-semibold text-foreground">
            {t('signIn')}
          </Link>
        </p>
      </div>
    </>
  )

  // Suspense fallback: render current step without animation
  const staticFallback = !codeValidated ? (
    <div>{inviteCodeStep}</div>
  ) : (
    <div>{signUpStep}</div>
  )

  return (
    <>
      {header}

      {codeValidated && propertyName && (
        <p className="mb-6 text-center text-sm text-muted-foreground">
          {t('invitedTo', { propertyName })}
        </p>
      )}

      <Suspense fallback={staticFallback}>
        <LazyAnimatedStepTransition
          codeValidated={codeValidated}
          inviteCodeStep={inviteCodeStep}
          signUpStep={signUpStep}
        />
      </Suspense>
    </>
  )
}
