import { useState } from 'react'
import { ExpenseRow } from '@/components/expenses/ExpenseRow'
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  InlineError,
  PageHeader,
  Spinner,
  inputClass,
} from '@/components/ui'
import { useSpace } from '@/features/shared-space/SpaceProvider'
import { useCategories, useExpenseList } from '@/features/queries'
import { expensesToCsv } from '@/lib/csv'
import { todayISO } from '@/lib/dates'
import { listAllExpenses, LIST_LIMIT } from '@/services/expense.service'
import { toAppError } from '@/services/errors'
import type { ExpenseFilters } from '@/types/domain'
import { Link } from 'react-router-dom'
import { useI18n } from '@/i18n/I18nProvider'

export function History() {
  const { t } = useI18n()
  const { space, memberName } = useSpace()
  const cats = useCategories()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [payer, setPayer] = useState('')
  const [category, setCategory] = useState('')
  const [exporting, setExporting] = useState(false)
  const [confirmingExport, setConfirmingExport] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const rangeInvalid = !!from && !!to && from > to
  const filters: ExpenseFilters = {
    from: from || undefined,
    to: to || undefined,
    payerMemberId: payer || undefined,
    categoryId: category || undefined,
  }
  const list = useExpenseList(
    space.coupleId,
    rangeInvalid ? { from: '9999-12-31' } : filters,
    LIST_LIMIT,
  )
  const hasFilters = !!(from || to || payer || category)
  const catName = (id: string) => cats.data?.find((c) => c.id === id)?.name ?? '—'

  async function exportCsv() {
    setExporting(true)
    setExportError(null)
    try {
      const all = await listAllExpenses(space.coupleId)
      const members = [space.me, ...(space.partner ? [space.partner] : [])]
      const csv = expensesToCsv(all, members, cats.data ?? [])
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `twobalance-expenses-${todayISO()}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) {
      setExportError(toAppError(e).message)
    } finally {
      setExporting(false)
      setConfirmingExport(false)
    }
  }

  return (
    <>
      <PageHeader title={t('history.title')} />

      <section
        aria-label={t('history.filters')}
        className="grid grid-cols-2 gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200"
      >
        <label className="min-w-0 text-sm font-medium text-slate-700">
          {t('history.from')}
          <input
            type="date"
            className={`${inputClass} mt-1`}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="min-w-0 text-sm font-medium text-slate-700">
          {t('history.to')}
          <input
            type="date"
            className={`${inputClass} mt-1`}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        {!space.solo && (
          <label className="min-w-0 text-sm font-medium text-slate-700">
            {t('history.paidBy')}
            <select
              className={`${inputClass} mt-1`}
              value={payer}
              onChange={(e) => setPayer(e.target.value)}
            >
              <option value="">{t('history.everyone')}</option>
              <option value={space.me.id}>{t('common.you')}</option>
              {space.partner && (
                <option value={space.partner.id}>{space.partner.displayName}</option>
              )}
            </select>
          </label>
        )}
        <label
          className={`min-w-0 text-sm font-medium text-slate-700 ${space.solo ? 'col-span-2' : ''}`}
        >
          {t('history.category')}
          <select
            className={`${inputClass} mt-1`}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">{t('history.allCategories')}</option>
            {cats.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <div className="col-span-2">
          <InlineError message={rangeInvalid ? t('history.rangeInvalid') : null} />
          {hasFilters && (
            <Button
              variant="ghost"
              onClick={() => {
                setFrom('')
                setTo('')
                setPayer('')
                setCategory('')
              }}
            >
              {t('history.clear')}
            </Button>
          )}
        </div>
      </section>

      <div className="mt-5">
        {list.isPending ? (
          <Spinner />
        ) : list.isError ? (
          <ErrorState
            message={toAppError(list.error).message}
            onRetry={() => void list.refetch()}
          />
        ) : list.data.length === 0 ? (
          <EmptyState
            title={hasFilters ? t('history.noMatch') : t('history.none')}
            hint={hasFilters ? t('history.noMatchHint') : t('history.noneHint')}
            action={
              !hasFilters && (
                <Link to="/expense/new" className="font-semibold text-emerald-800 underline">
                  {t('app.addExpense')}
                </Link>
              )
            }
          />
        ) : (
          <>
            <ul className="space-y-2">
              {list.data.map((e) => (
                <ExpenseRow
                  key={e.id}
                  expense={e}
                  payerName={memberName(e.payerMemberId)}
                  categoryName={catName(e.categoryId)}
                />
              ))}
            </ul>
            {list.data.length >= LIST_LIMIT && (
              <p className="mt-3 text-center text-sm text-slate-500">
                {t('history.limit', { n: LIST_LIMIT })}
              </p>
            )}
          </>
        )}
      </div>

      <div className="mt-6">
        <Button
          variant="secondary"
          full
          onClick={() => setConfirmingExport(true)}
          disabled={exporting}
        >
          {exporting ? t('history.exporting') : t('history.export')}
        </Button>
        <InlineError message={exportError} />
        {confirmingExport && (
          <ConfirmDialog
            title={t('history.exportConfirm.title')}
            message={t('history.exportConfirm.message')}
            confirmLabel={t('history.exportConfirm.confirm')}
            busyLabel={t('history.exporting')}
            tone="primary"
            busy={exporting}
            onConfirm={() => void exportCsv()}
            onCancel={() => setConfirmingExport(false)}
          />
        )}
      </div>
    </>
  )
}
