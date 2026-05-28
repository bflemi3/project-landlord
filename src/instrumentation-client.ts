import posthog from 'posthog-js'

if (process.env.NEXT_PUBLIC_POSTHOG_KEY && process.env.NODE_ENV === 'production') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    // 'always' creates a person profile for every visitor (vs identified_only =
    // only after posthog.identify()). For a pre-launch waitlist site the
    // identified_only mode left anonymous landers as bare UUIDs with no person
    // properties — 'always' auto-$set_once's $initial_geoip_country_name,
    // $initial_browser, $initial_referring_domain, etc. on first capture so
    // the Persons modal and waitlist dashboard insights actually have something
    // to show. Cost is negligible at pre-launch volume; revisit if MTU spikes.
    person_profiles: 'always',
    defaults: '2025-05-24',
  })
}
