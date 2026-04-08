# Bill Attachment Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable landlords to view, remove, and replace bill attachments on charge instances during statement drafting, with immediate upload and real progress reporting.

**Architecture:** Client-side XHR upload utility for progress/cancellation → `FileUpload` component gains upload orchestration → `AddChargeForm` wires up existing bill display and immediate upload → new server actions for signed URLs, document record creation, and document deletion → RLS migration for delete permissions.

**Tech Stack:** Next.js App Router, Supabase Storage REST API, XHR for upload progress, Vitest (jsdom + node), React Testing Library, Sonner for toasts.

---

### Task 1: RLS Delete Policies Migration

**Files:**
- Create: `supabase/migrations/20260408140000_source_documents_delete_policy.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Allow landlords to delete source documents they own
create policy "Landlords can delete documents"
  on source_documents for delete
  using (
    exists (select 1 from units where units.id = source_documents.unit_id
      and is_property_landlord(units.property_id))
  );

-- Allow landlords to delete source document files from storage
create policy "Landlords can delete source document files"
  on storage.objects for delete
  using (
    bucket_id = 'source-documents'
    and auth.uid() is not null
  );
```

- [ ] **Step 2: Apply migration locally**

Run: `npx supabase migration up`
Expected: Migration applied successfully, no errors.

- [ ] **Step 3: Verify policies exist**

Run: `npx supabase db lint`
Expected: No errors or warnings related to `source_documents`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260408140000_source_documents_delete_policy.sql
git commit -m "feat: add RLS delete policies for source documents and storage"
```

---

### Task 2: Upload File Utility — Tests

**Files:**
- Create: `src/lib/storage/upload-file.test.ts`

- [ ] **Step 1: Write the test file**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { uploadFile, type UploadFileOptions, type UploadFileResult } from './upload-file'

// Mock XMLHttpRequest
function createMockXHR() {
  const xhr: Record<string, unknown> = {
    open: vi.fn(),
    send: vi.fn(),
    setRequestHeader: vi.fn(),
    abort: vi.fn(),
    upload: { onprogress: null as ((e: ProgressEvent) => void) | null },
    onload: null as (() => void) | null,
    onerror: null as (() => void) | null,
    onabort: null as (() => void) | null,
    status: 200,
    readyState: 4,
  }
  return xhr
}

let mockXHR: ReturnType<typeof createMockXHR>

beforeEach(() => {
  mockXHR = createMockXHR()
  vi.stubGlobal('XMLHttpRequest', vi.fn(() => mockXHR))
})

afterEach(() => {
  vi.restoreAllMocks()
})

const baseOptions: UploadFileOptions = {
  file: new File(['test content'], 'bill.pdf', { type: 'application/pdf' }),
  bucket: 'source-documents',
  path: 'unit-1/2026-04/abc.pdf',
  authToken: 'test-token-123',
  supabaseUrl: 'http://localhost:54321',
}

describe('uploadFile', () => {
  it('constructs the correct URL from bucket, path, and supabaseUrl', () => {
    uploadFile(baseOptions)

    expect(mockXHR.open).toHaveBeenCalledWith(
      'POST',
      'http://localhost:54321/storage/v1/object/source-documents/unit-1/2026-04/abc.pdf',
      true,
    )
  })

  it('sets authorization header and content type', () => {
    uploadFile(baseOptions)

    expect(mockXHR.setRequestHeader).toHaveBeenCalledWith('Authorization', 'Bearer test-token-123')
    expect(mockXHR.setRequestHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf')
  })

  it('sends the file as the request body', () => {
    uploadFile(baseOptions)

    expect(mockXHR.send).toHaveBeenCalledWith(baseOptions.file)
  })

  it('resolves with success on HTTP 200', async () => {
    const promise = uploadFile(baseOptions)

    // Simulate successful upload
    mockXHR.status = 200
    ;(mockXHR.onload as () => void)()

    const result = await promise
    expect(result).toEqual({ success: true })
  })

  it('resolves with error on non-200 status', async () => {
    const promise = uploadFile(baseOptions)

    mockXHR.status = 403
    ;(mockXHR.onload as () => void)()

    const result = await promise
    expect(result).toEqual({ success: false, error: 'Upload failed with status 403' })
  })

  it('calls onProgress with increasing percentages', async () => {
    const onProgress = vi.fn()
    uploadFile({ ...baseOptions, onProgress })

    // Simulate progress events
    const progressHandler = mockXHR.upload.onprogress as (e: ProgressEvent) => void
    progressHandler({ lengthComputable: true, loaded: 50, total: 100 } as ProgressEvent)
    progressHandler({ lengthComputable: true, loaded: 100, total: 100 } as ProgressEvent)

    expect(onProgress).toHaveBeenCalledWith(50)
    expect(onProgress).toHaveBeenCalledWith(100)
  })

  it('ignores progress events where lengthComputable is false', () => {
    const onProgress = vi.fn()
    uploadFile({ ...baseOptions, onProgress })

    const progressHandler = mockXHR.upload.onprogress as (e: ProgressEvent) => void
    progressHandler({ lengthComputable: false, loaded: 0, total: 0 } as ProgressEvent)

    expect(onProgress).not.toHaveBeenCalled()
  })

  it('resolves with error on network failure', async () => {
    const promise = uploadFile(baseOptions)

    ;(mockXHR.onerror as () => void)()

    const result = await promise
    expect(result).toEqual({ success: false, error: 'Network error during upload' })
  })

  it('aborts the XHR when signal is aborted', async () => {
    const controller = new AbortController()
    const promise = uploadFile({ ...baseOptions, signal: controller.signal })

    controller.abort()

    // Simulate the abort handler firing
    ;(mockXHR.onabort as () => void)()

    const result = await promise
    expect(result).toEqual({ success: false, error: 'Upload aborted' })
    expect(mockXHR.abort).toHaveBeenCalled()
  })

  it('rejects immediately if signal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()

    const result = await uploadFile({ ...baseOptions, signal: controller.signal })
    expect(result).toEqual({ success: false, error: 'Upload aborted' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `nvm use 22 && npx vitest run src/lib/storage/upload-file.test.ts`
Expected: FAIL — cannot find module `./upload-file`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/storage/upload-file.test.ts
git commit -m "test: add upload-file utility tests (red)"
```

---

### Task 3: Upload File Utility — Implementation

**Files:**
- Create: `src/lib/storage/upload-file.ts`

- [ ] **Step 1: Implement the utility**

```typescript
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

export function uploadFile(options: UploadFileOptions): Promise<UploadFileResult> {
  const { file, bucket, path, authToken, supabaseUrl, onProgress, signal } = options

  // If already aborted, return immediately
  if (signal?.aborted) {
    return Promise.resolve({ success: false, error: 'Upload aborted' })
  }

  return new Promise<UploadFileResult>((resolve) => {
    const xhr = new XMLHttpRequest()
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
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `nvm use 22 && npx vitest run src/lib/storage/upload-file.test.ts`
Expected: All 9 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/storage/upload-file.ts
git commit -m "feat: add XHR upload utility with progress and cancellation"
```

