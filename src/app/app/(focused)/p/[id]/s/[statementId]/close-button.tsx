'use client'

import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function CloseButton({ propertyId }: { propertyId: string }) {
  const router = useRouter()
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => router.push(`/app/p/${propertyId}`)}
    >
      <X />
    </Button>
  )
}
