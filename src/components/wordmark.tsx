/* eslint-disable @next/next/no-img-element */

export function Wordmark({ className }: { className?: string }) {
  return (
    <>
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
    </>
  )
}
