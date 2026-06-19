import { getTranslations } from 'next-intl/server'

import { Dot } from '@/components/ui/dot'
import { getPropertyContractStatus } from '@/data/contracts/server'

// The property's contract status, inline with the title. Active/Inactive are
// quiet bare dots (active pulses "live"); No contract carries weight as a soft
// amber pill so a missing lease stands out. Pill metrics match ui/badge.
export async function PropertyStatus({ propertyId }: { propertyId: string }) {
  const [status, t] = await Promise.all([
    getPropertyContractStatus(propertyId),
    getTranslations('property'),
  ])
  const label = t(`contractStatus.${status}`)

  if (status === 'none') {
    return (
      <span className="bg-warning-subtle text-warning-subtle-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] leading-[18px] font-medium">
        <Dot tone="warning" />
        {label}
      </span>
    )
  }

  return (
    <span className="flex items-center gap-1.5">
      {status === 'active' ? <Dot tone="success" pulse /> : <Dot tone="muted" />}
      <span className="text-muted-foreground text-sm">{label}</span>
    </span>
  )
}
