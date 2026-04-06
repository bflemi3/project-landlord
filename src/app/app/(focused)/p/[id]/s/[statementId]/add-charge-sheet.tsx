'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { ResponsiveModal } from '@/components/responsive-modal'
import { InfoBox, InfoBoxContent } from '@/components/info-box'
import { ChargeNameInput, AmountInput, PayerToggle, SplitSlider } from '@/components/charge-form-fields'
import { FileUpload } from '@/components/file-upload'
import { addChargeToStatement } from '@/app/actions/statements/add-charge'
import { updateChargeInstance } from '@/app/actions/statements/update-charge-instance'
import { removeChargeInstance } from '@/app/actions/statements/remove-charge-instance'
import { uploadBillDocument } from '@/app/actions/statements/upload-bill'
import { statementQueryKey } from '@/lib/queries/statement'
import { statementChargesQueryKey } from '@/lib/queries/statement-charges'
import { missingChargesQueryKey } from '@/lib/queries/missing-charges'
import type { ChargeInstance } from '@/lib/queries/statement-charges'
import type { MissingCharge } from '@/lib/queries/missing-charges'

const CURRENCY_SYMBOLS: Record<string, string> = { BRL: 'R$', USD: '$', EUR: '€' }

interface AddChargeSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  statementId: string
  unitId: string
  periodYear: number
  periodMonth: number
  currency?: string
  /** Pre-fill from a missing charge definition */
  missingCharge?: MissingCharge | null
  /** Edit mode — existing charge instance */
  existingInstance?: ChargeInstance | null
  /** Called after save with the new/updated instance context for "save for next time" */
  onSaved?: (context: { name: string; amountMinor: number; isAdHoc: boolean }) => void
}

export function AddChargeSheet({
  open,
  onOpenChange,
  statementId,
  unitId,
  periodYear,
  periodMonth,
  currency = 'BRL',
  missingCharge,
  existingInstance,
  onSaved,
}: AddChargeSheetProps) {
  const formKey = `${open}-${existingInstance?.id ?? missingCharge?.definitionId ?? 'new'}`
  const isEditing = !!existingInstance
  const title = isEditing ? existingInstance.name : missingCharge?.name ?? undefined

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      className="sm:max-w-lg"
    >
      <AddChargeForm
        key={formKey}
        statementId={statementId}
        unitId={unitId}
        periodYear={periodYear}
        periodMonth={periodMonth}
        currency={currency}
        missingCharge={missingCharge}
        existingInstance={existingInstance}
        onClose={() => onOpenChange(false)}
        onSaved={onSaved}
      />
    </ResponsiveModal>
  )
}

