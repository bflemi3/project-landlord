import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { redeemInviteByCodeCore } from '@/data/profiles/actions/redeem-invite-by-code'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/app'
  const errorParam = searchParams.get('error_description') || searchParams.get('error')

  if (errorParam) {
    return NextResponse.redirect(
      `${origin}/auth/sign-in?error=${encodeURIComponent(errorParam)}`,
    )
  }

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.session) {
      // Sync avatar from OAuth provider on every sign-in
      const meta = data.session.user.user_metadata
      const oauthAvatar = meta?.avatar_url || meta?.picture
      if (oauthAvatar) {
        await supabase
          .from('profiles')
          .update({ avatar_url: oauthAvatar })
          .eq('id', data.session.user.id)
      }

      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      function buildUrl(path: string) {
        if (isLocalEnv) return `${origin}${path}`
        if (forwardedHost) return `https://${forwardedHost}${path}`
        return `${origin}${path}`
      }

      // Redeem invite code from cookie (set during Google OAuth sign-up)
      const cookieStore = await cookies()
      const pendingInviteCode = cookieStore.get('pending_invite_code')?.value
      if (pendingInviteCode) {
        const inviteCode = decodeURIComponent(pendingInviteCode)
        await redeemInviteByCodeCore(supabase, data.session.user.id, inviteCode)

        // Clear the cookie
        const response = NextResponse.redirect(buildUrl(next))
        response.cookies.set('pending_invite_code', '', { path: '/', maxAge: 0 })
        return response
      }

      if (type === 'recovery') {
        return NextResponse.redirect(buildUrl('/auth/reset-password'))
      }

      if (type === 'signup' || type === 'email') {
        // Redeem invite code from user_metadata (set during email sign-up)
        const inviteCode = data.session.user.user_metadata?.invite_code as string | undefined
        if (inviteCode) {
          await redeemInviteByCodeCore(supabase, data.session.user.id, inviteCode)
        }
        return NextResponse.redirect(buildUrl('/auth/verified'))
      }

      return NextResponse.redirect(buildUrl(next))
    }

    return NextResponse.redirect(
      `${origin}/auth/sign-in?error=${encodeURIComponent(error?.message ?? 'Authentication failed')}`,
    )
  }

  return NextResponse.redirect(`${origin}/auth/sign-in?error=Could+not+authenticate`)
}
