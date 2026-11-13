import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BalanceCard, SpentCard } from '@/components/balance/BalanceCard'
import { ExpenseRow } from '@/components/expenses/ExpenseRow'
import { Button, EmptyState, ErrorState, Spinner } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthProvider'
import { useSpace } from '@/features/shared-space/SpaceProvider'
import { SpaceSwitcher } from '@/features/shared-space/SpaceSwitcher'
import { InviteCode } from '@/features/shared-space/InviteReveal'
import { useCategories, useExpenseList, usePaidTotals } from '@/features/queries'
import { balanceCents } from '@/lib/money/calculations'
import { regenerateInvite } from '@/services/couple.service'
import { toAppError } from '@/services/errors'

const iconProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

const navLink =
  'flex min-h-12 min-w-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100'

export function Dashboard() {
  const { space, memberName } = useSpace()
  const { isAnonymous } = useAuth()
  const totals = usePaidTotals(space.coupleId, space.me.id)
  const recent = useExpenseList(space.coupleId, {}, 10)
  const cats = useCategories()
  const catName = (id: string) => cats.data?.find((c) => c.id === id)?.name ?? '—'

  return (
    <>
      <header className="pb-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="sr-only">{space.name}</h1>
          <SpaceSwitcher />
          <nav aria-label="Main" className="-mr-2 flex">
            <Link to="/history" className={navLink}>
              <svg {...iconProps}>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
              History
            </Link>
            <Link to="/stats" className={navLink}>
              <svg {...iconProps}>
                <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
              </svg>
              Stats
            </Link>
            <Link to="/account" className={navLink}>
              <svg {...iconProps}>
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
              </svg>
              Account
            </Link>
          </nav>
        </div>
      </header>

      {totals.isPending ? (
        <Spinner label="Loading balance…" />
      ) : totals.isError ? (
        <ErrorState
          message={toAppError(totals.error).message}
          onRetry={() => void totals.refetch()}
        />
      ) : space.solo ? (
        <SpentCard cents={totals.data.mine + totals.data.other} />
      ) : (
        <BalanceCard cents={balanceCents(totals.data)} />
      )}

      {!space.solo && !space.partner && (
        <InviteBanner key={space.coupleId} coupleId={space.coupleId} />
      )}
      {isAnonymous && <SecureNudge />}

      <section className="mt-8" aria-labelledby="recent-h">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="recent-h" className="text-lg font-bold">
            Recent expenses
          </h2>
          <Link to="/history" className="text-sm font-medium text-emerald-800 underline">
            See all
          </Link>
        </div>
        {recent.isPending ? (
          <Spinner />
        ) : recent.isError ? (
          <ErrorState
            message={toAppError(recent.error).message}
            onRetry={() => void recent.refetch()}
          />
        ) : recent.data.length === 0 ? (
          <EmptyState
            title="No expenses yet"
            hint="Add your first shared expense to get started."
          />
        ) : (
          <ul className="space-y-2">
            {recent.data.map((e) => (
              <ExpenseRow
                key={e.id}
                expense={e}
                payerName={memberName(e.payerMemberId)}
                categoryName={catName(e.categoryId)}
              />
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

function SecureNudge() {
  return (
    <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <h2 className="font-semibold text-amber-950">Secure your account</h2>
      <p className="mt-1 text-sm text-amber-900">
        Add an email and password so you can get back in if you change phone or clear browser data.
      </p>
      <Link
        to="/account"
        className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-amber-950 underline"
      >
        Add email
      </Link>
    </section>
  )
}

function InviteBanner({ coupleId }: { coupleId: string }) {
  const [code, setCode] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    setBusy(true)
    setError(null)
    try {
      setCode(await regenerateInvite(coupleId))
    } catch (e) {
      setError(toAppError(e).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="font-semibold">Waiting for your partner</h2>
      <p className="mt-1 text-sm text-slate-600">
        Your partner hasn't joined yet. Generate an invitation code and send it to them.
      </p>
      {code ? (
        <div className="mt-3">
          <InviteCode code={code} />
        </div>
      ) : (
        <Button
          variant="secondary"
          className="mt-3"
          onClick={() => void generate()}
          disabled={busy}
        >
          {busy ? 'Generating…' : 'Get invitation code'}
        </Button>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-rose-700">
          {error}
        </p>
      )}
    </section>
  )
}
