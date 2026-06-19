import { describe, it, expect } from 'vitest'
import { propertyCreationWizardKey, PROPERTY_CREATION_WIZARD_ID } from '../persistence'

describe('propertyCreationWizardKey', () => {
  it('namespaces the draft id under the property-creation wizard', () => {
    expect(propertyCreationWizardKey('abc-123')).toBe(`${PROPERTY_CREATION_WIZARD_ID}:abc-123`)
  })

  it('keeps different drafts independent', () => {
    expect(propertyCreationWizardKey('one')).not.toBe(propertyCreationWizardKey('two'))
  })
})
