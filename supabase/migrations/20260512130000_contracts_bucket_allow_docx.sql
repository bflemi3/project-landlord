-- Add DOCX to the contracts bucket's allowed_mime_types.
-- The contract extraction action accepts pdf + docx, but the bucket was
-- created with PDF + image MIME types only — DOCX uploads silently failed
-- with a 400 from storage, surfacing as "Your contract didn't finish
-- uploading" on the success screen. Align bucket policy with the action's
-- accepted formats.
update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp'
]
where id = 'contracts';
