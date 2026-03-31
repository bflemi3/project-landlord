'use server'

import { createClient } from '@/lib/supabase/server'
import { resend, RESEND_FROM } from '@/lib/resend/client'
import { getEmailTranslations, type EmailLocale } from '@/emails/i18n'

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

  const { data: property } = await supabase
    .from('properties')
    .select('name')
    .eq('id', invite.property_id)
    .single()

  const { data: profile } = await supabase
    .from('profiles')
    .select('preferred_locale, full_name')
    .eq('id', user.id)
    .single()

  const locale = (profile?.preferred_locale as EmailLocale) ?? 'en'
  const landlordName = profile?.full_name ?? ''
  const propertyName = property?.name ?? ''
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
        locale,
      }),
    })
  } catch {
    return { success: false }
  }

  // Update the timestamp so the UI reflects when the invite was last sent
  await supabase
    .from('invitations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', inviteId)

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
        <a href="https://mabenn.com/auth/sign-up" style="display:block;background:#14b8a6;color:#fff;font-weight:700;font-size:16px;text-align:center;padding:12px 24px;border-radius:12px;text-decoration:none">${t.tenantInvite.button}</a>
        <p style="font-size:14px;color:#a1a1aa;margin:8px 0 0">${t.tenantInvite.hint}</p>
      </div>
      <hr style="border:none;border-top:1px solid #e4e4e7;margin:32px 0" />
      <p style="font-size:14px;color:#a1a1aa;text-align:center;margin:0">${t.footer}</p>
    </td></tr>
  </table>
</body>
</html>`
}
