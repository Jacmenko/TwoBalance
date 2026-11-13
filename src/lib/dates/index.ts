// Date helpers. Expense dates are calendar dates ("YYYY-MM-DD") and are never
// converted through UTC timestamps, so they cannot shift by a day.

import { getLocale } from '@/i18n/core'

const pad = (n: number) => String(n).padStart(2, '0')

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Today's date in the device's local timezone. */
export function todayISO(now: Date = new Date()): string {
  return toISODate(now)
}

export function isValidISODate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const dt = new Date(y, mo - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d
}

export interface DateRange {
  from: string
  to: string // inclusive
}

export type RangePreset = 'this-month' | 'last-month' | 'last-30' | 'this-year' | 'custom'

export function presetRange(
  preset: Exclude<RangePreset, 'custom'>,
  now: Date = new Date(),
): DateRange {
  const y = now.getFullYear()
  const m = now.getMonth()
  switch (preset) {
    case 'this-month':
      return { from: toISODate(new Date(y, m, 1)), to: toISODate(new Date(y, m + 1, 0)) }
    case 'last-month':
      return { from: toISODate(new Date(y, m - 1, 1)), to: toISODate(new Date(y, m, 0)) }
    case 'last-30':
      return {
        from: toISODate(new Date(y, now.getMonth(), now.getDate() - 29)),
        to: toISODate(now),
      }
    case 'this-year':
      return { from: `${y}-01-01`, to: `${y}-12-31` }
  }
}

/** Format "2026-03-05" in the app language's locale, without timezone shifts. */
export function formatDate(iso: string, locale: string = getLocale()): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return iso
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
}
