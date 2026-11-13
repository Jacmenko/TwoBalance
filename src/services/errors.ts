/** Translate backend/network failures into safe, friendly messages. */

const KNOWN: Record<string, string> = {
  invalid_invite: 'That invitation code is invalid, already used, or has expired.',
  couple_full: 'This shared space already has two members.',
  already_member: 'This device is already part of a shared space.',
  invalid_display_name: 'Enter a name between 1 and 40 characters.',
  not_authenticated: 'Your session is missing or expired.',
  not_a_member: "You're not a member of a shared space.",
  invalid_category: 'Please choose a valid category.',
  expenses_amount_check: 'Amount must be greater than zero and at most 1,000,000.',
  expenses_description_check: 'Description can be at most 120 characters.',
}

const AUTH_CODES: Record<string, string> = {
  email_exists: 'That email is already linked to an account. Use "Sign in" instead.',
  over_request_rate_limit: 'Too many attempts. Wait a few minutes and try again.',
  validation_failed: 'Check the email and password and try again.',
  invalid_credentials: 'Wrong email or password.',
  weak_password: 'That password is too weak. Use at least 8 characters.',
  same_password: 'That is already your password.',
  email_not_confirmed: 'This email is not confirmed yet. In Supabase, turn off "Confirm email".',
  email_address_invalid: 'Enter a valid email address.',
}

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
    return new AppError(
      "You appear to be offline or the server can't be reached. Try again.",
      'network',
    )
  }
  const err = e as { message?: string; code?: string; status?: number }
  const msg = err?.message ?? ''
  const authText = err?.code ? AUTH_CODES[err.code] : undefined
  if (authText) return new AppError(authText, 'known')
  for (const [key, text] of Object.entries(KNOWN)) {
    if (msg.includes(key)) {
      return new AppError(text, key === 'not_authenticated' ? 'session' : 'known')
    }
  }
  if (err?.code === '42501' || /row-level security|permission denied/i.test(msg)) {
    return new AppError("You don't have permission to do that.", 'permission')
  }
  if (err?.status === 401 || /jwt|not authenticated/i.test(msg)) {
    return new AppError('Your session is missing or expired.', 'session')
  }
  return new AppError('Something went wrong. Please try again.', 'unknown')
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
