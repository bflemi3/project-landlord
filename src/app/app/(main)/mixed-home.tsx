import { getTranslations } from 'next-intl/server'
import { SuspenseFadeIn } from '@/components/suspense-fade-in'
import { getProfile } from '@/data/profiles/server'
import { GreetingSkeleton } from './home-skeletons'

async function MixedGreeting() {
  const [profile, t] = await Promise.all([
    getProfile(),
    getTranslations('home'),
  ])

  const firstName = profile?.fullName?.split(' ')[0] ?? undefined
  const hour = new Date().getHours()
  const greetingKey = hour < 12 ? 'goodMorning' : hour < 18 ? 'goodAfternoon' : 'goodEvening'
  const greeting = t(greetingKey)

  return (
    <h1 className="text-2xl font-bold">
      {greeting}{firstName ? `, ${firstName}` : ''}
    </h1>
  )
}

/**
 * Mixed home view — user has both landlord and tenant properties.
 * Placeholder for now — greeting only.
 */
export function MixedHome() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-8 pt-4 md:pt-14">
        <div className="w-full max-w-2xl">
          <SuspenseFadeIn fallback={<GreetingSkeleton />}>
            <MixedGreeting />
          </SuspenseFadeIn>
        </div>
      </div>
    </div>
  )
}
