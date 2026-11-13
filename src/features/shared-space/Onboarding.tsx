import { useState } from 'react'
import { Button, FullScreen } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthProvider'
import { SignInScreen } from '@/features/auth/SignInScreen'
import { SpaceForm } from './SpaceForm'

export function Onboarding({
  enterSpace,
}: {
  enterSpace: (coupleId: string, inviteCode?: string) => Promise<void>
}) {
  const { reload } = useAuth()
  const [signingIn, setSigningIn] = useState(false)

  if (signingIn) {
    return <SignInScreen onSignedIn={reload} onBack={() => setSigningIn(false)} />
  }

  return (
    <FullScreen>
      <h1 className="text-3xl font-bold">TwoBalance</h1>
      <p className="mt-2 mb-8 text-slate-600">A private shared expense tracker for two.</p>

      <SpaceForm enterSpace={enterSpace} />

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
