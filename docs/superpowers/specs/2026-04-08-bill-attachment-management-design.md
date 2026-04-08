# Bill Attachment Management in Charge Instance Editor

## Problem

When a landlord edits a charge instance that already has a bill attached, the form shows an empty file upload dropzone instead of showing the attached file. There is no way to view or remove an existing attachment.

## Scope

Three gaps to close:

1. **Show attached bill** — when opening a charge instance with an existing `sourceDocumentId`, display the attached file (name, icon, view/remove actions) instead of the upload dropzone.
2. **Remove attachment** — allow the landlord to detach and delete the bill (storage file + `source_documents` row).
3. **View attachment** — allow the landlord to view the attached PDF/image in a new tab via a signed URL.

Additionally, two improvements to the upload flow:

4. **Immediate upload** — start uploading the file as soon as the user selects it (not when they press save), with real progress reporting via XHR.
5. **Upload cancellation** — abort in-flight uploads when the user removes the file, selects a different one, or closes the modal.

## Architecture

### New utility: `lib/storage/upload-file.ts`

Pure, testable upload function. No Supabase client dependency — just the REST endpoint + auth token.

```ts
interface UploadFileOptions {
  file: File
  bucket: string
  path: string
  authToken: string
  supabaseUrl: string
  onProgress?: (percent: number) => void
  signal?: AbortSignal
}

interface UploadFileResult {
  success: boolean
  error?: string
}

function uploadFile(options: UploadFileOptions): Promise<UploadFileResult>
```

- Uses `XMLHttpRequest` for `xhr.upload.onprogress` events
- Respects `AbortSignal` for cancellation — calls `xhr.abort()`
- Hits `${supabaseUrl}/storage/v1/object/${bucket}/${path}`
- Sets `Authorization: Bearer ${authToken}` and `Content-Type` from the file
- Returns a promise that resolves on success, rejects on abort/error

### Updated component: `FileUpload`

Gains upload orchestration. New props (all optional — component works in display-only mode without them):

```ts
interface FileUploadProps {
  // Existing
  file?: File | null
  uploadedUrl?: string | null
  uploadedFileName?: string | null
  progress?: number
  onFileSelect?: (file: File) => void
  onClear?: () => void
  maxSizeMB?: number
  accept?: string
  className?: string

  // New — upload orchestration
  bucket?: string
  storagePath?: string          // Full path including filename
  authToken?: string
  supabaseUrl?: string
  uploadPromiseRef?: MutableRefObject<Promise<UploadFileResult> | null>
}
```

When `bucket`, `storagePath`, `authToken`, and `supabaseUrl` are provided, the component manages the upload lifecycle internally:

- **On file select** → validates size, calls `onFileSelect`, starts upload immediately via `uploadFile()`, sets `uploadPromiseRef.current` to the pending promise, tracks progress internally.
- **On clear** → aborts any in-flight upload via `AbortController`, calls `onClear`, sets `uploadPromiseRef.current = null`.
- **On new file while uploading** → aborts previous upload, starts new one.
- **Upload complete** → sets `uploadPromiseRef.current = null`, shows "uploaded" state.
- **Upload error** → sets `uploadPromiseRef.current = null`, shows error, reverts to dropzone.

When upload props are not provided, the component behaves as a display-only file picker (current behavior).

### Updated component: `AddChargeForm`

Changes to wire up the new `FileUpload` capabilities:

**State additions:**
- `uploadPromiseRef = useRef<Promise<UploadFileResult> | null>(null)` — set by `FileUpload`
- `uploadedStoragePath` — tracks the storage path of a successfully uploaded file (for creating the DB row at save time)
- `existingDocumentUrl` — signed URL fetched on mount when editing a charge with a bill
- `removedExistingBill` — boolean flag when user removes the pre-existing attachment

**On mount (editing with existing bill):**
1. If `existingInstance.sourceDocument` exists, call `getSourceDocumentUrl(existingInstance.sourceDocumentId)` to get a signed URL.
2. Pass the signed URL as `uploadedUrl` and `existingInstance.sourceDocument.fileName` as `uploadedFileName` to `FileUpload`.
3. Show the attached file card with view (Eye) and remove (X) actions.

