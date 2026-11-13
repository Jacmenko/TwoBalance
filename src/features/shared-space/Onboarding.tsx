import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Field, FullScreen, InlineError, inputClass } from '@/components/ui'
import { createSpace, joinSpace } from '@/services/couple.service'
import { toAppError } from '@/services/errors'
import { useAuth } from '@/features/auth/AuthProvider'
import { SignInScreen } from '@/features/auth/SignInScreen'

export function Onboarding({ onCreated }: { onCreated: (code: string) => void }) {
  const qc = useQueryClient()
  const { reload } = useAuth()
  const [signingIn, setSigningIn] = useState(false)
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [codeError, setCodeError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const n = name.trim()
    const nErr = n.length < 1 || n.length > 40 ? 'Enter your name (max 40 characters).' : null
    const cErr =
      mode === 'join' && code.replace(/[^a-z0-9]/gi, '').length !== 12
        ? 'Enter the 12-character code from your partner.'
        : null
    setNameError(nErr)
    setCodeError(cErr)
    if (nErr || cErr) return

    setBusy(true)
    try {
      if (mode === 'create') {
        const { inviteCode } = await createSpace(n)
        onCreated(inviteCode)
      } else {
        await joinSpace(code, n)
      }
      await qc.invalidateQueries({ queryKey: ['space'] })
    } catch (err) {
      setError(toAppError(err).message)
    } finally {
      setBusy(false)
    }
  }

  if (signingIn) {
    return <SignInScreen onSignedIn={reload} onBack={() => setSigningIn(false)} />
  }

  return (
    <FullScreen>
      <h1 className="text-3xl font-bold">TwoBalance</h1>
      <p className="mt-2 text-slate-600">A private shared expense tracker for two.</p>

      <div
        role="tablist"
        aria-label="Create or join"
        className="mt-8 grid grid-cols-2 rounded-xl bg-slate-200 p-1"
      >
        {(['create', 'join'] as const).map((m) => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m)
              setError(null)
            }}
            className={`min-h-11 rounded-lg text-sm font-semibold ${mode === m ? 'bg-white shadow-sm' : 'text-slate-600'}`}
          >
            {m === 'create' ? 'Create shared space' : 'Join with a code'}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <Field label="Your name" htmlFor="name" error={nameError}>
          <input
            id="name"
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            autoComplete="given-name"
            placeholder="e.g. Alex"
          />
        </Field>
        {mode === 'join' && (
          <Field label="Invitation code" htmlFor="code" error={codeError}>
            <input
              id="code"
              className={`${inputClass} font-mono uppercase tracking-widest`}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="XXXX-XXXX-XXXX"
            />
          </Field>
        )}
        <InlineError message={error} />
        <Button type="submit" full disabled={busy}>
          {busy ? 'Please wait…' : mode === 'create' ? 'Create shared space' : 'Join shared space'}
        </Button>
      </form>

      <Button variant="ghost" full className="mt-4" onClick={() => setSigningIn(true)}>
        Already have an account? Sign in
      </Button>

      <p className="mt-4 text-xs text-slate-500">
        There are no passwords: this device keeps an anonymous sign-in. After creating or joining a
        space, add an email and password under Account so you can sign in again on a new device.
      </p>
    </FullScreen>
  )
}
