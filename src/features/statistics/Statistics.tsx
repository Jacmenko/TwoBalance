import { useMemo, useState } from 'react'
import {
  EmptyState,
  ErrorState,
  InlineError,
  PageHeader,
  Spinner,
  inputClass,
} from '@/components/ui'
import { useSpace } from '@/features/shared-space/SpaceProvider'
import { useAllExpenses, useCategories } from '@/features/queries'
import { presetRange, type RangePreset } from '@/lib/dates'
import { formatEur } from '@/lib/money/format'
import { summarize } from '@/lib/statistics'
import { toAppError } from '@/services/errors'

const PRESETS: { id: RangePreset; label: string }[] = [
  { id: 'this-month', label: 'This month' },
  { id: 'last-month', label: 'Last month' },
  { id: 'last-30', label: 'Last 30 days' },
  { id: 'this-year', label: 'This year' },
  { id: 'custom', label: 'Custom' },
]

export function Statistics() {
  const { space, memberName } = useSpace()
  const cats = useCategories()
  const [preset, setPreset] = useState<RangePreset>('this-month')
  const [custom, setCustom] = useState(() => presetRange('this-month'))

  const range = preset === 'custom' ? custom : presetRange(preset)
  const rangeInvalid = !range.from || !range.to || range.from > range.to
  const q = useAllExpenses(space.coupleId, rangeInvalid ? { from: '9999-12-31' } : range)
  const summary = useMemo(() => summarize(q.data ?? []), [q.data])
  const catName = (id: string) => cats.data?.find((c) => c.id === id)?.name ?? 'Unknown'

  return (
    <>
      <PageHeader title="Statistics" />

      <div role="radiogroup" aria-label="Period" className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={preset === p.id}
            onClick={() => setPreset(p.id)}
            className={`min-h-11 rounded-full px-4 text-sm font-semibold ring-1 ${
              preset === p.id
                ? 'bg-emerald-700 text-white ring-emerald-700'
                : 'bg-white text-slate-700 ring-slate-300'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === 'custom' && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-sm font-medium text-slate-700">
            From
            <input
              type="date"
              className={`${inputClass} mt-1`}
              value={custom.from}
              onChange={(e) => setCustom({ ...custom, from: e.target.value })}
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            To
            <input
              type="date"
              className={`${inputClass} mt-1`}
              value={custom.to}
              onChange={(e) => setCustom({ ...custom, to: e.target.value })}
            />
          </label>
        </div>
      )}
      <InlineError
        message={rangeInvalid ? 'Choose a valid range: "From" must be on or before "To".' : null}
      />
      <p className="mt-2 text-sm text-slate-500">
        {range.from} → {range.to}
      </p>

      <div className="mt-4">
        {q.isPending ? (
          <Spinner />
        ) : q.isError ? (
          <ErrorState message={toAppError(q.error).message} onRetry={() => void q.refetch()} />
        ) : summary.totalCents === 0 ? (
          <EmptyState
            title="No spending in this period"
            hint="Pick another period or add an expense."
          />
        ) : (
          <div className="space-y-6">
            <section className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
              <h2 className="text-sm font-medium text-slate-600">Total shared spending</h2>
              <p className="mt-1 text-4xl font-bold tabular-nums">
                {formatEur(summary.totalCents)}
              </p>
            </section>

            <section aria-labelledby="by-cat">
              <h2 id="by-cat" className="mb-3 text-lg font-bold">
                By category
              </h2>
              <ul className="space-y-3">
                {summary.byCategory.map((c) => (
                  <li key={c.categoryId} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-semibold">{catName(c.categoryId)}</span>
                      <span className="tabular-nums">
                        {formatEur(c.totalCents)}{' '}
                        <span className="text-slate-500">· {c.percent}%</span>
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                      <div
                        className="h-full rounded-full bg-emerald-600"
                        style={{ width: `${c.percent}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="by-payer">
              <h2 id="by-payer" className="mb-3 text-lg font-bold">
                Paid by
              </h2>
              <ul className="space-y-2">
                {summary.byPayer.map((p) => (
                  <li
                    key={p.payerMemberId}
                    className="flex justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200"
                  >
                    <span className="font-semibold">{memberName(p.payerMemberId)}</span>
                    <span className="tabular-nums">{formatEur(p.totalCents)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>
    </>
  )
}
