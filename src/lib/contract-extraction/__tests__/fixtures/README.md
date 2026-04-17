# Contract extraction test fixtures

This directory holds the DOCX + PDF rental-contract fixtures used by the
contract-extraction pipeline tests (unit and LLM integration).

## Files

| File                         | Language | Shape                                                                           |
| ---------------------------- | -------- | ------------------------------------------------------------------------------- |
| `pt-br-real.docx` / `.pdf`   | pt-br    | Real Brazilian Sun Club contract (Brandon/Alex, R$6.300 bundled rent).          |
| `pt-br-synthetic-1.*`        | pt-br    | Formal Quadro Resumo as a table, IPCA annual adjustment, two co-tenants.        |
| `pt-br-synthetic-2.*`        | pt-br    | Prose-only sobrado (house) in Rio, DD/MM/YYYY dates, IGP-M adjustment.          |
| `en-synthetic-1.*`           | en       | California apartment, MM/DD/YYYY dates, CPI escalation.                         |
| `en-synthetic-2.*`           | en       | Texas house, "Month DD, YYYY" dates, two co-tenants, TERM-before-PARTIES order. |
| `es-synthetic-1.*`           | es       | Mexican contrato de arrendamiento, RFC + CURP, MXN, INPC adjustment.            |
| `es-synthetic-2.*`           | es       | Spanish (Spain) contrato de vivienda, DNI, euros, IPC/LAU references.           |
| `empty-body.docx`            | —        | DOCX with valid structure but empty body (no_text_extractable).                 |
| `locked.pdf`                 | —        | Password-protected PDF (password_protected).                                    |
| `no-text-layer.pdf`          | —        | PDF with no text layer (no_text_extractable).                                   |

Every synthetic fixture is authored to read plausibly as a draft written by a
human lawyer familiar with that jurisdiction's rental law (Lei do Inquilinato,
California Civil Code, Texas Property Code, Código Civil CDMX, LAU 29/1994).
Identifiers are obvious fakes.

## Regenerating DOCX

DOCX fixtures are generated programmatically via the `docx` npm package (pinned
to **9.6.1** as a devDependency). The generator walks the document as real
structure — `Document`, `Paragraph`, `HeadingLevel`, `Table`/`TableRow`/`TableCell`,
styled `TextRun` — so mammoth's `extractRawText` surfaces headings and Quadro
Resumo tables as real blocks, not a single prose blob.

From the repo root:

```bash
node src/lib/contract-extraction/__tests__/fixtures/generate.mjs
```

Running it twice produces identical DOCX content (modulo zip archive
timestamps in the DOCX metadata, which is expected).

## Regenerating PDFs

PDF fixtures are produced by running each DOCX through LibreOffice headless.
The whole point is that the PDFs pass through the same rendering pipeline a
user would hit when exporting from Word or Pages — do not substitute another
library.

### Prerequisite

```bash
brew install --cask libreoffice
```

On macOS the binary ends up at `/Applications/LibreOffice.app/Contents/MacOS/soffice`.
Symlinking it onto your PATH as `soffice` makes the commands below portable.

### Conversion

From the fixtures directory (or adjust paths accordingly):

```bash
FIX=src/lib/contract-extraction/__tests__/fixtures
for name in pt-br-synthetic-1 pt-br-synthetic-2 \
            en-synthetic-1 en-synthetic-2 \
            es-synthetic-1 es-synthetic-2; do
  soffice --headless --convert-to pdf --outdir "$FIX" "$FIX/$name.docx"
done
```

Convert fixtures one at a time if soffice complains about concurrent profile
access — running the loop sequentially is enough, no `--env:UserInstallation`
override needed.

### Accented character rendering

No font or locale flags are required. The default `soffice --headless` export
preserves PT-BR (ç, ã, ô, é, á) and ES (ñ, á, é, í, ó, ú) glyphs through to
the PDF text layer. `unpdf` recovers them intact during extraction — the
text-extraction tests verify this against the real and synthetic PT-BR
fixtures, and the integration tests assert on accented proper nouns in the
ES/MX fixtures.

If a future font substitution strips accents (e.g., running in a minimal
Docker image without the default Noto / Liberation fonts), add
`--infilter="MS Word 2007 XML"` to coerce LibreOffice through the OOXML
filter and install `fonts-liberation` / `fonts-noto` in the image.

## Expected-values files

Each unique contract has a companion `expected/<name>.expected.json` that
documents the fields an LLM extraction should recover. PDF and DOCX of the
same content share one expected file — the extraction result is
format-independent.

### Assertion DSL

Each leaf in an expected file is an **assertion spec**, one of:

| Spec                                 | Meaning                                                                            |
| ------------------------------------ | ---------------------------------------------------------------------------------- |
| `{ "equals": <value> }`              | Exact match (numbers, enum values, ISO dates, booleans, raw strings).              |
| `{ "contains": "<substring>" }`      | Case-insensitive substring match. Tolerates LLM casing variation.                  |
| `{ "normalizedEquals": "<string>" }` | Compare after stripping diacritics, lowercasing, and collapsing whitespace.        |
| `{ "isNull": true }`                 | Field must be `null` / `undefined`. Use for fields intentionally absent.           |
| `{ "notNull": true }`                | Field must be non-null. Use when presence matters but the exact value varies.      |

For nested objects (e.g. `address`, `rent`, `contractDates`, `rentAdjustment`)
the value is directly an object mapping field names to assertion specs —
walk recursively.

For arrays of objects (`landlords`, `tenants`, `expenses`) the value is a
**list-assertion object** with any of:

| Key            | Meaning                                                                          |
| -------------- | -------------------------------------------------------------------------------- |
| `length`       | Exact array length. Fails if `actual.length !== length`.                         |
| `minLength`    | Minimum array length. Fails if `actual.length < minLength`.                      |
| `items`        | Array of per-item assertion objects. Each expected item must find **some**       |
|                | matching actual item (order-independent). A matching item satisfies every       |
|                | field assertion in the expected item.                                            |

A missing `items` key means no per-item assertions — only the length check runs.

**Uniqueness:** The Task 7 walker must consume a unique actual item per expected
item — once an actual item is matched to an expected item, it can't be reused to
satisfy another. Without this guardrail, two expected items could both match the
same actual item (e.g., both `landlords[]` specs satisfied by one shared landlord
in the output) and the test would pass despite missing data.

Task 7's integration-test helper walks the expected tree, recurses into
nested objects, and dispatches on the assertion-spec shape at each leaf. Task
7 owns accent stripping / case folding; the fixture files are pure data.

### Example (partial)

```json
{
  "rent": {
    "amount": { "equals": 630000 },
    "currency": { "equals": "BRL" },
    "dueDay": { "equals": 5 }
  },
  "address": {
    "city": { "normalizedEquals": "florianopolis" }
  },
  "landlords": {
    "length": 2,
    "items": [
      { "name": { "normalizedEquals": "alex amorim anton" } },
      { "name": { "normalizedEquals": "daiana paula stolf" } }
    ]
  }
}
```