function AddChargeForm({
  statementId,
  unitId,
  periodYear,
  periodMonth,
  currency,
  missingCharge,
  existingInstance,
  onClose,
  onSaved,
}: {
  statementId: string
  unitId: string
  periodYear: number
  periodMonth: number
  currency: string
  missingCharge?: MissingCharge | null
  existingInstance?: ChargeInstance | null
  onClose: () => void
  onSaved?: (context: { name: string; amountMinor: number; isAdHoc: boolean }) => void
}) {
  const t = useTranslations('propertyDetail')
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()

  const isEditing = !!existingInstance
  const isFillingMissing = !!missingCharge
  const isAdHoc = !isEditing && !isFillingMissing
  const isVariable = missingCharge?.chargeType === 'variable'

  // Form state
  const [name, setName] = useState(existingInstance?.name ?? missingCharge?.name ?? '')
  const [amount, setAmount] = useState(
    existingInstance ? String(existingInstance.amountMinor / 100) : '',
  )
  const [payer, setPayer] = useState<'tenant' | 'landlord' | 'split'>(
    existingInstance
      ? (existingInstance.tenantPercentage === 100 || existingInstance.tenantPercentage === null
          ? (existingInstance.landlordPercentage === 100 ? 'landlord' : 'tenant')
          : 'split')
      : 'tenant',
  )
  const [splitMode, setSplitMode] = useState<'percent' | 'amount'>('percent')
  const [tenantPercent, setTenantPercent] = useState(
    existingInstance?.tenantPercentage ?? 50,
  )
  const [tenantFixedAmount, setTenantFixedAmount] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | undefined>(undefined)

  const currencySymbol = CURRENCY_SYMBOLS[currency] ?? currency
  const numAmount = Number(amount.replace(',', '.'))
  const amountMinor = numAmount ? Math.round(numAmount * 100) : 0
  const canSave = name.trim().length > 0 && amountMinor > 0

  function handleSave() {
    if (!canSave) return

    startTransition(async () => {
      // Upload bill if attached
      let documentId: string | undefined
      if (file) {
        setUploadProgress(0)
        const uploadResult = await uploadBillDocument(unitId, file, periodYear, periodMonth)
        setUploadProgress(100)
        if (uploadResult.success) {
          documentId = uploadResult.documentId
        }
      }

      if (isEditing) {
        // Update existing
        await updateChargeInstance({
          instanceId: existingInstance.id,
          amountMinor,
          sourceDocumentId: file ? documentId : (file === null ? existingInstance.sourceDocumentId : undefined),
        })
      } else {
        // Add new — pass split fields for ad-hoc charges
        const tp = payer === 'tenant' ? 100 : payer === 'landlord' ? 0 : tenantPercent
        await addChargeToStatement({
          statementId,
          name: name.trim(),
          amountMinor,
          chargeDefinitionId: missingCharge?.definitionId,
          sourceDocumentId: documentId,
          ...(isAdHoc && {
            splitType: payer === 'split' && splitMode === 'amount' ? 'fixed_amount' : 'percentage',
            tenantPercentage: payer === 'split' && splitMode === 'amount' ? null : tp,
            landlordPercentage: payer === 'split' && splitMode === 'amount' ? null : 100 - tp,
            tenantFixedMinor: payer === 'split' && splitMode === 'amount' ? Math.round(tenantFixedAmount * 100) : null,
            landlordFixedMinor: payer === 'split' && splitMode === 'amount' ? amountMinor - Math.round(tenantFixedAmount * 100) : null,
          }),
        })
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: statementChargesQueryKey(statementId) })
      queryClient.invalidateQueries({ queryKey: statementQueryKey(statementId) })
      queryClient.invalidateQueries({ queryKey: missingChargesQueryKey(unitId, statementId) })

      // Notify parent for "save for next time" flow
      if (!isEditing) {
        onSaved?.({ name: name.trim(), amountMinor, isAdHoc })
      }

      onClose()
    })
  }

  async function handleRemove() {
    if (!existingInstance) return
    startTransition(async () => {
      await removeChargeInstance(existingInstance.id)
      queryClient.invalidateQueries({ queryKey: statementChargesQueryKey(statementId) })
      queryClient.invalidateQueries({ queryKey: statementQueryKey(statementId) })
      queryClient.invalidateQueries({ queryKey: missingChargesQueryKey(unitId, statementId) })
      onClose()
    })
  }

  return (
    <>
      <div className="space-y-4">
        {/* Charge name — hero-style input for ad-hoc, not shown for definition-linked */}
        {isAdHoc && (
          <ChargeNameInput
            value={name}
            onChange={setName}
            placeholder="e.g. Repair fee, Late fee"
            autoFocus
          />
        )}

        {/* Amount */}
        <AmountInput
          amount={amount}
          onAmountChange={setAmount}
          canSave={canSave}
          onSave={handleSave}
          currencySymbol={currencySymbol}
          autoFocus={!isAdHoc}
        />

        {/* Payer/split — only for ad-hoc charges */}
        {isAdHoc && (
          <>
            <PayerToggle value={payer} onChange={setPayer} />
            {payer === 'split' && (
              <SplitSlider
                splitMode={splitMode}
                onSplitModeChange={setSplitMode}
                tenantPercent={tenantPercent}
                onTenantPercentChange={setTenantPercent}
                tenantFixedAmount={tenantFixedAmount}
                onTenantFixedAmountChange={setTenantFixedAmount}
                totalAmount={numAmount}
                currencySymbol={currencySymbol}
              />
            )}
          </>
        )}

        {/* Bill upload nudge for variable charges */}
        {isVariable && !file && (
          <InfoBox variant="default" className="text-sm">
            <InfoBoxContent>
              Attaching the bill helps your tenant verify this charge.
            </InfoBoxContent>
          </InfoBox>
        )}

        {/* File upload */}
        <FileUpload
          onFileSelect={setFile}
          file={file}
          progress={uploadProgress}
          onClear={() => setFile(null)}
        />
      </div>

      {/* Actions */}
      <div className="mt-6 space-y-3">
        <Button
          onClick={handleSave}
          className="h-12 w-full rounded-2xl"
          size="lg"
          disabled={!canSave}
          loading={isPending}
        >
          {isEditing ? 'Save changes' : 'Add to statement'}
        </Button>
        {isEditing && !existingInstance.chargeDefinitionId && (
          <Button
            variant="ghost"
            onClick={handleRemove}
            className="h-12 w-full rounded-2xl text-destructive"
            size="lg"
            disabled={isPending}
          >
            Remove charge
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={onClose}
          className="h-12 w-full rounded-2xl"
          size="lg"
          disabled={isPending}
        >
          {t('cancel')}
        </Button>
      </div>
    </>
  )
}
