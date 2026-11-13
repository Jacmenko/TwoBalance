import { Button, FullScreen } from '@/components/ui'
import { CredentialsForm } from './CredentialsForm'

export function SignInScreen({
  onSignedIn,
  onBack,
}: {
  onSignedIn: () => void | Promise<void>
  onBack: () => void
}) {
  return (
    <FullScreen>
      <h1 className="text-2xl font-bold">Sign in</h1>
      <p className="mt-2 text-slate-600">
        Sign in to your TwoBalance account. Enter the email and password you set under Account.
      </p>
      <div className="mt-6">
        <CredentialsForm mode="signin" onDone={onSignedIn} />
      </div>
      <Button variant="ghost" full className="mt-4" onClick={onBack}>
        Back
      </Button>
    </FullScreen>
  )
}
