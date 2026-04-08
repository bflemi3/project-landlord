'use client'

import { useRef, useState, useEffect, type MutableRefObject } from 'react'
import { useTranslations } from 'next-intl'
import { Upload, FileText, X, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { uploadFile, type UploadFileResult } from '@/lib/storage/upload-file'

const MAX_SIZE_MB = 10

export function FileUpload({
  onFileSelect,
  file,
  uploadedUrl,
  uploadedFileName,
  onClear,
  maxSizeMB = MAX_SIZE_MB,
  accept = 'application/pdf,image/*',
  className,
  bucket,
  storagePath,
  authToken,
  supabaseUrl,
  uploadPromiseRef,
}: {
  onFileSelect?: (file: File) => void
  file?: File | null
  uploadedUrl?: string | null
  uploadedFileName?: string | null
  onClear?: () => void
  maxSizeMB?: number
  accept?: string
  className?: string
  bucket?: string
  storagePath?: string
  authToken?: string
  supabaseUrl?: string
  uploadPromiseRef?: MutableRefObject<Promise<UploadFileResult> | null>
}) {
  const t = useTranslations('propertyDetail')
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | undefined>(undefined)
  const [uploadComplete, setUploadComplete] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const maxBytes = maxSizeMB * 1024 * 1024
  const activeFile = file ?? selectedFile
  const hasFile = !!activeFile || !!uploadedUrl
  const isUploading = progress !== undefined && progress >= 0 && progress < 100
  const isImage = activeFile?.type.startsWith('image/') ?? false
  const canUpload = !!bucket && !!storagePath && !!authToken && !!supabaseUrl

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  function startUpload(selectedFile: File) {
    if (!canUpload) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setProgress(0)
    setUploadComplete(false)
    setError(null)

    const promise = uploadFile({
      file: selectedFile,
      bucket: bucket!,
      path: storagePath!,
      authToken: authToken!,
      supabaseUrl: supabaseUrl!,
      onProgress: setProgress,
      signal: controller.signal,
    }).then((result) => {
      if (result.success) {
        setProgress(100)
        setUploadComplete(true)
      } else if (result.error !== 'Upload aborted') {
        setError(t('uploadFailed'))
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
      setError(t('fileTooLarge', { max: maxSizeMB }))
      e.target.value = ''
      return
    }

    setError(null)
    setSelectedFile(selected)
    onFileSelect?.(selected)

    if (canUpload) {
      startUpload(selected)
    }
  }

  function handleClear() {
    abortRef.current?.abort()
    abortRef.current = null
    if (uploadPromiseRef) uploadPromiseRef.current = null

    setError(null)
    setProgress(undefined)
    setUploadComplete(false)
    setSelectedFile(null)
    if (inputRef.current) inputRef.current.value = ''
    onClear?.()
  }

  if (hasFile) {
    const fileName = uploadedFileName ?? activeFile?.name ?? uploadedUrl?.split('/').pop() ?? 'Document'
    const previewUrl = activeFile && isImage ? URL.createObjectURL(activeFile) : uploadedUrl

    return (
      <div className={cn('rounded-2xl border border-border p-3', className)}>
        <div className="flex items-center gap-3">
          {isImage && previewUrl ? (
            <img
              src={previewUrl}
              alt={fileName}
              className="size-12 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-secondary">
              <FileText className="size-5 text-muted-foreground" />
            </div>
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
              <p className="mt-0.5 text-xs text-muted-foreground">
                {activeFile ? `${(activeFile.size / 1024).toFixed(0)} KB` : t('uploaded')}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {previewUrl && !isUploading && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
              >
                <Eye className="size-4" />
              </a>
            )}
            <button
              type="button"
              data-testid="file-clear-btn"
              onClick={handleClear}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-4 py-5 transition-colors hover:border-primary/30 hover:bg-muted/30"
      >
        <Upload className="size-5 text-muted-foreground" />
        <p className="text-center text-sm text-muted-foreground">
          {t('tapToAttachBill')}
        </p>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleSelect}
        className="hidden"
      />
      {error && (
        <p className="mt-2 text-center text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}
