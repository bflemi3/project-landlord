'use client'

import { useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AddPropertyButtonProps {
  ariaLabel: string
  label: string
}

export function AddPropertyButton({ ariaLabel, label }: AddPropertyButtonProps) {
  const router = useRouter()
  const draftId = useMemo(() => crypto.randomUUID(), [])
  const href = `/app/p/new/${draftId}`
  const warmPrefetch = useCallback(() => router.prefetch(href), [router, href])

  return (
    <Button
      render={
        <Link
          href={href}
          prefetch
          onMouseEnter={warmPrefetch}
          onFocus={warmPrefetch}
          onTouchStart={warmPrefetch}
          aria-label={ariaLabel}
        />
      }
      nativeButton={false}
      variant="ghost"
    >
      <Plus />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  )
}
