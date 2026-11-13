import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { SpaceInfo } from '@/types/domain'
import { useSpace } from './SpaceProvider'

const subtitle = (s: SpaceInfo) =>
  s.solo ? 'Just you' : s.partner ? `With ${s.partner.displayName}` : 'Waiting for your partner'

/** The dashboard title: shows the current space and opens a menu to switch or add spaces. */
export function SpaceSwitcher() {
  const { space, spaces, switchSpace } = useSpace()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={root} className="relative min-w-0 flex-1">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${space.name}. Switch space`}
        onClick={() => setOpen((o) => !o)}
        className="-ml-2 flex max-w-full min-w-0 flex-col items-start rounded-xl px-2 py-1 text-left hover:bg-white/60"
      >
        <span className="text-xs font-semibold tracking-wide text-emerald-800 uppercase">
          TwoBalance
        </span>
        <span className="flex max-w-full items-center gap-1">
          <span className="line-clamp-2 text-lg leading-tight font-bold text-balance sm:text-xl">
            {space.name}
          </span>
          <svg
            aria-hidden
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Your spaces"
          className="absolute left-0 z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200"
        >
          <ul className="max-h-72 overflow-y-auto py-1">
            {spaces.map((s) => {
              const current = s.coupleId === space.coupleId
              return (
                <li key={s.coupleId} role="none">
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={current}
                    onClick={() => {
                      switchSpace(s.coupleId)
                      setOpen(false)
                    }}
                    className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left hover:bg-slate-50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 font-semibold text-balance">{s.name}</span>
                      <span className="block truncate text-sm text-slate-600">{subtitle(s)}</span>
                    </span>
                    {current && (
                      <svg
                        aria-hidden
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="shrink-0 text-emerald-700"
                      >
                        <path d="M5 12l5 5 9-10" />
                      </svg>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
          <Link
            role="menuitem"
            to="/spaces/new"
            className="flex min-h-12 items-center gap-2 border-t border-slate-200 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            <span aria-hidden className="text-xl leading-none">
              +
            </span>
            Add another space
          </Link>
        </div>
      )}
    </div>
  )
}
