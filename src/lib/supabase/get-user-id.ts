import { createClient } from './server'

/**
 * Get the current user's ID from JWT claims (no network call).
 * Returns null if not authenticated.
 */
export async function getUserId(): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  return (data?.claims?.sub as string) ?? null
}
