import { useState, type FormEvent } from 'react'
import { Button, Field, InlineError, inputClass } from '@/components/ui'
import { createSpace, joinSpace } from '@/services/couple.service'
import { toAppError } from '@/services/errors'

/** Create a new named space, or join one with an invitation code. */
export function SpaceForm({
  enterSpace,
  defaultName = '',
}: {
  enterSpace: (coupleId: string, inviteCode?: string) => Promise<void>
  defaultName?: string
}) {
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [name, setName] = useState(defaultName)
  const [spaceName, setSpaceName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [spaceError, setSpaceError] = useState<string | null>(null)
  const [codeError, setCodeError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const n = name.trim()
    const sn = spaceName.trim()
    const nErr = n.length < 1 || n.length > 40 ? 'Enter your name (max 40 characters).' : null
    const sErr =
      mode === 'create' && (sn.length < 1 || sn.length > 40)
        ? 'Give the space a name (max 40 characters).'
        : null
    const cErr =
      mode === 'join' && code.replace(/[^a-z0-9]/gi, '').length !== 12
        ? 'Enter the 12-character code from your partner.'
        : null
    setNameError(nErr)
    setSpaceError(sErr)
    setCodeError(cErr)
    if (nErr || sErr || cErr) return

    setBusy(true)
    try {
      if (mode === 'create') {
        const { coupleId, inviteCode } = await createSpace(n, sn)
        await enterSpace(coupleId, inviteCode)
      } else {
        const { coupleId } = await joinSpace(code, n)
        await enterSpace(coupleId)
      }
    } catch (err) {
      setError(toAppError(err).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div
        role="tablist"
        aria-label="Create or join"
        className="grid grid-cols-2 rounded-xl bg-slate-200 p-1"
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
        {mode === 'create' && (
          <Field label="Space name" htmlFor="space-name" error={spaceError}>
            <input
              id="space-name"
              className={inputClass}
              value={spaceName}
              onChange={(e) => setSpaceName(e.target.value)}
              maxLength={40}
              autoComplete="off"
              placeholder="e.g. Home, Rome trip"
            />
          </Field>
        )}
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
    </>
  )
}
