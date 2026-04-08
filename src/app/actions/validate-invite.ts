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
 * Uses a security-definer RPC so it works for unauthenticated users.
 */
export async function validateAndFetchInviteContext(
  rawCode: string,
): Promise<InviteContext | InviteContextError> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('validate_invite_with_context', {
    invite_code: rawCode,
  })

  if (error || !data || data.length === 0) {
    return { valid: false, reason: 'invalid' }
  }

  const row = data[0]

  if (row.is_expired) {
    return { valid: false, reason: 'expired' }
  }

  return {
    valid: true,
    code: row.code,
    invitedEmail: row.invited_email,
    invitedName: row.invited_name,
    propertyName: row.property_name,
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
