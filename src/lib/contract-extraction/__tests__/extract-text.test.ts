// @vitest-environment node
// This whole module is server-side (no DOM needed). The Promise.try polyfill
// in extract-text.ts covers Node 22, but running under the node environment
// avoids any realm surprises around Buffer/Uint8Array identity from jsdom.

import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { extractText, ExtractTextError } from '../extract-text'

const FIXTURES = join(__dirname, 'fixtures')

async function loadFixture(name: string): Promise<Buffer> {
  return readFile(join(FIXTURES, name))
}

describe('extractText — happy path', () => {
  it('extracts text from a PDF buffer', async () => {
    const buffer = await loadFixture('pt-br-real.pdf')
    const text = await extractText(buffer)
    expect(text.length).toBeGreaterThan(100)
    expect(text.toLowerCase()).toContain('contrato')
  })

  it('extracts text from a DOCX buffer', async () => {
    const buffer = await loadFixture('pt-br-real.docx')
    const text = await extractText(buffer)
    expect(text.length).toBeGreaterThan(100)
    expect(text.toLowerCase()).toContain('contrato')
  })

  it('concatenates text from every page of a multi-page PDF', async () => {
    const buffer = await loadFixture('pt-br-real.pdf')
    const text = await extractText(buffer)
    // The Sun Club contract spans multiple pages with numbered clauses
    // (Cláusula Primeira, Segunda, ...). Hitting more than one of these
    // proves we got pages beyond the first.
    const clauseHits = (text.match(/cláusula/gi) || []).length
    expect(clauseHits).toBeGreaterThan(1)
  })

  it('extracts text from DOCX tables and headers (Quadro Resumo)', async () => {
    const buffer = await loadFixture('pt-br-real.docx')
    const text = await extractText(buffer)
    // The "Quadro Resumo" is a tabular section at the top of BR contracts.
    // Mammoth's extractRawText must walk tables, not just paragraphs.
    expect(text.toLowerCase()).toMatch(/quadro|resumo/)
  })

  it('preserves PT-BR accented characters in DOCX extraction', async () => {
    const buffer = await loadFixture('pt-br-real.docx')
    const text = await extractText(buffer)
    expect(text).toMatch(/[çãôéá]/)
  })

  it('preserves PT-BR accented characters in PDF extraction', async () => {
    const buffer = await loadFixture('pt-br-real.pdf')
    const text = await extractText(buffer)
    expect(text).toMatch(/[çãôéá]/)
  })
})

describe('extractText — empty input', () => {
  it('throws empty_file for a zero-byte buffer', async () => {
    await expect(extractText(Buffer.alloc(0))).rejects.toBeInstanceOf(ExtractTextError)
    await expect(extractText(Buffer.alloc(0))).rejects.toMatchObject({ code: 'empty_file' })
  })

  it('throws empty_file for a null buffer', async () => {
    await expect(extractText(null)).rejects.toMatchObject({ code: 'empty_file' })
  })

  it('throws empty_file for an undefined buffer', async () => {
    await expect(extractText(undefined)).rejects.toMatchObject({ code: 'empty_file' })
  })
})

describe('extractText — format detection', () => {
  it('throws unsupported_format for plain text', async () => {
    await expect(extractText(Buffer.from('hello world this is plain text'))).rejects.toMatchObject({
      code: 'unsupported_format',
    })
  })

  it('throws unsupported_format for PNG bytes', async () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])
    await expect(extractText(png)).rejects.toMatchObject({ code: 'unsupported_format' })
  })

  it('throws unsupported_format for short random bytes', async () => {
    const random = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07])
    await expect(extractText(random)).rejects.toMatchObject({ code: 'unsupported_format' })
  })
})

describe('extractText — password protected', () => {
  it('throws password_protected for an encrypted PDF', async () => {
    const buffer = await loadFixture('locked.pdf')
    await expect(extractText(buffer)).rejects.toMatchObject({ code: 'password_protected' })
  })

  it('throws password_protected for an OLE-CDF encrypted Office document', async () => {
    // OLE Compound Document File magic — used by Office docs encrypted-on-open
    const ole = Buffer.concat([
      Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
      Buffer.alloc(64, 0),
    ])
    await expect(extractText(ole)).rejects.toMatchObject({ code: 'password_protected' })
  })
})

describe('extractText — corrupt content', () => {
  it('throws corrupt_file for a PDF header followed by garbage', async () => {
    const corrupt = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(200, 0xff)])
    await expect(extractText(corrupt)).rejects.toMatchObject({ code: 'corrupt_file' })
  })

  it('rejects a zip header followed by garbage', async () => {
    const corrupt = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      Buffer.alloc(200, 0xff),
    ])
    // Mammoth may throw (→ corrupt_file) or return empty text (→ no_text_extractable)
    // depending on how it handles a truncated zip central directory. Both are
    // acceptable user-facing outcomes — what matters is we reject, not how.
    const error = await extractText(corrupt).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ExtractTextError)
    expect((error as ExtractTextError).code).toMatch(/^(corrupt_file|no_text_extractable)$/)
  })
})

describe('extractText — no extractable text', () => {
  it('throws no_text_extractable for a PDF with no text layer', async () => {
    const buffer = await loadFixture('no-text-layer.pdf')
    await expect(extractText(buffer)).rejects.toMatchObject({ code: 'no_text_extractable' })
  })

  it('throws no_text_extractable for a DOCX with empty body', async () => {
    const buffer = await loadFixture('empty-body.docx')
    await expect(extractText(buffer)).rejects.toMatchObject({ code: 'no_text_extractable' })
  })
})

describe('ExtractTextError', () => {
  it('exposes the typed code property', () => {
    const err = new ExtractTextError('empty_file')
    expect(err.code).toBe('empty_file')
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('ExtractTextError')
  })

  it('preserves the original error for debugging when a cause is passed', () => {
    const original = new Error('pdf.js internal detail')
    const err = new ExtractTextError('corrupt_file', original)
    expect(err.code).toBe('corrupt_file')
    expect(err.cause).toBe(original)
    expect(err.message).toContain('corrupt_file')
    expect(err.message).toContain('pdf.js internal detail')
  })

  it('falls back to the code as the message when no cause is passed', () => {
    const err = new ExtractTextError('empty_file')
    expect(err.message).toBe('empty_file')
    expect(err.cause).toBeUndefined()
  })
})
