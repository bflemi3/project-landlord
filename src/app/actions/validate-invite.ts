'use server'

import { createClient } from '@/lib/supabase/server'

export interface InviteContext {
  valid: true
  code: string
  invitedEmail: string
  invitedName: string | null
  propertyName: string | null
}

export interface InviteContextError {
  valid: false
  reason: 'invalid' | 'expired'
}

/**
 * Validates an invite code and returns context for the sign-up page.
 * Uses the admin-level query (server-side only) — not the anon RPC.
 */
export async function validateAndFetchInviteContext(
  rawCode: string,
): Promise<InviteContext | InviteContextError> {
  const supabase = await createClient()
  const code = rawCode.trim().toUpperCase()

  const { data: invite, error } = await supabase
    .from('invitations')
    .select('code, invited_email, invited_name, property_id, expires_at')
    .eq('code', code)
    .eq('status', 'pending')
    .is('accepted_by', null)
    .single()

  if (error || !invite) {
    return { valid: false, reason: 'invalid' }
  }

  // Check expiration
  if (invite.expires_at && new Date(invite.expires_at) <= new Date()) {
    return { valid: false, reason: 'expired' }
  }

  // Fetch property name if available
  let propertyName: string | null = null
  if (invite.property_id) {
    const { data: property } = await supabase
      .from('properties')
      .select('name')
      .eq('id', invite.property_id)
      .single()
    propertyName = property?.name ?? null
  }

  return {
    valid: true,
    code: invite.code!,
    invitedEmail: invite.invited_email,
    invitedName: invite.invited_name,
    propertyName,
  }
}

export async function validateInviteCode(code: string): Promise<{ valid: boolean }> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('validate_invite_code', {
    invite_code: code,
  })

  if (error) return { valid: false }

  return { valid: !!data }
}
