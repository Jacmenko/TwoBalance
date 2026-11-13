import { useState, type FormEvent } from 'react'
import { Button, Field, InlineError, inputClass } from '@/components/ui'
import { isValidISODate, todayISO } from '@/lib/dates'
import { centsToInputString, parseAmountToCents } from '@/lib/money/format'
import type { Category, Expense, ExpenseInput } from '@/types/domain'

interface Props {
  categories: Category[]
  payerName: string
  initial?: Expense
  submitLabel: string
  onSubmit: (input: ExpenseInput) => Promise<void>
  onDelete?: () => void
}

export function ExpenseForm({
  categories,
  payerName,
  initial,
  submitLabel,
  onSubmit,
  onDelete,
}: Props) {
  const [amount, setAmount] = useState(initial ? centsToInputString(initial.amountCents) : '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '')
  const [date, setDate] = useState(initial?.expenseDate ?? todayISO())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    const errs: Record<string, string> = {}
    const parsed = parseAmountToCents(amount)
    if (!parsed.ok) errs.amount = parsed.error
    const desc = description.trim()
    if (desc.length > 120) errs.description = 'Keep the description under 120 characters.'
    if (!categoryId) errs.category = 'Choose a category.'
    if (!isValidISODate(date)) errs.date = 'Enter a valid date.'
    setErrors(errs)
    if (Object.keys(errs).length || !parsed.ok) return

    setBusy(true)
    try {
      await onSubmit({
        amountCents: parsed.cents,
        description: desc,
        categoryId,
        expenseDate: date,
      })
    } catch (err) {
      setSubmitError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field label="Amount (€)" htmlFor="amount" error={errors.amount}>
        <input
          id="amount"
          className={`${inputClass} text-2xl font-semibold tabular-nums`}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-invalid={!!errors.amount}
          autoFocus={!initial}
        />
      </Field>
      <Field label="Description (optional)" htmlFor="description" error={errors.description}>
        <input
          id="description"
          className={inputClass}
          maxLength={120}
          placeholder="e.g. Groceries"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-invalid={!!errors.description}
        />
      </Field>
      <Field label="Category" htmlFor="category" error={errors.category}>
        <select
          id="category"
          className={inputClass}
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          aria-invalid={!!errors.category}
        >
          <option value="">Select a category…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Date" htmlFor="date" error={errors.date}>
        <input
          id="date"
          type="date"
          className={inputClass}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-invalid={!!errors.date}
        />
      </Field>
      <div>
        <span className="mb-1 block text-sm font-medium text-slate-700">Paid by</span>
        <p className="flex min-h-12 items-center rounded-xl bg-slate-100 px-4 text-slate-800">
          {payerName}
        </p>
      </div>
      <p className="text-sm text-slate-500">Split 50/50 between you and your partner.</p>

      <InlineError message={submitError} />
      <Button type="submit" full disabled={busy}>
        {busy ? 'Saving…' : submitLabel}
      </Button>
      {onDelete && (
        <Button variant="ghost" full className="text-rose-700" onClick={onDelete} disabled={busy}>
          Delete expense
        </Button>
      )}
    </form>
  )
}
