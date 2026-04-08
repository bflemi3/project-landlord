'use server'

import { createClient } from '@/lib/supabase/server'
import { resend, RESEND_FROM } from '@/lib/resend/client'
import { getEmailTranslations, type EmailLocale } from '@/emails/i18n'
import { generateInviteCode } from '@/lib/invitations/generate-invite-code'
import { formatAddress, formatAddressHtml } from '@/lib/address/format-address'

export async function resendInvite(inviteId: string): Promise<{ success: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false }

  // Fetch the invitation + property name + landlord profile
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
  const t = getEmailTranslations(locale)

  try {
    await resend.emails.send({
      from: RESEND_FROM,
      to: invite.invited_email,
      replyTo: 'hello@mabenn.com',
      subject: t.tenantInvite.subject(propertyName),
      html: buildTenantInviteEmail({
        tenantName: invite.invited_name,
        landlordName,
        propertyName,
        addressHtml,
        locale,
        code: newCode,
        expiresAt,
      }),
    })
  } catch {
    return { success: false }
  }

  // Update code, expiry, and timestamp so the UI reflects when the invite was last sent
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
  const body = t.tenantInvite.body(landlordName, propertyName)
  const signUpUrl = `https://mabenn.com/auth/sign-up?code=${encodeURIComponent(code)}`
  const expiresDate = new Date(expiresAt).toLocaleDateString(
    locale === 'pt-BR' ? 'pt-BR' : locale === 'es' ? 'es' : 'en-US',
    { month: 'long', day: 'numeric', year: 'numeric' },
  )

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body style="font-family:ui-sans-serif,system-ui,sans-serif;background:#fff;margin:0;padding:0">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:40px auto;padding:0 24px">
    <tr><td>
      <img src="https://mabenn.com/brand/wordmark-light.png" alt="mabenn" height="28" style="display:block;margin:0 auto 32px" />
      <div style="background:#fff;border:1px solid #e4e4e7;border-radius:16px;padding:32px">
        <p style="font-size:20px;font-weight:700;color:#18181b;margin:0 0 16px;line-height:1.4">${addressHtml || propertyName}</p>
        <p style="font-size:16px;color:#52525b;margin:0 0 24px">${greeting} ${body}</p>
        <a href="${signUpUrl}" style="display:block;background:#14b8a6;color:#fff;font-weight:700;font-size:16px;text-align:center;padding:12px 24px;border-radius:12px;text-decoration:none">${t.tenantInvite.button}</a>
        <p style="font-size:13px;color:#a1a1aa;margin:12px 0 0;text-align:center">${t.tenantInvite.manualCode(code)}</p>
        <p style="font-size:13px;color:#a1a1aa;margin:4px 0 0;text-align:center">${t.tenantInvite.expiresOn(expiresDate)}</p>
      </div>
      <hr style="border:none;border-top:1px solid #e4e4e7;margin:32px 0" />
      <p style="font-size:14px;color:#a1a1aa;text-align:center;margin:0">${t.footer}</p>
    </td></tr>
  </table>
</body>
</html>`
}
