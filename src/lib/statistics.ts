import type { Expense } from '@/types/domain'

export interface CategoryTotal {
  categoryId: string
  totalCents: number
  /** 0..100, rounded to one decimal for display only */
  percent: number
}

export interface PayerTotal {
  payerMemberId: string
  totalCents: number
}

export interface Summary {
  totalCents: number
  byCategory: CategoryTotal[]
  byPayer: PayerTotal[]
}

/** Summarise non-deleted expenses. Callers pre-filter by expense_date range. */
export function summarize(expenses: readonly Expense[]): Summary {
  const cat = new Map<string, number>()
  const payer = new Map<string, number>()
  let total = 0
  for (const e of expenses) {
    if (e.deletedAt) continue
    total += e.amountCents
    cat.set(e.categoryId, (cat.get(e.categoryId) ?? 0) + e.amountCents)
    payer.set(e.payerMemberId, (payer.get(e.payerMemberId) ?? 0) + e.amountCents)
  }
  const byCategory = [...cat.entries()]
    .map(([categoryId, totalCents]) => ({
      categoryId,
      totalCents,
      percent: total === 0 ? 0 : Math.round((totalCents * 1000) / total) / 10,
    }))
    .sort((a, b) => b.totalCents - a.totalCents)
  const byPayer = [...payer.entries()]
    .map(([payerMemberId, totalCents]) => ({ payerMemberId, totalCents }))
    .sort((a, b) => b.totalCents - a.totalCents)
  return { totalCents: total, byCategory, byPayer }
}
