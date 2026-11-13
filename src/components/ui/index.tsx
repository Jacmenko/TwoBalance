import { useEffect, useRef, type ComponentProps, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="flex flex-col items-center gap-3 py-16 text-slate-500">
      <div
        aria-hidden
        className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600"
      />
      <span className="text-sm">{label}</span>
    </div>
  )
}

export function FullScreen({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      {children}
    </div>
  )
}

type ButtonProps = ComponentProps<'button'> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  full?: boolean
}

export function Button({ variant = 'primary', full, className = '', ...props }: ButtonProps) {
  const styles = {
    primary: 'bg-emerald-700 text-white hover:bg-emerald-800 disabled:bg-emerald-300',
    secondary:
      'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 disabled:opacity-50',
    danger: 'bg-rose-700 text-white hover:bg-rose-800 disabled:bg-rose-300',
    ghost: 'text-slate-700 hover:bg-slate-100 disabled:opacity-50',
  }[variant]
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex min-h-12 items-center justify-center rounded-xl px-5 text-base font-semibold transition-colors disabled:cursor-not-allowed ${styles} ${full ? 'w-full' : ''} ${className}`}
    />
  )
}

export function ErrorState({
  message,
  onRetry,
  title = 'Something went wrong',
}: {
  message: string
  onRetry?: () => void
  title?: string
}) {
  return (
    <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-900">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm">{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

export function InlineError({ message }: { message: string | null | undefined }) {
  if (!message) return null
  return (
    <p role="alert" className="mt-1 text-sm font-medium text-rose-700">
      {message}
    </p>
  )
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
      <p className="font-semibold text-slate-800">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string
  htmlFor: string
  error?: string | null
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      <InlineError message={error} />
    </div>
  )
}

export const inputClass =
  'block min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-slate-900 placeholder:text-slate-400'

export function BackIcon() {
  return (
    <svg
      aria-hidden
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

export function PageHeader({
  title,
  back = '/',
  right,
}: {
  title: string
  back?: string
  right?: ReactNode
}) {
  return (
    <header className="flex items-center gap-2 pb-4">
      <Link
        to={back}
        aria-label="Back"
        className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100"
      >
        <BackIcon />
      </Link>
      <h1 className="flex-1 text-xl font-bold">{title}</h1>
      {right}
    </header>
  )
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  confirmLabel: string
  busy?: boolean
  error?: string | null
  onConfirm: () => void
  onCancel: () => void
}) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    cancelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onCancel])
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-msg"
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
      >
        <h2 id="confirm-title" className="text-lg font-bold">
          {title}
        </h2>
        <p id="confirm-msg" className="mt-2 text-slate-600">
          {message}
        </p>
        <InlineError message={error} />
        <div className="mt-5 flex gap-3">
          <Button ref={cancelRef} variant="secondary" full onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" full onClick={onConfirm} disabled={busy}>
            {busy ? 'Deleting…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
