import { getTranslations } from 'next-intl/server'
import { MapPin } from 'lucide-react'
import { getProperty } from '@/data/properties/server'
import { PropertyInfoActions } from './property-info-actions'

export async function PropertyInfoSection({ propertyId }: { propertyId: string }) {
  const t = await getTranslations('propertyDetail')
  const property = await getProperty(propertyId)

  const addressLines = [
    [property.street, property.number].filter(Boolean).join(', '),
    property.complement,
    property.neighborhood,
    [property.city, property.state].filter(Boolean).join(', '),
    property.postalCode,
  ].filter(Boolean)

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">{t('propertyInfo')}</h2>
        <PropertyInfoActions propertyId={propertyId} property={property} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 dark:border-zinc-700 dark:bg-zinc-800/50">
        <div className="flex gap-3">
          <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground/60" />
          <div className="text-sm text-foreground">
            {addressLines.map((line, i) => (
              <p key={i} className={i > 0 ? 'text-muted-foreground' : ''}>{line}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
