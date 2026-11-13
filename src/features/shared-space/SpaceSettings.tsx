import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button, ConfirmDialog, Field, InlineError, inputClass } from '@/components/ui'
import {
  deleteSpace,
  makeSpaceSolo,
  regenerateInvite,
  renameSpace,
} from '@/services/couple.service'
import { toAppError } from '@/services/errors'
import { useI18n } from '@/i18n/I18nProvider'
import { InviteCode } from './InviteReveal'
import { useSpace } from './SpaceProvider'

/** Lives on the Account page: settings for the space currently selected on the dashboard. */
export function SpaceSettings() {
  const { t } = useI18n()
  const { space, enterSpace } = useSpace()
  const qc = useQueryClient()
  const [dialog, setDialog] = useState<'solo' | 'delete' | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const partner = space.partner?.displayName
  // Invitation code shown after "Invite a partner" (kept with its space id so it never leaks
  // into another space when you switch).
  const [invite, setInvite] = useState<{ coupleId: string; code: string } | null>(null)
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const shownCode = invite && invite.coupleId === space.coupleId && !partner ? invite.code : null

  async function invitePartner() {
    setInviting(true)
    setInviteError(null)
    try {
      // A single-person space becomes a normal shared space once it has an invite.
      const code = await regenerateInvite(space.coupleId)
      setInvite({ coupleId: space.coupleId, code })
      await qc.invalidateQueries({ queryKey: ['space'] })
    } catch (e) {
      setInviteError(toAppError(e).message)
    } finally {
      setInviting(false)
    }
  }

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
        {t('settings.title')}
      </h2>
      <p className="mt-1 mb-3 text-sm text-slate-600">{t('settings.for', { name: space.name })}</p>

      <RenameSpace key={space.coupleId} coupleId={space.coupleId} currentName={space.name} />

      <div className="mt-4 space-y-5 rounded-2xl border border-slate-200 bg-white p-4">
        {space.solo && (
          <div>
            <h3 className="font-semibold">{t('settings.invite.title')}</h3>
            <p className="mt-1 text-sm text-slate-600">{t('settings.invite.body')}</p>
            <Button
              variant="secondary"
              className="mt-3"
              onClick={() => void invitePartner()}
              disabled={inviting}
            >
              {inviting ? t('common.generating') : t('settings.invite.title')}
            </Button>
            <InlineError message={inviteError} />
          </div>
        )}
        {shownCode && (
          <div>
            <h3 className="font-semibold">{t('settings.inviteCode.title')}</h3>
            <p className="mt-1 mb-3 text-sm text-slate-600">{t('settings.inviteCode.body')}</p>
            <InviteCode code={shownCode} />
          </div>
        )}
        {!space.solo && (
          <div>
            <h3 className="font-semibold">{t('settings.solo.title')}</h3>
            <p className="mt-1 text-sm text-slate-600">
              {partner ? t('settings.solo.withPartner', { partner }) : t('settings.solo.noPartner')}
            </p>
            <Button variant="secondary" className="mt-3" onClick={() => setDialog('solo')}>
              {t('settings.solo.button')}
            </Button>
          </div>
        )}
        <div>
          <h3 className="font-semibold text-rose-900">{t('settings.delete.title')}</h3>
          <p className="mt-1 text-sm text-slate-600">
            {partner
              ? t('settings.delete.withPartner', { partner })
              : t('settings.delete.noPartner')}
          </p>
          <Button variant="danger" className="mt-3" onClick={() => setDialog('delete')}>
            {t('settings.delete.button')}
          </Button>
        </div>
      </div>

      {dialog === 'solo' && (
        <ConfirmDialog
          title={t('settings.solo.dialogTitle')}
          message={
            partner
              ? t('settings.solo.dialogWithPartner', { name: space.name, partner })
              : t('settings.solo.dialogNoPartner', { name: space.name })
          }
          confirmLabel={t('settings.solo.confirm')}
          busyLabel={t('common.working')}
          tone="primary"
          busy={busy}
          error={error}
          onConfirm={() => void confirm()}
          onCancel={close}
        />
      )}
      {dialog === 'delete' && (
        <ConfirmDialog
          title={t('settings.delete.dialogTitle')}
          message={
            partner
              ? t('settings.delete.dialogMessageWithPartner', { name: space.name, partner })
              : t('settings.delete.dialogMessage', { name: space.name })
          }
          confirmLabel={t('settings.delete.confirm')}
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
  const { t } = useI18n()
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
      setError(t('settings.errName'))
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
      <h3 className="mb-3 font-semibold">{t('settings.rename')}</h3>
      <form onSubmit={(e) => void submit(e)} className="space-y-3" noValidate>
        <Field label={t('spaceForm.spaceName')} htmlFor="rename-space">
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
            {t('common.saved')}
          </p>
        )}
        <Button type="submit" variant="secondary" disabled={busy || name.trim() === currentName}>
          {busy ? t('common.saving') : t('settings.saveName')}
        </Button>
      </form>
    </div>
  )
}