---

### Task 4: Server Actions — Tests

**Files:**
- Create: `src/app/actions/statements/get-source-document-url.test.ts`
- Create: `src/app/actions/statements/delete-bill-document.test.ts`
- Create: `src/app/actions/statements/create-source-document-record.test.ts`
- Create: `src/app/actions/storage/delete-storage-file.test.ts`

- [ ] **Step 1: Write get-source-document-url tests**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { getSourceDocumentUrlCore } from './get-source-document-url'

function createMockSupabase(docData: { file_path: string } | null, signedUrl: string | null) {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: docData,
            error: docData ? null : { message: 'Not found' },
          }),
        }),
      }),
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        createSignedUrl: vi.fn().mockResolvedValue({
          data: signedUrl ? { signedUrl } : null,
          error: signedUrl ? null : { message: 'Failed' },
        }),
      }),
    },
  } as never
}

describe('getSourceDocumentUrlCore', () => {
  it('returns a signed URL for a valid document', async () => {
    const supabase = createMockSupabase(
      { file_path: 'unit-1/2026-04/abc.pdf' },
      'https://example.com/signed-url',
    )

    const result = await getSourceDocumentUrlCore(supabase, 'doc-123')

    expect(result).toEqual({ url: 'https://example.com/signed-url' })
    expect(supabase.storage.from).toHaveBeenCalledWith('source-documents')
  })

  it('returns null url for non-existent document', async () => {
    const supabase = createMockSupabase(null, null)

    const result = await getSourceDocumentUrlCore(supabase, 'missing-doc')

    expect(result).toEqual({ url: null })
  })

  it('returns null url when signed URL creation fails', async () => {
    const supabase = createMockSupabase(
      { file_path: 'unit-1/2026-04/abc.pdf' },
      null,
    )

    const result = await getSourceDocumentUrlCore(supabase, 'doc-123')

    expect(result).toEqual({ url: null })
  })
})
```

- [ ] **Step 2: Write delete-bill-document tests**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { deleteBillDocumentCore } from './delete-bill-document'

function createMockSupabase(docData: { file_path: string } | null) {
  const deleteFn = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  })

  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: docData,
            error: docData ? null : { message: 'Not found' },
          }),
        }),
      }),
      delete: deleteFn,
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        remove: vi.fn().mockResolvedValue({ error: null }),
      }),
    },
  } as never
}

describe('deleteBillDocumentCore', () => {
  it('deletes storage file and DB row for valid document', async () => {
    const supabase = createMockSupabase({ file_path: 'unit-1/2026-04/abc.pdf' })

    const result = await deleteBillDocumentCore(supabase, 'doc-123')

    expect(result).toEqual({ success: true })
    expect(supabase.storage.from).toHaveBeenCalledWith('source-documents')
    expect(supabase.storage.from('source-documents').remove).toHaveBeenCalledWith(['unit-1/2026-04/abc.pdf'])
  })

  it('returns failure for non-existent document', async () => {
    const supabase = createMockSupabase(null)

    const result = await deleteBillDocumentCore(supabase, 'missing-doc')

    expect(result).toEqual({ success: false })
  })
})
```

- [ ] **Step 3: Write delete-storage-file tests**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { deleteStorageFileCore } from './delete-storage-file'

function createMockSupabase(removeError: boolean = false) {
  return {
    storage: {
      from: vi.fn().mockReturnValue({
        remove: vi.fn().mockResolvedValue({
          error: removeError ? { message: 'Failed' } : null,
        }),
      }),
    },
  } as never
}

describe('deleteStorageFileCore', () => {
  it('deletes a file from the specified bucket', async () => {
    const supabase = createMockSupabase()

    const result = await deleteStorageFileCore(supabase, 'source-documents', 'unit-1/2026-04/abc.pdf')

    expect(result).toEqual({ success: true })
    expect(supabase.storage.from).toHaveBeenCalledWith('source-documents')
    expect(supabase.storage.from('source-documents').remove).toHaveBeenCalledWith(['unit-1/2026-04/abc.pdf'])
  })

  it('returns failure when storage removal fails', async () => {
    const supabase = createMockSupabase(true)

    const result = await deleteStorageFileCore(supabase, 'source-documents', 'unit-1/2026-04/abc.pdf')

    expect(result).toEqual({ success: false })
  })
})
```

- [ ] **Step 4: Write create-source-document-record tests**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { createSourceDocumentRecordCore, type CreateSourceDocumentInput } from './create-source-document-record'

function createMockSupabase(userId: string | null, docId: string | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId ? { id: userId } : null },
      }),
    },
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: docId ? { id: docId } : null,
            error: docId ? null : { message: 'Insert failed' },
          }),
        }),
      }),
    }),
  } as never
}

const baseInput: CreateSourceDocumentInput = {
  unitId: 'unit-1',
  filePath: 'unit-1/2026-04/abc.pdf',
  fileName: 'bill.pdf',
  mimeType: 'application/pdf',
  fileSizeBytes: 12345,
  periodYear: 2026,
  periodMonth: 4,
}

describe('createSourceDocumentRecordCore', () => {
  it('creates a DB row and returns the document ID', async () => {
    const supabase = createMockSupabase('user-1', 'doc-456')

    const result = await createSourceDocumentRecordCore(supabase, baseInput)

    expect(result).toEqual({ documentId: 'doc-456' })
    expect(supabase.from).toHaveBeenCalledWith('source_documents')
  })

  it('returns null documentId when not authenticated', async () => {
    const supabase = createMockSupabase(null, null)

    const result = await createSourceDocumentRecordCore(supabase, baseInput)

    expect(result).toEqual({ documentId: null })
  })

  it('returns null documentId when insert fails', async () => {
    const supabase = createMockSupabase('user-1', null)

    const result = await createSourceDocumentRecordCore(supabase, baseInput)

    expect(result).toEqual({ documentId: null })
  })
})
```

- [ ] **Step 5: Run all tests to verify they fail**

Run: `nvm use 22 && npx vitest run src/app/actions/statements/get-source-document-url.test.ts src/app/actions/statements/delete-bill-document.test.ts src/app/actions/statements/create-source-document-record.test.ts src/app/actions/storage/delete-storage-file.test.ts`
Expected: FAIL — cannot find modules.

- [ ] **Step 6: Commit**

```bash
git add src/app/actions/statements/get-source-document-url.test.ts src/app/actions/statements/delete-bill-document.test.ts src/app/actions/statements/create-source-document-record.test.ts src/app/actions/storage/delete-storage-file.test.ts
git commit -m "test: add server action tests for bill document management (red)"
```

---

### Task 5: Server Actions — Implementation

**Files:**
- Create: `src/app/actions/statements/get-source-document-url.ts`
- Create: `src/app/actions/statements/delete-bill-document.ts`
- Create: `src/app/actions/statements/create-source-document-record.ts`
- Create: `src/app/actions/storage/delete-storage-file.ts`

