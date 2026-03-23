import { Webhook } from 'standardwebhooks'
import { Resend } from 'resend'
import { type EmailLocale, getAuthEmailTranslations } from './i18n.ts'
import { buildConfirmEmailHtml, buildResetPasswordHtml } from './templates.ts'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)
const hookSecret = (Deno.env.get('SEND_EMAIL_HOOK_SECRET') as string).replace('v1,whsec_', '')

const RESEND_FROM = 'mabenn <noreply@mabenn.com>'
const BASE_URL = Deno.env.get('SITE_URL') ?? 'https://mabenn.com'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''

interface HookPayload {
  user: {
    id: string
    email: string
    user_metadata: {
      full_name?: string
      name?: string
    }
  }
  email_data: {
    token: string
    token_hash: string
    redirect_to: string
    email_action_type: string
    site_url: string
  }
}

async function getUserLocale(userId: string): Promise<EmailLocale> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=preferred_locale`,
      {
        headers: {
          apikey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string,
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string}`,
        },
      },
    )
    const data = await response.json()
    const locale = data?.[0]?.preferred_locale
    if (locale === 'pt-BR' || locale === 'es' || locale === 'en') return locale
  } catch {
    // Fall through to default
  }
  return 'en'
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const payload = await req.text()
  const headers = Object.fromEntries(req.headers)

  let data: HookPayload

  try {
    const wh = new Webhook(hookSecret)
    data = wh.verify(payload, headers) as HookPayload
  } catch {
    return new Response(
      JSON.stringify({ error: { http_code: 401, message: 'Invalid signature' } }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const { user, email_data } = data
  const { token_hash, redirect_to, email_action_type } = email_data

  const locale = await getUserLocale(user.id)
  const t = getAuthEmailTranslations(locale)
  const name = user.user_metadata?.full_name ?? user.user_metadata?.name

  const verifyUrl = `${SUPABASE_URL}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`

  let subject: string
  let html: string

  try {
    if (email_action_type === 'signup' || email_action_type === 'email') {
      subject = t.confirmEmail.subject
      html = buildConfirmEmailHtml({
        confirmUrl: verifyUrl,
        name,
        locale,
        baseUrl: BASE_URL,
      })
    } else if (email_action_type === 'recovery') {
      subject = t.resetPassword.subject
      html = buildResetPasswordHtml({
        resetUrl: verifyUrl,
        locale,
        baseUrl: BASE_URL,
      })
    } else {
      return new Response(
        JSON.stringify({}),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const { error } = await resend.emails.send({
      from: RESEND_FROM,
      to: [user.email],
      subject,
      html,
    })

    if (error) {
      console.error('Resend error:', JSON.stringify(error))
      throw error
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error sending email:', message)
    return new Response(
      JSON.stringify({ error: { http_code: 500, message } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  return new Response(
    JSON.stringify({}),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
})
