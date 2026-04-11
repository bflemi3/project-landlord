import { SuspenseFadeIn } from '@/components/suspense-fade-in'
import { LandlordGreeting } from './landlord-greeting'
import { PropertyCardList } from './property-card-list'
import { ActionsSection } from './actions-section'
import { HomeBottomBar } from './home-content'
import { GreetingSkeleton, CardsSkeleton, ActionsSkeleton } from './home-skeletons'

/**
 * Landlord home view. Three sections stream in parallel:
 * - Greeting (profile fetch)
 * - Property cards (home_properties view)
 * - Actions (home_action_items view)
 */
export function LandlordHome() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-6 pt-4 pb-4 md:pt-6">
        <div className="mx-auto max-w-4xl">
          <SuspenseFadeIn fallback={<GreetingSkeleton />}>
            <LandlordGreeting />
          </SuspenseFadeIn>

          <SuspenseFadeIn fallback={<CardsSkeleton />}>
            <PropertyCardList />
          </SuspenseFadeIn>

          <SuspenseFadeIn fallback={<ActionsSkeleton />}>
            <ActionsSection />
          </SuspenseFadeIn>
        </div>
      </div>

      <HomeBottomBar />
    </div>
  )
}
