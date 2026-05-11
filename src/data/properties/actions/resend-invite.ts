'use server'

import { createClient } from '@/lib/supabase/server'
import type { EmailLocale } from '@/emails/i18n'
import { generateInviteCode } from '@/data/invitations/generate-invite-code'
import { sendTenantInviteEmail } from '@/data/invitations/send-invite-emails'
import { formatAddress, formatAddressHtml } from '@/lib/address/format-address'

export async function resendInvite(inviteId: string): Promise<{ success: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false }

  const { data: invite } = await supabase
    .from('invitations')
    .select('id, invited_email, invited_name, property_id')
    .eq('id', inviteId)
    .eq('status', 'pending')
    .single()

  if (!invite) return { success: false }

  const newCode = generateInviteCode()
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: property } = await supabase
    .from('properties')
    .select('name, street, number, complement, neighborhood, city, state, country_code')
    .eq('id', invite.property_id)
    .single()

  const { data: profile } = await supabase
    .from('profiles')
    .select('preferred_locale, full_name')
    .eq('id', user.id)
    .single()

  const locale = (profile?.preferred_locale as EmailLocale) ?? 'en'
  const landlordName = profile?.full_name ?? ''
  const addressOneLine = property ? formatAddress(property) : ''
  const addressHtml = property ? formatAddressHtml(property) : ''
  const propertyName = addressOneLine || property?.name || ''

  const sendResult = await sendTenantInviteEmail({
    to: invite.invited_email,
    tenantName: invite.invited_name,
    landlordName,
    propertyName,
    addressHtml,
    code: newCode,
    expiresAt,
    locale,
  })

  if (!sendResult.success) return { success: false }

  // Reflect the new code + expiry on the row so the UI shows when last sent.
  await supabase
    .from('invitations')
    .update({
      code: newCode,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', inviteId)

  return { success: true }
}
