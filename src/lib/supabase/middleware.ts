import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Auth paths that authenticated users can still access
const AUTH_PASSTHROUGH_PATHS = [
  '/auth/callback',
  '/auth/redeem',
  '/auth/reset-password',
  '/auth/verified',
  '/auth/enter-code',
]

function redirectWithCookies(url: URL, supabaseResponse: NextResponse) {
  const redirect = NextResponse.redirect(url)
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie.name, cookie.value, cookie)
  })
  return redirect
}

export async function updateSession(request: NextRequest) {
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

  // Do not run code between createServerClient and getClaims().
  // A simple mistake could make it very hard to debug issues with
  // users being randomly logged out.
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims

  const { pathname } = request.nextUrl

  // Engineer-only gate for /eng/* routes
  if (pathname.startsWith('/eng')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/sign-in'
      return redirectWithCookies(url, supabaseResponse)
    }

    const serviceRole = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { data: allowlistEntry } = await serviceRole
      .from('engineer_allowlist')
      .select('id')
      .eq('user_id', (user as Record<string, unknown>).sub as string)
      .single()

    if (!allowlistEntry) {
      const url = request.nextUrl.clone()
      url.pathname = '/app'
      return redirectWithCookies(url, supabaseResponse)
    }
  }

  // Unauthenticated users trying to access /app → redirect to sign-in
  if (!user && pathname.startsWith('/app')) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/sign-in'
    return redirectWithCookies(url, supabaseResponse)
  }

  // Authenticated users on /app who haven't redeemed invite → redirect to enter-code
  if (user && pathname.startsWith('/app')) {
    const appMetadata = (user as Record<string, unknown>).app_metadata as
      | Record<string, unknown>
      | undefined
    const hasRedeemedInvite = appMetadata?.has_redeemed_invite === true
    if (!hasRedeemedInvite) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/enter-code'
      return redirectWithCookies(url, supabaseResponse)
    }
  }

  // Authenticated users trying to access /auth → redirect to /app
  // (except passthrough paths that need auth context)
  const isPassthrough = AUTH_PASSTHROUGH_PATHS.some((p) => pathname.startsWith(p))
  if (user && pathname.startsWith('/auth') && !isPassthrough) {
    const url = request.nextUrl.clone()
    url.pathname = '/app'
    return redirectWithCookies(url, supabaseResponse)
  }

  return supabaseResponse
}
