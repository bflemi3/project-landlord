'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Building2,
  Plus,
  DoorOpen,
  ChevronRight,
  LogOut,
  ArrowLeftRight,
  Check,
  Clock,
  UserPlus,
  Receipt,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Wordmark } from '@/components/wordmark'
import { FadeUp } from '@/components/fade-up'
import { FadeUpGroup } from '@/components/fade-up-group'
import { isPropertyComplete } from '@/components/property-card'
import { PreviewOperatingCard, PreviewSetupCard } from '@/app/preview/preview-property-cards'
import { UrgentActionList } from '@/components/urgent-action-list'
import type {
  HomeScreenData,
  PropertySetupProgress,
  PendingInvite,
  UrgentAction,
  PropertyOperationalData,
} from '@/app/preview/mock-data'
import type { PreviewMembership } from '@/app/preview/mock-data'

function getGreetingKey(): 'goodMorning' | 'goodAfternoon' | 'goodEvening' {
  const hour = new Date().getHours()
  if (hour < 12) return 'goodMorning'
  if (hour < 18) return 'goodAfternoon'
  return 'goodEvening'
}

// =============================================================================
// Shared: Page shell (header + scrollable content + bottom bar)
// =============================================================================

function PageShell({
  children,
  bottomBar,
  maxWidth = 'max-w-xl',
}: {
  children: React.ReactNode
  bottomBar?: React.ReactNode
  maxWidth?: string
}) {
  return (
    <div className="flex h-svh flex-col">
      <div className="flex-1 overflow-y-auto px-6 pt-8 pb-4">
        <div className={`mx-auto ${maxWidth}`}>{children}</div>
      </div>
      {bottomBar && (
        <div className="border-border bg-background/80 shrink-0 border-t px-6 py-4 backdrop-blur-lg">
          <div className={`mx-auto ${maxWidth}`}>{bottomBar}</div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Entry point
// =============================================================================

export function HomePreview({ data }: { data: HomeScreenData }) {
  const hasProperties = data.memberships.length > 0
  const isSingleProperty = data.memberships.length === 1

  if (!hasProperties) {
    return <EmptyState firstName={data.firstName} />
  }

  if (isSingleProperty) {
    return (
      <SinglePropertyState
        firstName={data.firstName}
        membership={data.memberships[0]}
        progress={data.setupProgress[data.memberships[0].property.id]}
        pendingInvites={data.pendingInvites[data.memberships[0].property.id] ?? []}
        chargeCount={data.chargeCount[data.memberships[0].property.id] ?? 0}
        operationalData={data.operationalData?.[data.memberships[0].property.id]}
      />
    )
  }

  return (
    <MultiPropertyState
      firstName={data.firstName}
      memberships={data.memberships}
      setupProgress={data.setupProgress}
      pendingInvites={data.pendingInvites}
      chargeCount={data.chargeCount}
      operationalData={data.operationalData}
      urgentActions={data.urgentActions}
    />
  )
}

// =============================================================================
// Empty state (Case 1) — role choice
// =============================================================================

function EmptyState({ firstName }: { firstName: string }) {
  const t = useTranslations('home')
  const [showComingSoon, setShowComingSoon] = useState(false)
  const greeting = t(getGreetingKey())

  return (
    <div className="flex min-h-[844px] flex-col">
      <div className="flex justify-end px-6 pt-5">
        <LogOut className="text-muted-foreground/60 size-4" />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-16">
        <div className="w-full max-w-2xl">
          <div className="mb-8 text-center">
            <Wordmark className="text-[22px]" />
          </div>
          <div className="mb-10 text-center">
            <h1 className="text-foreground text-2xl font-bold md:text-3xl">
              {greeting}, {firstName}.
            </h1>
            <p className="text-muted-foreground mt-2 text-base md:text-lg">
              {t('roleChoiceSubtitle')}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="group border-border bg-card hover:border-primary/30 dark:border-border dark:hover:border-primary/40 flex h-full flex-col items-center rounded-2xl border px-6 py-7 text-center shadow-sm transition-all hover:shadow-md md:p-8 dark:shadow-none">
              <div className="bg-primary/10 text-primary mb-4 flex size-14 items-center justify-center rounded-2xl md:mb-5 md:size-16">
                <Building2 className="size-6 md:size-7" />
              </div>
              <h3 className="text-foreground text-lg font-semibold">{t('iOwnProperty')}</h3>
              <p className="text-muted-foreground mt-1.5 text-sm/relaxed">
                {t('iOwnPropertyDescription')}
              </p>
              <div className="text-primary mt-4 flex items-center gap-1 text-sm font-medium md:mt-5">
                {t('addProperty')} <ChevronRight className="size-4" />
              </div>
            </div>
            <button
              onClick={() => setShowComingSoon(true)}
              className="group border-border bg-card dark:border-border flex size-full flex-col items-center rounded-2xl border px-6 py-7 text-center opacity-60 shadow-sm md:p-8 dark:shadow-none"
            >
              <div className="bg-secondary text-muted-foreground mb-4 flex size-14 items-center justify-center rounded-2xl md:mb-5 md:size-16">
                <DoorOpen className="size-6 md:size-7" />
              </div>
              <h3 className="text-foreground text-lg font-semibold">{t('iRentProperty')}</h3>
              <div className="text-muted-foreground mt-1.5 min-h-14 text-sm/relaxed">
                {showComingSoon ? (
                  <p>{t('comingSoonDescription')}</p>
                ) : (
                  <p>{t('iRentPropertyDescription')}</p>
                )}
              </div>
              <span className="bg-secondary text-muted-foreground mt-4 rounded-full px-3 py-1 text-xs font-medium md:mt-5">
                {t('comingSoon')}
              </span>
            </button>
          </div>
          <div className="bg-secondary/40 mt-5 flex items-start justify-center gap-2.5 rounded-xl px-5 py-3 text-center dark:bg-transparent dark:px-0">
            <span className="flex h-5 shrink-0 items-center">
              <ArrowLeftRight className="text-muted-foreground/50 size-3.5" />
            </span>
            <p className="text-muted-foreground/70 dark:text-muted-foreground text-sm/relaxed">
              {t('roleNote')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Single property state — setup (Cases 2, 3, 4) or operating (Cases 5, 8)
// =============================================================================

function SinglePropertyState({
  firstName,
  membership,
  progress,
  pendingInvites,
  chargeCount,
  operationalData,
}: {
  firstName: string
  membership: PreviewMembership
  progress: PropertySetupProgress
  pendingInvites: PendingInvite[]
  chargeCount: number
  operationalData?: PropertyOperationalData
}) {
  const t = useTranslations('home')
  const greeting = t(getGreetingKey())

  const isFullySetup = isPropertyComplete(progress)

  // Build action items for incomplete properties
  const actions: { icon: React.ElementType; title: string; description: string; color: string }[] =
    []

  if (pendingInvites.length > 0) {
    const names = pendingInvites.map((i) => i.name ?? i.email).join(', ')
    actions.push({
      icon: Clock,
      title:
        pendingInvites.length === 1
          ? `${names} is waiting to join`
          : `${pendingInvites.length} tenants are waiting to join`,
      description: 'Your invite is pending. You can resend it.',
      color: 'text-amber-500',
    })
  }

  if (!progress.tenantsInvited && !progress.tenantsAccepted) {
    actions.push({
      icon: UserPlus,
      title: 'Invite your tenants',
      description: "They'll see exactly what they owe and why.",
      color: 'text-primary',
    })
  }

  if (!progress.chargesConfigured) {
    actions.push({
      icon: Receipt,
      title: 'Set up charges',
      description: 'Define rent, utilities, and recurring fees.',
      color: 'text-primary',
    })
  }

  if (progress.chargesConfigured && progress.tenantsAccepted && !progress.firstStatementPublished) {
    actions.push({
      icon: FileText,
      title: 'Publish your first statement',
      description: "Review and share this month's charges.",
      color: 'text-primary',
    })
  }

  return (
    <PageShell
      bottomBar={
        <div className="flex justify-center">
          <Button variant="ghost" className="text-muted-foreground h-10 rounded-2xl px-6">
            <Plus className="size-4" />
            {t('addProperty')}
          </Button>
        </div>
      }
    >
      <FadeUpGroup stagger={0.08}>
        {/* Header */}
        <FadeUp className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-foreground text-2xl font-bold">
                {greeting}, {firstName}
              </h1>
              {/* Show revenue for operating single property */}
              {isFullySetup && operationalData && (
                <p className="text-muted-foreground mt-1.5 text-lg tabular-nums">
                  <span className="text-foreground font-bold">
                    R$ {(operationalData.expectedRevenueMinor / 100).toLocaleString('pt-BR')}
                  </span>{' '}
                  expected
                  {operationalData.pendingBillCount > 0 && (
                    <span className="text-amber-600 dark:text-amber-400">
                      {' · '}
                      {operationalData.pendingBillCount}{' '}
                      {operationalData.pendingBillCount === 1 ? 'bill' : 'bills'} pending
                    </span>
                  )}
                </p>
              )}
            </div>
            <LogOut className="text-muted-foreground/60 mt-1 size-4" />
          </div>
        </FadeUp>

        {/* Single property card — setup view with checklist */}
        {!isFullySetup && (
          <FadeUp className="mb-6">
            <PreviewSetupCard
              membership={membership}
              progress={progress}
              pendingInvites={pendingInvites}
            />
          </FadeUp>
        )}

        {/* Single property card — operating view */}
        {isFullySetup && (
          <FadeUp className="mb-6">
            <PreviewOperatingCard membership={membership} opData={operationalData} />
          </FadeUp>
        )}

        {/* Action cards for setup state */}
        {actions.length > 0 && (
          <FadeUp>
            <h3 className="text-foreground mb-3 text-base font-semibold">What&apos;s next</h3>
            <div className="space-y-2">
              {actions.map((action, i) => (
                <button
                  key={i}
                  className="border-border bg-card hover:border-primary/20 dark:bg-muted/50 flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors"
                >
                  <div
                    className={`bg-secondary flex size-9 shrink-0 items-center justify-center rounded-lg ${action.color}`}
                  >
                    <action.icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground text-sm font-medium">{action.title}</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">{action.description}</p>
                  </div>
                  <ChevronRight className="text-muted-foreground/40 size-4 shrink-0" />
                </button>
              ))}
            </div>
          </FadeUp>
        )}

        {/* Calm state — operating, nothing to do */}
        {isFullySetup && actions.length === 0 && (
          <FadeUp>
            <div className="bg-primary/5 dark:bg-primary/10 rounded-2xl px-5 py-6 text-center">
              <Check className="text-primary mx-auto mb-2 size-6" />
              <p className="text-foreground text-sm font-medium">Everything is set up</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Your property is running smoothly.
              </p>
            </div>
          </FadeUp>
        )}
      </FadeUpGroup>
    </PageShell>
  )
}

// =============================================================================
// Multi-property state (Cases 5, 6, 7)
// =============================================================================

function MultiPropertyState({
  firstName,
  memberships,
  setupProgress,
  pendingInvites,
  chargeCount,
  operationalData = {},
  urgentActions = [],
}: {
  firstName: string
  memberships: PreviewMembership[]
  setupProgress: Record<string, PropertySetupProgress>
  pendingInvites: Record<string, PendingInvite[]>
  chargeCount: Record<string, number>
  operationalData?: Record<string, PropertyOperationalData>
  urgentActions?: UrgentAction[]
}) {
  const t = useTranslations('home')
  const greeting = t(getGreetingKey())

  // Separate operating from setup properties
  const operating: PreviewMembership[] = []
  const inSetup: PreviewMembership[] = []
  for (const m of memberships) {
    const progress = setupProgress[m.property.id]
    if (progress && isPropertyComplete(progress)) {
      operating.push(m)
    } else {
      inSetup.push(m)
    }
  }

  // Revenue and pending bills from operating properties
  const totalRevenue = Object.values(operationalData).reduce(
    (sum, d) => sum + d.expectedRevenueMinor,
    0,
  )
  const totalPendingBills = Object.values(operationalData).reduce(
    (sum, d) => sum + d.pendingBillCount,
    0,
  )

  return (
    <PageShell
      maxWidth="max-w-4xl"
      bottomBar={
        <div className="flex justify-center">
          <Button variant="ghost" className="text-muted-foreground h-10 rounded-2xl px-6">
            <Plus className="size-4" />
            {t('addProperty')}
          </Button>
        </div>
      }
    >
      <FadeUpGroup stagger={0.08}>
        {/* Header — greeting + portfolio revenue */}
        <FadeUp className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-foreground text-2xl font-bold">
                {greeting}, {firstName}
              </h1>
              {totalRevenue > 0 && (
                <p className="text-muted-foreground mt-1.5 text-lg tabular-nums">
                  <span className="text-foreground font-bold">
                    R$ {(totalRevenue / 100).toLocaleString('pt-BR')}
                  </span>{' '}
                  expected · {memberships.length}{' '}
                  {memberships.length === 1 ? 'property' : 'properties'}
                  {totalPendingBills > 0 && (
                    <span className="text-amber-600 dark:text-amber-400">
                      {' · '}
                      {totalPendingBills} {totalPendingBills === 1 ? 'bill' : 'bills'} pending
                    </span>
                  )}
                </p>
              )}
            </div>
            <LogOut className="text-muted-foreground/60 mt-1 size-4" />
          </div>
        </FadeUp>

        {/* Urgent actions */}
        {urgentActions.length > 0 && (
          <FadeUp className="mb-8">
            <h2 className="text-foreground mb-3 text-base font-semibold">Needs attention</h2>
            <UrgentActionList urgentActions={urgentActions} />
          </FadeUp>
        )}

        {/* All properties — setup first, then operating */}
        <FadeUp>
          <div className="grid gap-3 md:grid-cols-2">
            {inSetup.map((m) => (
              <PreviewSetupCard
                key={m.id}
                membership={m}
                progress={setupProgress[m.property.id]}
                pendingInvites={pendingInvites[m.property.id] ?? []}
              />
            ))}
            {operating.map((m) => (
              <PreviewOperatingCard
                key={m.id}
                membership={m}
                opData={operationalData[m.property.id]}
              />
            ))}
          </div>
        </FadeUp>
      </FadeUpGroup>
    </PageShell>
  )
}
