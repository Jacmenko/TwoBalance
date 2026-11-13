import { describe, expect, it } from 'vitest'
import {
  balanceFromExpenses,
  balanceHalfCents,
  balanceState,
  halfCentsToCents,
  paidTotals,
  type ExpenseLike,
} from '@/lib/money/calculations'

const A = 'member-a'
const B = 'member-b'
const exp = (payer: string, amountCents: number, deletedAt: string | null = null): ExpenseLike => ({
  payerMemberId: payer,
  amountCents,
  deletedAt,
})
const balances = (list: ExpenseLike[]) => ({
  a: balanceFromExpenses(list, A),
  b: balanceFromExpenses(list, B),
})

describe('balance (50/50 split)', () => {
  it('no expenses -> both zero', () => {
    expect(balances([])).toEqual({ a: 0, b: 0 })
  })

  it('follows the spec example table', () => {
    const list: ExpenseLike[] = []
    list.push(exp(A, 1000))
    expect(balances(list)).toEqual({ a: 500, b: -500 })
    list.push(exp(B, 2000))
    expect(balances(list)).toEqual({ a: -500, b: 500 })
    list.push(exp(A, 3000))
    expect(balances(list)).toEqual({ a: 1000, b: -1000 })
  })

  it('handles multiple expenses by the same member', () => {
    expect(balances([exp(A, 1000), exp(A, 2000), exp(A, 500)])).toEqual({ a: 1750, b: -1750 })
  })

  it('editing an expense changes the balance', () => {
    const before = [exp(A, 1000)]
    const after = [exp(A, 2000)]
    expect(balanceFromExpenses(before, A)).toBe(500)
    expect(balanceFromExpenses(after, A)).toBe(1000)
  })

  it('deleted expenses are ignored', () => {
    const list = [exp(A, 1000), exp(A, 9999, '2026-01-01T00:00:00Z')]
    expect(balances(list)).toEqual({ a: 500, b: -500 })
    expect(paidTotals(list, A)).toEqual({ mine: 1000, other: 0 })
  })

  it('same expense paid by self and other cancel out', () => {
    expect(balances([exp(A, 1234), exp(B, 1234)])).toEqual({ a: 0, b: 0 })
  })
})

describe('odd-cent rounding (half away from zero, applied once)', () => {
  it('rounds exact halves away from zero', () => {
    expect(halfCentsToCents(1)).toBe(1)
    expect(halfCentsToCents(-1)).toBe(-1)
    expect(halfCentsToCents(2)).toBe(1)
    expect(halfCentsToCents(3)).toBe(2)
    expect(halfCentsToCents(-3)).toBe(-2)
    expect(halfCentsToCents(0)).toBe(0)
  })

  it('A pays 0.01 -> A +0.01, B -0.01', () => {
    expect(balances([exp(A, 1)])).toEqual({ a: 1, b: -1 })
  })

  it('does not accumulate per-expense rounding error', () => {
    // 100 odd-cent expenses of 1 cent by A: exact balance is 50 cents, not 100.
    const list = Array.from({ length: 100 }, () => exp(A, 1))
    expect(balanceHalfCents(paidTotals(list, A))).toBe(100)
    expect(balanceFromExpenses(list, A)).toBe(50)
  })

  it('both balances always sum to zero', () => {
    for (let i = 0; i < 500; i++) {
      const list = Array.from({ length: 1 + (i % 7) }, (_, j) =>
        exp((i + j) % 3 === 0 ? B : A, 1 + ((i * 7919 + j * 104729) % 100000)),
      )
      const { a, b } = balances(list)
      expect(a + b).toBe(0)
    }
  })
})

describe('balanceState', () => {
  it('classifies', () => {
    expect(balanceState(1)).toBe('positive')
    expect(balanceState(-1)).toBe('negative')
    expect(balanceState(0)).toBe('zero')
  })
})
