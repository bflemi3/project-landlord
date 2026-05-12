'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { FileUpload, type FileUploadControls } from '@/components/file-upload'
import { captureEvent } from '@/lib/analytics/capture'
import { TextShimmer } from '@/components/text-shimmer'
import { useReducedMotion } from 'motion/react'
import { ContractUploadError } from './contract-upload-error'
import { extractContractAction } from '../../actions/extract-contract-action'
import { StepOneSkeletonLayout } from './step-one-skeleton-layout'
import {
  usePropertyCreationActions,
  usePropertyCreationState,
} from '../../state/use-property-creation'
import type {
  ContractExtractionErrorCode,
  ContractExtractionResult,
} from '@/lib/contract-extraction/types'

const RETRY_CODES: ReadonlySet<ContractExtractionErrorCode> = new Set([
  'extraction_failed',
  'extraction_timeout',
  'rate_limited',
])

const ACCEPT =
  'application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

const LINE_KEYS = ['line1', 'line2', 'line3', 'line4', 'line5', 'line6', 'line7'] as const
const ROTATION_MS = 3500

function detectFileType(file: File): 'pdf' | 'docx' | null {
  const name = file.name.toLowerCase()
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf'
  if (
    file.type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.docx')
  ) {
    return 'docx'
  }
  return null
}

function countExtractedFields(result: ContractExtractionResult): number {
  let count = 0
  if (result.propertyType) count++
  if (result.address) count++
  if (result.rent) count++
  if (result.contractDates) count++
  if (result.rentAdjustment) count++
  if (result.landlords?.length) count++
  if (result.tenants?.length) count++
  if (result.expenses?.length) count++
  return count
}

/**
 * Store-driven contract upload step. Reads file/extraction state directly from
 * the wizard store and writes through actions. The parent wizard no longer
 * wires any props — page.tsx suspends on `hydrate(wizardKey)`, so by the time
 * this component mounts the store is already seeded.
 */
