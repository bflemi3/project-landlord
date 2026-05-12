'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import Link from 'next/link'
import Markdown, { type Components } from 'react-markdown'

const version = process.env.NEXT_PUBLIC_APP_VERSION
const releaseNotes = process.env.NEXT_PUBLIC_RELEASE_NOTES

const markdownComponents: Components = {
  p: (props) => <p className="leading-relaxed [&:not(:first-child)]:mt-2" {...props} />,
  ul: (props) => <ul className="list-disc space-y-1 pl-4 [&:not(:first-child)]:mt-2" {...props} />,
  ol: (props) => <ol className="list-decimal space-y-1 pl-4 [&:not(:first-child)]:mt-2" {...props} />,
  li: (props) => <li {...props} />,
  strong: (props) => <strong className="font-semibold" {...props} />,
  em: (props) => <em className="italic" {...props} />,
  a: (props) => (
    <a
      className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  code: (props) => (
    <code className="rounded bg-muted px-1 py-0.5 text-[0.9em]" {...props} />
  ),
  h1: (props) => <h2 className="text-base font-semibold [&:not(:first-child)]:mt-3" {...props} />,
  h2: (props) => <h3 className="text-base font-semibold [&:not(:first-child)]:mt-3" {...props} />,
  h3: (props) => <h4 className="font-semibold [&:not(:first-child)]:mt-3" {...props} />,
  hr: () => <hr className="my-3 border-border" />,
}

export function SwUpdateNotifier() {
  const t = useTranslations('pwa')

  useEffect(() => {
    function showUpdateToast() {
      toast(t('whatsNew', { version: version ?? '' }), {
        duration: Infinity,
        description: (
          <div className="flex flex-col gap-3">
            {releaseNotes && releaseNotes.length > 0 && (
              <div className="text-sm text-foreground">
                <Markdown components={markdownComponents}>{releaseNotes}</Markdown>
              </div>
            )}
            <Link
              href="/changelog"
              className="text-base font-medium text-primary hover:underline md:text-sm"
              onClick={() => toast.dismiss()}
            >
              {t('viewPastUpdates')}
            </Link>
          </div>
        ),
      })
    }

    if (process.env.NODE_ENV === 'development') return
    if (!('serwist' in window) || !window.serwist) return
    window.serwist.addEventListener('controlling', (event) => {
      if (!event.isUpdate) return
      showUpdateToast()
    })
  }, [t])

  return null
}
