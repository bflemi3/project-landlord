import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { formatAddress } from '@/lib/address/format-address'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

import { DeletePropertyButton } from './delete-property-button'

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: property } = await supabase
    .from('properties')
    .select('id, name, street, number, complement, neighborhood, city, state, postal_code, country_code')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!property) notFound()

  const address = formatAddress({
    street: property.street,
    number: property.number,
    complement: property.complement,
    neighborhood: property.neighborhood,
    city: property.city,
    state: property.state,
    country_code: property.country_code,
  })

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <Button variant="ghost" size="sm" render={<Link href="/app" />} className="mb-6 -ml-3">
        <ArrowLeft />
        Back
      </Button>

      <Card className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {property.name}
          </h1>
          {address ? (
            <p className="mt-1 text-base text-muted-foreground">{address}</p>
          ) : null}
        </div>

        <div className="border-t border-border pt-6">
          <DeletePropertyButton propertyId={property.id} propertyName={property.name} />
        </div>
      </Card>
    </div>
  )
}
