'use client'

import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslations } from 'next-intl'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { ResponsiveModal } from '@/components/responsive-modal'
import { InfoBox, InfoBoxContent } from '@/components/info-box'
import { ChargeNameInput, AmountInput, PayerToggle, SplitSlider } from '@/components/charge-form-fields'
import { FileUpload } from '@/components/file-upload'
import { addChargeToStatement } from '@/app/actions/statements/add-charge'
import { updateChargeInstance } from '@/app/actions/statements/update-charge-instance'
import { removeChargeInstance } from '@/app/actions/statements/remove-charge-instance'
import { uploadBillDocument } from '@/app/actions/statements/upload-bill'
import { saveChargeAsDefinition } from '@/app/actions/statements/save-charge-definition'
import { unitChargesQueryKey } from '@/lib/queries/unit-charges'
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
  const [confirmingRemove, setConfirmingRemove] = useState(false)
  const [saveForLater, setSaveForLater] = useState(false)
  const [savedChargeType, setSavedChargeType] = useState<'recurring' | 'variable'>('recurring')

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

      // Save as charge definition if toggled on
      if (isAdHoc && saveForLater) {
        const tp = payer === 'tenant' ? 100 : payer === 'landlord' ? 0 : tenantPercent
        await saveChargeAsDefinition({
          unitId,
          name: name.trim(),
          chargeType: savedChargeType,
          amountMinor: savedChargeType === 'variable' ? null : amountMinor,
          payer,
          splitMode: payer === 'split' ? splitMode : undefined,
          tenantPercent: tp,
          landlordPercent: 100 - tp,
          tenantFixedMinor: payer === 'split' && splitMode === 'amount' ? Math.round(tenantFixedAmount * 100) : undefined,
          landlordFixedMinor: payer === 'split' && splitMode === 'amount' ? amountMinor - Math.round(tenantFixedAmount * 100) : undefined,
        })
        queryClient.invalidateQueries({ queryKey: unitChargesQueryKey(unitId) })
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: statementChargesQueryKey(statementId) })
      queryClient.invalidateQueries({ queryKey: statementQueryKey(statementId) })
      queryClient.invalidateQueries({ queryKey: missingChargesQueryKey(unitId, statementId) })

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
            placeholder={t('chargePlaceholder')}
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
              {t('billNudge')}
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
        {/* Save for future statements — ad-hoc charges only */}
        {isAdHoc && (
          <div className="rounded-2xl border border-border p-4">
            <div className="flex items-center justify-between">
              <label htmlFor="save-for-later" className="text-sm font-medium text-foreground">
                {t('saveForFuture')}
              </label>
              <Switch
                id="save-for-later"
                checked={saveForLater}
                onCheckedChange={setSaveForLater}
              />
            </div>
            <AnimatePresence>
              {saveForLater && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="mt-3">
                    <p className="mb-2 text-sm text-muted-foreground">{t('chargeType')}</p>
                    <div className="flex h-10 rounded-lg border border-border bg-secondary/50 p-0.5">
                      <button
                        type="button"
                        onClick={() => setSavedChargeType('recurring')}
                        className={cn(
                          'flex-1 rounded-md text-sm font-medium transition-colors',
                          savedChargeType === 'recurring'
                            ? 'bg-card text-foreground shadow-sm dark:bg-zinc-700'
                            : 'text-muted-foreground',
                        )}
                      >
                        {t('chargeTypeFixed')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSavedChargeType('variable')}
                        className={cn(
                          'flex-1 rounded-md text-sm font-medium transition-colors',
                          savedChargeType === 'variable'
                            ? 'bg-card text-foreground shadow-sm dark:bg-zinc-700'
                            : 'text-muted-foreground',
                        )}
                      >
                        {t('chargeTypeVariable')}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        <Button
          onClick={handleSave}
          className="h-12 w-full rounded-2xl"
          size="lg"
          disabled={!canSave}
          loading={isPending}
        >
          {isEditing ? t('saveChanges') : t('addToStatement')}
        </Button>
        {isEditing && !existingInstance.chargeDefinitionId && !confirmingRemove && (
          <Button
            variant="ghost"
            onClick={() => setConfirmingRemove(true)}
            className="h-12 w-full rounded-2xl text-destructive"
            size="lg"
            disabled={isPending}
          >
            {t('removeCharge')}
          </Button>
        )}
        {confirmingRemove && (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4">
            <p className="mb-3 text-sm text-destructive">{t('removeChargeConfirm')}</p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={handleRemove}
                className="h-10 flex-1 rounded-xl"
                loading={isPending}
              >
                {t('yesRemove')}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setConfirmingRemove(false)}
                className="h-10 flex-1 rounded-xl"
                disabled={isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
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
