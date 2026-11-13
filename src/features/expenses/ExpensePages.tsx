import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ExpenseForm } from '@/components/expenses/ExpenseForm'
import { ConfirmDialog, EmptyState, ErrorState, PageHeader, Spinner } from '@/components/ui'
import { useSpace } from '@/features/shared-space/SpaceProvider'
import { useCategories, useExpense, useInvalidateLedger } from '@/features/queries'
import { createExpense, deleteExpense, updateExpense } from '@/services/expense.service'
import { toAppError } from '@/services/errors'
import type { ExpenseInput } from '@/types/domain'

export function NewExpensePage() {
  const { space } = useSpace()
  const nav = useNavigate()
  const invalidate = useInvalidateLedger()
  const cats = useCategories()

  async function save(input: ExpenseInput) {
    try {
      await createExpense(space.coupleId, space.me.id, input)
    } catch (e) {
      throw toAppError(e)
    }
    // Only after the backend confirmed the save.
    await invalidate()
    nav('/', { replace: true })
  }

  return (
    <Shell title="Add expense">
      {cats.isPending ? (
        <Spinner />
      ) : cats.isError ? (
        <ErrorState message={toAppError(cats.error).message} onRetry={() => void cats.refetch()} />
      ) : (
        <ExpenseForm
          categories={cats.data}
          payerName={`${space.me.displayName} (you)`}
          submitLabel="Save expense"
          onSubmit={save}
        />
      )}
    </Shell>
  )
}

export function EditExpensePage() {
  const { id = '' } = useParams()
  const { space, memberName } = useSpace()
  const nav = useNavigate()
  const invalidate = useInvalidateLedger()
  const cats = useCategories()
  const exp = useExpense(space.coupleId, id)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function save(input: ExpenseInput) {
    try {
      await updateExpense(id, input)
    } catch (e) {
      throw toAppError(e)
    }
    await invalidate()
    nav(-1)
  }

  async function remove() {
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteExpense(id)
      await invalidate()
      nav('/', { replace: true })
    } catch (e) {
      setDeleteError(toAppError(e).message)
      setDeleting(false)
    }
  }

  let body
  if (exp.isPending || cats.isPending) body = <Spinner />
  else if (exp.isError || cats.isError) {
    body = (
      <ErrorState
        message={toAppError(exp.error ?? cats.error).message}
        onRetry={() => {
          void exp.refetch()
          void cats.refetch()
        }}
      />
    )
  } else if (!exp.data || exp.data.coupleId !== space.coupleId) {
    body = <EmptyState title="Expense not found" hint="It may have been deleted." />
  } else {
    const payer = memberName(exp.data.payerMemberId)
    body = (
      <ExpenseForm
        key={exp.data.updatedAt}
        categories={cats.data}
        initial={exp.data}
        payerName={payer === 'You' ? `${space.me.displayName} (you)` : payer}
        submitLabel="Save changes"
        onSubmit={save}
        onDelete={() => setConfirming(true)}
      />
    )
  }

  return (
    <Shell title="Edit expense">
      {body}
      {confirming && (
        <ConfirmDialog
          title="Delete this expense?"
          message="It will be removed from the history, both balances and the statistics."
          confirmLabel="Delete"
          busy={deleting}
          error={deleteError}
          onConfirm={() => void remove()}
          onCancel={() => setConfirming(false)}
        />
      )}
    </Shell>
  )
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <PageHeader title={title} back="/" />
      {children}
    </>
  )
}
