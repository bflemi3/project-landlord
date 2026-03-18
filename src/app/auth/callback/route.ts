import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      function buildUrl(path: string) {
        if (isLocalEnv) return `${origin}${path}`
        if (forwardedHost) return `https://${forwardedHost}${path}`
        return `${origin}${path}`
      }

      if (type === 'recovery') {
        return NextResponse.redirect(buildUrl('/auth/reset-password'))
      }

      // Email confirmation — redirect to verified page (Tab B)
      // so it can notify Tab A via BroadcastChannel
      if (type === 'signup' || type === 'email') {
        return NextResponse.redirect(buildUrl('/auth/verified'))
      }

      return NextResponse.redirect(buildUrl(next))
    }

    return NextResponse.redirect(
      `${origin}/auth/sign-in?error=${encodeURIComponent(error.message)}`,
    )
  }

  return NextResponse.redirect(`${origin}/auth/sign-in?error=Could+not+authenticate`)
}
