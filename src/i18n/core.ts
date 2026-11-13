// Framework-free i18n core, so services and lib code can translate too.
// React components should use `useI18n()` (see I18nProvider) so they re-render on change.

import type { Category } from '@/types/domain'
import { en, type MessageKey, type Messages } from './messages/en'
import { es } from './messages/es'
import { sk } from './messages/sk'

export type { MessageKey }

export const LANGUAGES = ['en', 'es', 'sk'] as const
export type Language = (typeof LANGUAGES)[number]
export const DEFAULT_LANGUAGE: Language = 'en'

const CATALOGS: Record<Language, Messages> = { en, es, sk }
const LOCALES: Record<Language, string> = { en: 'en-GB', es: 'es-ES', sk: 'sk-SK' }
const STORAGE_KEY = 'twobalance.language'

export function isLanguage(v: unknown): v is Language {
  return typeof v === 'string' && (LANGUAGES as readonly string[]).includes(v)
}

function readStored(): Language {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (isLanguage(v)) return v
  } catch {
    /* storage unavailable (private mode, node) */
  }
  return DEFAULT_LANGUAGE
}

let current: Language = readStored()

export const getLanguage = (): Language => current
export const getLocale = (lang: Language = current): string => LOCALES[lang]

/** Update the active language and remember it on this device. */
export function setLanguage(lang: Language) {
  current = lang
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    /* storage unavailable */
  }
  if (typeof document !== 'undefined') document.documentElement.lang = lang
}

export type Params = Record<string, string | number>

export function translate(lang: Language, key: MessageKey, params?: Params): string {
  const text = CATALOGS[lang][key] ?? en[key]
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (m, name: string) =>
    name in params ? String(params[name]) : m,
  )
}

/** Translate using the active language (for non-React code, evaluated at call time). */
export const t = (key: MessageKey, params?: Params): string => translate(current, key, params)

/** Seeded categories come from the database in English; show them in the active language. */
export function categoryLabel(lang: Language, cat: Pick<Category, 'id' | 'name'>): string {
  const key = `category.${cat.id.slice(-1)}` as MessageKey
  const isSeed = /^00000000-0000-4000-8000-00000000000[1-9]$/.test(cat.id)
  return isSeed && key in en ? translate(lang, key) : cat.name
}
