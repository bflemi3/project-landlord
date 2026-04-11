import { getTranslations } from 'next-intl/server'
import { PageHeader, PageHeaderBack } from '@/components/page-header'
import { getProperty } from '@/data/properties/server'

/**
 * Property header — fetches property + translations, renders back button + name + address.
 * Wrapped in Suspense by the parent page — streams independently.
 */
export async function PropertyHeader({ propertyId }: { propertyId: string }) {
  const [property, t] = await Promise.all([
    getProperty(propertyId),
    getTranslations('propertyDetail'),
  ])

  const address = [property.street, property.number].filter(Boolean).join(', ')
  const cityState = [property.city, property.state].filter(Boolean).join(', ')
  const full = [address, cityState].filter(Boolean).join(', ')

  return (
    <PageHeader>
      <PageHeaderBack href="/app">{t('back')}</PageHeaderBack>
      <h1 className="text-2xl font-bold text-foreground">{property.name}</h1>
      {full && <p className="mt-0.5 text-sm text-muted-foreground">{full}</p>}
    </PageHeader>
  )
}
