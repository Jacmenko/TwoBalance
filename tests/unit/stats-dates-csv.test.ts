import { describe, expect, it } from 'vitest'
import { summarize } from '@/lib/statistics'
import { isValidISODate, presetRange, todayISO } from '@/lib/dates'
import { csvField, expensesToCsv } from '@/lib/csv'
import type { Category, Expense, Member } from '@/types/domain'

const mk = (over: Partial<Expense>): Expense => ({
  id: Math.random().toString(),
  coupleId: 'c',
  payerMemberId: 'a',
  categoryId: 'food',
  amountCents: 1000,
  description: 'x',
  expenseDate: '2026-03-10',
  createdAt: '',
  updatedAt: '',
  deletedAt: null,
  ...over,
})

describe('summarize', () => {
  it('totals, categories and payers add up; deleted excluded', () => {
    const s = summarize([
      mk({ amountCents: 3000, categoryId: 'food', payerMemberId: 'a' }),
      mk({ amountCents: 1000, categoryId: 'fun', payerMemberId: 'b' }),
      mk({ amountCents: 999999, categoryId: 'fun', deletedAt: 'now' }),
    ])
    expect(s.totalCents).toBe(4000)
    expect(s.byCategory.reduce((n, c) => n + c.totalCents, 0)).toBe(4000)
    expect(s.byPayer.reduce((n, p) => n + p.totalCents, 0)).toBe(4000)
    expect(s.byCategory[0]).toEqual({ categoryId: 'food', totalCents: 3000, percent: 75 })
  })
  it('handles empty input', () => {
    expect(summarize([])).toEqual({ totalCents: 0, byCategory: [], byPayer: [] })
  })
})

describe('dates', () => {
  it('validates ISO dates', () => {
    expect(isValidISODate('2026-02-28')).toBe(true)
    expect(isValidISODate('2026-02-30')).toBe(false)
    expect(isValidISODate('2026-2-3')).toBe(false)
    expect(isValidISODate('nope')).toBe(false)
  })
  it('computes calendar-month presets', () => {
    const now = new Date(2026, 2, 15) // 15 Mar 2026
    expect(presetRange('this-month', now)).toEqual({ from: '2026-03-01', to: '2026-03-31' })
    expect(presetRange('last-month', now)).toEqual({ from: '2026-02-01', to: '2026-02-28' })
    expect(presetRange('this-year', now)).toEqual({ from: '2026-01-01', to: '2026-12-31' })
    expect(presetRange('last-30', now)).toEqual({ from: '2026-02-14', to: '2026-03-15' })
  })
  it('todayISO uses local date parts', () => {
    expect(todayISO(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
})

describe('csv', () => {
  it('escapes fields and neutralises formulas', () => {
    expect(csvField('a,b')).toBe('"a,b"')
    expect(csvField('say "hi"')).toBe('"say ""hi"""')
    expect(csvField('=SUM(A1)')).toBe("'=SUM(A1)")
  })
  it('exports non-deleted rows with names and amounts', () => {
    const members: Member[] = [{ id: 'a', coupleId: 'c', userId: 'u', displayName: 'Alice' }]
    const cats: Category[] = [{ id: 'food', name: 'Groceries', icon: null, sortOrder: 1 }]
    const csv = expensesToCsv(
      [mk({ description: 'Milk, eggs', amountCents: 1050 }), mk({ deletedAt: 'x' })],
      members,
      cats,
    )
    expect(csv).toContain('Date,Description,Category,Paid by,Amount (EUR)')
    expect(csv).toContain('2026-03-10,"Milk, eggs",Groceries,Alice,10.50')
    expect(csv.split('\r\n').filter(Boolean)).toHaveLength(2)
  })
})
