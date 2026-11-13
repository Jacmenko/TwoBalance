import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { ExpenseFilters } from '@/types/domain'
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

export const useCategories = () =>
  useQuery({ queryKey: ['categories'], queryFn: listCategories, staleTime: Infinity })

export const useExpenseList = (filters: ExpenseFilters, limit: number) =>
  useQuery({
    queryKey: ['expenses', 'list', filters, limit],
    queryFn: () => listExpenses(filters, limit),
  })

export const useAllExpenses = (filters: ExpenseFilters) =>
  useQuery({ queryKey: ['expenses', 'all', filters], queryFn: () => listAllExpenses(filters) })

export const useExpense = (id: string) =>
  useQuery({ queryKey: ['expense', id], queryFn: () => getExpense(id) })

export const usePaidTotals = (myMemberId: string) =>
  useQuery({ queryKey: ['totals', myMemberId], queryFn: () => fetchPaidTotals(myMemberId) })
