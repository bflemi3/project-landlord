import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { redeemInviteByCodeCore } from '@/data/profiles/actions/redeem-invite-by-code'

function redirectWithCookies(url: string | URL, supabaseResponse: NextResponse) {
  const redirect = NextResponse.redirect(url)
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie.name, cookie.value, cookie)
  })
  return redirect
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/app'
  const errorParam = searchParams.get('error_description') || searchParams.get('error')

  if (errorParam) {
    return NextResponse.redirect(`${origin}/auth/sign-in?error=${encodeURIComponent(errorParam)}`)
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/sign-in?error=Could+not+authenticate`)
  }

  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.session) {
    return NextResponse.redirect(
      `${origin}/auth/sign-in?error=${encodeURIComponent(error?.message ?? 'Authentication failed')}`,
    )
  }

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

  const pendingInviteCode = request.cookies.get('pending_invite_code')?.value
  if (pendingInviteCode) {
    const inviteCode = decodeURIComponent(pendingInviteCode)
    await redeemInviteByCodeCore(supabase, data.session.user.id, inviteCode)
    await supabase.auth.refreshSession()

    const response = redirectWithCookies(buildUrl(next), supabaseResponse)
    response.cookies.set('pending_invite_code', '', { path: '/', maxAge: 0 })
    return response
  }

  if (type === 'recovery') {
    return redirectWithCookies(buildUrl('/auth/reset-password'), supabaseResponse)
  }

  if (type === 'signup' || type === 'email') {
    const inviteCode = data.session.user.user_metadata?.invite_code as string | undefined
    if (inviteCode) {
      await redeemInviteByCodeCore(supabase, data.session.user.id, inviteCode)
    }
    // exchangeCodeForSession sometimes mints a JWT without the app_metadata
    // claim the DB trigger set during signup. Refresh so the cookie carries
    // has_redeemed_invite before middleware reads it on the /app request.
    await supabase.auth.refreshSession()
    return redirectWithCookies(buildUrl('/auth/verified'), supabaseResponse)
  }

  return redirectWithCookies(buildUrl(next), supabaseResponse)
}
