import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { fetchSpaces } from '@/services/couple.service'
import { markHadSpace } from '@/services/auth.service'
import { toAppError } from '@/services/errors'
import { ErrorState, FullScreen, Spinner } from '@/components/ui'
import { useRealtimeSync, type RealtimeStatus } from '@/features/realtime/useRealtimeSync'
import type { SpaceInfo } from '@/types/domain'
import { Onboarding } from './Onboarding'
import { InviteReveal } from './InviteReveal'

interface SpaceContextValue {
  /** The space currently shown. */
  space: SpaceInfo
  /** Every space this account belongs to. */
  spaces: SpaceInfo[]
  realtime: RealtimeStatus
  memberName: (memberId: string) => string
  switchSpace: (coupleId: string) => void
  /** Call after creating/joining a space: reload the list, make it current and, for a new
   *  space, show its invitation code. */
  enterSpace: (coupleId: string, inviteCode?: string) => Promise<void>
}

const SpaceContext = createContext<SpaceContextValue | null>(null)

export function useSpace(): SpaceContextValue {
  const ctx = useContext(SpaceContext)
  if (!ctx) throw new Error('useSpace outside SpaceProvider')
  return ctx
}

const ACTIVE_KEY = 'twobalance.activeSpace'

function readActive(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY)
  } catch {
    return null
  }
}

function writeActive(id: string) {
  try {
    localStorage.setItem(ACTIVE_KEY, id)
  } catch {
    /* storage unavailable */
  }
}

export function SpaceProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth()
  const qc = useQueryClient()
  const [pendingInvite, setPendingInvite] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(readActive)
  const q = useQuery({ queryKey: ['space', userId], queryFn: () => fetchSpaces(userId) })
  const spaces = q.data ?? []
  // Fall back to the first space if the remembered one is gone or not loaded yet.
  const space = spaces.find((s) => s.coupleId === activeId) ?? spaces[0] ?? null
  const realtime = useRealtimeSync(space?.coupleId ?? null)

  useEffect(() => {
    if (space) markHadSpace(true)
  }, [space])

  const switchSpace = (coupleId: string) => {
    writeActive(coupleId)
    setActiveId(coupleId)
  }

  const enterSpace = async (coupleId: string, inviteCode?: string) => {
    if (inviteCode) setPendingInvite(inviteCode)
    await qc.invalidateQueries({ queryKey: ['space'] })
    switchSpace(coupleId)
  }

  if (q.isPending) return <Spinner label="Loading your spaces…" />
  if (q.isError && !space) {
    return (
      <FullScreen>
        <ErrorState message={toAppError(q.error).message} onRetry={() => void q.refetch()} />
      </FullScreen>
    )
  }
  if (!space) return <Onboarding enterSpace={enterSpace} />
  if (pendingInvite)
    return <InviteReveal code={pendingInvite} onContinue={() => setPendingInvite(null)} />

  const memberName = (id: string) =>
    id === space.me.id ? 'You' : id === space.partner?.id ? space.partner.displayName : 'Partner'

  return (
    <SpaceContext.Provider value={{ space, spaces, realtime, memberName, switchSpace, enterSpace }}>
      {children}
    </SpaceContext.Provider>
  )
}
