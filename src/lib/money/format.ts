// Money helpers. All amounts are integer cents. No floating-point money math.

export const MAX_AMOUNT_CENTS = 100_000_000 // 1,000,000.00 EUR (matches DB check)

export type ParseResult = { ok: true; cents: number } | { ok: false; error: string }

/**
 * Parse user input like "10", "10.5", "10,50" into integer cents.
 * Accepts '.' or ',' as the single decimal separator; rejects thousands
 * separators, signs, exponents and more than two decimals.
 */
export function parseAmountToCents(input: string): ParseResult {
  const s = input.trim()
  if (s === '') return { ok: false, error: 'Enter an amount.' }
  const m = /^(\d{1,9})(?:[.,](\d{1,2}))?$/.exec(s)
  if (!m) {
    if (/[.,]\d{3,}$/.test(s)) return { ok: false, error: 'Use at most two decimal places.' }
    return { ok: false, error: 'Enter a valid amount, e.g. 12.50.' }
  }
  const whole = Number(m[1])
  const frac = Number((m[2] ?? '').padEnd(2, '0'))
  const cents = whole * 100 + frac
  if (cents <= 0) return { ok: false, error: 'Amount must be greater than zero.' }
  if (cents > MAX_AMOUNT_CENTS) return { ok: false, error: 'Amount is too large (max 1,000,000).' }
  return { ok: true, cents }
}

/** Integer cents -> "1234.50" (plain, for editing inputs). */
export function centsToInputString(cents: number): string {
  const abs = Math.abs(cents)
  return `${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, '0')}`
}

function groupThousands(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** 12345 -> "123.45 €". Negative amounts get a leading minus. */
export function formatEur(cents: number, opts: { signed?: boolean } = {}): string {
  const abs = Math.abs(cents)
  const body = `${groupThousands(Math.trunc(abs / 100))}.${String(abs % 100).padStart(2, '0')} €`
  if (cents < 0) return `−${body}`
  if (opts.signed && cents > 0) return `+${body}`
  return body
}
