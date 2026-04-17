import { extractText as unpdfExtractText, getDocumentProxy } from 'unpdf'
import mammoth from 'mammoth'

// unpdf's bundled pdf.js calls Promise.try(), which landed in V8 12.5 / Node 23.
// This project runs Node 22 (Vercel's current default), so polyfill it. The call
// sites are inside pdf.js functions (not at module load), so a runtime polyfill
// is sufficient despite import hoisting. Spec: Promise.try(fn, ...args) runs fn
// synchronously and wraps both its return value and any thrown error as a settled
// promise — so the reject path must be wired or thrown errors escape the Promise.
if (typeof (Promise as unknown as { try?: unknown }).try !== 'function') {
  ;(Promise as unknown as { try: (fn: (...args: unknown[]) => unknown, ...args: unknown[]) => Promise<unknown> }).try =
    function (fn, ...args) {
      return new Promise((resolve, reject) => {
        try {
          resolve(fn(...args))
        } catch (e) {
          reject(e)
        }
      })
    }
}

/**
 * Errors that text extraction can emit. A subset of ContractExtractionErrorCode —
 * extractContract (Task 7) catches these and returns the structured error response.
 */
export type ExtractTextErrorCode =
  | 'empty_file'
  | 'unsupported_format'
  | 'corrupt_file'
  | 'password_protected'
  | 'no_text_extractable'

export class ExtractTextError extends Error {
  constructor(
    public readonly code: ExtractTextErrorCode,
    public readonly cause?: unknown,
  ) {
    const causeMessage = cause instanceof Error ? cause.message : undefined
    super(causeMessage ? `${code}: ${causeMessage}` : code)
    this.name = 'ExtractTextError'
  }
}

type DetectedFormat = 'pdf' | 'docx' | 'ole-encrypted'

/**
 * Detect file format from magic bytes — never trust the file extension.
 * Returns null for anything we don't recognize (the caller maps that to unsupported_format).
 */
function detectFormat(bytes: Uint8Array): DetectedFormat | null {
  if (bytes.length < 4) return null

  // PDF: ASCII "%PDF"
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return 'pdf'
  }

  // ZIP local file header — DOCX is a zip container
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    return 'docx'
  }

  // OLE Compound Document File header — used by Office documents that are
  // password-protected on open. A regular DOCX is a zip; once you password-protect
  // it on open, Office wraps the OOXML contents in an OLE-CDF envelope.
  if (
    bytes.length >= 8 &&
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0 &&
    bytes[4] === 0xa1 &&
    bytes[5] === 0xb1 &&
    bytes[6] === 0x1a &&
    bytes[7] === 0xe1
  ) {
    return 'ole-encrypted'
  }

  return null
}

/**
 * Distinguish password/encryption errors from generic corruption. pdf.js throws
 * a typed `PasswordException` (checked by `name`). Mammoth raises errors whose
 * messages mention an encrypted package or encryption info — match those
 * explicitly rather than any mention of "password" or "encrypted", which would
 * also catch plain corruption messages like "encrypted stream object ...".
 */
function isPasswordError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  if (error.name === 'PasswordException') return true
  return /EncryptedPackage|encryption info|password required|No password/i.test(error.message)
}

async function extractFromPdf(bytes: Uint8Array): Promise<string> {
  let pdf
  try {
    pdf = await getDocumentProxy(bytes)
  } catch (e) {
    if (isPasswordError(e)) throw new ExtractTextError('password_protected', e)
    throw new ExtractTextError('corrupt_file', e)
  }

  try {
    let text: string
    try {
      const result = await unpdfExtractText(pdf, { mergePages: true })
      text = result.text
    } catch (e) {
      if (isPasswordError(e)) throw new ExtractTextError('password_protected', e)
      throw new ExtractTextError('corrupt_file', e)
    }

    if (text.trim().length === 0) {
      throw new ExtractTextError('no_text_extractable')
    }
    return text
  } finally {
    await pdf.destroy()
  }
}

async function extractFromDocx(bytes: Uint8Array): Promise<string> {
  // Zero-copy wrap around the caller's bytes — no allocation. mammoth only
  // reads from the buffer; Buffer.from(Uint8Array) would copy the memory.
  const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)

  let result: { value: string }
  try {
    result = await mammoth.extractRawText({ buffer })
  } catch (e) {
    if (isPasswordError(e)) throw new ExtractTextError('password_protected', e)
    throw new ExtractTextError('corrupt_file', e)
  }

  if (result.value.trim().length === 0) {
    throw new ExtractTextError('no_text_extractable')
  }
  return result.value
}

/**
 * Extract raw text from a PDF or DOCX buffer.
 *
 * Format is detected from magic bytes, not from a file extension — callers
 * that only have an in-memory buffer (uploads, email attachments) are common.
 *
 * Throws ExtractTextError with a typed code on any failure. extractContract
 * (Task 7) maps these codes onto the public ContractExtractionErrorCode set
 * and runs the upstream file-size check before calling here.
 */
export async function extractText(
  buffer: Buffer | ArrayBuffer | Uint8Array | null | undefined,
): Promise<string> {
  if (buffer == null) throw new ExtractTextError('empty_file')

  // ArrayBuffer.isView and ArrayBuffer detection are realm-safe — `instanceof
  // Uint8Array` is not (jsdom and Node have different Uint8Array constructors,
  // so a Node Buffer fails `instanceof` against jsdom's Uint8Array in tests).
  const bytes = ArrayBuffer.isView(buffer)
    ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    : buffer instanceof ArrayBuffer
      ? new Uint8Array(buffer)
      : null

  if (bytes === null || bytes.byteLength === 0) {
    throw new ExtractTextError('empty_file')
  }

  const format = detectFormat(bytes)
  if (format === 'ole-encrypted') throw new ExtractTextError('password_protected')
  if (format === null) throw new ExtractTextError('unsupported_format')

  return format === 'pdf' ? extractFromPdf(bytes) : extractFromDocx(bytes)
}
