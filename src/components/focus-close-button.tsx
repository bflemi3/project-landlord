import Link from 'next/link'
import { X } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { Button } from '@/components/ui/button'

// Fixed close in the far-right corner, opposite the wordmark — shared chrome
// for focus layouts. Desktop only: on mobile the page header carries its own
// in-flow close (no floating chrome over scrolling content).
export async function FocusCloseButton() {
  const t = await getTranslations('common')

  return (
    <Button
      variant="ghost"
      size="icon-lg"
      render={<Link href="/app" />}
      nativeButton={false}
      aria-label={t('close')}
      className="fixed top-4 right-7 z-30 max-md:hidden"
    >
      <X />
    </Button>
  )
}
