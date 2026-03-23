'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Building2, Plus, Users, DoorOpen, LayoutGrid, List, ChevronRight, Sparkles, LogOut, ArrowLeftRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Wordmark } from '@/components/wordmark'
import { ThemeToggle } from '@/components/theme-toggle'
import { FadeUp } from '@/components/fade-up'
import { useMemberships, type MembershipWithProperty } from '@/lib/hooks/use-memberships'
import { createClient } from '@/lib/supabase/client'

function getGreetingKey(): 'goodMorning' | 'goodAfternoon' | 'goodEvening' {
  const hour = new Date().getHours()
  if (hour < 12) return 'goodMorning'
  if (hour < 18) return 'goodAfternoon'
  return 'goodEvening'
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
    <div className="flex min-h-svh flex-col">
      {/* Subtle sign out — top right */}
      <div className="flex justify-end px-6 pt-5">
        <SignOutLink />
      </div>

      {/* Centered content */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-16">
        <FadeUp.Group className="w-full max-w-2xl" stagger={0.1} baseDelay={0}>
          {/* Wordmark */}
          <FadeUp className="mb-8 text-center">
            <Wordmark className="mx-auto h-7" />
          </FadeUp>

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

              {/* Tenant card — disabled feel */}
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
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {t('iRentPropertyDescription')}
                </p>
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

        {/* Coming soon message */}
        {showComingSoon && (
          <motion.div
            className="mt-4 w-full max-w-2xl rounded-2xl border border-border bg-secondary/50 p-5"
            initial={{ opacity: 0, transform: 'translateY(8px)' }}
            animate={{ opacity: 1, transform: 'translateY(0px)' }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-center text-sm leading-relaxed text-muted-foreground">
              {t('comingSoonDescription')}
            </p>
          </motion.div>
        )}
      </div>

      {/* Footer — theme toggle */}
      <div className="flex justify-center px-6 pb-6">
        <ThemeToggle />
      </div>
    </div>
  )
}

// =============================================================================
// Populated state — property cards
// =============================================================================

function PopulatedState({ memberships, firstName }: { memberships: MembershipWithProperty[]; firstName?: string }) {
  const t = useTranslations('home')
  const [view, setView] = useState<'grouped' | 'flat'>('grouped')
  const greeting = t(getGreetingKey())

  const landlordMemberships = memberships.filter((m) => m.role === 'landlord')
  const tenantMemberships = memberships.filter((m) => m.role === 'tenant')

  return (
    <div className="mx-auto min-h-svh max-w-3xl px-6 pb-32 pt-8">
      <FadeUp.Group stagger={0.08}>
        {/* Header */}
        <FadeUp className="mb-10 flex items-start justify-between">
          <h1 className="text-2xl font-bold text-foreground">
            {greeting}{firstName ? `, ${firstName}` : ''}
          </h1>
          <SignOutLink />
        </FadeUp>

        {/* Controls row */}
        <FadeUp className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{t('myProperties')}</h2>
          <div className="flex rounded-lg border border-border bg-secondary/50 p-0.5">
            <button
              onClick={() => setView('grouped')}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                view === 'grouped'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title={t('viewByProperty')}
            >
              <LayoutGrid className="size-3.5" />
            </button>
            <button
              onClick={() => setView('flat')}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                view === 'flat'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title={t('viewAllUnits')}
            >
              <List className="size-3.5" />
            </button>
          </div>
        </FadeUp>
      </FadeUp.Group>

      {/* Property cards — grid on desktop */}
      <FadeUp.Group className="grid gap-4 md:grid-cols-2" stagger={0.06} baseDelay={0.16}>
        {landlordMemberships.map((m) => (
          <FadeUp key={m.id}>
            <PropertyCard membership={m} />
          </FadeUp>
        ))}
        {tenantMemberships.map((m) => (
          <FadeUp key={m.id}>
            <PropertyCard membership={m} />
          </FadeUp>
        ))}
      </FadeUp.Group>

      {/* Add property — sticky bottom bar */}
      <FadeUp delay={0.3} className="fixed inset-x-0 bottom-0 border-t border-border bg-background/80 px-6 py-4 backdrop-blur-lg">
        <div className="mx-auto max-w-3xl">
          <Button asChild className="h-12 w-full rounded-2xl" size="lg">
            <Link href="/app/p/new">
              <Plus className="size-5" />
              {t('addProperty')}
            </Link>
          </Button>
        </div>
      </FadeUp>
    </div>
  )
}

// =============================================================================
// Property card
// =============================================================================

function PropertyCard({ membership }: { membership: MembershipWithProperty }) {
  const t = useTranslations('home')
  const router = useRouter()
  const { property, unitCount, tenantCount, role } = membership

  const address = [property.city, property.state].filter(Boolean).join(', ')

  return (
    <button
      onClick={() => router.push(`/app/p/${property.id}`)}
      className="group block w-full rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:border-primary/30 hover:shadow-md dark:border-border dark:shadow-none dark:hover:border-primary/40"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-foreground">
            {property.name}
          </h3>
          {address && (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{address}</p>
          )}
        </div>
        <ChevronRight className="mt-0.5 size-5 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
      </div>

      <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Building2 className="size-3.5" />
          {t('units', { count: unitCount })}
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="size-3.5" />
          {tenantCount > 0 ? t('tenants', { count: tenantCount }) : t('noTenants')}
        </span>
        {role === 'landlord' && (
          <span className="ml-auto flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            <Sparkles className="size-3" />
            {t('nudgeCharges')}
          </span>
        )}
      </div>
    </button>
  )
}

// =============================================================================
// Sign out — subtle link, not a button
// =============================================================================

function SignOutLink() {
  const t = useTranslations('auth')

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/auth/sign-in'
  }

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center gap-1.5 text-sm text-muted-foreground/60 transition-colors hover:text-muted-foreground"
    >
      <LogOut className="size-3.5" />
      <span className="hidden sm:inline">{t('signOut')}</span>
    </button>
  )
}
