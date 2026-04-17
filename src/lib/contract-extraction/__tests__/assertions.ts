/**
 * Assertion walker for contract extraction integration tests.
 *
 * Reads an `*.expected.json` file and validates an `ContractExtractionResult`
 * against it using the DSL documented in `fixtures/README.md`.
 *
 * Leaf specs: equals | contains | normalizedEquals | isNull | notNull.
 * Nested objects recurse. Arrays use list assertions (length/minLength/items)
 * with unique-match consumption — each expected item claims one actual item.
 *
 * Instead of throwing on the first mismatch, the walker collects every failure
 * with a JSON-path-ish prefix so a failing run surfaces all gaps in one pass.
 */

// ---------------------------------------------------------------------------
// Spec shapes
// ---------------------------------------------------------------------------

export type LeafSpec =
  | { equals: unknown }
  | { contains: string }
  | { normalizedEquals: string }
  | { isNull: true }
  | { notNull: true }

export interface ListSpec {
  length?: number
  minLength?: number
  items?: Record<string, unknown>[]
}

// A node in the expected tree is either a leaf spec, a list spec, or a
// recursive object spec (plain object mapping field names to nested specs).
export type ExpectedNode = LeafSpec | ListSpec | { [key: string]: ExpectedNode }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LEAF_KEYS = new Set(['equals', 'contains', 'normalizedEquals', 'isNull', 'notNull'])
const LIST_KEYS = new Set(['length', 'minLength', 'items'])

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isLeafSpec(v: unknown): v is LeafSpec {
  if (!isPlainObject(v)) return false
  const keys = Object.keys(v)
  return keys.length > 0 && keys.every((k) => LEAF_KEYS.has(k))
}

function isListSpec(v: unknown): v is ListSpec {
  if (!isPlainObject(v)) return false
  const keys = Object.keys(v)
  return keys.length > 0 && keys.every((k) => LIST_KEYS.has(k))
}

/** Strip diacritics, lowercase, collapse whitespace. */
function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function stringify(v: unknown): string {
  if (typeof v === 'string') return JSON.stringify(v)
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

// ---------------------------------------------------------------------------
// Core walker
// ---------------------------------------------------------------------------

/**
 * Walk `expected` against `actual`, accumulating every mismatch into `errors`.
 * `path` is the JSON-path-ish prefix used in error messages (e.g. `rent.amount`).
 */
function walk(expected: ExpectedNode, actual: unknown, path: string, errors: string[]): void {
  if (isLeafSpec(expected)) {
    checkLeaf(expected, actual, path, errors)
    return
  }

  if (isListSpec(expected)) {
    checkList(expected, actual, path, errors)
    return
  }

  if (isPlainObject(expected)) {
    if (!isPlainObject(actual)) {
      errors.push(`${path}: expected object, got ${stringify(actual)}`)
      return
    }
    for (const [key, childSpec] of Object.entries(expected)) {
      const childPath = path === '' ? key : `${path}.${key}`
      walk(childSpec as ExpectedNode, actual[key], childPath, errors)
    }
    return
  }

  errors.push(`${path}: malformed expected node ${stringify(expected)}`)
}

function checkLeaf(spec: LeafSpec, actual: unknown, path: string, errors: string[]): void {
  if ('equals' in spec) {
    if (actual !== spec.equals) {
      errors.push(`${path}: expected equals ${stringify(spec.equals)}, got ${stringify(actual)}`)
    }
    return
  }
  if ('contains' in spec) {
    if (typeof actual !== 'string') {
      errors.push(`${path}: expected string containing ${stringify(spec.contains)}, got ${stringify(actual)}`)
      return
    }
    if (!actual.toLowerCase().includes(spec.contains.toLowerCase())) {
      errors.push(`${path}: expected substring ${stringify(spec.contains)}, got ${stringify(actual)}`)
    }
    return
  }
  if ('normalizedEquals' in spec) {
    if (typeof actual !== 'string') {
      errors.push(`${path}: expected string normalizing to ${stringify(spec.normalizedEquals)}, got ${stringify(actual)}`)
      return
    }
    if (normalize(actual) !== normalize(spec.normalizedEquals)) {
      errors.push(
        `${path}: expected normalized ${stringify(spec.normalizedEquals)}, got ${stringify(actual)} (normalized ${stringify(normalize(actual))})`,
      )
    }
    return
  }
  if ('isNull' in spec) {
    if (actual !== null && actual !== undefined) {
      errors.push(`${path}: expected null/undefined, got ${stringify(actual)}`)
    }
    return
  }
  if ('notNull' in spec) {
    if (actual === null || actual === undefined) {
      errors.push(`${path}: expected non-null, got ${stringify(actual)}`)
    }
    return
  }
}

function checkList(spec: ListSpec, actual: unknown, path: string, errors: string[]): void {
  if (!Array.isArray(actual)) {
    errors.push(`${path}: expected array, got ${stringify(actual)}`)
    return
  }
  if (spec.length !== undefined && actual.length !== spec.length) {
    errors.push(`${path}: expected length ${spec.length}, got ${actual.length}`)
  }
  if (spec.minLength !== undefined && actual.length < spec.minLength) {
    errors.push(`${path}: expected minLength ${spec.minLength}, got ${actual.length}`)
  }

  if (!spec.items) return

  // Unique-match: each expected item consumes one actual item. We try
  // expected items greedily in order, picking the first still-unused actual
  // item that passes all its field assertions with zero errors.
  const consumed = new Set<number>()
  spec.items.forEach((expectedItem, expectedIdx) => {
    const itemPath = `${path}[${expectedIdx}]`
    let matchIdx = -1
    let firstMatchErrors: string[] | null = null

    for (let i = 0; i < actual.length; i++) {
      if (consumed.has(i)) continue
      const candidateErrors: string[] = []
      walk(expectedItem as ExpectedNode, actual[i], itemPath, candidateErrors)
      if (candidateErrors.length === 0) {
        matchIdx = i
        break
      }
      // Keep the first candidate's errors as a fallback diagnostic if
      // nothing matches — it's more helpful than "no match".
      if (firstMatchErrors === null) firstMatchErrors = candidateErrors
    }

    if (matchIdx >= 0) {
      consumed.add(matchIdx)
    } else {
      errors.push(
        `${itemPath}: no unmatched actual item satisfied expected ${stringify(expectedItem)}`,
      )
      if (firstMatchErrors) {
        for (const e of firstMatchErrors) errors.push(`  ↳ ${e}`)
      }
    }
  })
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validate `actual` against the expected spec tree. Returns a (possibly empty)
 * list of failure messages. Callers can `expect(errors).toEqual([])` to fail
 * the test with a readable diff of everything that went wrong.
 */
export function assertExtracted(expected: ExpectedNode, actual: unknown): string[] {
  const errors: string[] = []
  walk(expected, actual, '', errors)
  return errors
}
