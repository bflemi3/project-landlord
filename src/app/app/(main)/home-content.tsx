'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import {
  Building2, Plus, DoorOpen,
  ChevronRight, ArrowLeftRight,
  Check, Clock, UserPlus, Receipt, FileText,
} from 'lucide-react'
import { buttonVariants } from '@/components/ui/button-variants'
import { StickyBottomBar } from '@/components/sticky-bottom-bar'
import { isPropertyComplete, getCompletionSteps } from '@/components/property-card'
import type { HomeProperty, HomeAction } from '@/data/home/shared'
import type { PropertySetupProgress } from '@/lib/types/property'

function deriveSetupProgress(p: HomeProperty): PropertySetupProgress {
  return {
    propertyCreated: true,
    tenantsInvited: p.tenantCount > 0 || p.pendingInviteCount > 0,
    tenantsAccepted: p.tenantCount > 0,
    chargesConfigured: p.chargeCount > 0,
    firstStatementPublished: false,
  }
}

// =============================================================================
// Empty state — fully client (useState for "coming soon" toggle)
// =============================================================================

interface EmptyStateProps {
  firstName?: string
  greeting: string
}

export function EmptyState({ firstName, greeting }: EmptyStateProps) {
  const t = useTranslations('home')
  const [showComingSoon, setShowComingSoon] = useState(false)

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-10 text-center">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          {greeting}{firstName ? `, ${firstName}` : ''}.
        </h1>
        <p className="mt-2 text-base text-muted-foreground md:text-lg">
          {t('roleChoiceSubtitle')}
        </p>
      </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Link
              href="/app/p/new"
              className="group flex h-full flex-col items-center rounded-2xl border border-border bg-card px-6 py-7 text-center shadow-sm transition-all hover:border-primary/30 hover:shadow-md dark:border-border dark:shadow-none dark:hover:border-primary/40 md:p-8"
            >
              <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15 md:mb-5 md:size-16">
                <Building2 className="size-6 md:size-7" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">{t('iOwnProperty')}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t('iOwnPropertyDescription')}</p>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary md:mt-5 md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
                {t('addProperty')} <ChevronRight className="size-4" />
              </div>
            </Link>

            <button
              onClick={() => setShowComingSoon(true)}
              className="group flex h-full w-full flex-col items-center rounded-2xl border border-border bg-card px-6 py-7 text-center opacity-60 shadow-sm transition-all hover:opacity-80 dark:border-border dark:shadow-none md:p-8"
            >
              <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground md:mb-5 md:size-16">
                <DoorOpen className="size-6 md:size-7" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">{t('iRentProperty')}</h3>
              <div className="mt-1.5 min-h-[3.5rem] text-sm leading-relaxed text-muted-foreground">
                {showComingSoon ? (
                  <p className="animate-fade-in">{t('comingSoonDescription')}</p>
                ) : (
                  <p>{t('iRentPropertyDescription')}</p>
                )}
              </div>
              <span className="mt-4 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground md:mt-5">
                {t('comingSoon')}
              </span>
            </button>
          </div>

      <div className="mt-5 flex items-start justify-center gap-2.5 rounded-xl bg-secondary/40 px-5 py-3 text-center dark:bg-transparent dark:px-0">
        <span className="flex h-5 shrink-0 items-center"><ArrowLeftRight className="size-3.5 text-muted-foreground/50" /></span>
        <p className="text-sm leading-relaxed text-muted-foreground/70 dark:text-muted-foreground">{t('roleNote')}</p>
      </div>
    </div>
  )
}

// =============================================================================
// Property card — client (Link click handlers, setup progress rendering)
// =============================================================================

const CARD_CLASS = 'group block w-full overflow-hidden rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:border-primary/20 hover:shadow-md dark:bg-zinc-800/80 dark:shadow-none dark:hover:border-primary/30'

