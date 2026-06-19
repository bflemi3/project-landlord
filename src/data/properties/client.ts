'use client'

import { createSuspenseHook } from '../shared/create-hook'
import { fetchPropertyOrThrow, propertyQueryKey, type Property } from './shared'

export const useProperty = createSuspenseHook<Property, [propertyId: string]>(
  propertyQueryKey,
  fetchPropertyOrThrow,
)

export type { Property } from './shared'
