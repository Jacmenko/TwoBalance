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
import { getSession, hadSpace, markHadSpace, signInAnonymously } from '@/services/auth.service'
import { toAppError } from '@/services/errors'
import { Button, ErrorState, FullScreen, Spinner } from '@/components/ui'

type AuthState =
  | { status: 'loading' }
  | { status: 'ready'; userId: string }
  | { status: 'lost' }
  | { status: 'error'; message: string }

interface AuthContextValue {
  userId: string
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
      if (session) return setState({ status: 'ready', userId: session.user.id })
      // No session. If this browser previously had a space, do NOT silently mint
      // a new identity (it would look like the user's data vanished).
      if (hadSpace()) return setState({ status: 'lost' })
      const fresh = await signInAnonymously()
      setState({ status: 'ready', userId: fresh.user.id })
    } catch (e) {
      setState({ status: 'error', message: toAppError(e).message })
    }
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

  const startFresh = async () => {
    markHadSpace(false)
    await init()
  }

  const value = useMemo(() => (state.status === 'ready' ? { userId: state.userId } : null), [state])

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
  if (state.status === 'lost') {
    return (
      <FullScreen>
        <h1 className="text-2xl font-bold">Session unavailable</h1>
        <p className="mt-3 text-slate-600">
          This browser used to be signed in to a shared space, but that sign-in is gone. This
          happens if site data was cleared, the browser or device changed, or the app was
          reinstalled.
        </p>
        <p className="mt-3 text-slate-600">
          Your expenses are not deleted — your partner can still see them and can export them as
          CSV. Because TwoBalance has no passwords, the old identity on this device can't be
          recovered.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Button variant="secondary" full onClick={() => void init()}>
            Check again
          </Button>
          <Button full onClick={() => void startFresh()}>
            Start over with a new identity
          </Button>
        </div>
        <p className="mt-3 text-sm text-slate-500">
          Starting over creates a new identity; you'll then create or join a space again.
        </p>
      </FullScreen>
    )
  }
  return <AuthContext.Provider value={value!}>{children}</AuthContext.Provider>
}
