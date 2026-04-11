import { SuspenseFadeIn } from '@/components/suspense-fade-in'
import { getTranslations } from 'next-intl/server'
import { getProfile } from '@/data/profiles/server'
import { EmptyState } from './home-content'
import { GreetingSkeleton } from './home-skeletons'

async function EmptyGreeting() {
  const [profile, t] = await Promise.all([
    getProfile(),
    getTranslations('home'),
  ])

  const firstName = profile?.fullName?.split(' ')[0] ?? undefined
  const hour = new Date().getHours()
  const greetingKey = hour < 12 ? 'goodMorning' : hour < 18 ? 'goodAfternoon' : 'goodEvening'
  const greeting = t(greetingKey)

  return (
    <EmptyState firstName={firstName} greeting={greeting} />
  )
}

/**
 * Empty home view — shown when user has no properties.
 * Greeting streams, role choice cards are static.
 */
export function EmptyHome() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-8 pt-4 md:pt-14">
        <SuspenseFadeIn fallback={<GreetingSkeleton />}>
          <EmptyGreeting />
        </SuspenseFadeIn>
      </div>
    </div>
  )
}
