import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Field, InlineError, PageHeader, inputClass } from '@/components/ui'
import { renameSpace } from '@/services/couple.service'
import { toAppError } from '@/services/errors'
import { SpaceForm } from './SpaceForm'
import { useSpace } from './SpaceProvider'

export function SpacesPage() {
  const { space, spaces, switchSpace, enterSpace } = useSpace()
  const nav = useNavigate()

  return (
    <>
      <PageHeader title="Spaces" />

      <ul className="space-y-2" aria-label="Your spaces">
        {spaces.map((s) => {
          const current = s.coupleId === space.coupleId
          return (
            <li key={s.coupleId}>
              <button
                type="button"
                aria-current={current ? 'true' : undefined}
                onClick={() => {
                  switchSpace(s.coupleId)
                  nav('/')
                }}
                className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-left shadow-sm ring-1 ${current ? 'ring-2 ring-emerald-600' : 'ring-slate-200 hover:bg-slate-50'}`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{s.name}</span>
                  <span className="block truncate text-sm text-slate-600">
                    {s.partner ? `With ${s.partner.displayName}` : 'Waiting for your partner'}
                  </span>
                </span>
                {current && (
                  <span className="shrink-0 text-sm font-semibold text-emerald-800">Current</span>
                )}
              </button>
            </li>
          )
        })}
      </ul>

      <RenameSpace key={space.coupleId} coupleId={space.coupleId} currentName={space.name} />

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="mb-4 text-lg font-bold">Add another space</h2>
        <SpaceForm enterSpace={enterSpace} defaultName={space.me.displayName} />
      </section>
    </>
  )
}

function RenameSpace({ coupleId, currentName }: { coupleId: string; currentName: string }) {
  const qc = useQueryClient()
  const [name, setName] = useState(currentName)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    const n = name.trim()
    if (n.length < 1 || n.length > 40) {
      setError('Enter a name (max 40 characters).')
      return
    }
    setBusy(true)
    try {
      await renameSpace(coupleId, n)
      await qc.invalidateQueries({ queryKey: ['space'] })
      setSaved(true)
    } catch (err) {
      setError(toAppError(err).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 font-semibold">Rename current space</h2>
      <form onSubmit={(e) => void submit(e)} className="space-y-3" noValidate>
        <Field label="Space name" htmlFor="rename-space">
          <input
            id="rename-space"
            className={inputClass}
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setSaved(false)
            }}
            maxLength={40}
            autoComplete="off"
          />
        </Field>
        <InlineError message={error} />
        {saved && (
          <p role="status" className="text-sm font-medium text-emerald-800">
            Saved.
          </p>
        )}
        <Button type="submit" variant="secondary" disabled={busy || name.trim() === currentName}>
          {busy ? 'Saving…' : 'Save name'}
        </Button>
      </form>
    </section>
  )
}
