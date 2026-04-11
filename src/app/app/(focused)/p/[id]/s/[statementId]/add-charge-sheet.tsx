'use client'

import { useState, useTransition, useRef, useEffect, lazy, Suspense } from 'react'
import { useTranslations } from 'next-intl'

const animatedSplitPromise = import('@/components/animated-split-section')
const AnimatedSplitSection = lazy(() =>
  animatedSplitPromise.then(m => ({ default: m.AnimatedSplitSection }))
)
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { ResponsiveModal } from '@/components/responsive-modal'
import { ChargeNameInput, AmountInput, PayerToggle, SplitSlider } from '@/components/charge-form-fields'
import { FileUpload } from '@/components/file-upload'
import { addChargeToStatement } from '@/data/statements/actions/add-charge'
import { updateChargeInstance } from '@/data/statements/actions/update-charge-instance'
import { removeChargeInstance } from '@/data/statements/actions/remove-charge-instance'
import { createSourceDocumentRecord } from '@/data/statements/actions/create-source-document-record'
import { deleteBillDocument } from '@/data/statements/actions/delete-bill-document'
import { deleteStorageFile } from '@/data/storage/actions/delete-storage-file'
import { saveChargeAsDefinition } from '@/data/statements/actions/save-charge-definition'
import { createClient } from '@/lib/supabase/client'
import { unitChargesQueryKey } from '@/data/units/shared'
import {
  statementQueryKey,
  statementChargesQueryKey,
  missingChargesQueryKey,
  type ChargeInstance,
  type MissingCharge,
} from '@/data/statements/shared'
import type { UploadFileResult } from '@/lib/storage/upload-file'

const CURRENCY_SYMBOLS: Record<string, string> = { BRL: 'R$', USD: '$', EUR: '€' }

