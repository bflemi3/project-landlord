'use client'

import { useRef, useState, useEffect, type MutableRefObject } from 'react'
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
  viewing?: string
  uploaded?: string
  uploadFailed?: string
  fileTooLarge?: string
}

export function FileUpload({
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
  bucket,
  storagePath,
  generateStoragePath,
  authToken,
  supabaseUrl,
  uploadPromiseRef,
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
  bucket?: string
  storagePath?: string
  generateStoragePath?: (file: File) => string
  authToken?: string
  supabaseUrl?: string
  uploadPromiseRef?: MutableRefObject<Promise<UploadFileResult> | null>
}) {
  const t = useTranslations('propertyDetail')
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | undefined>(undefined)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [viewing, setViewing] = useState(false)

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

  function startUpload(selectedFile: File, uploadPath: string) {
    if (!bucket || !authToken || !supabaseUrl) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setProgress(0)
    setError(null)

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
        setError(label('uploadFailed', 'uploadFailed'))
        setProgress(undefined)
        if (inputRef.current) inputRef.current.value = ''
        onClear?.()
      }
      if (uploadPromiseRef) uploadPromiseRef.current = null
      return result
    })

    if (uploadPromiseRef) uploadPromiseRef.current = promise
  }

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (!selected) return

    if (selected.size > maxBytes) {
      setError(label('fileTooLarge', 'fileTooLarge', { max: maxSizeMB }))
      e.target.value = ''
      return
    }

    setError(null)
    setSelectedFile(selected)

    const uploadPath = generateStoragePath?.(selected) ?? storagePath
    onFileSelect?.(selected, uploadPath)

    if (bucket && uploadPath && authToken && supabaseUrl) {
      startUpload(selected, uploadPath)
    }
  }

  function handleClear() {
    abortRef.current?.abort()
    abortRef.current = null
    if (uploadPromiseRef) uploadPromiseRef.current = null

    setError(null)
    setProgress(undefined)
    setSelectedFile(null)
    if (inputRef.current) inputRef.current.value = ''
    onClear?.()
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

  return (
    <div className={className}>
      <Card
        variant="dashed"
        size="none"
        className="cursor-pointer px-4 py-5 transition-colors hover:border-primary/30 hover:bg-muted/70"
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
      >
        <div className="flex flex-col items-center justify-center gap-2">
          <Upload className="size-5 text-muted-foreground" />
          <p className="text-center text-sm text-muted-foreground">
            {label('dropzone', 'tapToAttachBill')}
          </p>
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
      {error && (
        <p className="mt-2 text-center text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
