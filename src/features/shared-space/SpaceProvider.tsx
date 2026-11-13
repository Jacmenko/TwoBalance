import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { fetchSpace } from '@/services/couple.service'
import { markHadSpace } from '@/services/auth.service'
import { toAppError } from '@/services/errors'
import { ErrorState, FullScreen, Spinner } from '@/components/ui'
import { useRealtimeSync, type RealtimeStatus } from '@/features/realtime/useRealtimeSync'
import type { SpaceInfo } from '@/types/domain'
import { Onboarding } from './Onboarding'
import { InviteReveal } from './InviteReveal'

interface SpaceContextValue {
  space: SpaceInfo
  realtime: RealtimeStatus
  memberName: (memberId: string) => string
}

const SpaceContext = createContext<SpaceContextValue | null>(null)

export function useSpace(): SpaceContextValue {
  const ctx = useContext(SpaceContext)
  if (!ctx) throw new Error('useSpace outside SpaceProvider')
  return ctx
}

export function SpaceProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth()
  const [pendingInvite, setPendingInvite] = useState<string | null>(null)
  const q = useQuery({ queryKey: ['space', userId], queryFn: () => fetchSpace(userId) })
  const space = q.data ?? null
  const realtime = useRealtimeSync(space?.coupleId ?? null)

  useEffect(() => {
    if (space) markHadSpace(true)
  }, [space])

  if (q.isPending) return <Spinner label="Loading your space…" />
  if (q.isError && !space) {
    return (
      <FullScreen>
        <ErrorState message={toAppError(q.error).message} onRetry={() => void q.refetch()} />
      </FullScreen>
    )
  }
  if (!space) return <Onboarding onCreated={setPendingInvite} />
  if (pendingInvite)
    return <InviteReveal code={pendingInvite} onContinue={() => setPendingInvite(null)} />

  const memberName = (id: string) =>
    id === space.me.id ? 'You' : id === space.partner?.id ? space.partner.displayName : 'Partner'

  return (
    <SpaceContext.Provider value={{ space, realtime, memberName }}>
      {children}
    </SpaceContext.Provider>
  )
}
