import type { SupportedLanguage } from '../types'
import { enPrompt } from './en'
import { esPrompt } from './es'
import { ptBrPrompt } from './pt-br'
import { systemPrompt } from './system'

export { enPrompt, esPrompt, ptBrPrompt, systemPrompt }

const LANGUAGE_PROMPTS: Record<SupportedLanguage, string> = {
  'pt-br': ptBrPrompt,
  en: enPrompt,
  es: esPrompt,
}

export function getLanguagePrompt(language: SupportedLanguage): string {
  return LANGUAGE_PROMPTS[language]
}
