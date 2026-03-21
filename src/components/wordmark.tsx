/* eslint-disable @next/next/no-img-element */

import Link from 'next/link'

export function Wordmark({ className, href = '/' }: { className?: string; href?: string }) {
  return (
    <Link href={href}>
      <img
        src="/brand/wordmark-light.svg"
        alt="mabenn"
        className={`dark:hidden ${className ?? 'mx-auto h-10'}`}
      />
      <img
        src="/brand/wordmark-dark.svg"
        alt="mabenn"
        className={`hidden dark:block ${className ?? 'mx-auto h-10'}`}
      />
    </Link>
  )
}
