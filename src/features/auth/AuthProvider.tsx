import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  fetchCurrentUser,
  getSession,
  hadSpace,
  markHadSpace,
  signInAnonymously,
} from '@/services/auth.service'
import { toAppError } from '@/services/errors'
import { Button, ErrorState, FullScreen, Spinner } from '@/components/ui'
import { SignInScreen } from './SignInScreen'

type AuthState =
  | { status: 'loading' }
  | { status: 'ready'; userId: string; email: string | null; isAnonymous: boolean }
  | { status: 'lost' }
  | { status: 'error'; message: string }

interface AuthContextValue {
  userId: string
  email: string | null
  isAnonymous: boolean
  /** Re-read the signed-in user (e.g. after linking an email) without remounting the app. */
  refreshUser: () => Promise<void>
  /** Re-run the full start-up (e.g. after signing in as another account). */
  reload: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  const init = useCallback(async () => {
    setState({ status: 'loading' })
    try {
      const session = await getSession()
      if (session) {
        return setState({
          status: 'ready',
          userId: session.user.id,
          email: session.user.email ?? null,
          isAnonymous: session.user.is_anonymous ?? false,
        })
      }
      // No session. If this browser previously had a space, do NOT silently mint
      // a new identity (it would look like the user's data vanished).
      if (hadSpace()) return setState({ status: 'lost' })
      const fresh = await signInAnonymously()
      setState({
        status: 'ready',
        userId: fresh.user.id,
        email: fresh.user.email ?? null,
        isAnonymous: fresh.user.is_anonymous ?? true,
      })
    } catch (e) {
      setState({ status: 'error', message: toAppError(e).message })
    }
  }, [])

  const refreshUser = useCallback(async () => {
    const u = await fetchCurrentUser()
    setState({ status: 'ready', userId: u.id, email: u.email, isAnonymous: u.isAnonymous })
  }, [])

  useEffect(() => {
    void init()
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        // Defer: never call supabase from inside this callback synchronously.
        setTimeout(() => (hadSpace() ? setState({ status: 'lost' }) : void init()), 0)
      }
    })
    return () => data.subscription.unsubscribe()
  }, [init])

  const value = useMemo<AuthContextValue | null>(
    () =>
      state.status === 'ready'
        ? {
            userId: state.userId,
            email: state.email,
            isAnonymous: state.isAnonymous,
            refreshUser,
            reload: init,
          }
        : null,
    [state, refreshUser, init],
  )

  if (state.status === 'loading') return <Spinner />
  if (state.status === 'error') {
    return (
      <FullScreen>
        <ErrorState
          title="Can't start the app"
          message={state.message}
          onRetry={() => void init()}
        />
      </FullScreen>
    )
  }
  if (state.status === 'lost') return <LostSession reload={init} />
  return <AuthContext.Provider value={value!}>{children}</AuthContext.Provider>
}

function LostSession({ reload }: { reload: () => Promise<void> }) {
  const [signingIn, setSigningIn] = useState(false)

  const startFresh = async () => {
    markHadSpace(false)
    await reload()
  }

  if (signingIn) {
    return <SignInScreen onSignedIn={reload} onBack={() => setSigningIn(false)} />
  }

  return (
    <FullScreen>
      <h1 className="text-2xl font-bold">Session unavailable</h1>
      <p className="mt-3 text-slate-600">
        This browser used to be signed in to a shared space, but that sign-in is gone. This happens
        if site data was cleared, the browser or device changed, or the app was reinstalled.
      </p>
      <p className="mt-3 text-slate-600">
        Your expenses are not deleted. If you secured your account with an email and password, sign
        in to get straight back to your space.
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <Button full onClick={() => setSigningIn(true)}>
          Sign in
        </Button>
        <Button variant="secondary" full onClick={() => void reload()}>
          Check again
        </Button>
        <Button variant="ghost" full onClick={() => void startFresh()}>
          I never set an email — start over
        </Button>
      </div>
      <p className="mt-3 text-sm text-slate-500">
        Starting over creates a brand-new identity; an identity without an email can't be recovered,
        and you'll create or join a space again. Your partner can still export the old data as CSV.
      </p>
    </FullScreen>
  )
}
