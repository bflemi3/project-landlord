import { getTranslations } from 'next-intl/server'
import {
  getCompletionSteps,
  isPropertyComplete,
  PropertyCardProgress,
  PropertyCardSteps,
  PropertyCardStep,
} from '@/components/property-card'
import { Card } from '@/components/ui/card'
import { getProperty } from '@/data/properties/server'
import { getUnitCharges, getUnitTenants, getUnitInvites } from '@/data/units/server'

export async function SetupProgressSection({ propertyId }: { propertyId: string }) {
  const tP = await getTranslations('properties')
  const property = await getProperty(propertyId)

  // For setup progress, check the first unit (MVP: single unit per property)
  const firstUnitId = property.unitIds[0] ?? ''
  const [charges, members, invites] = await Promise.all([
    getUnitCharges(firstUnitId),
    getUnitTenants(firstUnitId),
    getUnitInvites(firstUnitId),
  ])

  const activeTenants = members.length
  const pendingInvites = invites.length

  const progress = {
    propertyCreated: true,
    tenantsInvited: activeTenants > 0 || pendingInvites > 0,
    tenantsAccepted: activeTenants > 0,
    chargesConfigured: charges.length > 0,
    firstStatementPublished: false,
  }

  if (isPropertyComplete(progress)) return null

  const steps = getCompletionSteps(progress)
  const completed = steps.filter((s) => s.done).length
  const total = steps.length

  return (
    <Card>
      <PropertyCardProgress
        className="mt-0"
        completed={completed}
        total={total}
        label={tP('setupSteps', { completed, total })}
      />
      <PropertyCardSteps>
        {steps.map((step) => (
          <PropertyCardStep
            key={step.key}
            state={step.done ? 'done' : step.inProgress ? 'inProgress' : 'pending'}
          >
            {tP(step.label)}
          </PropertyCardStep>
        ))}
      </PropertyCardSteps>
    </Card>
  )
}
