import { useState } from 'react'
import { Button, FullScreen } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthProvider'
import { SignInScreen } from '@/features/auth/SignInScreen'
import { useI18n } from '@/i18n/I18nProvider'
import { SpaceForm } from './SpaceForm'

export function Onboarding({
  enterSpace,
}: {
  enterSpace: (coupleId: string, inviteCode?: string) => Promise<void>
}) {
  const { reload } = useAuth()
  const { t } = useI18n()
  const [signingIn, setSigningIn] = useState(false)

  if (signingIn) {
    return <SignInScreen onSignedIn={reload} onBack={() => setSigningIn(false)} />
  }

  return (
    <FullScreen>
      <h1 className="text-3xl font-bold">TwoBalance</h1>
      <p className="mt-2 mb-8 text-slate-600">{t('app.tagline')}</p>

      <SpaceForm enterSpace={enterSpace} />

      <Button variant="ghost" full className="mt-4" onClick={() => setSigningIn(true)}>
        {t('onboarding.haveAccount')}
      </Button>

      <p className="mt-4 text-xs text-slate-500">{t('onboarding.noPasswords')}</p>
    </FullScreen>
  )
}
