'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import {
  Building2, Plus, DoorOpen,
  ChevronRight, ArrowLeftRight,
  Check, Clock, UserPlus, Receipt, FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FadeUp } from '@/components/fade-up'
import { StickyBottomBar } from '@/components/sticky-bottom-bar'
import { OperatingPropertyCard, SetupPropertyCard, isPropertyComplete } from '@/components/property-card'
import { useMemberships, type MembershipWithProperty } from '@/lib/hooks/use-memberships'
import { usePropertyCounts, type PropertyCounts } from '@/lib/hooks/use-property-counts'
import type { PropertySetupProgress } from '@/lib/types/property'

function getGreetingKey(): 'goodMorning' | 'goodAfternoon' | 'goodEvening' {
  const hour = new Date().getHours()
  if (hour < 12) return 'goodMorning'
  if (hour < 18) return 'goodAfternoon'
  return 'goodEvening'
}

/**
 * Derive setup progress from property counts.
 * Since we don't have statements yet in MVP, firstStatementPublished is always false.
 */
export function deriveSetupProgress(counts: PropertyCounts): PropertySetupProgress {
  return {
    propertyCreated: true,
    tenantsInvited: counts.tenantCount > 0 || counts.pendingInviteCount > 0,
    tenantsAccepted: counts.tenantCount > 0,
    chargesConfigured: counts.chargeCount > 0,
    firstStatementPublished: false,
  }
}

export function HomeContent({ firstName }: { firstName?: string }) {
  const { data: memberships } = useMemberships()
  const hasProperties = memberships.length > 0

  if (hasProperties) {
    return <PopulatedState memberships={memberships} firstName={firstName} />
  }

  return <EmptyState firstName={firstName} />
}

// =============================================================================
// Empty state — full-screen centered hero with role choice
// =============================================================================

function EmptyState({ firstName }: { firstName?: string }) {
  const t = useTranslations('home')
  const [showComingSoon, setShowComingSoon] = useState(false)
  const greeting = t(getGreetingKey())

  return (
    <div className="flex h-svh flex-col">
      {/* Centered content */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-8 pt-14">
        <FadeUp.Group className="w-full max-w-2xl" stagger={0.1} baseDelay={0}>
          {/* Greeting + subtitle */}
          <FadeUp className="mb-10 text-center">
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">
              {greeting}{firstName ? `, ${firstName}` : ''}.
            </h1>
            <p className="mt-2 text-base text-muted-foreground md:text-lg">
              {t('roleChoiceSubtitle')}
            </p>
          </FadeUp>

          {/* Role cards — stacked on mobile, side by side on desktop */}
          <FadeUp>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Landlord card */}
              <Link
                href="/app/p/new"
                className="group flex h-full flex-col items-center rounded-2xl border border-border bg-card px-6 py-7 text-center shadow-sm transition-all hover:border-primary/30 hover:shadow-md dark:border-border dark:shadow-none dark:hover:border-primary/40 md:p-8"
              >
                <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15 md:mb-5 md:size-16">
                  <Building2 className="size-6 md:size-7" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {t('iOwnProperty')}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {t('iOwnPropertyDescription')}
                </p>
                <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary md:mt-5 md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
                  {t('addProperty')}
                  <ChevronRight className="size-4" />
                </div>
              </Link>

              {/* Tenant card — disabled feel, text swaps on tap */}
              <button
                onClick={() => setShowComingSoon(true)}
                className="group flex h-full w-full flex-col items-center rounded-2xl border border-border bg-card px-6 py-7 text-center opacity-60 shadow-sm transition-all hover:opacity-80 dark:border-border dark:shadow-none md:p-8"
              >
                <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground md:mb-5 md:size-16">
                  <DoorOpen className="size-6 md:size-7" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {t('iRentProperty')}
                </h3>
                <div className="mt-1.5 min-h-[3.5rem] text-sm leading-relaxed text-muted-foreground">
                  {showComingSoon ? (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {t('comingSoonDescription')}
                    </motion.p>
                  ) : (
                    <p>{t('iRentPropertyDescription')}</p>
                  )}
                </div>
                <span className="mt-4 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground md:mt-5">
                  {t('comingSoon')}
                </span>
              </button>
            </div>
          </FadeUp>

          {/* Reassurance — bridges the two cards */}
          <FadeUp className="mt-5 flex items-start justify-center gap-2.5 rounded-xl bg-secondary/40 px-5 py-3 text-center dark:bg-transparent dark:px-0">
            <span className="flex h-5 shrink-0 items-center"><ArrowLeftRight className="size-3.5 text-muted-foreground/50" /></span>
            <p className="text-sm leading-relaxed text-muted-foreground/70 dark:text-muted-foreground">
              {t('roleNote')}
            </p>
          </FadeUp>
        </FadeUp.Group>
      </div>

    </div>
  )
}

// =============================================================================
// Populated state — property cards with setup/operating distinction
// =============================================================================

