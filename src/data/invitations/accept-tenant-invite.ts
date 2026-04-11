import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

type AdminClient = SupabaseClient<Database>

export interface AcceptTenantInviteResult {
  success: true
  userId: string
  email: string
  password: string
  propertyId: string
  unitId: string
  membershipId: string
}

export interface AcceptTenantInviteError {
  success: false
  error: string
}

/**
 * Accepts a pending tenant invitation by creating an auth user, marking the
 * invite as accepted, and creating a membership.
 *
 * Requires a Supabase client with admin/service-role privileges.
 */
export async function acceptTenantInvite(
  admin: AdminClient,
  email: string,
): Promise<AcceptTenantInviteResult | AcceptTenantInviteError> {
  const normalizedEmail = email.trim().toLowerCase()

  // 1. Find the pending tenant invitation
  const { data: invite, error: inviteError } = await admin
    .from('invitations')
    .select('id, invited_name, property_id, unit_id, source')
    .eq('invited_email', normalizedEmail)
    .eq('role', 'tenant')
    .eq('status', 'pending')
    .or('expires_at.is.null,expires_at.gt.now()')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (inviteError || !invite) {
    return { success: false, error: 'no_pending_invitation' }
  }

  if (!invite.property_id || !invite.unit_id) {
    return { success: false, error: 'invitation_missing_property_or_unit' }
  }

  // 2. Create the auth user with a generated password
  const password = generatePassword()

  const { data: userData, error: createError } = await admin.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: invite.invited_name ?? normalizedEmail },
  })

  if (createError || !userData.user) {
    return { success: false, error: `user_creation_failed: ${createError?.message}` }
  }

  const userId = userData.user.id

  // 3. Mark the invitation as accepted
  const { error: acceptError } = await admin
    .from('invitations')
    .update({
      status: 'accepted' as const,
      accepted_by: userId,
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', invite.id)

  if (acceptError) {
    // Roll back: delete the created user
    await admin.auth.admin.deleteUser(userId)
    return { success: false, error: `invitation_update_failed: ${acceptError.message}` }
  }

  // 4. Update profile flags (profile is auto-created by DB trigger)
  await admin
    .from('profiles')
    .update({
      has_redeemed_invite: true,
      acquisition_channel: invite.source,
    })
    .eq('id', userId)

  // 5. Create the membership
  const { data: membership, error: membershipError } = await admin
    .from('memberships')
    .insert({
      user_id: userId,
      property_id: invite.property_id,
      unit_id: invite.unit_id,
      role: 'tenant' as const,
    })
    .select('id')
    .single()

  if (membershipError || !membership) {
    return { success: false, error: `membership_creation_failed: ${membershipError?.message}` }
  }

  return {
    success: true,
    userId,
    email: normalizedEmail,
    password,
    propertyId: invite.property_id,
    unitId: invite.unit_id,
    membershipId: membership.id,
  }
}

/** Generate a random 16-char password with mixed character types. */
function generatePassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*'
  let password = ''
  for (let i = 0; i < 16; i++) {
    password += chars[Math.floor(Math.random() * chars.length)]
  }
  return password
}
