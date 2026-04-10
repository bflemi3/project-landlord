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

export default async function AppHomePage() {
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

  // Landlord dashboard — stream property cards and actions
  const isSingleProperty = properties.length === 1

  return (
    <div className="flex h-full flex-col">
      <MobileHeader userName={userName} avatarUrl={avatarUrl} />
      <div className="flex-1 overflow-y-auto px-6 pt-4 pb-4 md:pt-6">
        <div className={`mx-auto ${isSingleProperty ? 'max-w-xl' : 'max-w-4xl'}`}>
          <FadeIn>
            <Greeting firstName={firstName} greetingKey={greetingKey} propertyCount={properties.length} />
          </FadeIn>

          <FadeIn>
            <Suspense fallback={<CardsSkeleton />}>
              <PropertyCardsSection properties={properties} />
            </Suspense>
          </FadeIn>

          <FadeIn>
            <Suspense fallback={<ActionsSkeleton />}>
              <ActionsSection />
            </Suspense>
          </FadeIn>
        </div>
      </div>

      <HomeBottomBar isSingleProperty={isSingleProperty} />
    </div>
  )
}

// Server component that passes already-fetched properties to client card list
function PropertyCardsSection({ properties }: { properties: Awaited<ReturnType<typeof getHomeProperties>> }) {
  return <PropertyCardList properties={properties} />
}

// Server component that fetches actions and passes to client action list
async function ActionsSection() {
  const actions = await getHomeActions()
  return <ActionList actions={actions} />
}
