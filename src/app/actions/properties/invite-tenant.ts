'use server'

import { createClient } from '@/lib/supabase/server'
import { resend, RESEND_FROM } from '@/lib/resend/client'
import { getEmailTranslations, type EmailLocale } from '@/emails/i18n'

export interface InviteTenantState {
  success: boolean
  errors?: {
    email?: string
    general?: string
  }
}

export async function inviteTenant(
  _prevState: InviteTenantState,
  formData: FormData,
): Promise<InviteTenantState> {
  const propertyId = (formData.get('property_id') as string)?.trim()
  const unitId = (formData.get('unit_id') as string)?.trim()
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const tenantName = (formData.get('tenant_name') as string)?.trim() || null
  const propertyName = (formData.get('property_name') as string)?.trim() || ''
  const landlordName = (formData.get('landlord_name') as string)?.trim() || ''

  if (!email) {
    return { success: false, errors: { email: 'required' } }
  }

  if (!propertyId || !unitId) {
    return { success: false, errors: { general: 'missingContext' } }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, errors: { general: 'notAuthenticated' } }
  }

  // Read the landlord's preferred locale for the email
  const { data: profile } = await supabase
    .from('profiles')
    .select('preferred_locale')
    .eq('id', user.id)
    .single()

  const locale = (profile?.preferred_locale as EmailLocale) ?? 'en'

  // Check if this tenant is already invited to this unit
  const { data: existing } = await supabase
    .from('invitations')
    .select('id')
    .eq('property_id', propertyId)
    .eq('unit_id', unitId)
    .eq('invited_email', email)
    .eq('status', 'pending')
    .limit(1)
    .single()

  if (existing) {
    return { success: false, errors: { email: 'alreadyInvited' } }
  }

  // Create the invitation
  const { error: insertError } = await supabase
    .from('invitations')
    .insert({
      property_id: propertyId,
      unit_id: unitId,
      invited_by: user.id,
      invited_email: email,
      invited_name: tenantName,
      role: 'tenant' as const,
      status: 'pending' as const,
    })

  if (insertError) {
    return { success: false, errors: { general: 'inviteFailed' } }
  }

  // Send the invite email
  try {
    const t = getEmailTranslations(locale)
    await resend.emails.send({
      from: RESEND_FROM,
      to: email,
      replyTo: 'hello@mabenn.com',
      subject: t.tenantInvite.subject(propertyName),
      html: buildTenantInviteEmail({ tenantName, landlordName, propertyName, locale }),
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
  locale,
}: {
  tenantName: string | null
  landlordName: string
  propertyName: string
  locale: EmailLocale
}): string {
  const t = getEmailTranslations(locale)
  const greeting = t.tenantInvite.greeting(tenantName)
  const body = t.tenantInvite.body(landlordName, propertyName)
  const button = t.tenantInvite.button
  const hint = t.tenantInvite.hint
  const footer = t.footer

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body style="font-family:ui-sans-serif,system-ui,sans-serif;background:#fff;margin:0;padding:0">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:40px auto;padding:0 24px">
    <tr><td>
      <img src="https://mabenn.com/brand/wordmark-light.png" alt="mabenn" height="28" style="display:block;margin:0 auto 32px" />
      <div style="background:#fff;border:1px solid #e4e4e7;border-radius:16px;padding:32px">
        <p style="font-size:24px;font-weight:700;color:#18181b;margin:0 0 16px">${propertyName}</p>
        <p style="font-size:16px;color:#52525b;margin:0 0 24px">${greeting} ${body}</p>
        <a href="https://mabenn.com/auth/sign-up" style="display:block;background:#14b8a6;color:#fff;font-weight:700;font-size:16px;text-align:center;padding:12px 24px;border-radius:12px;text-decoration:none">${button}</a>
        <p style="font-size:14px;color:#a1a1aa;margin:8px 0 0">${hint}</p>
      </div>
      <hr style="border:none;border-top:1px solid #e4e4e7;margin:32px 0" />
      <p style="font-size:14px;color:#a1a1aa;text-align:center;margin:0">${footer}</p>
    </td></tr>
  </table>
</body>
</html>`
}
