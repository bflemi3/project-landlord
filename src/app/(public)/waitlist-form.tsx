'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Loader2, CheckCircle } from 'lucide-react'
import posthog from 'posthog-js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { joinWaitlist } from '@/app/actions/waitlist'
import { type EmailLocale } from '@/emails/i18n'
import { useWaitlist } from './waitlist-context'

export function WaitlistForm() {
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
      <div className="flex items-center gap-3 rounded-2xl bg-success/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
        <CheckCircle className="size-5 shrink-0" />
        {t('waitlistSuccess')}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <Input
        type="email"
        placeholder={t('waitlistPlaceholder')}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        disabled={loading}
        className="flex-1 border-zinc-200 bg-white shadow-sm placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-md dark:shadow-black/20 dark:placeholder:text-zinc-500"
      />
      <Button type="submit" disabled={loading} className="h-12 shrink-0 rounded-2xl px-6">
        {loading ? <Loader2 className="size-5 animate-spin" /> : t('heroCta')}
      </Button>
    </form>
  )
}