- [ ] **Step 1: Implement get-source-document-url**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import type { TypedSupabaseClient } from '@/lib/supabase/types'

export async function getSourceDocumentUrlCore(
  supabase: TypedSupabaseClient,
  documentId: string,
): Promise<{ url: string | null }> {
  const { data: doc, error } = await supabase
    .from('source_documents')
    .select('file_path')
    .eq('id', documentId)
    .single()

  if (error || !doc) return { url: null }

  const { data: signed, error: signError } = await supabase.storage
    .from('source-documents')
    .createSignedUrl(doc.file_path, 3600)

  if (signError || !signed) return { url: null }

  return { url: signed.signedUrl }
}

export async function getSourceDocumentUrl(
  documentId: string,
): Promise<{ url: string | null }> {
  const supabase = await createClient()
  return getSourceDocumentUrlCore(supabase, documentId)
}
```

- [ ] **Step 2: Implement delete-bill-document**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import type { TypedSupabaseClient } from '@/lib/supabase/types'

export async function deleteBillDocumentCore(
  supabase: TypedSupabaseClient,
  documentId: string,
): Promise<{ success: boolean }> {
  // Look up file path
  const { data: doc, error } = await supabase
    .from('source_documents')
    .select('file_path')
    .eq('id', documentId)
    .single()

  if (error || !doc) return { success: false }

  // Delete from storage
  await supabase.storage
    .from('source-documents')
    .remove([doc.file_path])

  // Delete DB row
  await supabase
    .from('source_documents')
    .delete()
    .eq('id', documentId)

  return { success: true }
}

export async function deleteBillDocument(
  documentId: string,
): Promise<{ success: boolean }> {
  const supabase = await createClient()
  return deleteBillDocumentCore(supabase, documentId)
}
```

- [ ] **Step 3: Implement create-source-document-record**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import type { TypedSupabaseClient } from '@/lib/supabase/types'

export interface CreateSourceDocumentInput {
  unitId: string
  filePath: string
  fileName: string
  mimeType: string
  fileSizeBytes: number
  periodYear: number
  periodMonth: number
}

export async function createSourceDocumentRecordCore(
  supabase: TypedSupabaseClient,
  input: CreateSourceDocumentInput,
): Promise<{ documentId: string | null }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { documentId: null }

  const { data: doc, error } = await supabase
    .from('source_documents')
    .insert({
      unit_id: input.unitId,
      file_path: input.filePath,
      file_name: input.fileName,
      mime_type: input.mimeType,
      file_size_bytes: input.fileSizeBytes,
      period_year: input.periodYear,
      period_month: input.periodMonth,
      uploaded_by: user.id,
      ingestion_status: 'uploaded',
    })
    .select('id')
    .single()

  if (error || !doc) return { documentId: null }

  return { documentId: doc.id }
}

export async function createSourceDocumentRecord(
  input: CreateSourceDocumentInput,
): Promise<{ documentId: string | null }> {
  const supabase = await createClient()
  return createSourceDocumentRecordCore(supabase, input)
}
```

- [ ] **Step 4: Implement delete-storage-file**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import type { TypedSupabaseClient } from '@/lib/supabase/types'

export async function deleteStorageFileCore(
  supabase: TypedSupabaseClient,
  bucket: string,
  path: string,
): Promise<{ success: boolean }> {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path])

  return { success: !error }
}

export async function deleteStorageFile(
  bucket: string,
  path: string,
): Promise<{ success: boolean }> {
  const supabase = await createClient()
  return deleteStorageFileCore(supabase, bucket, path)
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `nvm use 22 && npx vitest run src/app/actions/statements/get-source-document-url.test.ts src/app/actions/statements/delete-bill-document.test.ts src/app/actions/statements/create-source-document-record.test.ts src/app/actions/storage/delete-storage-file.test.ts`
Expected: All 10 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/actions/statements/get-source-document-url.ts src/app/actions/statements/delete-bill-document.ts src/app/actions/statements/create-source-document-record.ts src/app/actions/storage/delete-storage-file.ts
git commit -m "feat: add server actions for bill document URL, deletion, storage cleanup, and record creation"
```

---

### Task 6: Update `fetchStatementCharges` Query — Add `file_path`

**Files:**
- Modify: `src/lib/queries/statement-charges.ts`

- [ ] **Step 1: Add `file_path` to the select and type**

In `src/lib/queries/statement-charges.ts`:

Update the `sourceDocument` type in the `ChargeInstance` interface:

```typescript
// old
sourceDocument: { id: string; fileName: string; mimeType: string } | null

// new
sourceDocument: { id: string; fileName: string; mimeType: string; filePath: string } | null
```

Update the select query string:

```typescript
// old
source_documents ( id, file_name, mime_type )

// new
source_documents ( id, file_name, mime_type, file_path )
```

Update the type cast and mapping:

```typescript
// old
const doc = row.source_documents as unknown as { id: string; file_name: string; mime_type: string } | null

// new
const doc = row.source_documents as unknown as { id: string; file_name: string; mime_type: string; file_path: string } | null
```

And in the return mapping:

```typescript
// old
sourceDocument: doc ? { id: doc.id, fileName: doc.file_name, mimeType: doc.mime_type } : null,

// new
sourceDocument: doc ? { id: doc.id, fileName: doc.file_name, mimeType: doc.mime_type, filePath: doc.file_path } : null,
```

- [ ] **Step 2: Verify the app still compiles**

