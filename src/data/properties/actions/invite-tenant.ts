'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { TypedSupabaseClient } from '@/lib/supabase/types'
import type { EmailLocale } from '@/emails/i18n'
import { generateInviteCode } from '@/data/invitations/generate-invite-code'
import { sendTenantInviteEmail } from '@/data/invitations/send-invite-emails'
import { formatAddress, formatAddressHtml } from '@/lib/address/format-address'

export interface InviteTenantState {
  success: boolean
  errors?: {
    email?: string
    general?: string
  }
}

export interface InviteTenantInput {
  propertyId: string
  unitId: string
  email: string
  tenantName: string | null
  landlordName: string
}

export interface InviteTenantCoreResult {
  success: boolean
  errors?: {
    email?: string
    general?: string
  }
  locale?: EmailLocale
  resolvedLandlordName?: string
  code?: string
}

export async function inviteTenantCore(
  supabase: TypedSupabaseClient,
  input: InviteTenantInput,
): Promise<InviteTenantCoreResult> {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, errors: { general: 'notAuthenticated' } }
  }

  // Email must be stored lowercased for RLS and redemption matching.
  // See docs/project/architecture-auth.md.
  const email = input.email.trim().toLowerCase()

  const { data: profile } = await supabase
    .from('profiles')
    .select('preferred_locale, full_name')
    .eq('id', user.id)
    .single()

  const locale = (profile?.preferred_locale as EmailLocale) ?? 'en'
  const resolvedLandlordName = input.landlordName || profile?.full_name || ''

  const { data: existing } = await supabase
    .from('invitations')
    .select('id')
    .eq('property_id', input.propertyId)
    .eq('unit_id', input.unitId)
    .eq('invited_email', email)
    .eq('status', 'pending')
    .limit(1)
    .single()

  if (existing) {
    return { success: false, errors: { email: 'alreadyInvited' } }
  }

  const code = generateInviteCode()

  const { error: insertError } = await supabase
    .from('invitations')
    .insert({
      property_id: input.propertyId,
      unit_id: input.unitId,
      invited_by: user.id,
      invited_email: email,
      invited_name: input.tenantName,
      role: 'tenant' as const,
      status: 'pending' as const,
      code,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })

  if (insertError) {
    return { success: false, errors: { general: 'inviteFailed' } }
  }

  return { success: true, locale, resolvedLandlordName, code }
}

export async function inviteTenant(
  _prevState: InviteTenantState,
  formData: FormData,
): Promise<InviteTenantState> {
  const propertyId = (formData.get('property_id') as string)?.trim()
  const unitId = (formData.get('unit_id') as string)?.trim()
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const tenantName = (formData.get('tenant_name') as string)?.trim() || null
  const landlordName = (formData.get('landlord_name') as string)?.trim() || ''

  if (!email) {
    return { success: false, errors: { email: 'required' } }
  }

  if (!propertyId || !unitId) {
    return { success: false, errors: { general: 'missingContext' } }
  }

  const supabase = await createClient()

  const { data: property } = await supabase
    .from('properties')
    .select('name, street, number, complement, neighborhood, city, state, country_code')
    .eq('id', propertyId)
    .single()

  const addressOneLine = property ? formatAddress(property) : ''
  const addressHtml = property ? formatAddressHtml(property) : ''
  const propertyName = addressOneLine || property?.name || ''

  const result = await inviteTenantCore(supabase, {
    propertyId,
    unitId,
    email,
    tenantName,
    landlordName,
  })

  if (!result.success) {
    return { success: false, errors: result.errors }
  }

  await sendTenantInviteEmail({
    to: email,
    tenantName,
    landlordName: result.resolvedLandlordName ?? '',
    propertyName,
    addressHtml,
    code: result.code!,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    locale: result.locale ?? 'en',
  })

  revalidatePath(`/app/p/${propertyId}`)
  return { success: true }
}
