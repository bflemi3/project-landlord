'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import Link from 'next/link'

const version = process.env.NEXT_PUBLIC_APP_VERSION
const releaseNotes = process.env.NEXT_PUBLIC_RELEASE_NOTES

export function SwUpdateNotifier() {
  const t = useTranslations('pwa')

  useEffect(() => {
    function showUpdateToast() {
      const notes = releaseNotes
        ?.split('\n')
        .filter((line) => line.startsWith('- '))
        .map((line) => line.slice(2))

      toast(t('whatsNew', { version: version ?? '' }), {
        duration: Infinity,
        description: (
          <div className="flex flex-col gap-3">
            {notes && notes.length > 0 && (
              <ul className="list-disc space-y-1 pl-4">
                {notes.map((note, i) => (
                  <li key={i}>{note}</li>
                ))}
              </ul>
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
