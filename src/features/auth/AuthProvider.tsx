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
import { useI18n } from '@/i18n/I18nProvider'
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
  const { t } = useI18n()
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
          title={t('signin.cantStart')}
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
  const { t } = useI18n()
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
      <h1 className="text-2xl font-bold">{t('lost.title')}</h1>
      <p className="mt-3 text-slate-600">{t('lost.body1')}</p>
      <p className="mt-3 text-slate-600">{t('lost.body2')}</p>
      <div className="mt-6 flex flex-col gap-3">
        <Button full onClick={() => setSigningIn(true)}>
          {t('auth.signIn')}
        </Button>
        <Button variant="secondary" full onClick={() => void reload()}>
          {t('lost.checkAgain')}
        </Button>
        <Button variant="ghost" full onClick={() => void startFresh()}>
          {t('lost.startOver')}
        </Button>
      </div>
      <p className="mt-3 text-sm text-slate-500">{t('lost.startOverHint')}</p>
    </FullScreen>
  )
}
