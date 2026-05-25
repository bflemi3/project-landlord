'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Loader2, CheckCircle } from 'lucide-react'
import posthog from 'posthog-js'
import { joinWaitlist } from '@/app/actions/waitlist'
import { type EmailLocale } from '@/emails/i18n'
import { useWaitlist } from './waitlist-context'

type WaitlistFormProps = {
  buttonLabel?: string
}

export function WaitlistForm({ buttonLabel }: WaitlistFormProps = {}) {
  const t = useTranslations('landing')
  const locale = useLocale() as EmailLocale
  const { submitted, setSubmitted } = useWaitlist()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    await joinWaitlist(email, locale)
    posthog.capture('waitlist_joined', { email, locale })
    setSubmitted(true)
    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-center gap-2.5 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-3 text-[13.5px] text-emerald-300">
        <CheckCircle className="size-4 shrink-0" />
        {t('waitlistSuccess')}
      </div>
    )
  }

  const label = buttonLabel ?? t('ctaButton')

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
      <input
        type="email"
        placeholder={t('waitlistPlaceholder')}
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
  )
}
