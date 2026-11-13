import { describe, expect, it } from 'vitest'
import { centsToInputString, formatEur, parseAmountToCents } from '@/lib/money/format'

describe('parseAmountToCents', () => {
  it.each([
    ['10', 1000],
    ['10.5', 1050],
    ['10.50', 1050],
    ['10,5', 1050],
    ['0.01', 1],
    ['  7.05 ', 705],
    ['1000000', 100_000_000],
  ])('parses %s', (input, cents) => {
    expect(parseAmountToCents(input)).toEqual({ ok: true, cents })
  })

  it.each([
    '',
    ' ',
    'abc',
    '-5',
    '+5',
    '1e3',
    '0',
    '0.00',
    '1.234',
    '1,234.50',
    '1..5',
    '.5',
    '5.',
    '1000000.01',
    '12345678901',
  ])('rejects %j', (input) => {
    expect(parseAmountToCents(input).ok).toBe(false)
  })

  it('is exact for values that break floating point', () => {
    expect(parseAmountToCents('1.15')).toEqual({ ok: true, cents: 115 })
    expect(parseAmountToCents('0.29')).toEqual({ ok: true, cents: 29 })
    expect(parseAmountToCents('4.35')).toEqual({ ok: true, cents: 435 })
  })
})

describe('formatEur', () => {
  it('formats zero, positive and negative amounts', () => {
    expect(formatEur(0)).toBe('0.00 €')
    expect(formatEur(4500)).toBe('45.00 €')
    expect(formatEur(12550, { signed: true })).toBe('+125.50 €')
    expect(formatEur(-12550, { signed: true })).toBe('−125.50 €')
    expect(formatEur(0, { signed: true })).toBe('0.00 €')
    expect(formatEur(5)).toBe('0.05 €')
    expect(formatEur(123456789)).toBe('1,234,567.89 €')
  })
  it('round-trips through the input string', () => {
    expect(centsToInputString(1050)).toBe('10.50')
    expect(centsToInputString(5)).toBe('0.05')
  })
})
