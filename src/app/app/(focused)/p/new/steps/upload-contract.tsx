'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import posthog from 'posthog-js'
import { toast } from 'sonner'
import { FileUpload, type FileUploadControls } from '@/components/file-upload'
import { ContractUploadError } from './contract-upload-error'
import { extractContractAction } from '../actions/extract-contract-action'
import { ExtractionLoading } from './extraction-loading'
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

export interface UploadContractProps {
  initialFile?: File | null
  initialFileType?: 'pdf' | 'docx' | null
  autoExtract?: boolean
  onFileSelected?: (file: File, fileType: 'pdf' | 'docx') => void | Promise<void>
  onExtracted: (payload: {
    file: File
    fileName: string
    fileType: 'pdf' | 'docx'
    extractionResult: ContractExtractionResult
  }) => void
  onFileCleared?: () => void
}

export function UploadContract({
  initialFile = null,
  initialFileType = null,
  autoExtract = false,
  onFileSelected,
  onExtracted,
  onFileCleared,
}: UploadContractProps) {
  const t = useTranslations('propertyCreation')
  const [file, setFile] = useState<File | null>(initialFile)
  const [fileType, setFileType] = useState<'pdf' | 'docx' | null>(initialFileType)
  const [errorCode, setErrorCode] = useState<ContractExtractionErrorCode | null>(null)
  const [isPending, startTransition] = useTransition()
  const autoExtractFiredRef = useRef(false)
  const controlsRef = useRef<FileUploadControls | null>(null)

  async function runExtraction(selected: File, fileType: 'pdf' | 'docx') {
    const fd = new FormData()
    fd.set('file', selected)
    fd.set('fileType', fileType)

    const response = await extractContractAction(fd)

    if (response.success) {
      posthog.capture('contract_extraction_completed', {
        language: response.data.languageDetected,
        fieldCount: countExtractedFields(response.data),
      })
      onExtracted({
        file: selected,
        fileName: selected.name,
        fileType,
        extractionResult: response.data,
      })
      return
    }

    posthog.capture('contract_extraction_failed', { code: response.error.code })
    setErrorCode(response.error.code)

    // Retry codes keep the file around so the CTA can re-invoke extraction
    // with the same upload. Terminal codes drop the file and signal the parent
    // to clear persisted wizard state.
    if (!RETRY_CODES.has(response.error.code)) {
      setFile(null)
      setFileType(null)
      onFileCleared?.()
    }
  }

  useEffect(() => {
    if (!autoExtract) return
    if (autoExtractFiredRef.current) return
    if (!initialFile || !initialFileType) return
    autoExtractFiredRef.current = true
    startTransition(() => runExtraction(initialFile, initialFileType))
    // Fire-once on mount for mid-extraction resume — deps intentionally omitted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleFileSelect(selected: File) {
    setErrorCode(null)

    const detected = detectFileType(selected)

    posthog.capture('contract_upload_started', {
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

    setFile(selected)
    setFileType(detected)
    startTransition(async () => {
      if (onFileSelected) {
        await onFileSelected(selected, detected)
      }
      await runExtraction(selected, detected)
    })
  }

  function handleClear() {
    setFile(null)
    setFileType(null)
    setErrorCode(null)
    if (initialFile || file) {
      posthog.capture('contract_upload_removed')
    }
    onFileCleared?.()
  }

  function handleNoContract() {
    posthog.capture('no_contract_path_clicked')
    // Committing to the no-contract path: drop any in-flight upload or error
    // so nothing is left in memory or IndexedDB when Plan 9 wires the real
    // manual branch.
    setFile(null)
    setFileType(null)
    setErrorCode(null)
    controlsRef.current?.reset()
    onFileCleared?.()
    toast.message(t('upload.noContractToast'))
  }

  function pickAnother() {
    // Reset FileUpload's internal selection, clear the error, and open the
    // native file picker so the CTA is a single click to-the-next-file.
    controlsRef.current?.reset()
    setErrorCode(null)
    controlsRef.current?.openPicker()
  }

  function retryExtraction() {
    if (!file || !fileType) {
      // Safety net — the retry branch should only be reachable when we've
      // preserved both across the previous failure.
      pickAnother()
      return
    }
    setErrorCode(null)
    startTransition(() => runExtraction(file, fileType))
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
    return <ExtractionLoading />
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
        file={file}
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
