import { getUserRoles } from '@/data/home/server'
import { LandlordHome } from './landlord-home'
import { TenantHome } from './tenant-home'
import { MixedHome } from './mixed-home'
import { EmptyHome } from './empty-home'

/**
 * Routes to the appropriate home view based on the user's roles.
 * This is the only blocking query — a single fast SELECT DISTINCT role
 * from memberships. Everything inside each view streams independently.
 */
export async function HomeRouter() {
  const roles = await getUserRoles()

  const isLandlord = roles.includes('landlord')
  const isTenant = roles.includes('tenant')

  if (!isLandlord && !isTenant) {
    return <EmptyHome />
  }

  if (isLandlord && isTenant) {
    return <MixedHome />
  }

  if (isLandlord) {
    return <LandlordHome />
  }

  return <TenantHome />
}
