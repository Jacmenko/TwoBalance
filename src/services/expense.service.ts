import { supabase } from '@/lib/supabase/client'
import type { Category, Expense, ExpenseFilters, ExpenseInput } from '@/types/domain'
import type { PaidTotals } from '@/lib/money/calculations'
import { unwrap } from './errors'

interface ExpenseRow {
  id: string
  couple_id: string
  payer_member_id: string
  category_id: string
  amount_cents: number
  description: string
  expense_date: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

const COLUMNS =
  'id, couple_id, payer_member_id, category_id, amount_cents, description, expense_date, created_at, updated_at, deleted_at'

const toExpense = (r: ExpenseRow): Expense => ({
  id: r.id,
  coupleId: r.couple_id,
  payerMemberId: r.payer_member_id,
  categoryId: r.category_id,
  amountCents: Number(r.amount_cents),
  description: r.description,
  expenseDate: r.expense_date,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  deletedAt: r.deleted_at,
})

/** History screen page size; the UI says when it's hit (export has everything). */
export const LIST_LIMIT = 300

export async function listCategories(): Promise<Category[]> {
  const rows = await unwrap<
    { id: string; name: string; icon: string | null; sort_order: number }[]
  >(
    supabase
      .from('categories')
      .select('id, name, icon, sort_order')
      .eq('active', true)
      .order('sort_order'),
  )
  return rows.map((r) => ({ id: r.id, name: r.name, icon: r.icon, sortOrder: r.sort_order }))
}

/** Non-deleted expenses, newest first. Filters by expense_date (not created_at). */
export async function listExpenses(
  filters: ExpenseFilters = {},
  limit: number = LIST_LIMIT,
): Promise<Expense[]> {
  let q = supabase.from('expenses').select(COLUMNS).is('deleted_at', null)
  if (filters.from) q = q.gte('expense_date', filters.from)
  if (filters.to) q = q.lte('expense_date', filters.to)
  if (filters.payerMemberId) q = q.eq('payer_member_id', filters.payerMemberId)
  if (filters.categoryId) q = q.eq('category_id', filters.categoryId)
  const rows = await unwrap<ExpenseRow[]>(
    q
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit),
  )
  return rows.map(toExpense)
}

/** All matching expenses, paged past the API's per-request row cap. */
export async function listAllExpenses(filters: ExpenseFilters = {}): Promise<Expense[]> {
  const PAGE = 1000
  const out: Expense[] = []
  for (let offset = 0; ; offset += PAGE) {
    let q = supabase.from('expenses').select(COLUMNS).is('deleted_at', null)
    if (filters.from) q = q.gte('expense_date', filters.from)
    if (filters.to) q = q.lte('expense_date', filters.to)
    if (filters.payerMemberId) q = q.eq('payer_member_id', filters.payerMemberId)
    if (filters.categoryId) q = q.eq('category_id', filters.categoryId)
    const rows = await unwrap<ExpenseRow[]>(
      q
        .order('expense_date', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id')
        .range(offset, offset + PAGE - 1),
    )
    out.push(...rows.map(toExpense))
    if (rows.length < PAGE) return out
  }
}

export async function getExpense(id: string): Promise<Expense | null> {
  const row = await unwrap<ExpenseRow | null>(
    supabase.from('expenses').select(COLUMNS).eq('id', id).is('deleted_at', null).maybeSingle(),
  )
  return row ? toExpense(row) : null
}

export async function createExpense(
  coupleId: string,
  payerMemberId: string,
  input: ExpenseInput,
): Promise<Expense> {
  const row = await unwrap<ExpenseRow>(
    supabase
      .from('expenses')
      .insert({
        couple_id: coupleId,
        payer_member_id: payerMemberId,
        category_id: input.categoryId,
        amount_cents: input.amountCents,
        description: input.description.trim(),
        expense_date: input.expenseDate,
      })
      .select(COLUMNS)
      .single(),
  )
  return toExpense(row)
}

/** The payer is deliberately not editable: it is never changed silently. */
export async function updateExpense(id: string, input: ExpenseInput): Promise<Expense> {
  const row = await unwrap<ExpenseRow>(
    supabase
      .from('expenses')
      .update({
        category_id: input.categoryId,
        amount_cents: input.amountCents,
        description: input.description.trim(),
        expense_date: input.expenseDate,
      })
      .eq('id', id)
      .is('deleted_at', null)
      .select(COLUMNS)
      .single(),
  )
  return toExpense(row)
}

/** Soft delete. Every read path filters deleted_at IS NULL. */
export async function deleteExpense(id: string): Promise<void> {
  await unwrap(
    supabase
      .from('expenses')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)
      .select('id')
      .single(),
  )
}

/** Totals paid per side, aggregated in the database; balance is derived client-side. */
export async function fetchPaidTotals(myMemberId: string): Promise<PaidTotals> {
  const rows = await unwrap<{ payer_member_id: string; total_paid_cents: number }[]>(
    supabase.rpc('paid_totals'),
  )
  let mine = 0
  let other = 0
  for (const r of rows) {
    if (r.payer_member_id === myMemberId) mine += Number(r.total_paid_cents)
    else other += Number(r.total_paid_cents)
  }
  return { mine, other }
}
