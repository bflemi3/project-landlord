'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Loader2, Camera, Mail, ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useEmailVerification } from '@/lib/hooks/use-email-verification'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GoogleIcon } from '@/components/icons/google'
import { Wordmark } from '@/components/wordmark'
import { InfoBox, InfoBoxContent, InfoBoxDivider } from '@/components/info-box'

export default function SignUpPage() {
  const t = useTranslations('auth')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loadingEmail, setLoadingEmail] = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onVerified = useCallback(() => {
    window.location.href = '/app'
  }, [])

  useEmailVerification(success, onVerified)

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleGoogleSignUp() {
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
        data: { full_name: fullName },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
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

    setSuccess(true)
    setLoadingEmail(false)
  }

  const isLoading = loadingEmail || loadingGoogle

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

        <InfoBox>
          <InfoBoxContent>
            <p>{t('checkEmailSignup', { email })}</p>
            <InfoBoxDivider />
            <p>{t('checkEmailAutoVerify')}</p>
            <InfoBoxDivider />
            <p>{t('checkEmailSpam')}</p>
          </InfoBoxContent>
        </InfoBox>

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
        <Wordmark />
        <p className="mt-3 text-base text-muted-foreground">{t('tagline')}</p>
      </div>

      <h1 className="mb-8 text-center text-2xl font-bold">{t('signUp')}</h1>

      {/* Error */}
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
          <Link href="/auth/sign-in" className="font-semibold text-foreground">
            {t('signIn')}
          </Link>
        </p>
      </div>
    </>
  )
}
