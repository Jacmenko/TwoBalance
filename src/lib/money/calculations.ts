// Balance logic for a two-person, 50/50 shared ledger. Integer arithmetic only.
//
// Rounding policy (documented in README):
//   The exact balance of a member is (paidByMe - paidByOther) / 2 cents.
//   We keep it internally as an integer number of HALF-cents
//   (`balanceHalfCents = paidByMe - paidByOther`), so nothing is rounded per
//   expense and no error accumulates. For display it is converted to whole
//   cents ONCE, rounding exact halves AWAY FROM ZERO. Because that rule is
//   symmetric (round(-x) = -round(x)), member B's displayed balance is always
//   the exact negative of member A's.

export interface ExpenseLike {
  payerMemberId: string
  amountCents: number
  deletedAt?: string | null
}

export interface PaidTotals {
  /** Sum of cents paid by the current member. */
  mine: number
  /** Sum of cents paid by the other member. */
  other: number
}

/** Sum non-deleted expenses per side. */
export function paidTotals(expenses: readonly ExpenseLike[], myMemberId: string): PaidTotals {
  let mine = 0
  let other = 0
  for (const e of expenses) {
    if (e.deletedAt) continue
    if (e.payerMemberId === myMemberId) mine += e.amountCents
    else other += e.amountCents
  }
  return { mine, other }
}

/** Balance in half-cents (positive => the member is owed money). */
export function balanceHalfCents(totals: PaidTotals): number {
  return totals.mine - totals.other
}

/** Half-cents -> whole cents, exact halves rounded away from zero. */
export function halfCentsToCents(half: number): number {
  const abs = Math.abs(half)
  const cents = Math.floor((abs + 1) / 2)
  return half < 0 ? -cents : cents
}

/** Displayed balance in cents for the current member. */
export function balanceCents(totals: PaidTotals): number {
  return halfCentsToCents(balanceHalfCents(totals))
}

export function balanceFromExpenses(expenses: readonly ExpenseLike[], myMemberId: string): number {
  return balanceCents(paidTotals(expenses, myMemberId))
}

export type BalanceState = 'positive' | 'negative' | 'zero'

export function balanceState(cents: number): BalanceState {
  return cents > 0 ? 'positive' : cents < 0 ? 'negative' : 'zero'
}
