import { useState } from 'react'
import { Button, FullScreen } from '@/components/ui'

export async function shareInvite(code: string): Promise<'shared' | 'copied' | 'failed'> {
  const text = `Join me on TwoBalance. Open ${window.location.origin} and use this invitation code: ${code}`
  try {
    if (navigator.share) {
      await navigator.share({ title: 'TwoBalance invitation', text })
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
  const [msg, setMsg] = useState('')
  return (
    <div>
      <p
        aria-label={`Invitation code ${code.split('').join(' ')}`}
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
              setMsg('Code copied.')
            } catch {
              setMsg('Could not copy — please copy the code manually.')
            }
          }}
        >
          Copy code
        </Button>
        <Button
          full
          onClick={async () => {
            const r = await shareInvite(code)
            setMsg(r === 'copied' ? 'Invitation copied.' : r === 'failed' ? '' : '')
          }}
        >
          Share
        </Button>
      </div>
      <p role="status" className="mt-2 min-h-5 text-sm text-slate-600">
        {msg}
      </p>
    </div>
  )
}

export function InviteReveal({ code, onContinue }: { code: string; onContinue: () => void }) {
  return (
    <FullScreen>
      <h1 className="text-2xl font-bold">Your space is ready</h1>
      <p className="mt-2 text-slate-600">
        Send this one-time code to your partner. They open TwoBalance on their phone, enter their
        name and this code. It works once and expires in 7 days.
      </p>
      <div className="mt-6">
        <InviteCode code={code} />
      </div>
      <p className="mt-2 text-sm text-slate-500">
        This code is shown only now. If you lose it before your partner joins, you can generate a
        new one from the dashboard.
      </p>
      <Button full className="mt-6" onClick={onContinue}>
        Continue to dashboard
      </Button>
    </FullScreen>
  )
}
