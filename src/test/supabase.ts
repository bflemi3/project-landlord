import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

const SUPABASE_URL = 'http://127.0.0.1:54321'

type TypedAdminClient = SupabaseClient<Database>
type TypedClient = SupabaseClient<Database>

/** Admin client — bypasses RLS. Use for seeding and assertions only. */
export function getAdminClient(): TypedAdminClient {
  return createClient<Database>(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

/** Create a test user and return an authenticated client. */
export async function createTestUser(
  email?: string,
): Promise<{ client: TypedClient; userId: string; email: string }> {
  const admin = getAdminClient()
  const testEmail = email ?? `test-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`
  const password = 'test-password-123!'

  const { data: userData, error: createError } = await admin.auth.admin.createUser({
    email: testEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Test User' },
  })
  if (createError || !userData.user) throw new Error(`Failed to create test user: ${createError?.message}`)

  const client = createClient<Database>(SUPABASE_URL, process.env.SUPABASE_ANON_KEY!)
  const { error: signInError } = await client.auth.signInWithPassword({ email: testEmail, password })
  if (signInError) throw new Error(`Failed to sign in test user: ${signInError.message}`)

  return { client, userId: userData.user.id, email: testEmail }
}

/** Create a property with a unit via the RPC. */
export async function createTestProperty(
  client: TypedClient,
  name = 'Test Property',
): Promise<{ propertyId: string; unitId: string }> {
  const { data, error } = await client.rpc('create_property_with_membership', {
    p_name: name, p_street: 'Rua Teste', p_number: '123',
    p_city: 'Sao Paulo', p_state: 'SP', p_postal_code: '01310100',
    p_due_day: 10,
  })
  if (error || !data) throw new Error(`Failed to create test property: ${error?.message}`)
  const result = data as unknown as { property_id: string; unit_id: string }
  return { propertyId: result.property_id, unitId: result.unit_id }
}

/** Delete a test user and all their data. */
export async function cleanupTestUser(userId: string): Promise<void> {
  const admin = getAdminClient()
  await admin.from('properties').delete().eq('created_by', userId)
  await admin.auth.admin.deleteUser(userId)
}
