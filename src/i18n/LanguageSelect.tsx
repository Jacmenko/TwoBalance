import { useEffect, useRef, useState } from 'react'
import { useI18n } from './I18nProvider'
import { LANGUAGES, type Language } from './core'

/** Simple SVG flags: emoji flags don't render on Windows, SVG looks the same everywhere. */
export function Flag({
  language,
  className = 'h-5 w-7',
}: {
  language: Language
  className?: string
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 30 20"
      className={`${className} shrink-0 rounded-[3px] ring-1 ring-black/10`}
    >
      {language === 'en' && (
        <>
          <rect width="30" height="20" fill="#012169" />
          <path d="M0 0l30 20M30 0L0 20" stroke="#fff" strokeWidth="4" />
          <path d="M0 0l30 20M30 0L0 20" stroke="#C8102E" strokeWidth="1.6" />
          <path d="M15 0v20M0 10h30" stroke="#fff" strokeWidth="6.5" />
          <path d="M15 0v20M0 10h30" stroke="#C8102E" strokeWidth="4" />
        </>
      )}
      {language === 'es' && (
        <>
          <rect width="30" height="20" fill="#AA151B" />
          <rect y="5" width="30" height="10" fill="#F1BF00" />
        </>
      )}
      {language === 'sk' && (
        <>
          <rect width="30" height="6.67" fill="#fff" />
          <rect y="6.67" width="30" height="6.67" fill="#0B4EA2" />
          <rect y="13.33" width="30" height="6.67" fill="#EE1C25" />
          <path
            d="M6 4h8v7.5c0 2.8-2.2 4.4-4 5.2-1.8-.8-4-2.4-4-5.2z"
            fill="#EE1C25"
            stroke="#fff"
            strokeWidth="1"
          />
          <path d="M10 6v8M7.6 8.2h4.8M8.1 10.4h3.8" stroke="#fff" strokeWidth="1" />
        </>
      )}
    </svg>
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
