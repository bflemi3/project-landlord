import posthog from 'posthog-js'

if (process.env.NEXT_PUBLIC_POSTHOG_KEY && process.env.NODE_ENV === 'production') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    defaults: '2025-05-24',
  })
}
