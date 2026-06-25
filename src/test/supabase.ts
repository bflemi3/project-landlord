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

/** Create a property with a unit via the RPC. Uses the new create_property
 *  RPC which is idempotent on properties.id; we generate a fresh uuid here so
 *  every test gets its own row. The legacy create_property_with_membership /
 *  create_property_with_unit RPCs were dropped during the property-creation
 *  persistence migration. */
export async function createTestProperty(
  client: TypedClient,
  name = 'Test Property',
): Promise<{ propertyId: string; unitId: string }> {
  const propertyId = crypto.randomUUID()
  const { data, error } = await client.rpc('create_property', {
    p_property_id: propertyId,
    p_property: {
      name,
      country_code: 'BR',
      street: 'Rua Teste',
      number: '123',
      city: 'Sao Paulo',
      state: 'SP',
      postal_code: '01310100',
    } as never,
    p_unit: { name, currency: 'BRL' } as never,
  })
  if (error || !data) throw new Error(`Failed to create test property: ${error?.message}`)
  const result = data as unknown as { property_id: string; unit_id: string }
  return { propertyId: result.property_id, unitId: result.unit_id }
}

/** Delete a test user and all their data. */
export async function cleanupTestUser(userId: string): Promise<void> {
  const admin = getAdminClient()
  // payment_matches FKs to monthly_ledger / bank_transactions are ON DELETE
  // RESTRICT, so deleting the property (→ units → monthly_ledger) or the user
  // (→ bank_accounts → bank_transactions) would otherwise be blocked and the
  // error silently swallowed, leaking rows. Clear the matches first.
  const { data: txs } = await admin
    .from('bank_transactions')
    .select('id')
    .eq('user_id', userId)
  const txIds = (txs ?? []).map((t) => t.id)
  if (txIds.length > 0) {
    await admin.from('payment_matches').delete().in('bank_transaction_id', txIds)
  }
  await admin.from('properties').delete().eq('created_by', userId)
  await admin.auth.admin.deleteUser(userId)
}
