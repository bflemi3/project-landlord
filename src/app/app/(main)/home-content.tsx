'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import {
  Building2, DoorOpen,
  ChevronRight, ArrowLeftRight,
  Clock, UserPlus, Receipt, File,
} from 'lucide-react'
import { SectionLabel } from '@/components/section-label'
import { IconTile } from '@/components/icon-tile'
import { Card, cardShellClassName } from '@/components/ui/card'
import {
  List,
  ListRowBody,
  ListRowChevron,
  ListRowDescription,
  ListRowLeading,
  ListRowTitle,
  ListRowTrailing,
  listRowClassName,
} from '@/components/list-row'
import type { HomeAction } from '@/data/home/shared'

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
          {greeting}{firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="mt-2 text-base text-muted-foreground md:text-lg">
          {t('roleChoiceSubtitle')}
        </p>
      </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Link
              href="/app/p/new"
              className={cardShellClassName({
                interactive: true,
                size: 'none',
                className: 'group flex h-full flex-col items-center px-6 py-7 text-center dark:hover:border-primary/40 md:p-8',
              })}
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
              className={cardShellClassName({
                size: 'none',
                className: 'group flex h-full w-full flex-col items-center px-6 py-7 text-center opacity-60 transition-all hover:opacity-80 md:p-8',
              })}
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
// Action rows — client (Link click handlers)
// =============================================================================

const ACTION_ICONS: Record<string, React.ElementType> = {
  invite_tenants: UserPlus,
  configure_charges: Receipt,
  pending_invite: Clock,
  generate_statement: File,
}

const ACTION_TONES: Record<string, React.ComponentProps<typeof IconTile>['tone']> = {
  invite_tenants: 'primary',
  configure_charges: 'primary',
  pending_invite: 'warning',
  generate_statement: 'primary',
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
      <SectionLabel>{t('whatsNext')}</SectionLabel>
      <Card size="none">
        <List>
          {actions.map((action, i) => (
            <ActionRow key={`${action.actionType}-${action.propertyId}-${i}`} action={action} />
          ))}
        </List>
      </Card>
    </div>
  )
}

function ActionRow({ action }: { action: HomeAction }) {
  const t = useTranslations('home')
  const Icon = ACTION_ICONS[action.actionType] ?? ChevronRight
  const tone = ACTION_TONES[action.actionType] ?? 'primary'

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
      className={listRowClassName({ variant: 'embedded' })}
    >
      <ListRowLeading>
        <IconTile size="lg" shape="circle" tone={tone}>
          <Icon />
        </IconTile>
      </ListRowLeading>
      <ListRowBody>
        <ListRowTitle>{title}</ListRowTitle>
        <ListRowDescription>{description}</ListRowDescription>
      </ListRowBody>
      <ListRowTrailing>
        <ListRowChevron />
      </ListRowTrailing>
    </Link>
  )
}

