import { getProperty } from '@/data/properties/server'

export async function PropertyHeader({ propertyId }: { propertyId: string }) {
  const property = await getProperty(propertyId)

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
