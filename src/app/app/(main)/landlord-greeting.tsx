import { getTranslations } from 'next-intl/server'
import { getProfile } from '@/data/profiles/server'
import { AddPropertyButton } from './add-property-button'

function getGreetingKey(): 'goodMorning' | 'goodAfternoon' | 'goodEvening' {
  const hour = new Date().getHours()
  return hour < 12 ? 'goodMorning' : hour < 18 ? 'goodAfternoon' : 'goodEvening'
}

/**
 * Server component that fetches profile and renders the landlord greeting.
 * Wrapped in Suspense by the parent — streams independently.
 */
export async function LandlordGreeting() {
  const [profile, t] = await Promise.all([getProfile(), getTranslations('home')])

  const firstName = profile?.full_name?.split(' ')[0] ?? undefined
  const greetingKey = getGreetingKey()
  const greeting = t(greetingKey)
  const draftId = crypto.randomUUID()

  return (
    <div className="mb-8 flex items-center justify-between gap-4">
      <h1 className="font-display text-foreground text-3xl font-medium tracking-[-0.015em]">
        {greeting}
        {firstName ? `, ${firstName}` : ''}
      </h1>
      <AddPropertyButton ariaLabel={t('addProperty')} label={t('addProperty')} draftId={draftId} />
    </div>
  )
}
