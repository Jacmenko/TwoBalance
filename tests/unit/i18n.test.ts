import { describe, expect, it } from 'vitest'
import { categoryLabel, isLanguage, LANGUAGES, translate } from '@/i18n/core'
import { en } from '@/i18n/messages/en'
import { es } from '@/i18n/messages/es'
import { sk } from '@/i18n/messages/sk'

const catalogs = { en, es, sk }

describe('i18n', () => {
  it('supports English, Spanish and Slovak', () => {
    expect([...LANGUAGES]).toEqual(['en', 'es', 'sk'])
    expect(isLanguage('sk')).toBe(true)
    expect(isLanguage('de')).toBe(false)
  })

  it.each(['es', 'sk'] as const)('%s defines exactly the English keys', (lang) => {
    expect(Object.keys(catalogs[lang]).sort()).toEqual(Object.keys(en).sort())
  })

  it.each(['es', 'sk'] as const)('%s keeps the same {placeholders} as English', (lang) => {
    const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join()
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(vars(catalogs[lang][key]), `${lang}:${key}`).toBe(vars(en[key]))
    }
  })

  it('interpolates params', () => {
    expect(translate('en', 'switcher.with', { name: 'Alex' })).toBe('With Alex')
    expect(translate('es', 'switcher.with', { name: 'Alex' })).toBe('Con Alex')
    expect(translate('sk', 'switcher.with', { name: 'Alex' })).toBe('S Alex')
  })

  it('translates seeded categories by id and leaves unknown ones alone', () => {
    const seed = { id: '00000000-0000-4000-8000-000000000001', name: 'Groceries' }
    expect(categoryLabel('es', seed)).toBe('Supermercado')
    expect(categoryLabel('sk', seed)).toBe('Potraviny')
    expect(categoryLabel('es', { id: 'custom-1', name: 'Pets' })).toBe('Pets')
  })
})
