import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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

  // Unauthenticated users trying to access /app → redirect to sign-in
  if (!user && pathname.startsWith('/app')) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/sign-in'
    const redirect = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirect.cookies.set(cookie.name, cookie.value, cookie)
    })
    return redirect
  }

  // Authenticated users trying to access /auth (except callback, reset-password, verified) → redirect to /app
  if (user && pathname.startsWith('/auth') && !pathname.startsWith('/auth/callback') && !pathname.startsWith('/auth/reset-password') && !pathname.startsWith('/auth/verified')) {
    const url = request.nextUrl.clone()
    url.pathname = '/app'
    const redirect = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirect.cookies.set(cookie.name, cookie.value, cookie)
    })
    return redirect
  }

  return supabaseResponse
}
