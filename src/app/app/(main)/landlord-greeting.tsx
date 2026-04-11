import { getTranslations } from 'next-intl/server'
import { getProfile } from '@/data/profiles/server'

function getGreetingKey(): 'goodMorning' | 'goodAfternoon' | 'goodEvening' {
  const hour = new Date().getHours()
  return hour < 12 ? 'goodMorning' : hour < 18 ? 'goodAfternoon' : 'goodEvening'
}

/**
 * Server component that fetches profile and renders the landlord greeting.
 * Wrapped in Suspense by the parent — streams independently.
 */
export async function LandlordGreeting() {
  const [profile, t] = await Promise.all([
    getProfile(),
    getTranslations('home'),
  ])

  const firstName = profile?.fullName?.split(' ')[0] ?? undefined
  const greetingKey = getGreetingKey()
  const greeting = t(greetingKey)

  return (
    <div className="mb-8">
      <h1 className="text-2xl font-bold text-foreground">
        {greeting}{firstName ? `, ${firstName}` : ''}
      </h1>
    </div>
  )
}
