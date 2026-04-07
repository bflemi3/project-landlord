'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Upload, FileText, X, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'

const MAX_SIZE_MB = 10
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

export function FileUpload({
  onFileSelect,
  file,
  uploadedUrl,
  progress,
  onClear,
  maxSizeMB = MAX_SIZE_MB,
  accept = 'application/pdf,image/*',
  className,
}: {
  onFileSelect: (file: File) => void
  file?: File | null
  uploadedUrl?: string | null
  progress?: number
  onClear?: () => void
  maxSizeMB?: number
  accept?: string
  className?: string
}) {
  const t = useTranslations('propertyDetail')
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const maxBytes = maxSizeMB * 1024 * 1024
  const hasFile = !!file || !!uploadedUrl
  const isUploading = progress !== undefined && progress >= 0 && progress < 100
  const isImage = file?.type.startsWith('image/') ?? false

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (!selected) return

    if (selected.size > maxBytes) {
      setError(t('fileTooLarge', { max: maxSizeMB }))
      e.target.value = ''
      return
    }

    setError(null)
    onFileSelect(selected)
  }

  function handleClear() {
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
    onClear?.()
  }

  // File selected or uploaded — show preview
  if (hasFile) {
    const fileName = file?.name ?? uploadedUrl?.split('/').pop() ?? 'Document'
    const previewUrl = file && isImage ? URL.createObjectURL(file) : uploadedUrl

    return (
      <div className={cn('rounded-2xl border border-border p-3', className)}>
        <div className="flex items-center gap-3">
          {/* Thumbnail or icon */}
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

          {/* File info */}
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
                {file ? `${(file.size / 1024).toFixed(0)} KB` : t('uploaded')}
              </p>
            )}
          </div>

          {/* Actions */}
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
            {onClear && !isUploading && (
              <button
                type="button"
                onClick={handleClear}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // No file — show drop zone
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
