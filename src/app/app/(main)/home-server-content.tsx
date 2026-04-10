import { Suspense } from 'react'
import { FadeIn } from '@/components/fade-in'
import { getProfile } from '@/data/profiles/server'
import { getHomeProperties, getHomeActions } from '@/data/home/server'
import { CardsSkeleton, ActionsSkeleton } from './home-skeletons'
import { EmptyState, MobileHeader, PropertyCardList, ActionList, HomeBottomBar, Greeting } from './home-content'
import { TenantHomeContent } from './tenant-home-content'

function getGreetingKey(): 'goodMorning' | 'goodAfternoon' | 'goodEvening' {
  const hour = new Date().getHours()
  return hour < 12 ? 'goodMorning' : hour < 18 ? 'goodAfternoon' : 'goodEvening'
}

/**
 * Server component that fetches data and renders the appropriate home view.
 * Wrapped in Suspense by the parent page — streams as soon as data resolves.
 */
export async function HomeContent() {
  const [profile, properties] = await Promise.all([
    getProfile(),
    getHomeProperties(),
  ])

  const firstName = profile?.fullName?.split(' ')[0] ?? undefined
  const userName = profile?.fullName ?? undefined
  const avatarUrl = profile?.avatarUrl ?? undefined
  const greetingKey = getGreetingKey()

  const hasLandlordProperties = properties.some((p) => p.role === 'landlord')

  // Tenant-only users see a separate home page
  if (!hasLandlordProperties && properties.length > 0) {
    return (
      <FadeIn className="h-full">
        <TenantHomeContent
          firstName={firstName}
          userName={userName}
          avatarUrl={avatarUrl}
          greetingKey={greetingKey}
        />
      </FadeIn>
    )
  }

  // No properties — show empty/role-choice state
  if (properties.length === 0) {
    return (
      <FadeIn className="h-full">
        <EmptyState
          firstName={firstName}
          userName={userName}
          avatarUrl={avatarUrl}
          greetingKey={greetingKey}
        />
      </FadeIn>
    )
  }

  // Landlord dashboard — greeting renders immediately, actions stream
  const isSingleProperty = properties.length === 1

  return (
    <FadeIn className="flex h-full flex-col">
      <MobileHeader userName={userName} avatarUrl={avatarUrl} />
      <div className="flex-1 overflow-y-auto px-6 pt-4 pb-4 md:pt-6">
        <div className={`mx-auto ${isSingleProperty ? 'max-w-xl' : 'max-w-4xl'}`}>
          <Greeting firstName={firstName} greetingKey={greetingKey} propertyCount={properties.length} />

          <PropertyCardList properties={properties} />

          <Suspense fallback={<ActionsSkeleton />}>
            <ActionsSection />
          </Suspense>
        </div>
      </div>

      <HomeBottomBar isSingleProperty={isSingleProperty} />
    </FadeIn>
  )
}

/** Fetches actions independently — streams after the main content. */
async function ActionsSection() {
  const actions = await getHomeActions()
  return (
    <FadeIn>
      <ActionList actions={actions} />
    </FadeIn>
  )
}
