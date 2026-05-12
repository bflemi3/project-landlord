'use client'

import {
  useRef,
  useState,
  useEffect,
  type MutableRefObject,
  type ReactNode,
} from 'react'
import { useTranslations } from 'next-intl'
import { Upload, FileText, X, Eye, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { uploadFile, type UploadFileResult } from '@/lib/storage/upload-file'
import { IconTile } from '@/components/icon-tile'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

const MAX_SIZE_MB = 10

export interface FileUploadLabels {
  dropzone?: string
  dropzoneDrag?: string
  viewing?: string
  uploaded?: string
  uploadFailed?: string
  fileTooLarge?: string
}

export type FileUploadSize = 'sm' | 'lg'

export type FileUploadValidationCode = 'file_too_large'

export interface FileUploadControls {
  openPicker: () => void
  reset: () => void
}

function FileUpload({
  onFileSelect,
  file,
  uploadedUrl,
  uploadedFileName,
  onClear,
  onView,
  maxSizeMB = MAX_SIZE_MB,
  accept = 'application/pdf,image/*',
  className,
  hint,
  labels,
  size = 'sm',
  bucket,
  storagePath,
  generateStoragePath,
  authToken,
  supabaseUrl,
  uploadPromiseRef,
  controlsRef,
  error,
  onValidationError,
}: {
  onFileSelect?: (file: File, storagePath?: string) => void
  file?: File | null
  uploadedUrl?: string | null
  uploadedFileName?: string | null
  onClear?: () => void
  onView?: () => void
  maxSizeMB?: number
  accept?: string
  className?: string
  hint?: string
  labels?: FileUploadLabels
  size?: FileUploadSize
  bucket?: string
  storagePath?: string
  generateStoragePath?: (file: File) => string
  authToken?: string
  supabaseUrl?: string
  uploadPromiseRef?: MutableRefObject<Promise<UploadFileResult> | null>
  controlsRef?: MutableRefObject<FileUploadControls | null>
  error?: ReactNode
  onValidationError?: (code: FileUploadValidationCode, file: File) => void
}) {
  const t = useTranslations('fileUpload')
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const dragDepthRef = useRef(0)
  const [localError, setLocalError] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | undefined>(undefined)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [viewing, setViewing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const maxBytes = maxSizeMB * 1024 * 1024
  const activeFile = file ?? selectedFile
  const hasFile = !!activeFile || !!uploadedUrl || !!uploadedFileName
  const isUploading = progress !== undefined && progress >= 0 && progress < 100
  const isImage = activeFile?.type.startsWith('image/') ?? false

  function label(key: keyof FileUploadLabels, i18nKey: string, vars?: Record<string, string | number>) {
    return labels?.[key] ?? t(i18nKey, vars)
  }

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    if (!controlsRef) return
    controlsRef.current = {
      openPicker: () => inputRef.current?.click(),
      reset: () => {
        setSelectedFile(null)
        setLocalError(null)
        if (inputRef.current) inputRef.current.value = ''
      },
    }
    return () => {
      controlsRef.current = null
    }
  }, [controlsRef])

  function startUpload(selectedFile: File, uploadPath: string) {
    if (!bucket || !authToken || !supabaseUrl) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setProgress(0)
    setLocalError(null)

    const promise = uploadFile({
      file: selectedFile,
      bucket,
      path: uploadPath,
      authToken,
      supabaseUrl,
      onProgress: setProgress,
      signal: controller.signal,
    }).then((result) => {
      if (result.success) {
        setProgress(100)
      } else if (result.error !== 'Upload aborted') {
        setLocalError(label('uploadFailed', 'uploadFailed'))
        setProgress(undefined)
        if (inputRef.current) inputRef.current.value = ''
        onClear?.()
      }
      if (uploadPromiseRef) uploadPromiseRef.current = null
      return result
    })

    if (uploadPromiseRef) uploadPromiseRef.current = promise
  }

  function acceptFile(selected: File) {
    if (selected.size > maxBytes) {
      if (onValidationError) {
        onValidationError('file_too_large', selected)
      } else {
        setLocalError(label('fileTooLarge', 'fileTooLarge', { max: maxSizeMB }))
      }
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    setLocalError(null)
    setSelectedFile(selected)

    const uploadPath = generateStoragePath?.(selected) ?? storagePath
    onFileSelect?.(selected, uploadPath)

    if (bucket && uploadPath && authToken && supabaseUrl) {
      startUpload(selected, uploadPath)
    }
  }

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (!selected) return
    acceptFile(selected)
  }

  function handleDragEnter(e: React.DragEvent<HTMLDivElement>) {
    if (!e.dataTransfer?.types?.includes('Files')) return
    e.preventDefault()
    dragDepthRef.current += 1
    setIsDragging(true)
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    if (!e.dataTransfer?.types?.includes('Files')) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    if (!e.dataTransfer?.types?.includes('Files')) return
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if (dragDepthRef.current === 0) setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    if (!e.dataTransfer?.types?.includes('Files')) return
    e.preventDefault()
    dragDepthRef.current = 0
    setIsDragging(false)

    const dropped = e.dataTransfer.files?.[0]
    if (!dropped) return
    acceptFile(dropped)
  }

  function handleClear() {
    abortRef.current?.abort()
    abortRef.current = null
    if (uploadPromiseRef) uploadPromiseRef.current = null

    setLocalError(null)
    setProgress(undefined)
    setSelectedFile(null)
    if (inputRef.current) inputRef.current.value = ''
    onClear?.()
  }

  // `error` takes precedence over `hasFile`: when the parent sets an error it
  // is expected to have cleared the file too. Guarantees error UI is never
  // stacked on top of a stale file chip.
  if (error) {
    return (
      <div className={className}>
        {error}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleSelect}
          className="hidden"
        />
      </div>
    )
  }

  if (hasFile) {
    const fileName = uploadedFileName ?? activeFile?.name ?? uploadedUrl?.split('/').pop() ?? 'Document'
    const previewUrl = activeFile && isImage ? URL.createObjectURL(activeFile) : uploadedUrl

    return (
      <Card variant="solid" size="none" className={cn('p-3', className)}>
        <div className="flex items-center gap-3">
          {isImage && previewUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element -- blob URL from local file, not optimizable */
            <img
              src={previewUrl}
              alt={fileName}
              className="size-12 shrink-0 rounded-xl object-cover"
            />
          ) : (
            <IconTile size="lg" tone="muted">
              <FileText />
            </IconTile>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{fileName}</p>
            {isUploading ? (
              <div className="mt-1.5">
                <div className="h-1.5 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {activeFile ? `${(activeFile.size / 1024).toFixed(0)} KB` : label('uploaded', 'uploaded')}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {(onView || previewUrl) && !isUploading && (
              onView ? (
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={viewing}
                  onClick={async () => {
                    setViewing(true)
                    try { await onView() } finally { setViewing(false) }
                  }}
                >
                  {viewing ? <Loader2 className="animate-spin" /> : <Eye />}
                </Button>
              ) : (
                <a
                  href={previewUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: 'ghost', size: 'icon' })}
                >
                  <Eye />
                </a>
              )
            )}
            <Button
              variant="ghost"
              size="icon"
              data-testid="file-clear-btn"
              onClick={handleClear}
            >
              <X />
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  const isLarge = size === 'lg'
  const dragHint = labels?.dropzoneDrag

  return (
    <div className={className}>
      <Card
        variant="dashed"
        size="none"
        className={cn(
          'cursor-pointer transition-colors hover:border-primary/30 hover:bg-muted/70',
          isLarge ? 'px-6 py-16' : 'px-4 py-5',
          isDragging && 'border-primary bg-primary-subtle',
        )}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-dragging={isDragging ? 'true' : undefined}
      >
        <div className={cn('flex flex-col items-center justify-center', isLarge ? 'gap-4' : 'gap-2')}>
          <Upload className={cn('text-muted-foreground', isLarge ? 'size-8' : 'size-5')} />
          <div className="flex flex-col items-center gap-2">
            <p className={cn('text-center text-muted-foreground', isLarge ? 'text-base' : 'text-sm')}>
              {label('dropzone', 'tapToAttach')}
            </p>
            {dragHint && (
              <p className="hidden text-sm text-muted-foreground sm:block">
                {dragHint}
              </p>
            )}
          </div>
          {hint && (
            <p className="rounded-2xl bg-warning-subtle px-3 py-1.5 text-center text-sm text-warning-subtle-foreground">
              {hint}
            </p>
          )}
        </div>
      </Card>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleSelect}
        className="hidden"
      />
      {localError && (
        <p className="mt-2 text-center text-sm text-destructive">{localError}</p>
      )}
    </div>
  )
}

export { FileUpload }
