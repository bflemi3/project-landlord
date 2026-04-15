import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getUserId } from './get-user-id'

/**
 * Assert the current user is on the engineer allowlist.
 * Throws if not authenticated or not an engineer.
 * For use in server actions that should be restricted to engineers.
 */
export async function assertEngineer(): Promise<string> {
  const userId = await getUserId()
  if (!userId) {
    throw new Error('Not authenticated')
  }

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data } = await supabase
    .from('engineer_allowlist')
    .select('user_id')
    .eq('user_id', userId)
    .single()

  if (!data) {
    throw new Error('Not authorized: engineer access required')
  }

  return userId
}
