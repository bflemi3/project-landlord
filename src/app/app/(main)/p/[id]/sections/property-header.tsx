'use client'

import { useProperty } from '@/lib/hooks/use-property'

export function PropertyHeader({ propertyId }: { propertyId: string }) {
  const { data: property } = useProperty(propertyId)

  const address = [property.street, property.number].filter(Boolean).join(', ')
  const cityState = [property.city, property.state].filter(Boolean).join(', ')

  return (
    <>
      <h1 className="text-2xl font-bold text-foreground">{property.name}</h1>
      {(address || cityState) && (
        <p className="mt-0.5 text-sm text-muted-foreground">
          {[address, cityState].filter(Boolean).join(', ')}
        </p>
      )}
    </>
  )
}
