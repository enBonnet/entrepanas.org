import { getLocale, setLocale, locales } from '#/paraglide/runtime.js'

// ponytail: setLocale persists the cookie; reload lets SSR render the whole page
// in the new locale (avoids a per-component re-render binding). Add paraglide-js-react
// if a no-reload, live-switching UX is needed.
export function LanguageSwitcher() {
  const current = getLocale()
  const next = locales.find((l) => l !== current) ?? current

  return (
    <button
      type="button"
      onClick={() => {
        setLocale(next)
        window.location.reload()
      }}
      className="text-sm uppercase"
      style={{ color: 'var(--sea-ink-soft)' }}
      aria-label={`Switch to ${next}`}
    >
      {next}
    </button>
  )
}