function PopulatedState({ memberships, firstName }: { memberships: MembershipWithProperty[]; firstName?: string }) {
  const t = useTranslations('home')
  const router = useRouter()
  const greeting = t(getGreetingKey())

  const propertyIds = useMemo(() => memberships.map((m) => m.property.id), [memberships])
  const { data: countsByProperty } = usePropertyCounts(propertyIds)

  // Derive setup progress for each property
  const progressByProperty = useMemo(() => {
    const map = new Map<string, PropertySetupProgress>()
    for (const m of memberships) {
      const counts = countsByProperty[m.property.id]
      if (counts) {
        map.set(m.property.id, deriveSetupProgress(counts))
      }
    }
    return map
  }, [memberships, countsByProperty])

  // Separate setup from operating
  const { inSetup, operating } = useMemo(() => {
    const setup: MembershipWithProperty[] = []
    const op: MembershipWithProperty[] = []
    for (const m of memberships) {
      const progress = progressByProperty.get(m.property.id)
      if (progress && isPropertyComplete(progress)) {
        op.push(m)
      } else {
        setup.push(m)
      }
    }
    return { inSetup: setup, operating: op }
  }, [memberships, progressByProperty])

  // Build action items for single-property setup views
  const actions = useMemo(() => {
    if (memberships.length !== 1) return []

    const items: { icon: React.ElementType; title: string; description: string; color: string }[] = []
    const m = memberships[0]
    const counts = countsByProperty[m.property.id]
    const progress = progressByProperty.get(m.property.id)

    if (counts && counts.pendingInviteCount > 0) {
      items.push({
        icon: Clock,
        title: counts.pendingInviteCount === 1
          ? t('pendingInviteSingular')
          : t('pendingInvitePlural', { count: counts.pendingInviteCount }),
        description: t('pendingInviteDescription'),
        color: 'text-amber-500',
      })
    }

    if (progress && !progress.tenantsInvited) {
      items.push({
        icon: UserPlus,
        title: t('actionInviteTenants'),
        description: t('actionInviteTenantsDescription'),
        color: 'text-primary',
      })
    }

    if (progress && !progress.chargesConfigured) {
      items.push({
        icon: Receipt,
        title: t('actionSetUpCharges'),
        description: t('actionSetUpChargesDescription'),
        color: 'text-primary',
      })
    }

    if (progress && progress.chargesConfigured && progress.tenantsAccepted && !progress.firstStatementPublished) {
      items.push({
        icon: FileText,
        title: t('actionPublishStatement'),
        description: t('actionPublishStatementDescription'),
        color: 'text-primary',
      })
    }

    return items
  }, [memberships, countsByProperty, progressByProperty, t])

  const isSingleProperty = memberships.length === 1

  return (
    <div className="flex h-svh flex-col">
      <div className="flex-1 overflow-y-auto px-6 pt-14 pb-4">
        <div className={`mx-auto ${isSingleProperty ? 'max-w-xl' : 'max-w-4xl'}`}>
        <FadeUp.Group stagger={0.08}>
          {/* Header */}
          <FadeUp className="mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {greeting}{firstName ? `, ${firstName}` : ''}
              </h1>
              {memberships.length > 1 && (
                <p className="mt-1.5 text-lg text-muted-foreground">
                  {memberships.length} {t('propertiesCount')}
                </p>
              )}
            </div>
          </FadeUp>

          {/* Property cards */}
          <FadeUp>
            <div className="grid gap-3 md:grid-cols-2">
              {inSetup.map((m) => (
                <Link key={m.id} href={`/app/p/${m.property.id}`} className="block">
                  <SetupPropertyCard
                    membership={m}
                    progress={progressByProperty.get(m.property.id)!}
                    pendingInvites={[]}
                  />
                </Link>
              ))}
              {operating.map((m) => (
                <Link key={m.id} href={`/app/p/${m.property.id}`} className="block">
                  <OperatingPropertyCard membership={m} />
                </Link>
              ))}
            </div>
          </FadeUp>

          {/* Action cards for single-property setup */}
          {isSingleProperty && actions.length > 0 && (
            <FadeUp className="mt-8">
              <h3 className="mb-3 text-base font-semibold text-foreground">{t('whatsNext')}</h3>
              <div className="space-y-2">
                {actions.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => router.push(`/app/p/${memberships[0].property.id}`)}
                    className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-left transition-colors hover:border-primary/20 dark:border-zinc-700 dark:bg-zinc-800/50"
                  >
                    <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary ${action.color}`}>
                      <action.icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{action.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{action.description}</p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground/40" />
                  </button>
                ))}
              </div>
            </FadeUp>
          )}

          {/* Calm state — single property, fully set up */}
          {isSingleProperty && actions.length === 0 && operating.length === 1 && (
            <FadeUp className="mt-8">
              <div className="rounded-2xl bg-primary/5 px-5 py-6 text-center dark:bg-primary/10">
                <Check className="mx-auto mb-2 size-6 text-primary" />
                <p className="text-sm font-medium text-foreground">{t('allSetUp')}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t('allSetUpDescription')}</p>
              </div>
            </FadeUp>
          )}
        </FadeUp.Group>
        </div>
      </div>

      {/* Add property — always visible at bottom */}
      <StickyBottomBar>
        <div className={`mx-auto flex justify-center ${isSingleProperty ? 'max-w-xl' : 'max-w-4xl'}`}>
          <Link href="/app/p/new">
            <Button variant="ghost" className="h-10 rounded-2xl px-6 text-muted-foreground md:w-auto">
              <Plus className="size-4" />
              {t('addProperty')}
            </Button>
          </Link>
        </div>
      </StickyBottomBar>
    </div>
  )
}