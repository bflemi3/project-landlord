import Link from 'next/link'
import { X } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button-variants'

export function CloseButton({ propertyId }: { propertyId: string }) {
  return (
    <Link
      href={`/app/p/${propertyId}`}
      prefetch
      className={buttonVariants({ variant: 'ghost', size: 'icon' })}
    >
      <X />
    </Link>
  )
}
