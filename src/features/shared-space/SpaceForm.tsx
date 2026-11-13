import { useState, type FormEvent } from 'react'
import { Button, Field, InlineError, inputClass } from '@/components/ui'
import { createSpace, joinSpace } from '@/services/couple.service'
import { toAppError } from '@/services/errors'
import { useI18n } from '@/i18n/I18nProvider'

/** Create a new named space, or join one with an invitation code. */
export function SpaceForm({
  enterSpace,
  defaultName = '',
}: {
  enterSpace: (coupleId: string, inviteCode?: string) => Promise<void>
  defaultName?: string
}) {
  const { t } = useI18n()
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [name, setName] = useState(defaultName)
  const [spaceName, setSpaceName] = useState('')
  const [solo, setSolo] = useState(false)
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
    const nErr = n.length < 1 || n.length > 40 ? t('spaceForm.errName') : null
    const sErr =
      mode === 'create' && (sn.length < 1 || sn.length > 40) ? t('spaceForm.errSpace') : null
    const cErr =
      mode === 'join' && code.replace(/[^a-z0-9]/gi, '').length !== 12
        ? t('spaceForm.errCode')
        : null
    setNameError(nErr)
    setSpaceError(sErr)
    setCodeError(cErr)
    if (nErr || sErr || cErr) return

    setBusy(true)
    try {
      if (mode === 'create') {
        const { coupleId, inviteCode } = await createSpace(n, sn, solo)
        await enterSpace(coupleId, inviteCode ?? undefined)
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
        aria-label={t('spaceForm.tabs')}
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
            {m === 'create' ? t('spaceForm.createTab') : t('spaceForm.joinTab')}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        {mode === 'create' && (
          <Field label={t('spaceForm.spaceName')} htmlFor="space-name" error={spaceError}>
            <input
              id="space-name"
              className={inputClass}
              value={spaceName}
              onChange={(e) => setSpaceName(e.target.value)}
              maxLength={40}
              autoComplete="off"
              placeholder={t('spaceForm.spaceNamePlaceholder')}
            />
          </Field>
        )}
        {mode === 'create' && (
          <fieldset>
            <legend className="mb-1 block text-sm font-medium text-slate-700">
              {t('spaceForm.whoFor')}
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  value: false,
                  label: t('spaceForm.withPartner'),
                  hint: t('spaceForm.withPartnerHint'),
                },
                {
                  value: true,
                  label: t('spaceForm.justMe'),
                  hint: t('spaceForm.justMeHint'),
                },
              ].map((o) => (
                <label
                  key={o.label}
                  className={`flex min-h-16 cursor-pointer flex-col justify-center rounded-xl border px-3 py-2 ${solo === o.value ? 'border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600' : 'border-slate-300 bg-white'}`}
                >
                  <input
                    type="radio"
                    name="space-kind"
                    className="sr-only"
                    checked={solo === o.value}
                    onChange={() => setSolo(o.value)}
                  />
                  <span className="text-sm font-semibold">{o.label}</span>
                  <span className="text-xs text-slate-600">{o.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <Field label={t('spaceForm.yourName')} htmlFor="name" error={nameError}>
          <input
            id="name"
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            autoComplete="given-name"
            placeholder={t('spaceForm.yourNamePlaceholder')}
          />
        </Field>
        {mode === 'join' && (
          <Field label={t('spaceForm.code')} htmlFor="code" error={codeError}>
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
          {busy
            ? t('common.pleaseWait')
            : mode === 'create'
              ? solo
                ? t('spaceForm.createMine')
                : t('spaceForm.createShared')
              : t('spaceForm.join')}
        </Button>
      </form>
    </>
  )
}
