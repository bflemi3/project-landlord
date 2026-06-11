import { getTranslations } from 'next-intl/server'
import { SuspenseFadeIn } from '@/components/suspense-fade-in'
import { getProfile } from '@/data/profiles/server'
import { GreetingSkeleton } from './home-skeletons'

async function MixedGreeting() {
  const [profile, t] = await Promise.all([getProfile(), getTranslations('home')])

  const firstName = profile?.full_name?.split(' ')[0] ?? undefined
  const hour = new Date().getHours()
  const greetingKey = hour < 12 ? 'goodMorning' : hour < 18 ? 'goodAfternoon' : 'goodEvening'
  const greeting = t(greetingKey)

  return (
    <h1 className="font-display text-3xl font-medium tracking-[-0.015em]">
      {greeting}
      {firstName ? `, ${firstName}` : ''}
    </h1>
  )
}

/**
 * Mixed home view — user has both landlord and tenant properties.
 * Placeholder for now — greeting only.
 */
export function MixedHome() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <div className="w-full max-w-2xl">
        <SuspenseFadeIn fallback={<GreetingSkeleton />}>
          <MixedGreeting />
        </SuspenseFadeIn>
      </div>
    </div>
  )
}