**On file select:**
- Generate a storage path: `{unitId}/{periodYear}-{periodMonth}/{crypto.randomUUID()}.{ext}`
- Get auth token from Supabase client session
- Pass `bucket`, `storagePath`, `authToken`, `supabaseUrl` to `FileUpload`
- Store `uploadedStoragePath` in state for use at save time

**On clear/remove:**
- If removing a newly uploaded file: delete the storage file (fire-and-forget cleanup)
- If removing the pre-existing bill: call `deleteBillDocument(existingInstance.sourceDocumentId)` to delete the `source_documents` row + storage file. Set `removedExistingBill = true`.
- Clear `uploadedStoragePath`

**On save (`handleSave`):**
1. If `uploadPromiseRef.current` is not null → await it. If it fails, show error toast, don't save.
2. If upload succeeded (or was already done) and `uploadedStoragePath` exists → call `createSourceDocumentRecord(...)` server action to create the `source_documents` row, get back `documentId`.
3. If `removedExistingBill` → pass `sourceDocumentId: null` to `updateChargeInstance`.
4. Otherwise pass the new `documentId` (or the existing one if unchanged).

**On modal close while uploading:**
- `FileUpload` handles abort internally via its `AbortController`.
- If a file was already uploaded to storage but not saved to a charge, delete the orphaned storage file (cleanup on unmount via `useEffect` return).

### New server actions

**`getSourceDocumentUrl(documentId: string): Promise<{ url: string | null }>`**
- Looks up `file_path` from `source_documents` table
- Calls `supabase.storage.from('source-documents').createSignedUrl(filePath, 3600)` (1-hour expiry)
- Returns the signed URL

**`deleteBillDocument(documentId: string): Promise<{ success: boolean }>`**
- Looks up `file_path` from `source_documents` table
- Deletes from storage: `supabase.storage.from('source-documents').remove([filePath])`
- Deletes DB row: `supabase.from('source_documents').delete().eq('id', documentId)`
- Returns success/failure

**`createSourceDocumentRecord(input): Promise<{ documentId: string | null }>`**
- Creates the `source_documents` row with metadata (unit_id, file_path, file_name, mime_type, file_size_bytes, period_year, period_month, uploaded_by)
- Separated from file upload since the upload now happens client-side
- The existing `uploadBillDocument` action becomes unused after this change and should be removed

### Migration: RLS delete policies

New migration file to add delete policies:

```sql
-- Landlords can delete source documents
create policy "Landlords can delete documents"
  on source_documents for delete
  using (is_property_landlord(property_id));

-- Landlords can delete source document files from storage
create policy "Landlords can delete source document files"
  on storage.objects for delete
  using (
    bucket_id = 'source-documents'
    and auth.uid() is not null
  );
```

### Query update: `fetchStatementCharges`

The query already fetches `source_documents (id, file_name, mime_type)` via a left join. It also needs `file_path` so we can construct storage paths for deletion without a separate lookup. Add `file_path` to the select and to the `ChargeInstance.sourceDocument` type.

## User experience

### Editing a charge with an existing bill

1. User taps a charge in the statement draft → `AddChargeSheet` opens
2. Form loads with amount pre-filled. File section shows the attached bill card: file icon, filename, Eye button, X button.
3. User taps Eye → PDF opens in a new tab via signed URL
4. User taps X → bill is deleted immediately, dropzone reappears
5. User can optionally attach a new file

### Attaching a new bill

1. User taps the dropzone or picks a file
2. Upload starts immediately — progress bar fills in real-time
3. Upload completes → file card shows with "Uploaded" status, Eye and X buttons
4. User taps Save → charge is saved with the new `sourceDocumentId` (instant, no upload wait)

### Save while upload is in progress

1. User selects a file → upload starts
2. User taps Save before upload finishes → save button shows spinner, waits for upload to complete
3. Upload finishes → DB row is created, charge is saved with `sourceDocumentId`
4. If upload fails → error toast, save is aborted, user can retry

### Replacing a file mid-upload