export function UploadContract() {
  const t = useTranslations('propertyCreation')
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  const contractFile = usePropertyCreationState((s) => s.contractFile)
  const contractFileType = usePropertyCreationState((s) => s.contractFileType)
  const extractionResult = usePropertyCreationState((s) => s.extractionResult)
  const path = usePropertyCreationState((s) => s.path)
  const actions = usePropertyCreationActions()

  const [errorCode, setErrorCode] = useState<ContractExtractionErrorCode | null>(null)
  const [isPending, startTransition] = useTransition()
  const autoExtractFiredRef = useRef(false)
  const controlsRef = useRef<FileUploadControls | null>(null)

  // Rotating shimmer line during extraction.
  const [lineIndex, setLineIndex] = useState(0)
  useEffect(() => {
    if (!isPending) return
    if (!animate) return
    const id = setInterval(() => {
      setLineIndex((i) => (i + 1) % LINE_KEYS.length)
    }, ROTATION_MS)
    return () => clearInterval(id)
  }, [isPending, animate])

  async function runExtraction(selected: File, fileType: 'pdf' | 'docx') {
    const fd = new FormData()
    fd.set('file', selected)
    fd.set('fileType', fileType)

    const response = await extractContractAction(fd)

    if (response.success) {
      captureEvent('contract_extraction_completed', {
        language: response.data.languageDetected,
        fieldCount: countExtractedFields(response.data),
      })
      actions.setContractFile(selected, selected.name, fileType)
      actions.commitContractOutput({
        extractionResult: response.data,
        path: 'contract',
      })
      captureEvent('property_checkout_entered', { path: 'contract' })
      actions.goToStep(2)
      return
    }

    captureEvent('contract_extraction_failed', { code: response.error.code })
    setErrorCode(response.error.code)

    // Retry codes keep the file around so the CTA can re-invoke extraction
    // with the same upload. Terminal codes drop the file from the store.
    if (!RETRY_CODES.has(response.error.code)) {
      actions.clearContractFile()
    }
  }

  // Auto-extract on mount when we have a stored file but no extraction result
  // and no committed path — i.e. the user reloaded mid-extraction (hydrate()
  // already forced step back to 1 for this case).
  useEffect(() => {
    if (autoExtractFiredRef.current) return
    if (!contractFile || !contractFileType) return
    if (extractionResult) return
    if (path) return
    autoExtractFiredRef.current = true
    const file = contractFile
    const type = contractFileType
    startTransition(() => runExtraction(file, type))
    // Fire-once on mount for mid-extraction resume — deps intentionally omitted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleFileSelect(selected: File) {
    setErrorCode(null)

    const detected = detectFileType(selected)

    captureEvent('contract_upload_started', {
      fileType: detected ?? 'unknown',
      fileSizeBytes: selected.size,
    })

    if (!detected) {
      // Drop FileUpload's internal selection so the rejected file doesn't
      // resurface as a stale chip once the user clears the error.
      controlsRef.current?.reset()
      setErrorCode('unsupported_format')
      return
    }

    actions.setContractFile(selected, selected.name, detected)
    startTransition(async () => {
      await runExtraction(selected, detected)
    })
  }

  function handleClear() {
    setErrorCode(null)
    if (contractFile) {
      captureEvent('contract_upload_removed')
    }
    actions.clearContractFile()
  }

  function handleNoContract() {
    captureEvent('no_contract_path_clicked')
    // Committing to the no-contract path: drop any in-flight upload or error
    // so nothing is left in memory or IndexedDB when Plan 9 wires the real
    // manual branch.
    setErrorCode(null)
    controlsRef.current?.reset()
    actions.clearContractFile()
    actions.commitContractOutput({
      extractionResult: null,
      path: 'no_contract',
    })
    captureEvent('property_checkout_entered', { path: 'no_contract' })
    actions.goToStep(2)
  }

  function pickAnother() {
    // Reset FileUpload's internal selection, clear the error, and open the
    // native file picker so the CTA is a single click to-the-next-file.
    controlsRef.current?.reset()
    setErrorCode(null)
    controlsRef.current?.openPicker()
  }

  function retryExtraction() {
    if (!contractFile || !contractFileType) {
      // Safety net — the retry branch should only be reachable when we've
      // preserved both across the previous failure.
      pickAnother()
      return
    }
    setErrorCode(null)
    const file = contractFile
    const type = contractFileType
    startTransition(() => runExtraction(file, type))
  }

  const ctaHandlers: Record<ContractExtractionErrorCode, () => void> = {
    file_too_large: pickAnother,
    unsupported_format: pickAnother,
    corrupt_file: pickAnother,
    empty_file: pickAnother,
    no_text_extractable: pickAnother,
    password_protected: pickAnother,
    not_a_contract: pickAnother,
    unsupported_language: handleNoContract,
    extraction_failed: retryExtraction,
    extraction_timeout: retryExtraction,
    rate_limited: retryExtraction,
    api_key_missing: pickAnother, // unreachable — no CTA rendered for this code
  }

  function handleErrorCta() {
    if (!errorCode) return
    ctaHandlers[errorCode]()
  }

  if (isPending) {
    const currentKey = LINE_KEYS[lineIndex]!
    return (
      <div data-slot="extraction-loading">
        <StepOneSkeletonLayout />
        <div
          className="mt-6 text-center text-base"
          aria-live={animate ? 'off' : 'polite'}
          data-slot="extraction-loading-copy"
        >
          {animate ? (
            <TextShimmer as="p" duration="2.5s">
              {t(`loading.${currentKey}`)}
            </TextShimmer>
          ) : (
            <p className="text-muted-foreground">{t('loading.static')}</p>
          )}
        </div>
      </div>
    )
  }

  const fileUploadError = errorCode ? (
    <ContractUploadError code={errorCode} onCta={handleErrorCta} />
  ) : null

  return (
    <div
      className="flex flex-col gap-8 pt-8"
      data-slot="upload-contract"
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">{t('upload.title')}</h1>
        <p className="text-base text-muted-foreground">
          {t('upload.description')}
        </p>
      </div>

      <FileUpload
        file={contractFile}
        onFileSelect={handleFileSelect}
        onClear={handleClear}
        onValidationError={(code) => {
          if (code === 'file_too_large') setErrorCode('file_too_large')
        }}
        controlsRef={controlsRef}
        error={fileUploadError}
        accept={ACCEPT}
        size="lg"
        labels={{
          dropzone: t('upload.dropzone'),
          dropzoneDrag: t('upload.dropzoneHintDesktop'),
          fileTooLarge: t('upload.fileTooLarge', { max: 10 }),
        }}
      />

      <button
        type="button"
        onClick={handleNoContract}
        className="self-start text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        {t('upload.noContractLink')}
      </button>
    </div>
  )
}
