// @vitest-environment node
// franc runs in Node; no DOM needed.

import { describe, it, expect } from 'vitest'
import { francAll } from 'franc'
import { detectLanguage } from '../language-detection'

// Keep in sync with SUPPORTED_SCORE_THRESHOLD in language-detection.ts.
// The regression tests below pin franc's raw scores against this value so a
// franc patch that shifts PT-PT's `por` score or French's `spa` score can't
// silently flip detection.
const SUPPORTED_SCORE_THRESHOLD = 0.95

// ---------------------------------------------------------------------------
// Inline snippets of legal text per language. Kept realistic (clause-like) and
// long enough (≥30 chars of word content) to give franc reliable signal. These
// are language-detection tests, not contract-extraction tests — the full
// pipeline against real fixtures lives in Task 7's integration tests.
// ---------------------------------------------------------------------------

const PT_BR_CONTRACT = `
Contrato de locação residencial celebrado entre as partes abaixo qualificadas,
tendo como objeto o imóvel situado na Rua das Flores, nº 123, bairro Centro,
cidade de São Paulo, Estado de São Paulo. O locatário se obriga a pagar ao
locador o aluguel mensal no valor de dois mil e quinhentos reais, devido até o
quinto dia útil de cada mês. O prazo de vigência do presente contrato é de
trinta meses, contados a partir da data de sua assinatura.
`.trim()

const PT_PT_CONTRACT = `
Contrato de arrendamento habitacional celebrado entre as partes abaixo
identificadas, tendo por objecto o imóvel sito na Rua das Amoreiras, n.º 45,
freguesia de Santo António, concelho de Lisboa. O arrendatário obriga-se a
pagar ao senhorio a renda mensal no montante de oitocentos euros, devida até ao
oitavo dia de cada mês. O prazo de vigência do presente contrato é de doze
meses, renovável por iguais períodos.
`.trim()

const EN_CONTRACT = `
This residential lease agreement is entered into between the parties identified
below, concerning the premises located at 123 Main Street, Apartment 4B, San
Francisco, California. The tenant agrees to pay the landlord monthly rent in the
amount of two thousand five hundred dollars, due on the first day of each month.
The term of this lease shall be twelve months, commencing on the date of
execution.
`.trim()

const EN_WITH_PT_BR_NAMES = `
This residential lease agreement is entered into between João da Silva Santos
and Maria Aparecida Ferreira de Oliveira, concerning the premises located at
Rua das Flores 123, São Paulo, Brazil. The tenant agrees to pay the landlord
monthly rent in the amount of two thousand five hundred dollars, due on the
first day of each month. The term of this lease shall be twelve months.
`.trim()

const ES_CONTRACT = `
Contrato de arrendamiento celebrado entre las partes identificadas a
continuación, teniendo por objeto el inmueble ubicado en la Avenida Insurgentes
número 123, Colonia Roma Norte, Ciudad de México. El arrendatario se obliga a
pagar al arrendador la renta mensual por la cantidad de veinticinco mil pesos,
pagadera dentro de los primeros cinco días de cada mes. El plazo del presente
contrato es de doce meses contados a partir de la fecha de su firma.
`.trim()

const FR_CONTRACT = `
Contrat de location à usage d'habitation conclu entre les parties ci-dessous
identifiées, concernant le bien immobilier situé au 45 rue des Lilas, 75011
Paris. Le locataire s'engage à payer au bailleur le loyer mensuel d'un montant
de mille cinq cents euros, dû le premier jour de chaque mois. La durée du
présent contrat est de trois ans à compter de la date de signature.
`.trim()

const DE_CONTRACT = `
Wohnungsmietvertrag zwischen den nachstehend bezeichneten Parteien über die
Wohnung in der Hauptstraße 12, 10115 Berlin. Der Mieter verpflichtet sich, dem
Vermieter die monatliche Miete in Höhe von eintausendzweihundert Euro zu
zahlen, fällig am ersten Werktag eines jeden Monats. Die Laufzeit dieses
Vertrages beträgt zwölf Monate ab dem Tag der Unterzeichnung.
`.trim()