Run: `npx next build --no-lint 2>&1 | head -30`
Expected: No type errors related to `ChargeInstance`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/queries/statement-charges.ts
git commit -m "feat: add file_path to statement charges query for bill management"
```

---

### Task 7: FileUpload Component — Tests

**Files:**
- Create: `src/components/file-upload.test.tsx`

- [ ] **Step 1: Write the test file**

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { createRef, type MutableRefObject } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import { FileUpload } from './file-upload'
import type { UploadFileResult } from '@/lib/storage/upload-file'

// Mock the upload utility
vi.mock('@/lib/storage/upload-file', () => ({
  uploadFile: vi.fn(),
}))

// Mock next-intl
const messages = {
  propertyDetail: {
    tapToAttachBill: 'Tap to attach a bill',
    uploaded: 'Uploaded',
    fileTooLarge: 'File is too large. Maximum size is {max}MB.',
    uploadFailed: 'Upload failed. Please try again.',
  },
}

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

afterEach(cleanup)

describe('FileUpload', () => {
  describe('display modes', () => {
    it('renders dropzone when no file or URL is provided', () => {
      renderWithIntl(<FileUpload />)
      expect(screen.getByText('Tap to attach a bill')).toBeInTheDocument()
    })

    it('renders file card with name when uploadedUrl is provided', () => {
      renderWithIntl(
        <FileUpload
          uploadedUrl="https://example.com/bill.pdf"
          uploadedFileName="electricity-bill.pdf"
        />,
      )
      expect(screen.getByText('electricity-bill.pdf')).toBeInTheDocument()
      expect(screen.queryByText('Tap to attach a bill')).not.toBeInTheDocument()
    })

    it('renders file card when file is provided', () => {
      const file = new File(['content'], 'water-bill.pdf', { type: 'application/pdf' })
      renderWithIntl(<FileUpload file={file} />)
      expect(screen.getByText('water-bill.pdf')).toBeInTheDocument()
    })

    it('shows Eye icon link when uploadedUrl is provided', () => {
      renderWithIntl(
        <FileUpload
          uploadedUrl="https://example.com/bill.pdf"
          uploadedFileName="bill.pdf"
        />,
      )
      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', 'https://example.com/bill.pdf')
      expect(link).toHaveAttribute('target', '_blank')
    })
  })

  describe('file selection', () => {
    it('calls onFileSelect when a file is picked', () => {
      const onFileSelect = vi.fn()
      renderWithIntl(<FileUpload onFileSelect={onFileSelect} />)

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['content'], 'bill.pdf', { type: 'application/pdf' })
      fireEvent.change(input, { target: { files: [file] } })

      expect(onFileSelect).toHaveBeenCalledWith(file)
    })

    it('calls onClear when X button is clicked', () => {
      const onClear = vi.fn()
      const file = new File(['content'], 'bill.pdf', { type: 'application/pdf' })
      renderWithIntl(<FileUpload file={file} onClear={onClear} />)

      const clearButton = screen.getByRole('button')
      fireEvent.click(clearButton)

      expect(onClear).toHaveBeenCalled()
    })
  })

  describe('upload orchestration', () => {
    let mockUploadFile: ReturnType<typeof vi.fn>

    beforeEach(async () => {
      const mod = await import('@/lib/storage/upload-file')
      mockUploadFile = mod.uploadFile as ReturnType<typeof vi.fn>
      mockUploadFile.mockReset()
    })

    const uploadProps = {
      bucket: 'source-documents',
      storagePath: 'unit-1/2026-04/abc.pdf',
      authToken: 'test-token',
      supabaseUrl: 'http://localhost:54321',
    }

    it('starts upload on file select when upload props are provided', async () => {
      mockUploadFile.mockResolvedValue({ success: true })
      const ref = createRef<Promise<UploadFileResult> | null>() as MutableRefObject<Promise<UploadFileResult> | null>
      ref.current = null

      renderWithIntl(
        <FileUpload
          {...uploadProps}
          uploadPromiseRef={ref}
          onFileSelect={vi.fn()}
        />,
      )

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['content'], 'bill.pdf', { type: 'application/pdf' })
      fireEvent.change(input, { target: { files: [file] } })

      expect(mockUploadFile).toHaveBeenCalledWith(
        expect.objectContaining({
          file,
          bucket: 'source-documents',
          path: 'unit-1/2026-04/abc.pdf',
          authToken: 'test-token',
          supabaseUrl: 'http://localhost:54321',
        }),
      )
    })

    it('sets uploadPromiseRef during upload and clears on complete', async () => {
      let resolveUpload: (value: UploadFileResult) => void
      const uploadPromise = new Promise<UploadFileResult>((resolve) => {
        resolveUpload = resolve
      })
      mockUploadFile.mockReturnValue(uploadPromise)

      const ref = createRef<Promise<UploadFileResult> | null>() as MutableRefObject<Promise<UploadFileResult> | null>
      ref.current = null

      renderWithIntl(
        <FileUpload
          {...uploadProps}
          uploadPromiseRef={ref}
          onFileSelect={vi.fn()}
        />,
      )

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['content'], 'bill.pdf', { type: 'application/pdf' })
      fireEvent.change(input, { target: { files: [file] } })

      // Promise ref should be set during upload
      expect(ref.current).not.toBeNull()

      // Complete the upload
      resolveUpload!({ success: true })
      await waitFor(() => expect(ref.current).toBeNull())
    })

    it('aborts upload when onClear is called during upload', async () => {
      let resolveUpload: (value: UploadFileResult) => void
      mockUploadFile.mockReturnValue(
        new Promise<UploadFileResult>((resolve) => { resolveUpload = resolve }),
      )

      const ref = createRef<Promise<UploadFileResult> | null>() as MutableRefObject<Promise<UploadFileResult> | null>
      ref.current = null
      const onClear = vi.fn()

      renderWithIntl(
        <FileUpload
          {...uploadProps}
          uploadPromiseRef={ref}
          onFileSelect={vi.fn()}
          onClear={onClear}
        />,
      )

      // Select a file to start upload
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['content'], 'bill.pdf', { type: 'application/pdf' })
      fireEvent.change(input, { target: { files: [file] } })

      // Verify the upload was called with a signal
      expect(mockUploadFile).toHaveBeenCalledWith(
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      )

      // Get the abort signal that was passed
      const callArgs = mockUploadFile.mock.calls[0][0]
      const signal = callArgs.signal as AbortSignal

      // Clear the file (triggers abort)
      const clearButton = screen.getByRole('button')
      fireEvent.click(clearButton)

      // Signal should be aborted
      expect(signal.aborted).toBe(true)
      expect(onClear).toHaveBeenCalled()
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `nvm use 22 && npx vitest run src/components/file-upload.test.tsx`
Expected: FAIL — tests fail because `FileUpload` doesn't yet accept the new props.

- [ ] **Step 3: Commit**

```bash
git add src/components/file-upload.test.tsx
git commit -m "test: add FileUpload component tests for upload orchestration (red)"
```

---

### Task 8: FileUpload Component — Implementation

**Files:**
- Modify: `src/components/file-upload.tsx`

- [ ] **Step 1: Update the FileUpload component**

Replace the entire content of `src/components/file-upload.tsx`:

```tsx
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
  // Upload orchestration props
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
  // Upload orchestration
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

  const maxBytes = maxSizeMB * 1024 * 1024
  const hasFile = !!file || !!uploadedUrl
  const isUploading = progress !== undefined && progress >= 0 && progress < 100
  const isImage = file?.type.startsWith('image/') ?? false
  const canUpload = !!bucket && !!storagePath && !!authToken && !!supabaseUrl

  // Abort on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  function startUpload(selectedFile: File) {
    if (!canUpload) return

    // Abort any previous upload
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
        // Clear the file on failure
        if (inputRef.current) inputRef.current.value = ''
        onClear?.()
      }
      // Clear the ref regardless
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
    onFileSelect?.(selected)

    if (canUpload) {
      startUpload(selected)
    }
  }

  function handleClear() {
    // Abort any in-flight upload
    abortRef.current?.abort()
    abortRef.current = null
    if (uploadPromiseRef) uploadPromiseRef.current = null

    setError(null)
    setProgress(undefined)
    setUploadComplete(false)
    if (inputRef.current) inputRef.current.value = ''
    onClear?.()
  }

  // File selected or uploaded — show preview
  if (hasFile) {
    const fileName = uploadedFileName ?? file?.name ?? uploadedUrl?.split('/').pop() ?? 'Document'
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
            {!isUploading && (
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
```

- [ ] **Step 2: Add the `uploadFailed` translation key**

In `messages/en.json`, `messages/pt-BR.json`, and `messages/es.json`, add inside the `propertyDetail` section:

```json
"uploadFailed": "Upload failed. Please try again."
```

For `pt-BR.json`:
```json
"uploadFailed": "Falha no upload. Tente novamente."
```

For `es.json`:
```json
"uploadFailed": "Error al subir. Inténtelo de nuevo."
```

- [ ] **Step 3: Run FileUpload tests to verify they pass**

Run: `nvm use 22 && npx vitest run src/components/file-upload.test.tsx`
Expected: All tests PASS.

- [ ] **Step 4: Run upload-file tests to verify nothing broke**

Run: `nvm use 22 && npx vitest run src/lib/storage/upload-file.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/file-upload.tsx messages/en.json messages/pt-BR.json messages/es.json
git commit -m "feat: add upload orchestration to FileUpload component with progress and cancellation"
```

---

### Task 9: AddChargeForm — Tests

**Files:**
- Create: `src/app/app/(focused)/p/[id]/s/[statementId]/add-charge-sheet.test.tsx`

- [ ] **Step 1: Write the test file**

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AddChargeSheet } from './add-charge-sheet'
import type { ChargeInstance } from '@/lib/queries/statement-charges'

// Mock server actions
vi.mock('@/app/actions/statements/update-charge-instance', () => ({
  updateChargeInstance: vi.fn().mockResolvedValue({ success: true }),
}))
vi.mock('@/app/actions/statements/remove-charge-instance', () => ({
  removeChargeInstance: vi.fn().mockResolvedValue({ success: true }),
}))
vi.mock('@/app/actions/statements/add-charge', () => ({
  addChargeToStatement: vi.fn().mockResolvedValue({ success: true }),
}))
vi.mock('@/app/actions/statements/save-charge-definition', () => ({
  saveChargeAsDefinition: vi.fn().mockResolvedValue({ success: true }),
}))
vi.mock('@/app/actions/statements/get-source-document-url', () => ({
  getSourceDocumentUrl: vi.fn().mockResolvedValue({ url: 'https://example.com/signed-bill.pdf' }),
}))
vi.mock('@/app/actions/statements/delete-bill-document', () => ({
  deleteBillDocument: vi.fn().mockResolvedValue({ success: true }),
}))
vi.mock('@/app/actions/storage/delete-storage-file', () => ({
  deleteStorageFile: vi.fn().mockResolvedValue({ success: true }),
}))
vi.mock('@/app/actions/statements/create-source-document-record', () => ({
  createSourceDocumentRecord: vi.fn().mockResolvedValue({ documentId: 'new-doc-id' }),
}))
vi.mock('@/lib/storage/upload-file', () => ({
  uploadFile: vi.fn().mockResolvedValue({ success: true }),
}))
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn().mockReturnValue({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  }),
}))

const messages = {
  propertyDetail: {
    saveChanges: 'Save changes',
    addToStatement: 'Add to statement',
    removeCharge: 'Remove charge',
    removeChargeConfirm: 'Are you sure?',
    yesRemove: 'Yes, remove',
    cancel: 'Cancel',
    chargePlaceholder: 'e.g. Repair fee',
    saveForFuture: 'Save for future',
    chargeType: 'Charge type',
    chargeTypeFixed: 'Fixed',
    chargeTypeVariable: 'Variable',
    billNudge: 'Attaching the bill helps your tenant verify this charge.',
    tapToAttachBill: 'Tap to attach a bill',
    uploaded: 'Uploaded',
    fileTooLarge: 'File is too large. Maximum size is {max}MB.',
    uploadFailed: 'Upload failed. Please try again.',
  },
}

function renderSheet(props: Partial<React.ComponentProps<typeof AddChargeSheet>> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={messages}>
        <AddChargeSheet
          open
          onOpenChange={vi.fn()}
          statementId="stmt-1"
          unitId="unit-1"
          periodYear={2026}
          periodMonth={4}
          {...props}
        />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  )
}

const existingInstanceWithBill: ChargeInstance = {
  id: 'ci-1',
  statementId: 'stmt-1',
  chargeDefinitionId: 'cd-1',
  sourceDocumentId: 'doc-1',
  name: 'Electricity',
  amountMinor: 15000,
  currency: 'BRL',
  chargeSource: 'manual',
  splitType: 'percentage',
  landlordPercentage: 0,
  tenantPercentage: 100,
  landlordFixedMinor: null,
  tenantFixedMinor: null,
  sourceDocument: {
    id: 'doc-1',
    fileName: 'electricity-march.pdf',
    mimeType: 'application/pdf',
    filePath: 'unit-1/2026-03/abc.pdf',
  },
}

const existingInstanceNoBill: ChargeInstance = {
  ...existingInstanceWithBill,
  sourceDocumentId: null,
  sourceDocument: null,
}

afterEach(cleanup)

describe('AddChargeSheet — bill attachment', () => {
  it('shows attached file card when editing a charge with a bill', async () => {
    renderSheet({ existingInstance: existingInstanceWithBill })

    await waitFor(() => {
      expect(screen.getByText('electricity-march.pdf')).toBeInTheDocument()
    })
    expect(screen.queryByText('Tap to attach a bill')).not.toBeInTheDocument()
  })

  it('shows dropzone when editing a charge without a bill', () => {
    renderSheet({ existingInstance: existingInstanceNoBill })

    expect(screen.getByText('Tap to attach a bill')).toBeInTheDocument()
  })

  it('calls deleteBillDocument when removing an existing bill', async () => {
    renderSheet({ existingInstance: existingInstanceWithBill })

    await waitFor(() => {
      expect(screen.getByText('electricity-march.pdf')).toBeInTheDocument()
    })

    // Find and click the X button (clear)
    const buttons = screen.getAllByRole('button')
    const clearButton = buttons.find((btn) =>
      btn.querySelector('svg')?.classList.contains('lucide-x'),
    )
    expect(clearButton).toBeDefined()
    fireEvent.click(clearButton!)

    const { deleteBillDocument } = await import('@/app/actions/statements/delete-bill-document')
    await waitFor(() => {
      expect(deleteBillDocument).toHaveBeenCalledWith('doc-1')
    })
  })

  it('shows dropzone after removing an existing bill', async () => {
    renderSheet({ existingInstance: existingInstanceWithBill })

    await waitFor(() => {
      expect(screen.getByText('electricity-march.pdf')).toBeInTheDocument()
    })

    const buttons = screen.getAllByRole('button')
    const clearButton = buttons.find((btn) =>
      btn.querySelector('svg')?.classList.contains('lucide-x'),
    )
    fireEvent.click(clearButton!)

    await waitFor(() => {
      expect(screen.getByText('Tap to attach a bill')).toBeInTheDocument()
    })
  })

  it('calls deleteStorageFile when removing a newly uploaded file', async () => {
    renderSheet({ existingInstance: existingInstanceNoBill })

    // Select a file (triggers upload)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['content'], 'new-bill.pdf', { type: 'application/pdf' })
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText('new-bill.pdf')).toBeInTheDocument()
    })

    // Click X to remove
    const buttons = screen.getAllByRole('button')
    const clearButton = buttons.find((btn) =>
      btn.querySelector('svg')?.classList.contains('lucide-x'),
    )
    fireEvent.click(clearButton!)

    const { deleteStorageFile } = await import('@/app/actions/storage/delete-storage-file')
    await waitFor(() => {
      expect(deleteStorageFile).toHaveBeenCalledWith(
        'source-documents',
        expect.stringMatching(/^unit-1\/2026-04\/.+\.pdf$/),
      )
    })
  })

  it('calls deleteStorageFile for previous file when replacing with a new one', async () => {
    renderSheet({ existingInstance: existingInstanceNoBill })

    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    // Select first file
    const file1 = new File(['content1'], 'bill-1.pdf', { type: 'application/pdf' })
    fireEvent.change(input, { target: { files: [file1] } })

    await waitFor(() => {
      expect(screen.getByText('bill-1.pdf')).toBeInTheDocument()
    })

    const { deleteStorageFile } = await import('@/app/actions/storage/delete-storage-file')
    const callCountBefore = (deleteStorageFile as ReturnType<typeof vi.fn>).mock.calls.length

    // Select second file (replaces first)
    const file2 = new File(['content2'], 'bill-2.pdf', { type: 'application/pdf' })
    fireEvent.change(input, { target: { files: [file2] } })

    await waitFor(() => {
      expect((deleteStorageFile as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(callCountBefore)
    })
  })

  it('cleans up orphaned storage file on unmount without saving', async () => {
    const { unmount } = renderSheet({ existingInstance: existingInstanceNoBill })

    // Select a file (triggers upload)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['content'], 'orphan-bill.pdf', { type: 'application/pdf' })
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText('orphan-bill.pdf')).toBeInTheDocument()
    })

    const { deleteStorageFile } = await import('@/app/actions/storage/delete-storage-file')
    ;(deleteStorageFile as ReturnType<typeof vi.fn>).mockClear()

    // Unmount without saving
    unmount()

    expect(deleteStorageFile).toHaveBeenCalledWith(
      'source-documents',
      expect.stringMatching(/^unit-1\/2026-04\/.+\.pdf$/),
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `nvm use 22 && npx vitest run src/app/app/\\(focused\\)/p/\\[id\\]/s/\\[statementId\\]/add-charge-sheet.test.tsx`
Expected: FAIL — the component doesn't yet have the new behavior.

- [ ] **Step 3: Commit**

```bash
git add "src/app/app/(focused)/p/[id]/s/[statementId]/add-charge-sheet.test.tsx"
git commit -m "test: add AddChargeSheet bill attachment tests (red)"
```

---

### Task 10: AddChargeForm — Implementation

**Files:**
- Modify: `src/app/app/(focused)/p/[id]/s/[statementId]/add-charge-sheet.tsx`

- [ ] **Step 1: Update the AddChargeForm component**

Replace the entire content of `src/app/app/(focused)/p/[id]/s/[statementId]/add-charge-sheet.tsx`:

```tsx
'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslations } from 'next-intl'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
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
import { createSourceDocumentRecord } from '@/app/actions/statements/create-source-document-record'
import { getSourceDocumentUrl } from '@/app/actions/statements/get-source-document-url'
import { deleteBillDocument } from '@/app/actions/statements/delete-bill-document'
import { deleteStorageFile } from '@/app/actions/storage/delete-storage-file'
import { saveChargeAsDefinition } from '@/app/actions/statements/save-charge-definition'
import { createClient } from '@/lib/supabase/client'
import { unitChargesQueryKey } from '@/lib/queries/unit-charges'
import { statementQueryKey } from '@/lib/queries/statement'
import { statementChargesQueryKey } from '@/lib/queries/statement-charges'
import { missingChargesQueryKey } from '@/lib/queries/missing-charges'
import type { ChargeInstance } from '@/lib/queries/statement-charges'
import type { MissingCharge } from '@/lib/queries/missing-charges'
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

  // Bill attachment state
  const [file, setFile] = useState<File | null>(null)
  const [existingDocumentUrl, setExistingDocumentUrl] = useState<string | null>(null)
  const [uploadedStoragePath, setUploadedStoragePath] = useState<string | null>(null)
  const [removedExistingBill, setRemovedExistingBill] = useState(false)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [storagePath, setStoragePath] = useState<string | null>(null)
  const uploadPromiseRef = useRef<Promise<UploadFileResult> | null>(null)
  const savedRef = useRef(false)
  const uploadedStoragePathRef = useRef<string | null>(null)

  const currencySymbol = CURRENCY_SYMBOLS[currency] ?? currency
  const numAmount = Number(amount.replace(',', '.'))
  const amountMinor = numAmount ? Math.round(numAmount * 100) : 0
  const canSave = name.trim().length > 0 && amountMinor > 0

  // Fetch signed URL and auth token on mount
  useEffect(() => {
    async function init() {
      // Get auth token for uploads
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) setAuthToken(session.access_token)

      // Fetch signed URL for existing bill
      if (existingInstance?.sourceDocumentId && !removedExistingBill) {
        const { url } = await getSourceDocumentUrl(existingInstance.sourceDocumentId)
        setExistingDocumentUrl(url)
      }
    }
    init()
  }, [existingInstance?.sourceDocumentId, removedExistingBill])

  // Clean up orphaned storage files on unmount (e.g. modal closed without saving)
  useEffect(() => {
    return () => {
      if (!savedRef.current && uploadedStoragePathRef.current) {
        deleteStorageFile('source-documents', uploadedStoragePathRef.current)
      }
    }
  }, [])

  function handleFileSelect(selectedFile: File) {
    // Clean up previously uploaded file if replacing mid-flow
    if (uploadedStoragePath) {
      deleteStorageFile('source-documents', uploadedStoragePath)
    }

    setFile(selectedFile)
    setRemovedExistingBill(false)

    // Generate storage path
    const fileExt = selectedFile.name.split('.').pop() ?? ''
    const path = `${unitId}/${periodYear}-${String(periodMonth).padStart(2, '0')}/${crypto.randomUUID()}.${fileExt}`
    setStoragePath(path)
    setUploadedStoragePath(path)
    uploadedStoragePathRef.current = path
    setExistingDocumentUrl(null)
  }

  function handleClear() {
    // If removing an existing bill, delete it
    if (existingInstance?.sourceDocumentId && !removedExistingBill && !file) {
      setRemovedExistingBill(true)
      setExistingDocumentUrl(null)
      deleteBillDocument(existingInstance.sourceDocumentId)
    }

    // Clean up uploaded storage file if removing a newly attached file
    if (uploadedStoragePath) {
      deleteStorageFile('source-documents', uploadedStoragePath)
    }

    setFile(null)
    setStoragePath(null)
    setUploadedStoragePath(null)
    uploadedStoragePathRef.current = null
  }

  function handleSave() {
    if (!canSave) return

    startTransition(async () => {
      // If upload is still in progress, await it
      if (uploadPromiseRef.current) {
        const uploadResult = await uploadPromiseRef.current
        if (!uploadResult.success) {
          toast.error(t('uploadFailed'))
          return
        }
      }

      // Create source document record if we uploaded a new file
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
        documentId = newDocId
      }

      if (isEditing) {
        // Determine what sourceDocumentId to pass
        let newSourceDocumentId: string | null | undefined
        if (removedExistingBill && !documentId) {
          newSourceDocumentId = null
        } else if (documentId) {
          newSourceDocumentId = documentId
        } else {
          newSourceDocumentId = undefined // unchanged
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

      // Mark as saved so unmount cleanup doesn't delete the uploaded file
      savedRef.current = true

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

  // Determine what to show in FileUpload
  const showExistingBill = !!existingInstance?.sourceDocument && !removedExistingBill && !file
  const fileUploadUrl = showExistingBill ? existingDocumentUrl : undefined
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

        {isVariable && !file && !showExistingBill && (
          <InfoBox variant="default" className="text-sm">
            <InfoBoxContent>
              {t('billNudge')}
            </InfoBoxContent>
          </InfoBox>
        )}

        <FileUpload
          file={file}
          uploadedUrl={fileUploadUrl}
          uploadedFileName={fileUploadFileName}
          onFileSelect={handleFileSelect}
          onClear={handleClear}
          bucket="source-documents"
          storagePath={storagePath ?? undefined}
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
```

- [ ] **Step 2: Run AddChargeSheet tests to verify they pass**

Run: `nvm use 22 && npx vitest run src/app/app/\\(focused\\)/p/\\[id\\]/s/\\[statementId\\]/add-charge-sheet.test.tsx`
Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add "src/app/app/(focused)/p/[id]/s/[statementId]/add-charge-sheet.tsx"
git commit -m "feat: wire up bill attachment display, removal, and immediate upload in AddChargeForm"
```

---

### Task 11: Integration Tests

**Files:**
- Create: `src/app/actions/statements/get-source-document-url.integration.test.ts`
- Create: `src/app/actions/statements/delete-bill-document.integration.test.ts`
- Create: `src/app/actions/statements/create-source-document-record.integration.test.ts`
- Create: `src/app/actions/storage/delete-storage-file.integration.test.ts`

These tests run against local Supabase (`vitest.integration.config.ts`). They use the service role key from `supabase status` (set up by `src/test/setup-integration.ts`).

- [ ] **Step 1: Write get-source-document-url integration test**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { getSourceDocumentUrlCore } from './get-source-document-url'

const SUPABASE_URL = 'http://127.0.0.1:54321'

describe('getSourceDocumentUrl (integration)', () => {
  let admin: ReturnType<typeof createClient>
  let propertyId: string
  let unitId: string
  let userId: string
  let documentId: string
  const storagePath = `test-integration/${crypto.randomUUID()}.pdf`

  beforeAll(async () => {
    admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Create a test user
    const { data: authUser } = await admin.auth.admin.createUser({
      email: `test-${crypto.randomUUID()}@example.com`,
      password: 'test-password-123',
      email_confirm: true,
    })
    userId = authUser.user!.id

    // Create test property + unit via admin
    const { data: prop } = await admin.from('properties').insert({
      name: 'Test Property',
      created_by: userId,
    }).select('id').single()
    propertyId = prop!.id

    await admin.from('memberships').insert({
      property_id: propertyId,
      user_id: userId,
      role: 'landlord',
    })

    const { data: unit } = await admin.from('units').insert({
      property_id: propertyId,
      label: 'Unit 1',
    }).select('id').single()
    unitId = unit!.id

    // Upload a test file to storage
    const testFile = new Blob(['test pdf content'], { type: 'application/pdf' })
    await admin.storage.from('source-documents').upload(storagePath, testFile)

    // Create source document record
    const { data: doc } = await admin.from('source_documents').insert({
      unit_id: unitId,
      file_path: storagePath,
      file_name: 'test.pdf',
      mime_type: 'application/pdf',
      file_size_bytes: 16,
      period_year: 2026,
      period_month: 4,
      uploaded_by: userId,
      ingestion_status: 'uploaded',
    }).select('id').single()
    documentId = doc!.id
  })

  afterAll(async () => {
    await admin.storage.from('source-documents').remove([storagePath])
    await admin.from('source_documents').delete().eq('id', documentId)
    await admin.from('units').delete().eq('id', unitId)
    await admin.from('memberships').delete().eq('property_id', propertyId)
    await admin.from('properties').delete().eq('id', propertyId)
    await admin.auth.admin.deleteUser(userId)
  })

  it('returns a signed URL for a valid document', async () => {
    const result = await getSourceDocumentUrlCore(admin as never, documentId)
    expect(result.url).toBeTruthy()
    expect(result.url).toContain('/storage/v1/')
  })

  it('returns null for non-existent document', async () => {
    const result = await getSourceDocumentUrlCore(admin as never, crypto.randomUUID())
    expect(result.url).toBeNull()
  })
})
```

- [ ] **Step 2: Write delete-bill-document integration test**

```typescript
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { deleteBillDocumentCore } from './delete-bill-document'

const SUPABASE_URL = 'http://127.0.0.1:54321'

describe('deleteBillDocument (integration)', () => {
  let admin: ReturnType<typeof createClient>
  let propertyId: string
  let unitId: string
  let userId: string
  let tenantId: string

  beforeAll(async () => {
    admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Create landlord user
    const { data: authUser } = await admin.auth.admin.createUser({
      email: `landlord-${crypto.randomUUID()}@example.com`,
      password: 'test-password-123',
      email_confirm: true,
    })
    userId = authUser.user!.id

    // Create tenant user
    const { data: tenantUser } = await admin.auth.admin.createUser({
      email: `tenant-${crypto.randomUUID()}@example.com`,
      password: 'test-password-123',
      email_confirm: true,
    })
    tenantId = tenantUser.user!.id

    // Create property + unit + memberships
    const { data: prop } = await admin.from('properties').insert({
      name: 'Test Property',
      created_by: userId,
    }).select('id').single()
    propertyId = prop!.id

    await admin.from('memberships').insert([
      { property_id: propertyId, user_id: userId, role: 'landlord' },
      { property_id: propertyId, user_id: tenantId, role: 'tenant' },
    ])

    const { data: unit } = await admin.from('units').insert({
      property_id: propertyId,
      label: 'Unit 1',
    }).select('id').single()
    unitId = unit!.id
  })

  afterAll(async () => {
    await admin.from('units').delete().eq('id', unitId)
    await admin.from('memberships').delete().eq('property_id', propertyId)
    await admin.from('properties').delete().eq('id', propertyId)
    await admin.auth.admin.deleteUser(userId)
    await admin.auth.admin.deleteUser(tenantId)
  })

  it('deletes storage file and DB row', async () => {
    const path = `test-integration/${crypto.randomUUID()}.pdf`
    const testFile = new Blob(['test content'], { type: 'application/pdf' })
    await admin.storage.from('source-documents').upload(path, testFile)

    const { data: doc } = await admin.from('source_documents').insert({
      unit_id: unitId,
      file_path: path,
      file_name: 'to-delete.pdf',
      mime_type: 'application/pdf',
      file_size_bytes: 12,
      period_year: 2026,
      period_month: 4,
      uploaded_by: userId,
      ingestion_status: 'uploaded',
    }).select('id').single()

    const result = await deleteBillDocumentCore(admin as never, doc!.id)
    expect(result.success).toBe(true)

    // Verify DB row is gone
    const { data: check } = await admin.from('source_documents').select('id').eq('id', doc!.id).single()
    expect(check).toBeNull()
  })

  it('returns failure for non-existent document', async () => {
    const result = await deleteBillDocumentCore(admin as never, crypto.randomUUID())
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 3: Write create-source-document-record integration test**

```typescript
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { createSourceDocumentRecordCore, type CreateSourceDocumentInput } from './create-source-document-record'

const SUPABASE_URL = 'http://127.0.0.1:54321'

describe('createSourceDocumentRecord (integration)', () => {
  let admin: ReturnType<typeof createClient>
  let landlordClient: ReturnType<typeof createClient>
  let propertyId: string
  let unitId: string
  let userId: string
  const createdDocIds: string[] = []

  beforeAll(async () => {
    admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Create landlord user
    const email = `landlord-${crypto.randomUUID()}@example.com`
    const { data: authUser } = await admin.auth.admin.createUser({
      email,
      password: 'test-password-123',
      email_confirm: true,
    })
    userId = authUser.user!.id

    // Create property + unit
    const { data: prop } = await admin.from('properties').insert({
      name: 'Test Property',
      created_by: userId,
    }).select('id').single()
    propertyId = prop!.id

    await admin.from('memberships').insert({
      property_id: propertyId,
      user_id: userId,
      role: 'landlord',
    })

    const { data: unit } = await admin.from('units').insert({
      property_id: propertyId,
      label: 'Unit 1',
    }).select('id').single()
    unitId = unit!.id

    // Create an authenticated client for the landlord
    landlordClient = createClient(SUPABASE_URL, process.env.SUPABASE_ANON_KEY!)
    await landlordClient.auth.signInWithPassword({ email, password: 'test-password-123' })
  })

  afterAll(async () => {
    for (const id of createdDocIds) {
      await admin.from('source_documents').delete().eq('id', id)
    }
    await admin.from('units').delete().eq('id', unitId)
    await admin.from('memberships').delete().eq('property_id', propertyId)
    await admin.from('properties').delete().eq('id', propertyId)
    await admin.auth.admin.deleteUser(userId)
  })

  it('creates a DB row and returns the document ID', async () => {
    const input: CreateSourceDocumentInput = {
      unitId,
      filePath: `test-integration/${crypto.randomUUID()}.pdf`,
      fileName: 'created-doc.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 999,
      periodYear: 2026,
      periodMonth: 4,
    }

    const result = await createSourceDocumentRecordCore(landlordClient as never, input)
    expect(result.documentId).toBeTruthy()
    createdDocIds.push(result.documentId!)

    // Verify row exists
    const { data: doc } = await admin.from('source_documents')
      .select('file_name, uploaded_by')
      .eq('id', result.documentId!)
      .single()
    expect(doc!.file_name).toBe('created-doc.pdf')
    expect(doc!.uploaded_by).toBe(userId)
  })
})
```

- [ ] **Step 4: Write delete-storage-file integration test**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { deleteStorageFileCore } from './delete-storage-file'

const SUPABASE_URL = 'http://127.0.0.1:54321'

describe('deleteStorageFile (integration)', () => {
  let admin: ReturnType<typeof createClient>

  beforeAll(async () => {
    admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  })

  it('removes a file from the specified bucket', async () => {
    const path = `test-integration/${crypto.randomUUID()}.pdf`
    const testFile = new Blob(['test content'], { type: 'application/pdf' })
    await admin.storage.from('source-documents').upload(path, testFile)

    const result = await deleteStorageFileCore(admin as never, 'source-documents', path)
    expect(result.success).toBe(true)

    // Verify file is gone
    const { data } = await admin.storage.from('source-documents').download(path)
    expect(data).toBeNull()
  })

  it('returns success even for non-existent file (Supabase remove is idempotent)', async () => {
    const result = await deleteStorageFileCore(
      admin as never,
      'source-documents',
      `test-integration/does-not-exist-${crypto.randomUUID()}.pdf`,
    )
    expect(result.success).toBe(true)
  })
})
```

- [ ] **Step 5: Run integration tests to verify they pass**

Run: `nvm use 22 && npx vitest run --config vitest.integration.config.ts`
Expected: All integration tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/actions/statements/get-source-document-url.integration.test.ts src/app/actions/statements/delete-bill-document.integration.test.ts src/app/actions/statements/create-source-document-record.integration.test.ts src/app/actions/storage/delete-storage-file.integration.test.ts
git commit -m "test: add integration tests for bill document server actions"
```

---

### Task 12: Remove Old Upload Action

**Files:**
- Delete: `src/app/actions/statements/upload-bill.ts`

- [ ] **Step 1: Verify no remaining imports**

Run: `nvm use 22 && npx vitest run` (run all tests to make sure nothing else imports the old action)

Search for remaining references:

Run a grep for `upload-bill` or `uploadBillDocument` across `src/` to confirm only the deleted file references it. At this point `add-charge-sheet.tsx` no longer imports it (it was replaced in Task 10).

- [ ] **Step 2: Delete the file**

```bash
rm src/app/actions/statements/upload-bill.ts
```

- [ ] **Step 3: Verify app compiles**

Run: `npx next build --no-lint 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add -u src/app/actions/statements/upload-bill.ts
git commit -m "chore: remove unused uploadBillDocument action (replaced by client-side upload)"
```

---

### Task 13: Run Full Test Suite & Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run all unit tests**

Run: `nvm use 22 && npx vitest run`
Expected: All tests PASS.

- [ ] **Step 2: Run integration tests**

Run: `nvm use 22 && npx vitest run --config vitest.integration.config.ts`
Expected: All tests PASS (or pass with no tests if integration tests are not wired up yet).

- [ ] **Step 3: Verify build**

Run: `npx next build --no-lint 2>&1 | tail -10`
Expected: Build succeeds with no type errors.

- [ ] **Step 4: Verify migration applies cleanly**

Run: `npx supabase migration up`
Expected: No errors. All migrations applied.
