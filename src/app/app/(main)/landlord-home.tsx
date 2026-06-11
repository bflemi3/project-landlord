import { SuspenseFadeIn } from '@/components/suspense-fade-in'
import { LandlordGreeting } from './landlord-greeting'
import { RevenueSummarySection } from './revenue-summary-section'
import { PropertyCardList } from './property-card-list'
import { GreetingSkeleton, RevenueSummarySkeleton, CardsSkeleton } from './home-skeletons'

export function LandlordHome() {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <SuspenseFadeIn fallback={<GreetingSkeleton />}>
        <LandlordGreeting />
      </SuspenseFadeIn>

      <SuspenseFadeIn fallback={<RevenueSummarySkeleton />}>
        <RevenueSummarySection />
      </SuspenseFadeIn>

      <SuspenseFadeIn fallback={<CardsSkeleton />}>
        <PropertyCardList />
      </SuspenseFadeIn>
    </div>
  )
}
