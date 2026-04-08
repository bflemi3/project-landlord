'use server'

import { createClient } from '@/lib/supabase/server'
import type { TypedSupabaseClient } from '@/lib/supabase/types'
import { resend, RESEND_FROM } from '@/lib/resend/client'
import { getEmailTranslations, type EmailLocale } from '@/emails/i18n'
import { generateInviteCode } from '@/lib/invitations/generate-invite-code'
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

  // Read the landlord's profile for locale and name
  const { data: profile } = await supabase
    .from('profiles')
    .select('preferred_locale, full_name')
    .eq('id', user.id)
    .single()

  const locale = (profile?.preferred_locale as EmailLocale) ?? 'en'
  const resolvedLandlordName = input.landlordName || profile?.full_name || ''

  // Check if this tenant is already invited to this unit
  const { data: existing } = await supabase
    .from('invitations')
    .select('id')
    .eq('property_id', input.propertyId)
    .eq('unit_id', input.unitId)
    .eq('invited_email', input.email)
    .eq('status', 'pending')
    .limit(1)
    .single()

  if (existing) {
    return { success: false, errors: { email: 'alreadyInvited' } }
  }

  // Create the invitation
  const code = generateInviteCode()

  const { error: insertError } = await supabase
    .from('invitations')
    .insert({
      property_id: input.propertyId,
      unit_id: input.unitId,
      invited_by: user.id,
      invited_email: input.email,
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

  // Fetch property address for the email
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

  // Send the invite email
  try {
    const locale = result.locale ?? 'en'
    const resolvedLandlordName = result.resolvedLandlordName ?? ''
    const t = getEmailTranslations(locale)
    await resend.emails.send({
      from: RESEND_FROM,
      to: email,
      replyTo: 'hello@mabenn.com',
      subject: t.tenantInvite.subject(propertyName),
      html: buildTenantInviteEmail({
        tenantName,
        landlordName: resolvedLandlordName,
        propertyName,
        addressHtml,
        locale,
        code: result.code!,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    })
  } catch {
    // Email failed but invitation was created — don't fail the action
  }

  return { success: true }
}

function buildTenantInviteEmail({
  tenantName,
  landlordName,
  propertyName,
  addressHtml,
  locale,
  code,
  expiresAt,
}: {
  tenantName: string | null
  landlordName: string
  propertyName: string
  addressHtml: string
  locale: EmailLocale
  code: string
  expiresAt: string
}): string {
  const t = getEmailTranslations(locale)
  const greeting = t.tenantInvite.greeting(tenantName)
  const intro = t.tenantInvite.intro(landlordName)
  const signUpUrl = `https://mabenn.com/auth/sign-up?code=${encodeURIComponent(code)}`
  const expiresDate = new Date(expiresAt).toLocaleDateString(
    locale === 'pt-BR' ? 'pt-BR' : locale === 'es' ? 'es' : 'en-US',
    { month: 'long', day: 'numeric', year: 'numeric' },
  )

  const displayAddress = addressHtml || propertyName

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body style="font-family:ui-sans-serif,system-ui,sans-serif;background:#fff;margin:0;padding:0">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:40px auto;padding:0 24px">
    <tr><td>
      <img src="https://mabenn.com/brand/wordmark-light.png" alt="mabenn" height="28" style="display:block;margin:0 auto 32px" />
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e4e4e7;border-radius:16px">
        <tr><td style="padding:32px">
          <p style="font-size:16px;color:#52525b;line-height:1.5;margin:0 0 20px">${greeting} ${intro}</p>
          ${displayAddress ? `<table cellpadding="0" cellspacing="0" style="margin:0 0 20px"><tr>
            <td style="width:3px;background:#14b8a6;border-radius:2px"></td>
            <td style="padding:8px 0 8px 16px"><p style="font-size:15px;font-weight:600;color:#18181b;margin:0;line-height:1.5">${displayAddress}</p></td>
          </tr></table>` : ''}
          <p style="font-size:15px;color:#71717a;line-height:1.5;margin:0 0 24px">${t.tenantInvite.valueProp}</p>
          <a href="${signUpUrl}" style="display:block;background:#14b8a6;color:#fff;font-weight:700;font-size:16px;text-align:center;padding:12px 24px;border-radius:12px;text-decoration:none">${t.tenantInvite.button}</a>
          <p style="font-size:13px;color:#a1a1aa;margin:12px 0 0;text-align:center">${t.tenantInvite.manualCode(code)}</p>
          <p style="font-size:13px;color:#a1a1aa;margin:4px 0 0;text-align:center">${t.tenantInvite.expiresOn(expiresDate)}</p>
        </td></tr>
      </table>
      <hr style="border:none;border-top:1px solid #e4e4e7;margin:32px 0" />
      <p style="font-size:14px;color:#a1a1aa;text-align:center;margin:0">${t.footer}</p>
    </td></tr>
  </table>
</body>
</html>`
}
