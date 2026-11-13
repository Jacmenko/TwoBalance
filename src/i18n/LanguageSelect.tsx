import { useEffect, useRef, useState } from 'react'
import { useI18n } from './I18nProvider'
import { LANGUAGES, type Language } from './core'
import es from './flags/es.svg'
import gb from './flags/gb.svg'
import sk from './flags/sk.svg'

// Real flag artwork from the MIT-licensed "flag-icons" set (see flags/LICENSE).
const FLAG_SRC: Record<Language, string> = { en: gb, es, sk }

export function Flag({
  language,
  className = 'h-5 w-[27px]',
}: {
  language: Language
  className?: string
}) {
  return (
    <img
      src={FLAG_SRC[language]}
      alt=""
      aria-hidden
      draggable={false}
      className={`${className} shrink-0 rounded-[3px] object-cover ring-1 ring-black/10`}
    />
  )
}

/** Dropdown (listbox) that shows each language with its flag. */
export function LanguageSelect() {
  const { language, setLanguage, t } = useI18n()
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
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t('language.label')}: ${t(`language.${language}`)}`}
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 hover:bg-slate-50"
      >
        <Flag language={language} />
        <svg
          aria-hidden
          width="16"
          height="16"
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
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t('language.label')}
          className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-2xl bg-white py-1 shadow-xl ring-1 ring-slate-200"
        >
          {LANGUAGES.map((l) => (
            <li key={l} role="option" aria-selected={l === language}>
              <button
                type="button"
                onClick={() => {
                  setLanguage(l)
                  setOpen(false)
                }}
                className="flex min-h-12 w-full items-center gap-3 px-4 text-left hover:bg-slate-50"
              >
                <Flag language={l} />
                <span className="flex-1 font-medium">{t(`language.${l}`)}</span>
                {l === language && (
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
          ))}
        </ul>
      )}
    </div>
  )
}
