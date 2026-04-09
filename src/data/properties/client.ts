'use client'

import { createSuspenseHook } from '../shared/create-hook'
import { fetchProperty, propertyQueryKey, type Property } from './shared'

export const useProperty = createSuspenseHook<Property, [string]>(
  propertyQueryKey,
  fetchProperty,
)

export type { Property } from './shared'