describe('detectLanguage — supported languages', () => {
  it('detects PT-BR from a Brazilian contract', () => {
    expect(detectLanguage(PT_BR_CONTRACT)).toBe('pt-br')
  })

  it('detects EN from a US-style lease', () => {
    expect(detectLanguage(EN_CONTRACT)).toBe('en')
  })

  it('detects ES from a Mexican contrato de arrendamiento', () => {
    expect(detectLanguage(ES_CONTRACT)).toBe('es')
  })
})

describe('detectLanguage — ambiguity and overlap', () => {
  it('maps European Portuguese to pt-br (only supported variant)', () => {
    expect(detectLanguage(PT_PT_CONTRACT)).toBe('pt-br')
  })

  it('returns en for an English contract with Brazilian proper nouns', () => {
    expect(detectLanguage(EN_WITH_PT_BR_NAMES)).toBe('en')
  })

  it('returns the dominant language in a bilingual document', () => {
    // EN legal text dominates, with one PT-BR clause tucked in
    const bilingual = `${EN_CONTRACT}\n\nCláusula adicional em português.`
    expect(detectLanguage(bilingual)).toBe('en')

    // PT-BR legal text dominates
    const bilingualPt = `${PT_BR_CONTRACT}\n\nAdditional clause in English.`
    expect(detectLanguage(bilingualPt)).toBe('pt-br')
  })
})

describe('detectLanguage — unsupported languages', () => {
  it('returns null for French', () => {
    expect(detectLanguage(FR_CONTRACT)).toBeNull()
  })

  it('returns null for German', () => {
    expect(detectLanguage(DE_CONTRACT)).toBeNull()
  })
})

describe('detectLanguage — franc score invariants (regression guard)', () => {
  // These tests protect the 0.95 threshold against franc patches. If a franc
  // update shifts one of these scores, the threshold itself needs re-tuning —
  // detection behavior won't silently flip, the test will catch it.

  function bestSupportedScore(text: string, iso: string): number | undefined {
    return francAll(text).find(([code]) => code === iso)?.[1]
  }

  it('PT-PT ranks por at or above threshold (so it maps to pt-br)', () => {
    const score = bestSupportedScore(PT_PT_CONTRACT, 'por')
    expect(score).toBeDefined()
    expect(score!).toBeGreaterThanOrEqual(SUPPORTED_SCORE_THRESHOLD)
  })

  it('FR ranks every supported language below threshold (so it stays null)', () => {
    const ranked = francAll(FR_CONTRACT)
    const supported = ranked.filter(([code]) => code === 'por' || code === 'eng' || code === 'spa')
    for (const [, score] of supported) {
      expect(score).toBeLessThan(SUPPORTED_SCORE_THRESHOLD)
    }
  })

  it('EN ranks eng above threshold', () => {
    const score = bestSupportedScore(EN_CONTRACT, 'eng')
    expect(score).toBeDefined()
    expect(score!).toBeGreaterThanOrEqual(SUPPORTED_SCORE_THRESHOLD)
  })

  it('ES ranks spa above threshold', () => {
    const score = bestSupportedScore(ES_CONTRACT, 'spa')
    expect(score).toBeDefined()
    expect(score!).toBeGreaterThanOrEqual(SUPPORTED_SCORE_THRESHOLD)
  })
})

describe('detectLanguage — insufficient input', () => {
  it('returns null for empty string', () => {
    expect(detectLanguage('')).toBeNull()
  })

  it('returns null for null', () => {
    expect(detectLanguage(null)).toBeNull()
  })

  it('returns null for undefined', () => {
    expect(detectLanguage(undefined)).toBeNull()
  })

  it('returns null for very short text', () => {
    expect(detectLanguage('oi')).toBeNull()
    expect(detectLanguage('hello')).toBeNull()
  })

  it('returns null for text that is mostly numbers and punctuation', () => {
    expect(detectLanguage('2026-01-01 R$ 2500,00 CEP 01001-000 — 123/456')).toBeNull()
  })

  it('returns null for whitespace-only text', () => {
    expect(detectLanguage('   \n\t   ')).toBeNull()
  })
})
