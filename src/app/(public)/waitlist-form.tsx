'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import posthog from 'posthog-js'
import { joinWaitlist } from '@/app/actions/waitlist'
import { localizedPath } from '@/lib/i18n/localized-paths'
import { type EmailLocale } from '@/emails/i18n'
import { useWaitlist } from './waitlist-context'

type WaitlistFormProps = {
  buttonLabel?: string
}

export function WaitlistForm({ buttonLabel }: WaitlistFormProps = {}) {
  const t = useTranslations('landing')
  const locale = useLocale() as EmailLocale
  const { submitted, restored, role, setRole, markJoined } = useWaitlist()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Any "Join the waitlist" link points at #waitlist; once it's pressed, focus the
  // email field after the smooth scroll begins (preventScroll keeps the scroll intact).
  useEffect(() => {
    function focusEmail(e: MouseEvent) {
      const target = e.target as HTMLElement | null
      if (target?.closest('a[href="#waitlist"]')) {
        requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }))
      }
    }
    document.addEventListener('click', focusEmail)
    return () => document.removeEventListener('click', focusEmail)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setError(false)
    setLoading(true)
    try {
      const result = await joinWaitlist(email, locale, role)
      if (!result.success) {
        setError(true)
        return
      }
      posthog.identify(email, { email })
      posthog.capture('waitlist_joined', { email, locale, role })
      markJoined(role)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    // Animate only a fresh submit; a restored confirmation appears statically.
    const animate = !restored
    return (
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <div
          className={`flex size-11 items-center justify-center rounded-full bg-[#e9408f]/15 text-[#e9408f] ${
            animate ? 'success-pop' : ''
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path
              d="M20 6 9 17l-5-5"
              pathLength={1}
              className={animate ? 'success-check' : undefined}
              style={animate ? { strokeDasharray: 1, strokeDashoffset: 1 } : undefined}
            />
          </svg>
        </div>
        <div className={animate ? 'success-text' : undefined}>
          <p className="font-display text-[20px] font-medium tracking-tight text-[#f5f5f4]">
            {t('waitlistSuccessTitle')}
          </p>
          <p className="mx-auto mt-1.5 max-w-[34ch] text-[13.5px] leading-[1.55] text-[#a8a29e]">
            {t('waitlistSuccessBody')}
          </p>
        </div>
      </div>
    )
  }

  const label = error ? t('waitlistRetry') : (buttonLabel ?? t('ctaButton'))
  // es has no localized legal route — it shares the en URL (no /privacidad).
  const privacyHref = localizedPath(locale === 'pt-BR' ? 'pt-BR' : 'en', 'privacy')

  return (
    <div>
      <div
        role="group"
        className="relative mx-auto mb-2 flex w-fit rounded-full border border-white/[0.08] bg-white/[0.03] p-1"
      >
        <span
          className={`pointer-events-none absolute inset-y-1 left-1 w-[112px] rounded-full bg-[#f5f0e8] transition-transform duration-300 ease-out ${
            role === 'tenant' ? 'translate-x-full' : 'translate-x-0'
          }`}
          aria-hidden
        />
        <button
          type="button"
          aria-pressed={role === 'landlord'}
          onClick={() => setRole('landlord')}
          className={`relative z-10 w-[112px] rounded-full py-1.5 text-[13px] font-medium transition-colors ${
            role === 'landlord' ? 'text-[#1c1917]' : 'text-[#a8a29e] hover:text-[#f5f5f4]'
          }`}
        >
          {t('waitlistRoleLandlord')}
        </button>
        <button
          type="button"
          aria-pressed={role === 'tenant'}
          onClick={() => setRole('tenant')}
          className={`relative z-10 w-[112px] rounded-full py-1.5 text-[13px] font-medium transition-colors ${
            role === 'tenant' ? 'text-[#1c1917]' : 'text-[#a8a29e] hover:text-[#f5f5f4]'
          }`}
        >
          {t('waitlistRoleTenant')}
        </button>
      </div>
      {/* Reserved line so toggling never shifts the form; text only fades in for tenants. */}
      <p
        className={`mb-3 text-center text-[12.5px] leading-[1.4] text-[#f0a4c5] transition-opacity duration-200 ${
          role === 'tenant' ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden={role !== 'tenant'}
      >
        {t('waitlistTenantHelper')}
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
      <input
        ref={inputRef}
        type="email"
        placeholder={t('waitlistPlaceholder')}
        aria-label={t('waitlistEmailLabel')}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        disabled={loading}
        className="min-w-0 flex-1 rounded-full border border-white/[0.10] bg-white/[0.03] px-5 py-3 text-[14px] text-[#f5f5f4] placeholder:text-[#78716c] outline-none transition-colors focus:border-[#e9408f]/40 focus:bg-white/[0.05] disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={loading}
        className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#f5f0e8] px-6 py-3 text-[14px] font-medium text-[#1c1917] transition-colors hover:bg-[#ebe5d9] disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            {label}
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
          </>
        )}
      </button>
      </form>
      <p className="mt-5 text-center text-[12.5px] leading-[1.5] text-[#78716c]">{t('ctaFinePrint')}</p>
      <p className="mt-1.5 text-center text-[12.5px] leading-[1.5] text-[#78716c]">
        {t.rich('ctaConsent', {
          privacy: (chunks) => (
            <Link
              href={privacyHref}
              className="underline underline-offset-2 transition-colors hover:text-[#a8a29e]"
            >
              {chunks}
            </Link>
          ),
        })}
      </p>
      {/* Reserved line so a failed submit doesn't shift the layout; fades in only on error. */}
      <p
        className={`mt-2 text-center text-[12.5px] leading-[1.4] text-red-400 transition-opacity duration-200 ${
          error ? 'opacity-100' : 'opacity-0'
        }`}
        role="alert"
        aria-hidden={!error}
      >
        {t('waitlistError')}
      </p>
    </div>
  )
}
