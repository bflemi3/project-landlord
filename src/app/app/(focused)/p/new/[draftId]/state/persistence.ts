import type { ContractExtractionResult } from '@/lib/contract-extraction/types'
import type { WizardState } from '@/lib/wizard-state'
import type {
  CheckoutPath,
  SectionId,
} from './registry'

export type SectionStatus = 'upcoming' | 'completed' | 'skipped'

export interface PropertyCreationData {
  // Step 1 / contract upload
  contractFile: Blob | null
  contractFileName: string | null
  contractFileType: 'pdf' | 'docx' | null
  extractionResult: ContractExtractionResult | null

  // Which entry path the user took out of Step 1.
  // `null` until Step 1 commits.
  path: CheckoutPath | null

  // Step 2 / accordion
  sectionStates: Record<SectionId, SectionStatus>
  activeSectionId: SectionId | null
  // Per-section user input. Keys are filled by the individual section
  // primitives as the user progresses; `{}` is a valid starting shape.
  sectionData: Partial<Record<SectionId, unknown>>
}

export type PropertyCreationWizardState = WizardState<PropertyCreationData>

export const PROPERTY_CREATION_WIZARD_ID = 'property-creation'
export const PROPERTY_CREATION_STATE_VERSION = 2

export function propertyCreationWizardKey(draftId: string): string {
  return `${PROPERTY_CREATION_WIZARD_ID}:${draftId}`
}
