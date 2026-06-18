// First-touch attribution capture for the waitlist.
//
// On the visitor's first landing-page load we snapshot the UTM params, the
// referrer, and the landing path, and persist them in sessionStorage. Later
// loads (including same-session navigations that strip the query string) keep
// the original first-touch values — that's what answers "who sent them." The
// snapshot rides along to the DB on waitlist capture and to PostHog on join.

export type Attribution = {
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
  referrer: string | null
  landing_path: string
}

const STORAGE_KEY = 'mabenn_first_touch'

function cleanParam(value: string | null): string | null {
  if (value === null) return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/**
 * Pure parse of a query string + referrer + pathname into an Attribution.
 * No DOM/storage access — unit-tested directly.
 */
export function parseAttribution(
  search: string,
  referrer: string,
  pathname: string,
): Attribution {
  const params = new URLSearchParams(search)
  return {
    utm_source: cleanParam(params.get('utm_source')),
    utm_medium: cleanParam(params.get('utm_medium')),
    utm_campaign: cleanParam(params.get('utm_campaign')),
    utm_content: cleanParam(params.get('utm_content')),
    utm_term: cleanParam(params.get('utm_term')),
    referrer: cleanParam(referrer),
    landing_path: pathname || '/',
  }
}

/**
 * Returns the first-touch attribution for this browser session, capturing it
 * from the current URL on first call and persisting it. SSR-safe (returns a
 * computed-from-nothing snapshot when `window` is absent). Best-effort about
 * storage — private mode / blocked storage falls back to the live parse.
 */
export function readFirstTouchAttribution(): Attribution {
  if (typeof window === 'undefined') {
    return parseAttribution('', '', '/')
  }

  const current = parseAttribution(
    window.location.search,
    document.referrer,
    window.location.pathname,
  )

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw) as Attribution
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  } catch {
    // Storage unavailable — return the live parse without persisting.
  }

  return current
}