1. User selects file A → upload starts
2. User taps X (or selects file B) → upload of A is aborted, orphan storage file cleaned up
3. If file B selected → new upload starts immediately

## Edge cases

- **Modal closed during upload**: `useEffect` cleanup aborts in-flight upload. If file was already stored, fire-and-forget delete of orphan.
- **Network failure during upload**: XHR `onerror` resolves the promise with `{ success: false }`. Progress bar disappears, dropzone reappears, error toast shown.
- **Signed URL expiry**: URLs last 1 hour. If user leaves the modal open that long and taps Eye, they'd get a stale URL. Acceptable for MVP — they can close and reopen.
- **Concurrent delete**: If two browser tabs somehow try to delete the same document, the second delete fails silently. Acceptable.

## Files changed

| File | Change |
|---|---|
| `src/lib/storage/upload-file.ts` | **New** — XHR upload utility |
| `src/components/file-upload.tsx` | **Modified** — add upload orchestration |
| `src/app/app/(focused)/p/[id]/s/[statementId]/add-charge-sheet.tsx` | **Modified** — wire up existing bill display, immediate upload, save-while-uploading |
| `src/app/actions/statements/get-source-document-url.ts` | **New** — signed URL action |
| `src/app/actions/statements/delete-bill-document.ts` | **New** — delete storage + DB row |
| `src/app/actions/statements/create-source-document-record.ts` | **New** — create DB row (split from upload) |
| `src/app/actions/statements/upload-bill.ts` | **Removed** — replaced by client-side upload + `createSourceDocumentRecord` |
| `src/lib/queries/statement-charges.ts` | **Modified** — add `file_path` to select + type |
| `supabase/migrations/YYYYMMDDHHMMSS_source_documents_delete_policy.sql` | **New** — RLS delete policies |

## Test plan

### Unit tests (vitest, jsdom)

**`src/lib/storage/upload-file.test.ts`**
- Uploads file successfully, calls `onProgress` with increasing percentages, resolves with `{ success: true }`
- Handles abort via `AbortSignal` — resolves with `{ success: false }`, XHR is aborted
- Handles network error — resolves with `{ success: false, error: message }`
- Sends correct authorization header and content type
- Constructs correct URL from bucket/path/supabaseUrl

**`src/components/file-upload.test.tsx`**
- Renders dropzone when no file or URL provided
- Renders file card with name, Eye, X when `uploadedUrl` is provided
- Renders file card when `file` is provided
- Calls `onFileSelect` when file is picked
- Calls `onClear` when X is clicked
- Starts upload on file select when upload props are provided
- Sets `uploadPromiseRef.current` during upload, clears it on complete
- Aborts upload when `onClear` is called during upload
- Aborts previous upload when new file is selected during upload
- Shows progress bar during upload
- Shows error state on upload failure

**`src/app/app/(focused)/p/[id]/s/[statementId]/add-charge-sheet.test.tsx`**
- When editing with existing bill: shows file card (not dropzone), displays filename
- Removing existing bill: calls `deleteBillDocument`, shows dropzone
- Save while upload in progress: awaits `uploadPromiseRef`, then saves
- Save after upload complete: saves immediately with `documentId`
- Save after upload failure: shows error, does not save
- Modal close during upload: aborts upload (via `FileUpload` internal cleanup)

### Integration tests (vitest, node)

**`src/app/actions/statements/delete-bill-document.integration.test.ts`**
- Deletes storage file and DB row for valid document
- Returns failure for non-existent document
- Respects RLS — non-landlord cannot delete

**`src/app/actions/statements/get-source-document-url.integration.test.ts`**
- Returns signed URL for valid document
- Returns null for non-existent document

**`src/app/actions/statements/create-source-document-record.integration.test.ts`**
- Creates DB row with correct metadata
- Returns `documentId`

## Out of scope

- Drag-and-drop onto the dropzone (current `FileUpload` is tap/click only — fine for mobile-first)
- Multi-file attachments per charge instance
- File type-specific previews (e.g., inline PDF viewer) — Eye opens in new tab
- Retry failed uploads automatically
