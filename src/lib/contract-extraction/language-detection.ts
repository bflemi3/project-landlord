import { francAll } from 'franc'
import type { SupportedLanguage } from './types'

/**
 * Minimum length of word-content (Unicode letters) that franc needs to produce
 * a reliable result. Below this franc's ISO 639-3 detection is noisy — e.g.,
 * "hello world" detects as Xhosa. Trigram-based detection needs prose, not
 * headers or metadata. This pre-filter short-circuits before calling franc so
 * ambiguous inputs cleanly return null.
 */
const MIN_WORD_CONTENT_LENGTH = 30

/**
 * Minimum score (franc normalizes the top result to 1.0) a supported language
 * must reach to be accepted. Tuned so European Portuguese — which franc
 * frequently labels Galician (`glg`) as the closer match, with `por` a hair
 * behind at ~0.98 — still maps to pt-br, while close-but-unsupported languages
 * like Italian, Catalan, or French (where the best supported score sits around
 * 0.87–0.91) return null.
 */
const SUPPORTED_SCORE_THRESHOLD = 0.95

/**
 * ISO 639-3 → SupportedLanguage mapping. Only Portuguese, English, and Spanish
 * are supported — any other code returns null so the extraction engine can
 * emit `unsupported_language` rather than silently running on an unknown
 * prompt. European Portuguese maps to pt-br because it's the only Portuguese
 * variant we support; the LLM prompt handles PT-BR vs PT-PT vocabulary drift.
 */
const ISO_TO_SUPPORTED: Record<string, SupportedLanguage> = {
  por: 'pt-br',
  eng: 'en',
  spa: 'es',
}

/**
 * Strip digits, whitespace, and punctuation so the length check reflects
 * actual prose content, not metadata. Preserves Unicode letters (accented
 * chars included) so real contracts with heavy PT-BR/ES accentuation aren't
 * penalized.
 */
function wordContentLength(text: string): number {
  return text.replace(/[^\p{L}]/gu, '').length
}

/**
 * Detect the language of a contract text. Returns one of `'pt-br' | 'en' | 'es'`
 * for supported languages, or `null` when detection is ambiguous or the result
 * maps to an unsupported language — the extraction engine surfaces `null` as
 * the `unsupported_language` error code.
 *
 * Uses `franc` for trigram-based detection. We don't just take the top result:
 * French/Italian/etc. would yield a Spanish "close cousin" that's clearly below
 * threshold, while European Portuguese frequently ranks Galician first with
 * Portuguese a hair behind. Picking the best supported language and gating on
 * an absolute score handles both without a per-language allowlist.
 */
export function detectLanguage(text: string | null | undefined): SupportedLanguage | null {
  if (text == null) return null
  if (wordContentLength(text) < MIN_WORD_CONTENT_LENGTH) return null

  const ranked = francAll(text)
  if (ranked.length === 0) return null
  if (ranked[0][0] === 'und') return null

  // Take the best-ranked supported language — if it's below threshold we
  // return null rather than falling through to lower-ranked supported
  // candidates. Lower-ranked matches are definitionally weaker; "no fallbacks"
  // per the plan.
  for (const [iso, score] of ranked) {
    const supported = ISO_TO_SUPPORTED[iso]
    if (supported === undefined) continue
    return score >= SUPPORTED_SCORE_THRESHOLD ? supported : null
  }
  return null
}
