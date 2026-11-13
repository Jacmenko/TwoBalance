import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { toAppError } from './errors'

const HAD_SPACE_KEY = 'twobalance.hadSpace'

/** Remember (per browser) that this identity belonged to a space, so a lost
 *  session is reported instead of silently minting a fresh identity. */
export function markHadSpace(value: boolean) {
  try {
    if (value) localStorage.setItem(HAD_SPACE_KEY, '1')
    else localStorage.removeItem(HAD_SPACE_KEY)
  } catch {
    /* storage unavailable */
  }
}

export function hadSpace(): boolean {
  try {
    return localStorage.getItem(HAD_SPACE_KEY) === '1'
  } catch {
    return false
  }
}

export async function getSession(): Promise<Session | null> {
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return data.session
  } catch (e) {
    throw toAppError(e)
  }
}

export async function signInAnonymously(): Promise<Session> {
  try {
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error) throw error
    if (!data.session) throw new Error('No session returned')
    return data.session
  } catch (e) {
    throw toAppError(e)
  }
}
