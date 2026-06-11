import posthog from 'posthog-js'

/** PostHog `capture` that swallows initialization errors. Use everywhere
 *  instead of calling `posthog.capture(...)` directly — analytics shouldn't
 *  crash user flow when posthog is unavailable (e.g. tests, ad-blockers,
 *  consent-revoked sessions). */
export function captureEvent(event: string, properties?: Record<string, unknown>): void {
  try {
    // Only forward `properties` when defined — `posthog.capture(event,
    // undefined)` otherwise leaks an extra arg to the spy in tests that
    // assert on call arity.
    if (properties === undefined) {
      posthog.capture(event)
    } else {
      posthog.capture(event, properties)
    }
  } catch {
    // posthog unavailable — capture is best-effort.
  }
}
