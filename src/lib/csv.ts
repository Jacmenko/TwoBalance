import { centsToInputString } from '@/lib/money/format'
import type { Category, Expense, Member } from '@/types/domain'

/** Escape a CSV field; also neutralise spreadsheet formula injection. */
export function csvField(value: string): string {
  let v = value
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

export function expensesToCsv(
  expenses: readonly Expense[],
  members: readonly Member[],
  categories: readonly Category[],
): string {
  const memberName = new Map(members.map((m) => [m.id, m.displayName]))
  const catName = new Map(categories.map((c) => [c.id, c.name]))
  const rows = [['Date', 'Description', 'Category', 'Paid by', 'Amount (EUR)']]
  for (const e of expenses) {
    if (e.deletedAt) continue
    rows.push([
      e.expenseDate,
      e.description,
      catName.get(e.categoryId) ?? '',
      memberName.get(e.payerMemberId) ?? '',
      centsToInputString(e.amountCents),
    ])
  }
  // BOM so Excel opens UTF-8 correctly; CRLF per RFC 4180.
  return '﻿' + rows.map((r) => r.map(csvField).join(',')).join('\r\n') + '\r\n'
}
