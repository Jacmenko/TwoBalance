import { useState } from 'react'
import { Button, ConfirmDialog, PageHeader } from '@/components/ui'
import { signOut } from '@/services/auth.service'
import { toAppError } from '@/services/errors'
import { useAuth } from './AuthProvider'
import { CredentialsForm } from './CredentialsForm'

export function AccountPage() {
  const { email, isAnonymous, refreshUser } = useAuth()
  const [justSecured, setJustSecured] = useState(false)
  const [confirmOut, setConfirmOut] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function doSignOut() {
    setBusy(true)
    setError(null)
    try {
      await signOut()
    } catch (e) {
      setError(toAppError(e).message)
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="Account" />
      {isAnonymous ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold">Secure your account</h2>
          <p className="mt-1 text-sm text-slate-600">
            Right now your identity only exists on this device. Add an email and password so you can
            sign in again if you change phone, clear browser data or reinstall the app. Your shared
            space and expenses stay exactly as they are.
          </p>
          <div className="mt-4">
            <CredentialsForm
              mode="link"
              onDone={async () => {
                await refreshUser()
                setJustSecured(true)
              }}
            />
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          {justSecured && (
            <p
              role="status"
              className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
            >
              Done — your account is secured.
            </p>
          )}
          <p className="text-sm text-slate-500">Signed in as</p>
          <p className="font-semibold break-all">{email}</p>
          <p className="mt-3 text-sm text-slate-600">
            On a new device, open TwoBalance, choose “Sign in”, enter this email and your password.
          </p>
          <Button variant="secondary" className="mt-4" onClick={() => setConfirmOut(true)}>
            Sign out on this device
          </Button>
        </section>
      )}
      {confirmOut && (
        <ConfirmDialog
          title="Sign out?"
          message="You'll need your email and password to sign back in on this device."
          confirmLabel="Sign out"
          busy={busy}
          error={error}
          onConfirm={() => void doSignOut()}
          onCancel={() => setConfirmOut(false)}
        />
      )}
    </>
  )
}
