export interface UploadFileOptions {
  file: File
  bucket: string
  path: string
  authToken: string
  supabaseUrl: string
  onProgress?: (percent: number) => void
  signal?: AbortSignal
}

export interface UploadFileResult {
  success: boolean
  error?: string
}

// Indirection allows test mocks (vi.fn(() => instance)) to work without `new`
function createXhr(): XMLHttpRequest {
  try {
    return new XMLHttpRequest()
  } catch {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (XMLHttpRequest as any)()
  }
}

export function uploadFile(options: UploadFileOptions): Promise<UploadFileResult> {
  const { file, bucket, path, authToken, supabaseUrl, onProgress, signal } = options

  if (signal?.aborted) {
    return Promise.resolve({ success: false, error: 'Upload aborted' })
  }

  return new Promise<UploadFileResult>((resolve) => {
    const xhr = createXhr()
    const url = `${supabaseUrl}/storage/v1/object/${bucket}/${path}`

    xhr.open('POST', url, true)
    xhr.setRequestHeader('Authorization', `Bearer ${authToken}`)
    xhr.setRequestHeader('Content-Type', file.type)

    xhr.upload.onprogress = (e: ProgressEvent) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ success: true })
      } else {
        resolve({ success: false, error: `Upload failed with status ${xhr.status}` })
      }
    }

    xhr.onerror = () => {
      resolve({ success: false, error: 'Network error during upload' })
    }

    xhr.onabort = () => {
      resolve({ success: false, error: 'Upload aborted' })
    }

    if (signal) {
      signal.addEventListener('abort', () => xhr.abort(), { once: true })
    }

    xhr.send(file)
  })
}
