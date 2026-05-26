import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { LOCALE_COOKIE, detectLocaleFromHeader } from '@/lib/i18n/detect-locale'
import { marketingLocaleFromHost } from '@/lib/marketing-meta'

// Production English host(s). Portuguese-preferring visitors who land here are
// bounced to mabenn.com.br. Localhost, previews, and .com.br are never matched,
// so they're never redirected (and there's no loop — the target isn't an EN host).
const EN_HOSTS = new Set(['mabenn.com', 'www.mabenn.com'])

export async function middleware(request: NextRequest) {
  const hostname = (request.headers.get('host') ?? '').split(':')[0].toLowerCase()
  const hasLocaleCookie = Boolean(request.cookies.get(LOCALE_COOKIE))

  // On the English domain, send a Portuguese-preferring visitor to mabenn.com.br
  // (temporary redirect, path + query preserved). Gated to real page loads
  // (Accept: text/html) and skipped once the user has made an explicit choice (the
  // locale cookie). Crawlers/unfurlers send en or no Accept-Language and so are
  // never redirected — both domains stay independently indexable.
  if (
    EN_HOSTS.has(hostname) &&
    !hasLocaleCookie &&
    request.headers.get('accept')?.includes('text/html') &&
    detectLocaleFromHeader(request.headers.get('accept-language')) === 'pt-BR'
  ) {
    const target = new URL(request.nextUrl.pathname + request.nextUrl.search, 'https://mabenn.com.br')
    return NextResponse.redirect(target, 307)
  }

  const response = await updateSession(request)

  // Seed the locale cookie on first visit. The domain decides (mabenn.com → en,
  // mabenn.com.br → pt-BR), matching the host-based metadata; the language switcher
  // overrides this later by setting the cookie explicitly.
  if (!hasLocaleCookie) {
    response.cookies.set(LOCALE_COOKIE, marketingLocaleFromHost(request.headers.get('host')), {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax',
    })
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json|serwist/.*|sw.js|workbox-.*).*)'],
}
