'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { CheckCircle } from 'lucide-react'

const BROADCAST_CHANNEL = 'mabenn-email-verification'

export default function EmailVerifiedPage() {
  const t = useTranslations('auth')

  useEffect(() => {
    try {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL)
      channel.postMessage({ type: 'EMAIL_VERIFIED' })
      setTimeout(() => channel.close(), 1000)
    } catch {
      // BroadcastChannel not supported — Tab A will pick up via polling
    }
  }, [])

  return (
    <div className="text-center">
      <div className="pb-10">
        <img src="/brand/wordmark-light.svg" alt="mabenn" className="mx-auto h-10 dark:hidden" />
        <img src="/brand/wordmark-dark.svg" alt="mabenn" className="mx-auto hidden h-10 dark:block" />
        <p className="mt-3 text-base text-muted-foreground">{t('tagline')}</p>
      </div>

      <div className="mx-auto mb-8 flex size-12 items-center justify-center rounded-full bg-primary/10">
        <CheckCircle className="size-6 text-primary" />
      </div>

      <h1 className="mb-6 text-2xl font-bold">{t('emailVerified')}</h1>

      <div className="rounded-2xl border border-border bg-secondary/50 px-5 py-5 text-sm text-muted-foreground">
        <p>{t('emailVerifiedMessage')}</p>
      </div>

      <Link
        href="/app"
        className="mt-10 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        {t('orContinueHere')}
      </Link>
    </div>
  )
}
