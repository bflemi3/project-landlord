import { hasAnyUserSectionData } from './section-defaults'
import type { PropertyCreationStateShape } from './store'

/**
 * Number of sections the user hasn't handled yet — i.e. still `upcoming`.
 * Skipped and completed sections both count as handled. Drives the "X
 * sections left" label next to the Create CTA in both the desktop summary
 * and the mobile sticky bar.
 */
export function getRemainingSectionCount(
  state: Pick<PropertyCreationStateShape, 'sectionStates'>,
): number {
  let remaining = 0
  for (const status of Object.values(state.sectionStates)) {
    if (status === 'upcoming') remaining += 1
  }
  return remaining
}

/**
 * True when the user has any artifact worth warning about on exit — an
 * uploaded contract file, an extraction result, any non-default section
 * slice, or any section moved past `upcoming`. Picking the no-contract path
 * alone does not count: if the user hasn't touched a section, there's
 * nothing to save.
 *
 * Drives the Close button's exit-prompt branch. Called once per exit click
 * via `storeApi.getState()` — not subscribed.
 */
export function hasWizardWork(
  state: Pick<
    PropertyCreationStateShape,
    'contractFile' | 'extractionResult' | 'sectionData' | 'sectionStates'
  >,
): boolean {
  if (state.contractFile !== null) return true
  if (state.extractionResult !== null) return true
  if (hasAnyUserSectionData(state.sectionData)) return true
  for (const status of Object.values(state.sectionStates)) {
    if (status !== 'upcoming') return true
  }
  return false
}
