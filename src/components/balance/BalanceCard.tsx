import { balanceState } from '@/lib/money/calculations'
import { formatEur } from '@/lib/money/format'
import { useI18n } from '@/i18n/I18nProvider'

const STYLES = {
  positive: 'bg-emerald-100 border-emerald-300 text-emerald-950',
  negative: 'bg-rose-100 border-rose-300 text-rose-950',
  zero: 'bg-slate-100 border-slate-200 text-slate-900',
} as const

/** Solo spaces have nobody to split with, so show plain spending instead of a balance. */
export function SpentCard({ cents }: { cents: number }) {
  const { t } = useI18n()
  return (
    <section
      aria-label={t('balance.totalSpent')}
      className="rounded-3xl border border-slate-200 bg-slate-100 p-6 text-slate-900"
    >
      <h2 className="text-sm font-medium opacity-80">{t('balance.totalSpent')}</h2>
      <p className="mt-3 text-5xl font-bold tracking-tight tabular-nums">{formatEur(cents)}</p>
    </section>
  )
}

/** The ONE personal balance card. Shows only the current user's balance. */
export function BalanceCard({ cents }: { cents: number }) {
  const { t } = useI18n()
  const state = balanceState(cents)
  const status =
    state === 'positive'
      ? t('balance.owed', { amount: formatEur(cents) })
      : state === 'negative'
        ? t('balance.owe', { amount: formatEur(-cents) })
        : t('balance.settled')
  return (
    <section
      aria-label={t('balance.yourBalance')}
      data-state={state}
      className={`rounded-3xl border p-6 ${STYLES[state]}`}
    >
      <h2 className="text-sm font-medium opacity-80">{t('balance.yourBalance')}</h2>
      <p className="mt-3 text-5xl font-bold tracking-tight tabular-nums">
        {formatEur(cents, { signed: true })}
      </p>
      <p role="status" className="mt-2 text-base font-medium">
        {status}
      </p>
    </section>
  )
}