export function PropertyCard({ property: p }: { property: HomeProperty }) {
  const tP = useTranslations('properties')
  const t = useTranslations('home')

  const progress = deriveSetupProgress(p)
  const fullySetup = isPropertyComplete(progress)
  const address = [p.city, p.state].filter(Boolean).join(', ')

  if (fullySetup) {
    return (
      <Link prefetch href={`/app/p/${p.propertyId}`} className={CARD_CLASS}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-foreground">{p.name}</h3>
            {address && <p className="mt-0.5 text-sm text-muted-foreground">{address}</p>}
          </div>
          <ChevronRight className="mt-0.5 size-5 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
        </div>

        <div className="mt-3">
          <p className="text-sm text-muted-foreground">{t('noBillingData')}</p>
        </div>
      </Link>
    )
  }

  const steps = getCompletionSteps(progress)
  const completed = steps.filter((s) => s.done).length
  const total = steps.length

  return (
    <Link prefetch href={`/app/p/${p.propertyId}`} className={CARD_CLASS}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-foreground">{p.name}</h3>
          {address && <p className="mt-0.5 text-sm text-muted-foreground">{address}</p>}
        </div>
        <ChevronRight className="mt-0.5 size-5 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
      </div>

      <div className="mt-3 mb-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            {tP('setupSteps', { completed, total })}
          </span>
          <span className="text-xs font-semibold text-primary">
            {Math.round((completed / total) * 100)}%
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-border dark:bg-zinc-700">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${(completed / total) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {steps.map((step) => (
          <div key={step.key} className="flex items-center gap-2.5">
            {step.done ? (
              <div className="flex size-5 items-center justify-center rounded-full bg-primary/10">
                <Check className="size-3 text-primary" />
              </div>
            ) : step.inProgress ? (
              <div className="flex size-5 items-center justify-center rounded-full bg-amber-500/10">
                <Clock className="size-3 text-amber-500" />
              </div>
            ) : (
              <div className="size-5 rounded-full border border-zinc-300 dark:border-zinc-600" />
            )}
            <span className={`text-sm ${step.done ? 'text-muted-foreground' : step.inProgress ? 'font-medium text-foreground' : 'text-muted-foreground/60'}`}>
              {tP(step.label)}
            </span>
          </div>
        ))}
      </div>
    </Link>
  )
}

// =============================================================================
// Action rows — client (Link click handlers)
// =============================================================================

const ACTION_ICONS: Record<string, React.ElementType> = {
  invite_tenants: UserPlus,
  configure_charges: Receipt,
  pending_invite: Clock,
  generate_statement: FileText,
}

const ACTION_COLORS: Record<string, string> = {
  invite_tenants: 'text-primary',
  configure_charges: 'text-primary',
  pending_invite: 'text-amber-500',
  generate_statement: 'text-primary',
}

function getActionHash(action: HomeAction): string {
  switch (action.actionType) {
    case 'pending_invite':
      return action.detailId ? `invite-${action.detailId}` : 'tenants'
    case 'invite_tenants':
      return 'invite-btn'
    case 'configure_charges':
      return 'add-charge'
    case 'generate_statement':
      return 'generate-statement'
    default:
      return ''
  }
}

export function ActionList({ actions }: { actions: HomeAction[] }) {
  const t = useTranslations('home')

  if (actions.length === 0) return null

  return (
    <div className="mt-8">
      <h3 className="mb-3 text-base font-semibold text-foreground">{t('whatsNext')}</h3>
      <div className="space-y-2">
        {actions.map((action, i) => (
          <ActionRow key={`${action.actionType}-${action.propertyId}-${i}`} action={action} />
        ))}
      </div>
    </div>
  )
}

function ActionRow({ action }: { action: HomeAction }) {
  const t = useTranslations('home')
  const Icon = ACTION_ICONS[action.actionType] ?? ChevronRight
  const color = ACTION_COLORS[action.actionType] ?? 'text-primary'

  let title: string
  let description: string

  switch (action.actionType) {
    case 'pending_invite':
      title = action.detailName
        ? t('pendingInviteNamed', { name: action.detailName })
        : t('pendingInviteSingular')
      description = action.propertyName
      break
    case 'invite_tenants':
      title = t('actionInviteTenants')
      description = action.propertyName
      break
    case 'configure_charges':
      title = t('actionSetUpCharges')
      description = action.propertyName
      break
    case 'generate_statement':
      title = t('actionGenerateStatement')
      description = action.propertyName
      break
    default:
      title = ''
      description = ''
  }

  const highlight = getActionHash(action)

  return (
    <Link
      prefetch
      href={`/app/p/${action.propertyId}${highlight ? `?highlight=${highlight}` : ''}`}
      className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-left transition-colors hover:border-primary/20 dark:border-zinc-700 dark:bg-zinc-800/50"
    >
      <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary ${color}`}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground/40" />
    </Link>
  )
}

// =============================================================================
// Bottom bar — client (Link)
// =============================================================================

export function HomeBottomBar() {
  const t = useTranslations('home')

  return (
    <StickyBottomBar>
      <div className="mx-auto flex max-w-4xl justify-center">
        <Link
          href="/app/p/new"
          className={buttonVariants({ variant: 'ghost', className: 'h-10 rounded-2xl px-6 text-muted-foreground' })}
        >
          <Plus className="size-4" />
          {t('addProperty')}
        </Link>
      </div>
    </StickyBottomBar>
  )
}
