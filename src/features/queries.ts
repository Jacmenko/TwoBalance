import { useCallback } from 'react'
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { categoryLabel } from '@/i18n/core'
import { useI18n } from '@/i18n/I18nProvider'
import type { Category, ExpenseFilters } from '@/types/domain'
import {
  fetchPaidTotals,
  getExpense,
  listAllExpenses,
  listCategories,
  listExpenses,
} from '@/services/expense.service'

/** Everything derived from the ledger. Call after any successful mutation. */
export function invalidateLedger(qc: QueryClient) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: ['expenses'] }),
    qc.invalidateQueries({ queryKey: ['expense'] }),
    qc.invalidateQueries({ queryKey: ['totals'] }),
  ])
}

export function useInvalidateLedger() {
  const qc = useQueryClient()
  return () => invalidateLedger(qc)
}

/** Categories with names shown in the active language (the cache keeps the DB originals). */
export function useCategories() {
  const { language } = useI18n()
  const select = useCallback(
    (cats: Category[]) => cats.map((c) => ({ ...c, name: categoryLabel(language, c) })),
    [language],
  )
  return useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
    staleTime: Infinity,
    select,
  })
}

export const useExpenseList = (coupleId: string, filters: ExpenseFilters, limit: number) =>
  useQuery({
    queryKey: ['expenses', 'list', coupleId, filters, limit],
    queryFn: () => listExpenses(coupleId, filters, limit),
  })

export const useAllExpenses = (coupleId: string, filters: ExpenseFilters) =>
  useQuery({
    queryKey: ['expenses', 'all', coupleId, filters],
    queryFn: () => listAllExpenses(coupleId, filters),
  })

export const useExpense = (coupleId: string, id: string) =>
  useQuery({ queryKey: ['expense', coupleId, id], queryFn: () => getExpense(coupleId, id) })

export const usePaidTotals = (coupleId: string, myMemberId: string) =>
  useQuery({
    queryKey: ['totals', coupleId, myMemberId],
    queryFn: () => fetchPaidTotals(coupleId, myMemberId),
  })
