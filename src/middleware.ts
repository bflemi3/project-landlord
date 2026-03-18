import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import {
  LOCALE_COOKIE,
  defaultLocale,
  detectLocaleFromHeader,
  detectLocaleFromDomain,
} from '@/lib/i18n/detect-locale'

export async function middleware(request: NextRequest) {
  const response = await updateSession(request)

  // Set locale cookie if not already present
  if (!request.cookies.get(LOCALE_COOKIE)) {
    const hostname = request.headers.get('host') ?? ''
    // Browser language preference takes priority over domain
    const detected =
      detectLocaleFromHeader(request.headers.get('accept-language')) ??
      detectLocaleFromDomain(hostname) ??
      defaultLocale

    response.cookies.set(LOCALE_COOKIE, detected, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax',
    })
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json|sw.js|workbox-.*).*)'],
}
