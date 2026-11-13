import { useState, type FormEvent } from 'react'
import { Button, Field, InlineError, inputClass } from '@/components/ui'
import {
  linkEmailPassword,
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
  signInWithPassword,
} from '@/services/auth.service'
import { toAppError } from '@/services/errors'
import { useI18n } from '@/i18n/I18nProvider'

type Mode = 'link' | 'signin'

/** Email + password. `link` attaches them to this (anonymous) identity;
 *  `signin` signs in to an existing account. */
export function CredentialsForm({
  mode,
  onDone,
}: {
  mode: Mode
  onDone: () => void | Promise<void>
}) {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const addr = normalizeEmail(email)
    if (!/^\S+@\S+\.\S+$/.test(addr)) {
      setError(t('auth.validEmail'))
      return
    }
    if (mode === 'link' && password.length < MIN_PASSWORD_LENGTH) {
      setError(t('auth.passwordMin', { n: MIN_PASSWORD_LENGTH }))
      return
    }
    if (mode === 'signin' && password.length === 0) {
      setError(t('auth.enterPassword'))
      return
    }
    setBusy(true)
    try {
      if (mode === 'link') await linkEmailPassword(addr, password)
      else await signInWithPassword(addr, password)
      await onDone()
    } catch (err) {
      setError(toAppError(err).message)
      setBusy(false)
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-4" noValidate>
      <Field label={t('auth.email')} htmlFor="auth-email">
        <input
          id="auth-email"
          type="email"
          inputMode="email"
          className={inputClass}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder={t('auth.emailPlaceholder')}
        />
      </Field>
      <Field label={t('auth.password')} htmlFor="auth-password">
        <input
          id="auth-password"
          type="password"
          className={inputClass}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'link' ? 'new-password' : 'current-password'}
        />
      </Field>
      <InlineError message={error} />
      <Button type="submit" full disabled={busy}>
        {busy
          ? t('common.pleaseWait')
          : mode === 'link'
            ? t('auth.secureMyAccount')
            : t('auth.signIn')}
      </Button>
    </form>
  )
}
