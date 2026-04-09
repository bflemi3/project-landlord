'use client'

import { createSuspenseHook } from '../shared/create-hook'
import {
  fetchUnit, unitQueryKey,
  fetchUnitCharges, unitChargesQueryKey,
  fetchUnitTenants, unitTenantsQueryKey,
  fetchUnitInvites, unitInvitesQueryKey,
  fetchUnitStatements, unitStatementsQueryKey,
  type Unit,
  type ChargeDefinition,
  type UnitTenant,
  type UnitInvite,
  type UnitStatement,
} from './shared'

export const useUnit = createSuspenseHook<Unit, [string]>(
  unitQueryKey,
  fetchUnit,
)

export const useUnitCharges = createSuspenseHook<ChargeDefinition[], [string]>(
  unitChargesQueryKey,
  fetchUnitCharges,
)

export const useUnitTenants = createSuspenseHook<UnitTenant[], [string]>(
  unitTenantsQueryKey,
  fetchUnitTenants,
)

export const useUnitInvites = createSuspenseHook<UnitInvite[], [string]>(
  unitInvitesQueryKey,
  fetchUnitInvites,
)

export const useUnitStatements = createSuspenseHook<UnitStatement[], [string]>(
  unitStatementsQueryKey,
  fetchUnitStatements,
)

export type { Unit, ChargeDefinition, ChargeSplit, UnitTenant, UnitInvite, UnitStatement } from './shared'
