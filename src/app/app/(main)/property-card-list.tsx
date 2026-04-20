import { getHomeProperties } from '@/data/home/server'
import { HomePropertyCard } from './home-property-card'

/**
 * Server component that fetches all landlord properties in one DB call
 * and renders cards. Wrapped in Suspense by the parent — streams independently.
 */
export async function PropertyCardList() {
  const properties = await getHomeProperties()

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {properties.map((p) => (
        <HomePropertyCard key={p.propertyId} property={p} />
      ))}
    </div>
  )
}
