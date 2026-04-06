'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useQueryClient } from '@tanstack/react-query'
import { Pencil, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ResponsiveModal } from '@/components/responsive-modal'
import { PropertyForm, type PropertyFormValues } from '@/app/app/(focused)/p/new/steps/property-form'
import { updateProperty } from '@/app/actions/properties/update-property'
import { useProperty } from '@/lib/hooks/use-property'
import { propertyQueryKey } from '@/lib/queries/property'

export function PropertyInfoSection({ propertyId }: { propertyId: string }) {
  const t = useTranslations('propertyDetail')
  const queryClient = useQueryClient()
  const { data: property } = useProperty(propertyId)
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)


  const addressLines = [
    [property.street, property.number].filter(Boolean).join(', '),
    property.complement,
    property.neighborhood,
    [property.city, property.state].filter(Boolean).join(', '),
    property.postalCode,
  ].filter(Boolean)

  async function handleSave(values: PropertyFormValues) {
    setSaving(true)
    await updateProperty({
      propertyId,
      name: values.name,
      street: values.street,
      number: values.number,
      complement: values.complement,
      neighborhood: values.neighborhood,
      city: values.city,
      state: values.state,
      postalCode: values.postal_code,
    })
    queryClient.invalidateQueries({ queryKey: propertyQueryKey(propertyId) })
    setSaving(false)
    setEditOpen(false)
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">{t('propertyInfo')}</h2>
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setEditOpen(true)}>
          <Pencil className="size-3.5" />
          {t('edit')}
        </Button>
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

      <ResponsiveModal
        open={editOpen}
        onOpenChange={setEditOpen}
        className="sm:max-w-lg"
      >
        <PropertyForm
          key={editOpen ? 'open' : 'closed'}
          onValidated={handleSave}
          initialValues={{
            name: property.name,
            postal_code: property.postalCode ?? '',
            street: property.street ?? '',
            number: property.number ?? '',
            complement: property.complement ?? '',
            neighborhood: property.neighborhood ?? '',
            city: property.city ?? '',
            state: property.state ?? '',
            country_code: property.countryCode,
          }}
        >
          <PropertyForm.Name className="mb-4" />
          <ResponsiveModal.Content className="px-0.5">
            <PropertyForm.Content />
          </ResponsiveModal.Content>
          <ResponsiveModal.Footer>
            <PropertyForm.Footer label={t('saveChanges')} />
          </ResponsiveModal.Footer>
        </PropertyForm>
      </ResponsiveModal>
    </div>
  )
}
