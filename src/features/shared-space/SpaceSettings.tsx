import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button, ConfirmDialog, Field, InlineError, inputClass } from '@/components/ui'
import { deleteSpace, makeSpaceSolo, renameSpace } from '@/services/couple.service'
import { toAppError } from '@/services/errors'
import { useSpace } from './SpaceProvider'

/** Lives on the Account page: settings for the space currently selected on the dashboard. */
export function SpaceSettings() {
  const { space, enterSpace } = useSpace()
  const qc = useQueryClient()
  const [dialog, setDialog] = useState<'solo' | 'delete' | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const partner = space.partner?.displayName

  function close() {
    setDialog(null)
    setError(null)
  }

  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      if (dialog === 'solo') {
        const id = await makeSpaceSolo(space.coupleId)
        await enterSpace(id)
      } else {
        await deleteSpace(space.coupleId)
        await qc.invalidateQueries({ queryKey: ['space'] })
      }
      setDialog(null)
    } catch (e) {
      setError(toAppError(e).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="space-settings-h">
      <h2 id="space-settings-h" className="text-lg font-bold">
        Space settings
      </h2>
      <p className="mt-1 mb-3 text-sm text-slate-600">
        For “{space.name}”. Switch or add spaces from the title on the dashboard.
      </p>

      <RenameSpace key={space.coupleId} coupleId={space.coupleId} currentName={space.name} />

      <div className="mt-4 space-y-5 rounded-2xl border border-slate-200 bg-white p-4">
        {!space.solo && (
          <div>
            <h3 className="font-semibold">Change to single-person</h3>
            <p className="mt-1 text-sm text-slate-600">
              {partner
                ? `You and ${partner} each get your own single-person copy with all expenses, and the shared space is removed.`
                : 'Turns this space into a single-person space. You can invite a partner again later.'}
            </p>
            <Button variant="secondary" className="mt-3" onClick={() => setDialog('solo')}>
              Change to single-person…
            </Button>
          </div>
        )}
        <div>
          <h3 className="font-semibold text-rose-900">Delete space</h3>
          <p className="mt-1 text-sm text-slate-600">
            {partner
              ? `Permanently deletes this space and all its expenses for you and ${partner}.`
              : 'Permanently deletes this space and all its expenses.'}
          </p>
          <Button variant="danger" className="mt-3" onClick={() => setDialog('delete')}>
            Delete space…
          </Button>
        </div>
      </div>

      {dialog === 'solo' && (
        <ConfirmDialog
          title="Change to single-person?"
          message={
            partner
              ? `This creates a single-person copy of “${space.name}” for you and another for ${partner}, each with all expenses. The shared space is then removed for both of you. This can't be undone.`
              : `“${space.name}” becomes a single-person space. You can invite a partner again later.`
          }
          confirmLabel="Change to single-person"
          busyLabel="Working…"
          tone="primary"
          busy={busy}
          error={error}
          onConfirm={() => void confirm()}
          onCancel={close}
        />
      )}
      {dialog === 'delete' && (
        <ConfirmDialog
          title="Delete this space?"
          message={`This permanently deletes “${space.name}” and all its expenses${partner ? ` for you and ${partner}` : ''}. This can't be undone. Export a CSV from History first if you want a backup.`}
          confirmLabel="Delete space"
          busy={busy}
          error={error}
          onConfirm={() => void confirm()}
          onCancel={close}
        />
      )}
    </section>
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
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 font-semibold">Rename</h3>
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
    </div>
  )
}
