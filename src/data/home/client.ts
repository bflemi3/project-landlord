'use client'

import { createSuspenseHook } from '../shared/create-hook'
import {
  fetchHomeProperties, homePropertiesQueryKey,
  fetchHomeActions, homeActionsQueryKey,
  type HomeProperty, type HomeAction,
} from './shared'

export const useHomeProperties = createSuspenseHook<HomeProperty[], []>(
  homePropertiesQueryKey,
  fetchHomeProperties,
)

export const useHomeActions = createSuspenseHook<HomeAction[], []>(
  homeActionsQueryKey,
  fetchHomeActions,
)

export type { HomeProperty, HomeAction } from './shared'
