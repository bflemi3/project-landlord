'use client'

import { createSuspenseHook } from '../shared/create-hook'
import {
  fetchStatement, statementQueryKey,
  fetchStatementCharges, statementChargesQueryKey,
  fetchMissingCharges, missingChargesQueryKey,
  type Statement,
  type ChargeInstance,
  type MissingCharge,
} from './shared'

export const useStatement = createSuspenseHook<Statement, [string]>(
  statementQueryKey,
  fetchStatement,
)

export const useStatementCharges = createSuspenseHook<ChargeInstance[], [string]>(
  statementChargesQueryKey,
  fetchStatementCharges,
)

export const useMissingCharges = createSuspenseHook<MissingCharge[], [string, string, number, number]>(
  missingChargesQueryKey,
  fetchMissingCharges,
)

export type { Statement, ChargeInstance, MissingCharge } from './shared'
