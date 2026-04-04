'use client'

import { useState, useCallback, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { X, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SlideIn } from '@/components/slide-in'
import { StepProgress } from '@/components/step-progress'
import { PropertyForm, type PropertyFormValues } from './steps/property-form'
import { InviteTenantsForm, type InviteEntry } from './steps/invite-tenants-form'
import { ChargesForm, type ChargeData } from './steps/charges-form'
import type { ChargeConfig } from './steps/charge-config-sheet'
import { SetupComplete } from './steps/setup-complete'
import { createProperty, type CreatePropertyState } from '@/app/actions/properties/create-property'
import { inviteTenant } from '@/app/actions/properties/invite-tenant'
import { createCharges } from '@/app/actions/properties/create-charges'
import posthog from 'posthog-js'
const TOTAL_STEPS = 3

export function CreatePropertyFlow() {
  // 1. Refs
  const propertyFormData = useRef<PropertyFormValues | null>(null)
  const inviteData = useRef<InviteEntry[]>([])
  const chargeData = useRef<ChargeConfig[]>([])
  const chargeDueDay = useRef('10')
  const createdPropertyId = useRef<string | undefined>(undefined)

  // 2. Context
  const t = useTranslations('properties')
  const router = useRouter()

  // 4. State
  const [step, setStep] = useState(1)
  const [serverErrors, setServerErrors] = useState<CreatePropertyState['errors']>()
  const [propertyName, setPropertyName] = useState('')
  const [isPending, startTransition] = useTransition()

  // 8. Callbacks
  const handlePropertyValidated = useCallback((values: PropertyFormValues) => {
    propertyFormData.current = values
    setPropertyName(values.name || [values.street, values.number, values.complement].filter(Boolean).join(' '))
    setServerErrors(undefined)
    setStep(2)
  }, [])

  const handleInvitesComplete = useCallback((invites: InviteEntry[]) => {
    inviteData.current = invites
    setStep(3)
  }, [])

  const handleChargesComplete = useCallback((data: ChargeData) => {
    chargeData.current = data.configs
    const formValues = propertyFormData.current
    if (!formValues) return

    startTransition(async () => {
      // Build FormData from saved values
      const formData = new FormData()
      formData.set('name', formValues.name)
      formData.set('postal_code', formValues.postal_code)
      formData.set('street', formValues.street)
      formData.set('number', formValues.number)
      formData.set('complement', formValues.complement)
      formData.set('neighborhood', formValues.neighborhood)
      formData.set('city', formValues.city)
      formData.set('state', formValues.state)
      formData.set('country_code', formValues.country_code)
      formData.set('due_day', chargeDueDay.current)

      const result = await createProperty({ success: false }, formData)

      if (!result.success) {
        setServerErrors(result.errors)
        setStep(1)
        return
      }

      createdPropertyId.current = result.propertyId

      // Track partial failures for invites and charges
      const failures: string[] = []

      // Send invites
      const pendingInvites = inviteData.current.filter((inv) => inv.email.trim() && !inv.sent)
      for (const invite of pendingInvites) {
        const fd = new FormData()
        fd.set('property_id', result.propertyId!)
        fd.set('unit_id', result.unitId!)
        fd.set('email', invite.email)
        fd.set('tenant_name', invite.name)
        fd.set('property_name', propertyName)
        fd.set('landlord_name', '')
        const inviteResult = await inviteTenant({ success: false }, fd)
        if (!inviteResult.success) {
          failures.push(invite.email)
        }
      }

      // Create charge definitions
      if (chargeData.current.length > 0) {
        const chargeResult = await createCharges(result.unitId!, chargeData.current)
        if (!chargeResult.success) {
          failures.push(...chargeResult.failedCharges)
        }

        for (const config of chargeData.current) {
          if (!chargeResult.failedCharges.includes(config.name)) {
            posthog.capture('charge_definition_created', {
              property_id: result.propertyId,
              charge_type: config.chargeType,
            })
          }
        }
      }

      // Show warning toast for partial failures (don't block success)
      if (failures.length > 0) {
        toast.warning(t('partialFailure'), { position: 'top-center', duration: 6000 })
      }

      setStep(4)
    })
  }, [propertyName, t])

  const handleBack = useCallback(() => {
    setStep((s) => Math.max(1, s - 1))
  }, [])

  // 10. Return
  return (
    <div className="flex h-full flex-col overflow-hidden pt-8">
      {/* Top bar: close + progress */}
      {step <= TOTAL_STEPS && (
        <div className="mx-auto mb-2 w-full max-w-lg px-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="w-20">
              {step > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                >
                  <ChevronLeft />
                  {t('back')}
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {t('step', { current: step, total: TOTAL_STEPS })}
            </p>
            <div className="flex w-20 justify-end">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/app')}
              >
                <X />
              </Button>
            </div>
          </div>
          <StepProgress current={step} total={TOTAL_STEPS} />
        </div>
      )}

      {/* Step content — full-width scroll, content centered inside */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {step === 1 ? (
          <div className="mx-auto max-w-lg px-6">
            <div className="pt-8">
              <h1 className="mb-2 text-2xl font-bold text-foreground">{t('whereIsProperty')}</h1>
              <p className="mb-6 text-base text-muted-foreground">{t('whereIsPropertyDescription')}</p>
            </div>
            <PropertyForm
              onValidated={handlePropertyValidated}
              initialValues={propertyFormData.current ?? undefined}
              initialErrors={serverErrors}
            >
              <PropertyForm.Name />
              <PropertyForm.Content className="mt-5" />
              <PropertyForm.Footer className="pt-10 pb-8" />
            </PropertyForm>
          </div>
        ) : (
          <SlideIn activeKey={step} className="flex flex-1 flex-col">
            <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col px-6 pb-8">
              {step === 2 && (
                <InviteTenantsForm
                  propertyName={propertyName}
                  onSubmit={handleInvitesComplete}
                  isSubmitting={false}
                  stateRef={inviteData}
                />
              )}
              {step === 3 && (
                <ChargesForm
                  onSubmit={handleChargesComplete}
                  isSubmitting={isPending}
                  initialConfigs={chargeData.current.length > 0 ? chargeData.current : undefined}
                  stateRef={chargeData}
                  dueDayRef={chargeDueDay}
                />
              )}
              {step === 4 && (
                <SetupComplete
                  propertyName={propertyName}
                  propertyId={createdPropertyId.current}
                  tenantCount={inviteData.current.filter((i) => i.email.trim()).length}
                  chargeCount={chargeData.current.length}
                />
              )}
            </div>
          </SlideIn>
        )}
      </div>
    </div>
  )
}
