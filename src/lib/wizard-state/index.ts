import { get, set, del } from 'idb-keyval'

export interface WizardState<T = Record<string, unknown>> {
  version: number
  currentStep: number
  updatedAt: string
  data: T
}

interface LoadOptions {
  expectedVersion?: number
}

const PREFIX = 'wizard:'

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

export async function saveWizardState<T>(
  wizardId: string,
  state: WizardState<T>,
): Promise<void> {
  if (!isBrowser()) return
  const stamped = { ...state, updatedAt: new Date().toISOString() }
  await set(PREFIX + wizardId, stamped)
}

export async function loadWizardState<T = Record<string, unknown>>(
  wizardId: string,
  options?: LoadOptions,
): Promise<WizardState<T> | null> {
  if (!isBrowser()) return null
  const stored = await get<WizardState<T>>(PREFIX + wizardId)
  if (stored === undefined) return null

  if (
    options?.expectedVersion !== undefined &&
    stored.version !== options.expectedVersion
  ) {
    return null
  }

  return stored
}

export async function clearWizardState(wizardId: string): Promise<void> {
  if (!isBrowser()) return
  await del(PREFIX + wizardId)
}

export async function hasWizardState(wizardId: string): Promise<boolean> {
  if (!isBrowser()) return false
  const stored = await get(PREFIX + wizardId)
  return stored !== undefined
}
