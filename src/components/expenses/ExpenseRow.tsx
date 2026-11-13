import { Link } from 'react-router-dom'
import { formatDate } from '@/lib/dates'
import { formatEur } from '@/lib/money/format'
import type { Expense } from '@/types/domain'

export function ExpenseRow({
  expense,
  payerName,
  categoryName,
  showDate = true,
}: {
  expense: Expense
  payerName: string
  categoryName: string
  showDate?: boolean
}) {
  return (
    <li>
      <Link
        to={`/expense/${expense.id}`}
        className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
      >
        <span className="min-w-0">
          <span className="block truncate font-semibold">
            {expense.description || categoryName}
          </span>
          <span className="block truncate text-sm text-slate-600">
            {payerName}
            {expense.description && ` · ${categoryName}`}
            {showDate && ` · ${formatDate(expense.expenseDate)}`}
          </span>
        </span>
        <span className="shrink-0 font-semibold tabular-nums">
          {formatEur(expense.amountCents)}
        </span>
      </Link>
    </li>
  )
}
