'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Check, MapPin, Users, Receipt, ChevronLeft } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button-variants'
import { FadeUp } from '@/components/fade-up'
import { FadeUpGroup } from '@/components/fade-up-group'
import { InfoBox, InfoBoxContent, InfoBoxDivider } from '@/components/info-box'

interface SetupCompleteProps {
  propertyName: string
  propertyId?: string
  tenantCount?: number
  chargeCount?: number
}

export function SetupComplete({ propertyName, propertyId, tenantCount = 0, chargeCount = 0 }: SetupCompleteProps) {
  const t = useTranslations('properties')

  return (
    <div className="flex min-h-[60svh] flex-col items-center justify-center text-center">
      <FadeUpGroup stagger={0.1}>
        <FadeUp className="mb-6">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10">
            <Check className="size-8 text-primary" />
          </div>
        </FadeUp>

        <FadeUp>
          <h1 className="mb-3 text-2xl font-bold text-foreground">{t('setupComplete')}</h1>
          <p className="text-base text-muted-foreground">
            {t('setupCompleteSimple', { name: propertyName })}
          </p>
        </FadeUp>

        {/* Summary */}
        <FadeUp className="mx-auto mt-6 mb-10 w-full max-w-xs">
          <InfoBox>
            <InfoBoxContent>
              <div className="flex items-center gap-3">
                <MapPin className="size-4 shrink-0 text-primary" />
                <span className="truncate font-medium text-foreground">{propertyName}</span>
              </div>
              <InfoBoxDivider />
              <div className="flex items-center gap-3">
                <Users className="size-4 shrink-0" />
                <span className={tenantCount > 0 ? 'text-foreground' : ''}>
                  {tenantCount > 0 ? t('tenantsInvited', { count: tenantCount }) : t('noTenantsInvited')}
                </span>
              </div>
              <InfoBoxDivider />
              <div className="flex items-center gap-3">
                <Receipt className="size-4 shrink-0" />
                <span className={chargeCount > 0 ? 'text-foreground' : ''}>
                  {chargeCount > 0 ? t('chargesConfigured', { count: chargeCount }) : t('noChargesConfigured')}
                </span>
              </div>
            </InfoBoxContent>
          </InfoBox>
        </FadeUp>

        <FadeUp className="w-full space-y-3">
          {propertyId && (
            <Link href={`/app/p/${propertyId}`} className={buttonVariants({ size: 'lg', className: 'h-12 w-full rounded-2xl' })}>
              {t('viewProperty')}
            </Link>
          )}
          <Link href="/app" className={buttonVariants({ variant: 'ghost', size: 'lg', className: 'h-12 w-full rounded-2xl' })}>
            <ChevronLeft />
            {t('goHome')}
          </Link>
        </FadeUp>
      </FadeUpGroup>
    </div>
  )
}
