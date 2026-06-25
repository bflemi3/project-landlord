'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

type BackButtonProps = {
  className?: string
  label?: string
  href?: string
  onClick?: VoidFunction
}

export function BackButton({ className, label, href, onClick }: BackButtonProps) {
  const router = useRouter()
  const t = useTranslations('common')
  const pathname = usePathname()
  const pathnameRef = useRef(pathname)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // window.history.length includes any external page the user came from, so a
  // referral from Google would send router.back() back to Google. Same-origin
  // referrer is the real signal that "back" stays inside Mabenn. Ref (not state)
  // because it only changes once on mount and is only read in the click handler.
  const internalReferrerRef = useRef(false)

  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])

  useEffect(() => {
    try {
      const ref = document.referrer
      internalReferrerRef.current = !!ref && new URL(ref).origin === window.location.origin
    } catch {
      // Opaque or unparseable referrer — treat as external (safer to push to /).
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  function handleClick() {
    if (!internalReferrerRef.current) {
      router.push('/')
      return
    }
    const beforePath = window.location.pathname
    router.back()
    if (timerRef.current) clearTimeout(timerRef.current)
    // Workaround: in Next App Router, router.back() landing on a URL with a
    // hash where the path also changed (e.g. /privacy → /#faq) fires popstate
    // but the router treats it as a same-page hash change and skips the route
    // transition. Detect that case — browser path moved but Next's internal
    // pathname didn't — and force the push. The pathnameRef guard prevents
    // this from firing on every cross-page back (which would duplicate history
    // and kill the forward stack).
    timerRef.current = setTimeout(() => {
      if (
        window.location.pathname !== beforePath &&
        pathnameRef.current === beforePath
      ) {
        router.push(window.location.pathname + window.location.search + window.location.hash)
      }
    }, 100)
  }

  if (href) {
    return (
      <Button className={className} variant="link" render={<Link href={href} />} nativeButton={false}>
        <ChevronLeft />
        {label ?? t('back')}
      </Button>
    )
  }

  return (
    <Button className={className} variant="ghost" onClick={onClick ?? handleClick}>
      <ChevronLeft />
      {label ?? t('back')}
    </Button>
  )
}
