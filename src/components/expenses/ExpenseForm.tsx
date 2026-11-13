import { useState, type FormEvent } from 'react'
import { Button, Field, InlineError, inputClass } from '@/components/ui'
import { isValidISODate, todayISO } from '@/lib/dates'
import { centsToInputString, parseAmountToCents } from '@/lib/money/format'
import { useI18n } from '@/i18n/I18nProvider'
import type { Category, Expense, ExpenseInput } from '@/types/domain'

interface Props {
  categories: Category[]
  payerName: string
  /** Single-person space: no payer and no split to show. */
  solo?: boolean
  initial?: Expense
  submitLabel: string
  onSubmit: (input: ExpenseInput) => Promise<void>
  onDelete?: () => void
}

export function ExpenseForm({
  categories,
  payerName,
  solo = false,
  initial,
  submitLabel,
  onSubmit,
  onDelete,
}: Props) {
  const { t } = useI18n()
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
    if (desc.length > 120) errs.description = t('expense.errDescription')
    if (!categoryId) errs.category = t('expense.errCategory')
    if (!isValidISODate(date)) errs.date = t('expense.errDate')
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
      <Field label={t('expense.amount')} htmlFor="amount" error={errors.amount}>
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
      <Field label={t('expense.description')} htmlFor="description" error={errors.description}>
        <input
          id="description"
          className={inputClass}
          maxLength={120}
          placeholder={t('expense.descriptionPlaceholder')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-invalid={!!errors.description}
        />
      </Field>
      <Field label={t('expense.category')} htmlFor="category" error={errors.category}>
        <select
          id="category"
          className={inputClass}
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          aria-invalid={!!errors.category}
        >
          <option value="">{t('expense.selectCategory')}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t('expense.date')} htmlFor="date" error={errors.date}>
        <input
          id="date"
          type="date"
          className={inputClass}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-invalid={!!errors.date}
        />
      </Field>
      {!solo && (
        <>
          <div>
            <span className="mb-1 block text-sm font-medium text-slate-700">
              {t('expense.paidBy')}
            </span>
            <p className="flex min-h-12 items-center rounded-xl bg-slate-100 px-4 text-slate-800">
              {payerName}
            </p>
          </div>
          <p className="text-sm text-slate-500">{t('expense.split')}</p>
        </>
      )}

      <InlineError message={submitError} />
      <Button type="submit" full disabled={busy}>
        {busy ? t('common.saving') : submitLabel}
      </Button>
      {onDelete && (
        <Button variant="ghost" full className="text-rose-700" onClick={onDelete} disabled={busy}>
          {t('expense.delete')}
        </Button>
      )}
    </form>
  )
}
