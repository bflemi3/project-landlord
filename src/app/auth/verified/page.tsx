'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { CheckCircle } from 'lucide-react'
import { Wordmark } from '@/components/wordmark'
import { InfoBox, InfoBoxContent } from '@/components/info-box'

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
        <Wordmark />
        <p className="mt-3 text-base text-muted-foreground">{t('tagline')}</p>
      </div>

      <div className="mx-auto mb-8 flex size-12 items-center justify-center rounded-full bg-primary/10">
        <CheckCircle className="size-6 text-primary" />
      </div>

      <h1 className="mb-6 text-2xl font-bold">{t('emailVerified')}</h1>

      <InfoBox>
        <InfoBoxContent>{t('emailVerifiedMessage')}</InfoBoxContent>
      </InfoBox>

      <Link
        href="/app"
        className="mt-10 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        {t('orContinueHere')}
      </Link>
    </div>
  )
}
