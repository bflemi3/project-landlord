import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { FadeIn } from '@/components/fade-in'
import { getProfile } from '@/data/profiles/server'
import { GreetingSkeleton } from './home-skeletons'

async function TenantGreeting() {
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
 * Tenant home view — greeting + placeholder for future tenant dashboard.
 */
export function TenantHome() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-8 pt-4 md:pt-14">
        <div className="w-full max-w-2xl">
          <Suspense fallback={<GreetingSkeleton />}>
            <FadeIn>
              <TenantGreeting />
            </FadeIn>
          </Suspense>
        </div>
      </div>
    </div>
  )
}
