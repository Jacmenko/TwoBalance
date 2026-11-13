import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { invalidateLedger } from '@/features/queries'

export type RealtimeStatus = 'connecting' | 'live' | 'interrupted'

/**
 * Realtime is only a *notification*: every event just invalidates queries so
 * the data is refetched from the database (the source of truth). Duplicate or
 * out-of-order events are therefore harmless. On (re)connect, tab refocus and
 * browser "online" we refetch too, and while realtime is down we poll.
 */
export function useRealtimeSync(coupleId: string | null): RealtimeStatus {
  const qc = useQueryClient()
  const [status, setStatus] = useState<RealtimeStatus>('connecting')

  useEffect(() => {
    if (!coupleId) return
    const refetchAll = () => {
      void invalidateLedger(qc)
      void qc.invalidateQueries({ queryKey: ['space'] })
    }

    const channel = supabase
      .channel(`couple-${coupleId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `couple_id=eq.${coupleId}` },
        () => void invalidateLedger(qc),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'members', filter: `couple_id=eq.${coupleId}` },
        () => void qc.invalidateQueries({ queryKey: ['space'] }),
      )
      .subscribe((s) => {
        if (s === 'SUBSCRIBED') {
          setStatus('live')
          refetchAll() // catch anything missed while disconnected
        } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
          setStatus('interrupted')
        }
      })

    const onOnline = () => refetchAll()
    const onVisible = () => document.visibilityState === 'visible' && refetchAll()
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.removeEventListener('online', onOnline)
      document.removeEventListener('visibilitychange', onVisible)
      void supabase.removeChannel(channel)
    }
  }, [coupleId, qc])

  // Fallback polling while realtime is not connected.
  useEffect(() => {
    if (!coupleId || status === 'live') return
    const t = setInterval(() => {
      void invalidateLedger(qc)
      void qc.invalidateQueries({ queryKey: ['space'] })
    }, 20_000)
    return () => clearInterval(t)
  }, [coupleId, status, qc])

  return status
}
