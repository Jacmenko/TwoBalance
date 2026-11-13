import { Button, FullScreen } from '@/components/ui'
import { useI18n } from '@/i18n/I18nProvider'
import { CredentialsForm } from './CredentialsForm'

export function SignInScreen({
  onSignedIn,
  onBack,
}: {
  onSignedIn: () => void | Promise<void>
  onBack: () => void
}) {
  const { t } = useI18n()
  return (
    <FullScreen>
      <h1 className="text-2xl font-bold">{t('signin.title')}</h1>
      <p className="mt-2 text-slate-600">{t('signin.body')}</p>
      <div className="mt-6">
        <CredentialsForm mode="signin" onDone={onSignedIn} />
      </div>
      <Button variant="ghost" full className="mt-4" onClick={onBack}>
        {t('common.back')}
      </Button>
    </FullScreen>
  )
}
