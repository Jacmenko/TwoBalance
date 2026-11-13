/** Translate backend/network failures into safe, friendly messages (in the active language). */
import { t } from '@/i18n/core'

const KNOWN = [
  'invalid_invite',
  'couple_full',
  'already_member',
  'already_solo',
  'invalid_space_name',
  'invalid_display_name',
  'not_authenticated',
  'not_a_member',
  'invalid_category',
  'expenses_amount_check',
  'expenses_description_check',
] as const

const AUTH_CODES = [
  'email_exists',
  'over_request_rate_limit',
  'validation_failed',
  'invalid_credentials',
  'weak_password',
  'same_password',
  'email_not_confirmed',
  'email_address_invalid',
] as const

export class AppError extends Error {
  readonly kind: 'network' | 'permission' | 'session' | 'known' | 'unknown'
  constructor(message: string, kind: AppError['kind']) {
    super(message)
    this.kind = kind
  }
}

function isNetworkError(e: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  const msg = String((e as { message?: string })?.message ?? '')
  return (
    e instanceof TypeError ||
    /failed to fetch|networkerror|load failed|network request failed/i.test(msg)
  )
}

export function toAppError(e: unknown): AppError {
  if (e instanceof AppError) return e
  if (isNetworkError(e)) {
    return new AppError(t('error.network'), 'network')
  }
  const err = e as { message?: string; code?: string; status?: number }
  const msg = err?.message ?? ''
  const authCode = AUTH_CODES.find((c) => c === err?.code)
  if (authCode) return new AppError(t(`error.${authCode}`), 'known')
  for (const key of KNOWN) {
    if (msg.includes(key)) {
      return new AppError(t(`error.${key}`), key === 'not_authenticated' ? 'session' : 'known')
    }
  }
  if (err?.code === '42501' || /row-level security|permission denied/i.test(msg)) {
    return new AppError(t('error.permission'), 'permission')
  }
  if (err?.status === 401 || /jwt|not authenticated/i.test(msg)) {
    return new AppError(t('error.not_authenticated'), 'session')
  }
  return new AppError(t('error.unknown'), 'unknown')
}

export async function unwrap<T>(p: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  let res
  try {
    res = await p
  } catch (e) {
    throw toAppError(e)
  }
  if (res.error) throw toAppError(res.error)
  return res.data as T
}
