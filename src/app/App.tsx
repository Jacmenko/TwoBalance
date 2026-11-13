import { Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { SpaceProvider, useSpace } from '@/features/shared-space/SpaceProvider'
import { Dashboard } from '@/features/dashboard/Dashboard'
import { History } from '@/features/history/History'
import { Statistics } from '@/features/statistics/Statistics'
import { EditExpensePage, NewExpensePage } from '@/features/expenses/ExpensePages'
import { FullScreen } from '@/components/ui'
import { isSupabaseConfigured } from '@/lib/supabase/client'

function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

function Layout() {
  const { realtime } = useSpace()
  const online = useOnline()
  const { pathname } = useLocation()
  const showFab = pathname === '/'

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-32">
      {!online ? (
        <p role="status" className="mb-3 rounded-xl bg-amber-100 px-4 py-2 text-sm text-amber-900">
          You're offline. Changes can't be saved until you're back online.
        </p>
      ) : (
        realtime === 'interrupted' && (
          <p
            role="status"
            className="mb-3 rounded-xl bg-amber-100 px-4 py-2 text-sm text-amber-900"
          >
            Live updates are paused. We're refreshing periodically instead.
          </p>
        )
      )}
      <main>
        <Outlet />
      </main>
      {showFab && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-md">
            <Link
              to="/expense/new"
              className="pointer-events-auto flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 text-lg font-semibold text-white shadow-lg hover:bg-emerald-800"
            >
              <span aria-hidden className="text-2xl leading-none">
                +
              </span>{' '}
              Add expense
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

function NotConfigured() {
  return (
    <FullScreen>
      <h1 className="text-2xl font-bold">Supabase isn't configured</h1>
      <p className="mt-3 text-slate-600">
        Copy <code>.env.example</code> to <code>.env</code> and set <code>VITE_SUPABASE_URL</code>{' '}
        and <code>VITE_SUPABASE_ANON_KEY</code>, then restart the dev server. See the README.
      </p>
    </FullScreen>
  )
}

export function App() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 5_000,
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
          },
        },
      }),
  )
  if (!isSupabaseConfigured) return <NotConfigured />

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SpaceProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="history" element={<History />} />
              <Route path="stats" element={<Statistics />} />
              <Route path="expense/new" element={<NewExpensePage />} />
              <Route path="expense/:id" element={<EditExpensePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </SpaceProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
