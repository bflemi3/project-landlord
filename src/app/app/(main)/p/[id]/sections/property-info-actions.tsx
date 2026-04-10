'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useQueryClient } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ResponsiveModal } from '@/components/responsive-modal'
import { PropertyForm, type PropertyFormValues } from '@/app/app/(focused)/p/new/steps/property-form'
import { updateProperty } from '@/data/properties/actions/update-property'
import { propertyQueryKey } from '@/data/properties/shared'
import type { Property } from '@/data/properties/shared'

export function PropertyInfoActions({ propertyId, property }: { propertyId: string; property: Property }) {
  const t = useTranslations('propertyDetail')
  const queryClient = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)

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
      countryCode: values.country_code,
    })
    queryClient.invalidateQueries({ queryKey: propertyQueryKey(propertyId) })
    setSaving(false)
    setEditOpen(false)
  }

  return (
    <>
      <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setEditOpen(true)}>
        <Pencil className="size-3.5" />
        {t('edit')}
      </Button>

      <ResponsiveModal
        open={editOpen}
        onOpenChange={setEditOpen}
        className="sm:max-w-lg"
      >
        <PropertyForm
          key={editOpen ? 'open' : 'closed'}
          onValidated={handleSave}
          excludePropertyId={propertyId}
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
    </>
  )
}
