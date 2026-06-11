'use client'

import { useProperty } from '@/data/properties/client'

export function PropertyTitle({ propertyId }: { propertyId: string }) {
  const { data: property } = useProperty(propertyId)

  const locality = [property.neighborhood, property.city].filter(Boolean).join(' · ')

  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-display text-foreground text-2xl font-medium tracking-tight">
        {property.name}
      </h1>
      {locality ? <p className="text-muted-foreground text-sm">{locality}</p> : null}
    </div>
  )
}