interface AddChargeSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  statementId: string
  unitId: string
  periodYear: number
  periodMonth: number
  currency?: string
  missingCharge?: MissingCharge | null
  existingInstance?: ChargeInstance | null
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
  const isVariable = missingCharge?.chargeType === 'variable' || existingInstance?.chargeType === 'variable'
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

  // Bill attachment state
  const [file, setFile] = useState<File | null>(null)
  const [uploadedStoragePath, setUploadedStoragePath] = useState<string | null>(null)
  const [removedExistingBill, setRemovedExistingBill] = useState(false)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const uploadPromiseRef = useRef<Promise<UploadFileResult> | null>(null)
  const savedRef = useRef(false)
  const uploadedStoragePathRef = useRef<string | null>(null)


  const currencySymbol = CURRENCY_SYMBOLS[currency] ?? currency
  const numAmount = Number(amount.replace(',', '.'))
  const amountMinor = numAmount ? Math.round(numAmount * 100) : 0
  const isValid = name.trim().length > 0 && amountMinor > 0
  const isDirty = isEditing
    ? amountMinor !== existingInstance.amountMinor || removedExistingBill || !!file
    : true // new charges are always "dirty"
  const canSave = isValid && isDirty

  // Fetch auth token on mount
  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) setAuthToken(session.access_token)
    }
    init()
  }, [])

  // Clean up orphaned storage files on unmount
  useEffect(() => {
    return () => {
      if (!savedRef.current && uploadedStoragePathRef.current) {
        deleteStorageFile('source-documents', uploadedStoragePathRef.current)
      }
    }
  }, [])

  function generateStoragePath(selectedFile: File): string {
    const fileExt = selectedFile.name.split('.').pop() ?? ''
    return `${unitId}/${periodYear}-${String(periodMonth).padStart(2, '0')}/${crypto.randomUUID()}.${fileExt}`
  }

  function handleFileSelect(selectedFile: File, path?: string) {
    if (uploadedStoragePath) {
      deleteStorageFile('source-documents', uploadedStoragePath)
    }

    setFile(selectedFile)

    if (path) {
      setUploadedStoragePath(path)
      uploadedStoragePathRef.current = path
    }

  }

  function handleClear() {
    if (existingInstance?.sourceDocumentId && !removedExistingBill && !file) {
      setRemovedExistingBill(true)
    }

    if (uploadedStoragePath) {
      deleteStorageFile('source-documents', uploadedStoragePath)
    }

    setFile(null)
    setUploadedStoragePath(null)
    uploadedStoragePathRef.current = null
  }

  async function handleViewBill(filePath: string) {
    const supabase = createClient()
    const { data, error } = await supabase.storage
      .from('source-documents')
      .createSignedUrl(filePath, 3600)
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank')
    } else if (error) {
      toast.error(t('uploadFailed'))
    }
  }

  function handleSave() {
    if (!canSave) return

    startTransition(async () => {
      if (uploadPromiseRef.current) {
        const uploadResult = await uploadPromiseRef.current
        if (!uploadResult.success) {
          toast.error(t('uploadFailed'))
          return
        }
      }

      let documentId: string | undefined | null
      if (uploadedStoragePath && file) {
        const { documentId: newDocId } = await createSourceDocumentRecord({
          unitId,
          filePath: uploadedStoragePath,
          fileName: file.name,
          mimeType: file.type,
          fileSizeBytes: file.size,
          periodYear,
          periodMonth,
        })
        if (!newDocId) {
          // DB record creation failed — clean up the orphaned storage file
          deleteStorageFile('source-documents', uploadedStoragePath)
          toast.error(t('uploadFailed'))
          return
        }
        documentId = newDocId
      }

      if (isEditing) {
        // Delete old bill if user removed it (whether or not they added a new one)
        if (removedExistingBill && existingInstance.sourceDocumentId) {
          deleteBillDocument(existingInstance.sourceDocumentId)
        }

        let newSourceDocumentId: string | null | undefined
        if (documentId) {
          newSourceDocumentId = documentId
        } else if (removedExistingBill) {
          newSourceDocumentId = null
        } else {
          newSourceDocumentId = undefined
        }

        await updateChargeInstance({
          instanceId: existingInstance.id,
          amountMinor,
          sourceDocumentId: newSourceDocumentId,
        })
      } else {
        const tp = payer === 'tenant' ? 100 : payer === 'landlord' ? 0 : tenantPercent
        await addChargeToStatement({
          statementId,
          name: name.trim(),
          amountMinor,
          chargeDefinitionId: missingCharge?.definitionId,
          sourceDocumentId: documentId ?? undefined,
          ...(isAdHoc && {
            splitType: payer === 'split' && splitMode === 'amount' ? 'fixed_amount' : 'percentage',
            tenantPercentage: payer === 'split' && splitMode === 'amount' ? null : tp,
            landlordPercentage: payer === 'split' && splitMode === 'amount' ? null : 100 - tp,
            tenantFixedMinor: payer === 'split' && splitMode === 'amount' ? Math.round(tenantFixedAmount * 100) : null,
            landlordFixedMinor: payer === 'split' && splitMode === 'amount' ? amountMinor - Math.round(tenantFixedAmount * 100) : null,
          }),
        })
      }

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

      savedRef.current = true

      queryClient.invalidateQueries({ queryKey: statementChargesQueryKey(statementId) })
      queryClient.invalidateQueries({ queryKey: statementQueryKey(statementId) })
      queryClient.invalidateQueries({ queryKey: missingChargesQueryKey(unitId, statementId) })

      onSaved?.({ name: name.trim(), amountMinor, isAdHoc })
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

  const showExistingBill = !!existingInstance?.sourceDocument && !removedExistingBill && !file
  const fileUploadFileName = showExistingBill ? existingInstance?.sourceDocument?.fileName : undefined

  return (
    <>
      <div className="space-y-4">
        {isAdHoc && (
          <ChargeNameInput
            value={name}
            onChange={setName}
            placeholder={t('chargePlaceholder')}
            autoFocus
          />
        )}

        <AmountInput
          amount={amount}
          onAmountChange={setAmount}
          canSave={canSave}
          onSave={handleSave}
          currencySymbol={currencySymbol}
          autoFocus={!isAdHoc}
        />

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

        <FileUpload
          file={file}
          uploadedFileName={fileUploadFileName}
          onFileSelect={handleFileSelect}
          onClear={handleClear}
          onView={showExistingBill && existingInstance?.sourceDocument?.filePath
            ? () => handleViewBill(existingInstance.sourceDocument!.filePath)
            : undefined}
          hint={removedExistingBill && !file
            ? t('billRemovedOnSave')
            : isVariable && !file && !showExistingBill ? t('billNudge') : undefined}
          bucket="source-documents"
          generateStoragePath={generateStoragePath}
          authToken={authToken ?? undefined}
          supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL}
          uploadPromiseRef={uploadPromiseRef}
        />
      </div>

      <div className="mt-6 space-y-3">
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
            <Suspense fallback={null}>
              <AnimatedSplitSection show={saveForLater}>
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
              </AnimatedSplitSection>
            </Suspense>
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
                {t('cancel')}
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
