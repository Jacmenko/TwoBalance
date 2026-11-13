import { useState } from 'react'
import { Button, ConfirmDialog, PageHeader } from '@/components/ui'
import { useI18n } from '@/i18n/I18nProvider'
import { LanguageSelect } from '@/i18n/LanguageSelect'
import { signOut } from '@/services/auth.service'
import { toAppError } from '@/services/errors'
import { SpaceSettings } from '@/features/shared-space/SpaceSettings'
import { useAuth } from './AuthProvider'
import { CredentialsForm } from './CredentialsForm'

export function AccountPage() {
  const { t } = useI18n()
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
      <PageHeader title={t('account.title')} right={<LanguageSelect />} />
      <SpaceSettings />
      <h2 className="mt-8 mb-3 text-lg font-bold">{t('account.signIn')}</h2>
      {isAnonymous ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold">{t('account.secure.title')}</h2>
          <p className="mt-1 text-sm text-slate-600">{t('account.secure.body')}</p>
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
              {t('account.secured')}
            </p>
          )}
          <p className="text-sm text-slate-500">{t('account.signedInAs')}</p>
          <p className="font-semibold break-all">{email}</p>
          <p className="mt-3 text-sm text-slate-600">{t('account.newDevice')}</p>
          <Button variant="secondary" className="mt-4" onClick={() => setConfirmOut(true)}>
            {t('account.signOut')}
          </Button>
        </section>
      )}
      {confirmOut && (
        <ConfirmDialog
          title={t('account.signOut.title')}
          message={t('account.signOut.message')}
          confirmLabel={t('account.signOut.confirm')}
          busy={busy}
          error={error}
          onConfirm={() => void doSignOut()}
          onCancel={() => setConfirmOut(false)}
        />
      )}
    </>
  )
}
