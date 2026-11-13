import { balanceState } from '@/lib/money/calculations'
import { formatEur } from '@/lib/money/format'

const STYLES = {
  positive: 'bg-emerald-100 border-emerald-300 text-emerald-950',
  negative: 'bg-rose-100 border-rose-300 text-rose-950',
  zero: 'bg-slate-100 border-slate-200 text-slate-900',
} as const

/** The ONE personal balance card. Shows only the current user's balance. */
export function BalanceCard({ cents }: { cents: number }) {
  const state = balanceState(cents)
  const status =
    state === 'positive'
      ? `You are owed ${formatEur(cents)}`
      : state === 'negative'
        ? `You owe ${formatEur(-cents)}`
        : "You're all settled."
  return (
    <section
      aria-label="Your balance"
      data-state={state}
      className={`rounded-3xl border p-6 ${STYLES[state]}`}
    >
      <h2 className="text-sm font-medium opacity-80">Your balance</h2>
      <p className="mt-3 text-5xl font-bold tracking-tight tabular-nums">
        {formatEur(cents, { signed: true })}
      </p>
      <p role="status" className="mt-2 text-base font-medium">
        {status}
      </p>
    </section>
  )
}
