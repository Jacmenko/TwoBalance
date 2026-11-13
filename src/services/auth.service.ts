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

export interface CurrentUser {
  id: string
  email: string | null
  isAnonymous: boolean
}

export const MIN_PASSWORD_LENGTH = 8

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

/** Fresh user record from the server (the cached session can be stale after linking). */
export async function fetchCurrentUser(): Promise<CurrentUser> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw toAppError(error ?? new Error('not_authenticated'))
  return {
    id: data.user.id,
    email: data.user.email ?? null,
    isAnonymous: data.user.is_anonymous ?? false,
  }
}

/** Anonymous user -> permanent: attaches an email + password to this identity. The user
 *  id (and therefore the shared space) is preserved. Requires "Confirm email" to be off
 *  in Supabase, otherwise the email stays pending until confirmed. */
export async function linkEmailPassword(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ email: normalizeEmail(email), password })
  if (error) throw toAppError(error)
}

/** Sign in to an existing account on this device. */
export async function signInWithPassword(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(email),
    password,
  })
  if (error) throw toAppError(error)
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw toAppError(error)
}
