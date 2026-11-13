import { useState } from 'react'
import { Button, FullScreen } from '@/components/ui'
import { t } from '@/i18n/core'
import { useI18n } from '@/i18n/I18nProvider'

export async function shareInvite(code: string): Promise<'shared' | 'copied' | 'failed'> {
  const text = t('invite.shareText', { url: window.location.origin, code })
  try {
    if (navigator.share) {
      await navigator.share({ title: t('invite.shareTitle'), text })
      return 'shared'
    }
  } catch (e) {
    if ((e as DOMException)?.name === 'AbortError') return 'failed'
  }
  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'failed'
  }
}

export function InviteCode({ code }: { code: string }) {
  // Subscribes to language changes; the handlers below call the module-level t().
  useI18n()
  const [msg, setMsg] = useState('')
  return (
    <div>
      <p
        aria-label={t('invite.codeAria', { code: code.split('').join(' ') })}
        className="rounded-2xl border border-slate-200 bg-white px-4 py-5 text-center font-mono text-3xl font-bold tracking-widest"
      >
        {code}
      </p>
      <div className="mt-3 flex gap-3">
        <Button
          variant="secondary"
          full
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code)
              setMsg(t('invite.codeCopied'))
            } catch {
              setMsg(t('invite.copyFailed'))
            }
          }}
        >
          {t('invite.copyCode')}
        </Button>
        <Button
          full
          onClick={async () => {
            const r = await shareInvite(code)
            setMsg(r === 'copied' ? t('invite.invitationCopied') : '')
          }}
        >
          {t('invite.share')}
        </Button>
      </div>
      <p role="status" className="mt-2 min-h-5 text-sm text-slate-600">
        {msg}
      </p>
    </div>
  )
}

export function InviteReveal({ code, onContinue }: { code: string; onContinue: () => void }) {
  const { t } = useI18n()
  return (
    <FullScreen>
      <h1 className="text-2xl font-bold">{t('reveal.title')}</h1>
      <p className="mt-2 text-slate-600">{t('reveal.body')}</p>
      <div className="mt-6">
        <InviteCode code={code} />
      </div>
      <p className="mt-2 text-sm text-slate-500">{t('reveal.shownOnce')}</p>
      <Button full className="mt-6" onClick={onContinue}>
        {t('reveal.continue')}
      </Button>
    </FullScreen>
  )
}
