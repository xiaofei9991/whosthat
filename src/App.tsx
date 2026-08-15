import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { tmdb, img } from './api'
import { slugify } from './slugify'
import {
  getShowProgress,
  saveShowProgress,
  removeShowProgress,
  listProgress,
} from './progress'
import { t, getLang, setLang } from './i18n'
import type {
  ListedProgress,
  MediaType,
  Navigate,
  RecentSearch,
  Route,
  StaticPageId,
  TmdbCastMember,
  TmdbDetails,
  TmdbEpisodeCredits,
  TmdbListResponse,
  TmdbPerson,
  TmdbSeasonCredits,
  TmdbTitle,
} from './types'

function progressLabel(p: ListedProgress): string {
  if (p.season === 'all') return t('prog.whole')
  if (p.episode && p.episode !== 'all') return t('prog.se', { s: p.season, e: p.episode })
  return t('prog.season', { n: p.season })
}

// Parses /movie/:id/:slug, /tv/:id/:slug, /tv/:id/season-:n/:slug,
// /who-plays/:type/:mediaId/:personId/:slug and static pages; anything else is home.
function parseRoute(pathname: string): Route {
  const w = pathname.match(/^\/who-plays\/(movie|tv)\/(\d+)\/(\d+)(?:\/|$)/)
  if (w)
    return {
      type: 'whoplays',
      mediaType: w[1] as MediaType,
      mediaId: Number(w[2]),
      personId: Number(w[3]),
    }
  const s = pathname.match(/^\/tv\/(\d+)\/season-(\d+)(?:\/|$)/)
  if (s) return { type: 'season', id: Number(s[1]), season: Number(s[2]) }
  const m = pathname.match(/^\/(movie|tv)\/(\d+)(?:\/|$)/)
  if (m) return { type: 'title', mediaType: m[1] as MediaType, id: Number(m[2]) }
  const st = pathname.match(/^\/(about|faq|privacy)\/?$/)
  if (st) return { type: 'static', page: st[1] as StaticPageId }
  return { type: 'home' }
}

function seasonUrl(id: number, season: number, name?: string | null): string {
  const slug = slugify(name)
  return `/tv/${id}/season-${season}${slug ? `/${slug}` : ''}`
}

function titleUrl(item: Pick<TmdbTitle, 'id' | 'media_type' | 'title' | 'name'>): string {
  const type = item.media_type === 'tv' ? 'tv' : 'movie'
  const slug = slugify(item.title || item.name)
  return `/${type}/${item.id}${slug ? `/${slug}` : ''}`
}

function whoPlaysUrl(
  mediaType: MediaType,
  mediaId: number,
  personId: number,
  character: string,
  titleName?: string | null,
): string {
  const slug = slugify(`who plays ${character} in ${titleName}`)
  return `/who-plays/${mediaType}/${mediaId}/${personId}${slug ? `/${slug}` : ''}`
}

function setCanonical(url: string): void {
  let link = document.querySelector('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }
  link.setAttribute('href', url)
}

function LangToggle() {
  const lang = getLang()
  return (
    <button
      onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
      aria-label={lang === 'zh' ? 'Switch to English' : '切换到中文'}
      title={lang === 'zh' ? 'Switch to English' : '切换到中文'}
      className="grid size-9 place-items-center rounded-lg border border-zinc-800 text-xs font-semibold text-zinc-400 transition hover:border-amber-400/50 hover:text-amber-400"
    >
      {lang === 'zh' ? 'EN' : '中'}
    </button>
  )
}

function InstallButton() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const onPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  if (!installPrompt) return null
  return (
    <button
      onClick={() => {
        void installPrompt.prompt()
        void installPrompt.userChoice.finally(() => setInstallPrompt(null))
      }}
      className="hidden rounded-lg border border-zinc-800 px-3 py-2 text-xs font-medium text-zinc-400 transition hover:border-amber-400/50 hover:text-amber-400 sm:block"
    >
      {t('install')}
    </button>
  )
}

function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false)

  const share = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
        return
      } catch {
        /* user cancelled */
      }
    } else {
      try {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 1600)
      } catch {
        /* clipboard unavailable */
      }
    }
  }

  return (
    <button
      onClick={share}
      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1 text-sm text-zinc-300 transition hover:border-amber-400/50 hover:text-amber-400"
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="6" cy="12" r="2.6" />
        <circle cx="17" cy="5.5" r="2.6" />
        <circle cx="17" cy="18.5" r="2.6" />
        <path d="M8.4 10.8l6.2-3.9M8.4 13.2l6.2 3.9" />
      </svg>
      {copied ? t('share.copied') : t('share')}
    </button>
  )
}

function ThemeToggle() {
  const [light, setLight] = useState(() =>
    document.documentElement.classList.contains('light'),
  )

  const toggle = () => {
    const next = !light
    setLight(next)
    const root = document.documentElement
    // Crossfade colors during the swap instead of an instant flip.
    root.classList.add('theme-switching')
    root.classList.toggle('light', next)
    window.setTimeout(() => root.classList.remove('theme-switching'), 350)
    try {
      localStorage.setItem('theme', next ? 'light' : 'dark')
    } catch {
      /* private mode */
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={light ? 'Switch to dark mode' : 'Switch to light mode'}
      title={light ? 'Switch to dark mode' : 'Switch to light mode'}
      className="grid size-9 place-items-center rounded-lg border border-zinc-800 text-zinc-400 transition hover:border-amber-400/50 hover:text-amber-400"
    >
      {light ? (
        <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M11.0174 2.80157C6.37072 3.29221 2.75 7.22328 2.75 12C2.75 17.1086 6.89137 21.25 12 21.25C16.7767 21.25 20.7078 17.6293 21.1984 12.9826C19.8717 14.6669 17.8126 15.75 15.5 15.75C11.4959 15.75 8.25 12.5041 8.25 8.5C8.25 6.18738 9.33315 4.1283 11.0174 2.80157ZM1.25 12C1.25 6.06294 6.06294 1.25 12 1.25C12.7166 1.25 13.0754 1.82126 13.1368 2.27627C13.196 2.71398 13.0342 3.27065 12.531 3.57467C10.8627 4.5828 9.75 6.41182 9.75 8.5C9.75 11.6756 12.3244 14.25 15.5 14.25C17.5882 14.25 19.4172 13.1373 20.4253 11.469C20.7293 10.9658 21.286 10.804 21.7237 10.8632C22.1787 10.9246 22.75 11.2834 22.75 12C22.75 17.9371 17.9371 22.75 12 22.75C6.06294 22.75 1.25 17.9371 1.25 12Z"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12 1.25C12.4142 1.25 12.75 1.58579 12.75 2V3C12.75 3.41421 12.4142 3.75 12 3.75C11.5858 3.75 11.25 3.41421 11.25 3V2C11.25 1.58579 11.5858 1.25 12 1.25ZM4.39861 4.39861C4.6915 4.10572 5.16638 4.10572 5.45927 4.39861L5.85211 4.79145C6.145 5.08434 6.145 5.55921 5.85211 5.85211C5.55921 6.145 5.08434 6.145 4.79145 5.85211L4.39861 5.45927C4.10572 5.16638 4.10572 4.6915 4.39861 4.39861ZM19.6011 4.39887C19.894 4.69176 19.894 5.16664 19.6011 5.45953L19.2083 5.85237C18.9154 6.14526 18.4405 6.14526 18.1476 5.85237C17.8547 5.55947 17.8547 5.0846 18.1476 4.79171L18.5405 4.39887C18.8334 4.10598 19.3082 4.10598 19.6011 4.39887ZM12 6.75C9.1005 6.75 6.75 9.1005 6.75 12C6.75 14.8995 9.1005 17.25 12 17.25C14.8995 17.25 17.25 14.8995 17.25 12C17.25 9.1005 14.8995 6.75 12 6.75ZM5.25 12C5.25 8.27208 8.27208 5.25 12 5.25C15.7279 5.25 18.75 8.27208 18.75 12C18.75 15.7279 15.7279 18.75 12 18.75C8.27208 18.75 5.25 15.7279 5.25 12ZM1.25 12C1.25 11.5858 1.58579 11.25 2 11.25H3C3.41421 11.25 3.75 11.5858 3.75 12C3.75 12.4142 3.41421 12.75 3 12.75H2C1.58579 12.75 1.25 12.4142 1.25 12ZM20.25 12C20.25 11.5858 20.5858 11.25 21 11.25H22C22.4142 11.25 22.75 11.5858 22.75 12C22.75 12.4142 22.4142 12.75 22 12.75H21C20.5858 12.75 20.25 12.4142 20.25 12ZM18.1476 18.1476C18.4405 17.8547 18.9154 17.8547 19.2083 18.1476L19.6011 18.5405C19.894 18.8334 19.894 19.3082 19.6011 19.6011C19.3082 19.894 18.8334 19.894 18.5405 19.6011L18.1476 19.2083C17.8547 18.9154 17.8547 18.4405 18.1476 18.1476ZM5.85211 18.1479C6.145 18.4408 6.145 18.9157 5.85211 19.2086L5.45927 19.6014C5.16638 19.8943 4.6915 19.8943 4.39861 19.6014C4.10572 19.3085 4.10572 18.8336 4.39861 18.5407L4.79145 18.1479C5.08434 17.855 5.55921 17.855 5.85211 18.1479ZM12 20.25C12.4142 20.25 12.75 20.5858 12.75 21V22C12.75 22.4142 12.4142 22.75 12 22.75C11.5858 22.75 11.25 22.4142 11.25 22V21C11.25 20.5858 11.5858 20.25 12 20.25Z"
          />
        </svg>
      )}
    </button>
  )
}

export default function App() {
  const [route, setRoute] = useState(() => parseRoute(window.location.pathname))

  useEffect(() => {
    document.documentElement.lang = getLang() === 'zh' ? 'zh-CN' : 'en'
  }, [])

  useEffect(() => {
    const onPopState = () => setRoute(parseRoute(window.location.pathname))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = (path: string) => {
    if (path !== window.location.pathname) window.history.pushState(null, '', path)
    setRoute(parseRoute(path))
    window.scrollTo(0, 0)
  }

  useEffect(() => {
    if (route.type === 'home') {
      document.title = t('title.default')
      setCanonical(`${window.location.origin}/`)
      // Unknown deep paths fall back to home; normalize the URL so the
      // address bar and canonical don't disagree.
      if (window.location.pathname !== '/') window.history.replaceState(null, '', '/')
    }
  }, [route])

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault()
              navigate('/')
            }}
            className="flex items-center gap-2 text-lg font-bold tracking-tight"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-amber-400 text-zinc-950">
              <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
                <path d="M15.9998 10.5004C15.9998 11.3288 15.5521 12.0004 14.9998 12.0004C14.4475 12.0004 13.9998 11.3288 13.9998 10.5004C13.9998 9.67196 14.4475 9.00039 14.9998 9.00039C15.5521 9.00039 15.9998 9.67196 15.9998 10.5004Z" />
                <path d="M9.99982 10.5004C9.99982 11.3288 9.5521 12.0004 8.99982 12.0004C8.44753 12.0004 7.99982 11.3288 7.99982 10.5004C7.99982 9.67196 8.44753 9.00039 8.99982 9.00039C9.5521 9.00039 9.99982 9.67196 9.99982 10.5004Z" />
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M13.2648 2.05116C13.3472 1.64522 13.7431 1.38294 14.149 1.46533C18.3625 2.32056 21.6797 5.63763 22.535 9.85114C22.6173 10.2571 22.3551 10.6529 21.9491 10.7353C21.5432 10.8177 21.1473 10.5555 21.0649 10.1495C20.3295 6.52642 17.4738 3.67075 13.8506 2.93535C13.4447 2.85296 13.1824 2.45709 13.2648 2.05116ZM10.735 2.05121C10.8174 2.45714 10.5551 2.85301 10.1492 2.93541C6.52602 3.6708 3.67032 6.52647 2.93486 10.1496C2.85246 10.5555 2.45659 10.8178 2.05065 10.7354C1.64472 10.653 1.38244 10.2571 1.46484 9.85119C2.32014 5.63769 5.63726 2.32061 9.85079 1.46538C10.2567 1.38299 10.6526 1.64527 10.735 2.05121ZM2.05081 13.2654C2.45675 13.183 2.85262 13.4453 2.93502 13.8512C3.67048 17.4743 6.52618 20.33 10.1493 21.0654C10.5553 21.1478 10.8175 21.5436 10.7351 21.9496C10.6528 22.3555 10.2569 22.6178 9.85095 22.5354C5.63742 21.6802 2.3203 18.3631 1.465 14.1496C1.3826 13.7437 1.64488 13.3478 2.05081 13.2654ZM21.9491 13.2654C22.3551 13.3478 22.6173 13.7437 22.535 14.1496C21.6797 18.3631 18.3625 21.6802 14.149 22.5354C13.7431 22.6178 13.3472 22.3555 13.2648 21.9496C13.1824 21.5436 13.4447 21.1478 13.8506 21.0654C17.4738 20.33 20.3295 17.4743 21.0649 13.8512C21.1473 13.4453 21.5432 13.183 21.9491 13.2654ZM8.39729 15.5538C8.64395 15.221 9.11366 15.1512 9.44643 15.3979C10.1748 15.9377 11.0539 16.2504 11.9998 16.2504C12.9457 16.2504 13.8249 15.9377 14.5532 15.3979C14.886 15.1512 15.3557 15.221 15.6023 15.5538C15.849 15.8865 15.7792 16.3563 15.4464 16.6029C14.474 17.3237 13.2848 17.7504 11.9998 17.7504C10.7148 17.7504 9.52562 17.3237 8.55321 16.6029C8.22044 16.3563 8.15063 15.8865 8.39729 15.5538Z"
                />
              </svg>
            </span>
            Who&rsquo;s That?
          </a>
          <span className="hidden text-sm text-zinc-500 sm:inline">{t('tagline')}</span>
          <span className="ml-auto flex items-center gap-2">
            <InstallButton />
            <LangToggle />
            <ThemeToggle />
          </span>
        </div>
      </header>

      {route.type === 'home' ? (
        <Home onPick={(item) => navigate(titleUrl(item))} navigate={navigate} />
      ) : route.type === 'whoplays' ? (
        <WhoPlaysPage
          key={`${route.mediaType}-${route.mediaId}-${route.personId}`}
          mediaType={route.mediaType}
          mediaId={route.mediaId}
          personId={route.personId}
          navigate={navigate}
        />
      ) : route.type === 'season' ? (
        <SeasonPage
          key={`season-${route.id}-${route.season}`}
          id={route.id}
          season={route.season}
          navigate={navigate}
        />
      ) : route.type === 'static' ? (
        <StaticPage key={route.page} page={route.page} navigate={navigate} />
      ) : (
        <TitlePage
          key={`${route.mediaType}-${route.id}`}
          mediaType={route.mediaType}
          id={route.id}
          onBack={() => navigate('/')}
          navigate={navigate}
        />
      )}

      <footer className="mx-auto max-w-5xl border-t border-zinc-800/60 px-4 py-10 text-center text-xs text-zinc-600">
        <nav className="mb-3 flex justify-center gap-5 text-sm">
          {(
            [
              ['/about', t('footer.about')],
              ['/faq', t('footer.faq')],
              ['/privacy', t('footer.privacy')],
            ] as const
          ).map(([href, label]) => (
            <a
              key={href}
              href={href}
              onClick={(e) => {
                e.preventDefault()
                navigate(href)
              }}
              className="text-zinc-500 hover:text-amber-400"
            >
              {label}
            </a>
          ))}
          <a
            href="https://github.com/xiaofei9991/whosthat/issues"
            target="_blank"
            rel="noopener"
            className="text-zinc-500 hover:text-amber-400"
          >
            {t('footer.feedback')}
          </a>
        </nav>
        {t('footer.line')}
      </footer>
    </div>
  )
}

const RECENT_KEY = 'wt.recent'

function loadRecent(): RecentSearch[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) || 'null')
    return Array.isArray(saved)
      ? saved.filter((r): r is RecentSearch => Boolean(r && r.id && (r.title || r.name))).slice(0, 5)
      : []
  } catch {
    return []
  }
}

function Home({ onPick, navigate }: { onPick: (item: TmdbTitle) => void; navigate: Navigate }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TmdbTitle[] | null>(null)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [focused, setFocused] = useState(false)
  const [trending, setTrending] = useState<TmdbTitle[]>([])
  const [myShows, setMyShows] = useState(() => listProgress())
  const [recent, setRecent] = useState(loadRecent)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const pick = (item: TmdbTitle) => {
    const entry = { media_type: item.media_type, id: item.id, title: item.title, name: item.name }
    const next = [
      entry,
      ...recent.filter((r) => !(r.id === entry.id && r.media_type === entry.media_type)),
    ].slice(0, 5)
    setRecent(next)
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next))
      localStorage.removeItem('wt.searches') // legacy per-keystroke history
    } catch {
      /* private mode */
    }
    onPick(item)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!results || results.length === 0) {
      if (e.key === 'Escape') setResults(null)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => (i <= 0 ? results.length - 1 : i - 1))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      const picked = results[activeIdx]
      if (picked) pick(picked)
    } else if (e.key === 'Escape') {
      setResults(null)
    }
  }

  useEffect(() => {
    tmdb<TmdbListResponse<TmdbTitle>>('/trending/all/week')
      .then((d) => setTrending(d.results.filter((r) => r.media_type !== 'person').slice(0, 12)))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  useEffect(() => {
    clearTimeout(timer.current)
    setActiveIdx(-1)
    if (!query.trim()) {
      setResults(null)
      return
    }
    timer.current = setTimeout(() => {
      tmdb<TmdbListResponse<TmdbTitle>>('/search/multi', { query: query.trim() })
        .then((d) =>
          setResults(
            d.results
              .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
              .slice(0, 10),
          ),
        )
        .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
    }, 300)
  }, [query])

  return (
    <main className="mx-auto max-w-5xl px-4">
      <section className="py-14 text-center sm:py-20">
        <h1 className="animate-fade-up mx-auto max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl">
          {t('hero.h1')}
        </h1>
        <p
          className="animate-fade-up mx-auto mt-4 max-w-xl text-zinc-400"
          style={{ animationDelay: '90ms' }}
        >
          {t('hero.sub')} <span className="text-amber-400">{t('hero.zero')}</span>
        </p>

        <div
          className="animate-fade-up relative z-10 mx-auto mt-8 max-w-xl"
          style={{ animationDelay: '180ms' }}
        >
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => setFocused(true)}
            onClick={() => setFocused(true)}
            onBlur={() =>
              setTimeout(() => {
                setResults(null)
                setFocused(false)
              }, 150)
            }
            role="combobox"
            aria-expanded={!!results}
            aria-autocomplete="list"
            placeholder={t('search.ph')}
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-5 py-4 text-lg outline-none transition duration-200 placeholder:text-zinc-500 focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10"
          />
          {(results || (focused && !query.trim() && recent.length > 0)) && (
            <ul className="animate-pop-in absolute z-10 mt-2 w-full overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 text-left shadow-2xl">
              {!results && (
                <li className="px-5 py-3">
                  <span className="mb-1.5 block text-xs text-zinc-500">{t('recentSearches')}</span>
                  <span className="flex flex-wrap gap-2">
                    {recent.map((r) => (
                      <button
                        key={`${r.media_type}-${r.id}`}
                        onClick={() => pick(r)}
                        className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 transition hover:border-amber-400/50 hover:text-amber-400"
                      >
                        {r.title || r.name}
                      </button>
                    ))}
                  </span>
                </li>
              )}
              {results && results.length === 0 && (
                <li className="px-5 py-4 text-zinc-500">{t('search.none')}</li>
              )}
              {results?.map((r, i) => (
                <li key={`${r.media_type}-${r.id}`}>
                  <a
                    href={titleUrl(r)}
                    onClick={(e) => {
                      e.preventDefault()
                      pick(r)
                    }}
                    onMouseEnter={() => setActiveIdx(i)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 ${
                      i === activeIdx ? 'bg-zinc-800' : ''
                    }`}
                  >
                    <Poster path={r.poster_path} className="h-14 w-10 rounded" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{r.title || r.name}</span>
                      <span className="text-sm text-zinc-500">
                        {r.media_type === 'tv' ? t('tv') : t('movie')} ·{' '}
                        {(r.release_date || r.first_air_date || '').slice(0, 4) || '—'}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        {error && <SetupNotice message={error} />}
      </section>

      {myShows.length > 0 && (
        <section className="pb-12">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-500">
            {t('yourShows')}
          </h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {myShows.map((p) => {
              const href = `/tv/${p.id}/${slugify(p.name)}`
              return (
                <div key={p.id} className="group relative">
                  <a
                    href={href}
                    onClick={(e) => {
                      e.preventDefault()
                      onPick({ media_type: 'tv', id: p.id, name: p.name })
                    }}
                    className="block text-left"
                  >
                    <Poster
                      path={p.poster_path}
                      size="w342"
                      className="aspect-2/3 w-full rounded-xl transition group-hover:scale-[1.03] group-hover:ring-2 group-hover:ring-amber-400"
                    />
                    <span className="mt-1.5 block truncate text-sm text-zinc-300">{p.name}</span>
                    <span className="block text-xs text-amber-400/90">{progressLabel(p)}</span>
                  </a>
                  <button
                    onClick={() => {
                      removeShowProgress(p.id)
                      setMyShows(listProgress())
                    }}
                    aria-label={`${t('remove')} ${p.name}`}
                    title={t('remove')}
                    className="absolute right-1.5 top-1.5 hidden size-6 place-items-center rounded-full bg-zinc-950/80 text-xs text-zinc-300 backdrop-blur hover:bg-zinc-950 hover:text-amber-400 group-hover:grid"
                  >
                    ✕
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      navigate(href)
                    }}
                    className="absolute bottom-2 right-2 hidden size-7 place-items-center rounded-full bg-zinc-950/80 text-xs text-amber-400 backdrop-blur hover:bg-amber-400 hover:text-zinc-950 group-hover:grid"
                    title={t('continue')}
                  >
                    ▶
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {trending.length > 0 && (
        <section className="pb-16">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-500">
            {t('trending')}
          </h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {trending.map((r, i) => (
              <a
                key={`${r.media_type}-${r.id}`}
                href={titleUrl(r)}
                onClick={(e) => {
                  e.preventDefault()
                  onPick(r)
                }}
                className="animate-fade-up group block text-left"
                style={{ animationDelay: `${Math.min(i * 45, 500)}ms` }}
              >
                <Poster
                  path={r.poster_path}
                  size="w342"
                  className="aspect-2/3 w-full rounded-xl transition group-hover:scale-[1.03] group-hover:ring-2 group-hover:ring-amber-400"
                />
                <span className="mt-1.5 block truncate text-sm text-zinc-300">
                  {r.title || r.name}
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-2xl border-t border-zinc-800/80 pb-16 pt-12">
        <h2 className="text-xl font-bold tracking-tight text-zinc-200">{t('blurb.h2')}</h2>
        <p className="mt-4 text-sm leading-relaxed text-zinc-400">{t('blurb.p1')}</p>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">{t('blurb.p2')}</p>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">{t('blurb.p3')}</p>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          {t('blurb.p4')}{' '}
          <a
            href="https://github.com/xiaofei9991/whosthat/issues"
            target="_blank"
            rel="noopener"
            className="text-amber-400 hover:underline"
          >
            {t('blurb.p4link')}
          </a>
        </p>
      </section>
    </main>
  )
}

function TitlePage({
  mediaType,
  id,
  onBack,
  navigate,
}: {
  mediaType: MediaType
  id: number
  onBack: () => void
  navigate: Navigate
}) {
  const isTV = mediaType === 'tv'
  const [details, setDetails] = useState<TmdbDetails | null>(null)
  const [cast, setCast] = useState<TmdbCastMember[] | null>(null)
  const [upToSeason, setUpToSeason] = useState('all')
  const [upToEpisode, setUpToEpisode] = useState('all')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDetails(null)
    setCast(null)
    // Restore the spoiler shield where this viewer left off last time.
    const saved = isTV ? getShowProgress(id) : null
    setUpToSeason(saved ? String(saved.season) : 'all')
    setUpToEpisode(saved && saved.episode ? String(saved.episode) : 'all')
    const path = isTV ? `/tv/${id}` : `/movie/${id}`
    tmdb<TmdbDetails>(path, { append_to_response: isTV ? 'aggregate_credits' : 'credits' })
      .then(setDetails)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [id, isTV])

  const rememberProgress = (season: string, episode: string) => {
    if (!isTV || !details) return
    if (season === 'all') {
      removeShowProgress(id)
      return
    }
    saveShowProgress(id, {
      season: Number(season),
      episode: episode === 'all' ? 'all' : Number(episode),
              name: details.name ?? details.title ?? '',
      poster_path: details.poster_path,
    })
  }

  useEffect(() => {
    if (!details) return
    const name = details.title || details.name
    const y = (details.release_date || details.first_air_date || '').slice(0, 4)
    document.title = t('title.title', { name, y: y ? ` (${y})` : '' })
    setCanonical(
      `${window.location.origin}/${isTV ? 'tv' : 'movie'}/${details.id}/${slugify(name)}`,
    )
  }, [details, isTV])

  useEffect(() => {
    if (!details) return
    if (!isTV) {
      setCast(details.credits?.cast.slice(0, 30) ?? [])
      return
    }
    if (upToSeason === 'all') {
      setCast(normalizeTvCast(details.aggregate_credits?.cast ?? []).slice(0, 30))
      return
    }
    // Spoiler-safe mode: only people who appear up to the watched point.
    const n = Number(upToSeason)
    const ep = upToEpisode === 'all' ? null : Number(upToEpisode)
    // Full seasons: everything before season n, plus season n itself when no
    // episode cutoff is set.
    const fullSeasons = ep == null ? n : n - 1
    setCast(null)
    let cancelled = false

    const seasonReqs = Array.from({ length: fullSeasons }, (_, i) =>
      tmdb<TmdbSeasonCredits>(`/tv/${id}/season/${i + 1}/aggregate_credits`).catch(
        (): TmdbSeasonCredits => ({ cast: [] }),
      ),
    )
    const episodeReqs =
      ep == null
        ? []
        : Array.from({ length: ep }, (_, i) =>
            tmdb<TmdbEpisodeCredits>(`/tv/${id}/season/${n}/episode/${i + 1}/credits`).catch(
              (): TmdbEpisodeCredits | null => null,
            ),
          )

    Promise.all([Promise.all(seasonReqs), Promise.all(episodeReqs)])
      .then(([seasons, episodes]) => {
        if (cancelled) return
        const merged = new Map<number, TmdbCastMember>()
        for (const s of seasons) {
          for (const c of s.cast ?? []) {
            const prev = merged.get(c.id)
            if (prev) {
              prev.total_episode_count = (prev.total_episode_count ?? 0) + (c.total_episode_count ?? 0)
              for (const role of c.roles ?? [])
                if (!prev.roles?.some((r) => r.character === role.character)) {
                  prev.roles = [...(prev.roles ?? []), role]
                }
            } else {
              merged.set(c.id, { ...c, roles: [...(c.roles ?? [])] })
            }
          }
        }
        for (const epCredits of episodes) {
          if (!epCredits) continue
          for (const c of [...(epCredits.cast || []), ...(epCredits.guest_stars || [])]) {
            const role = { character: c.character || '' }
            const prev = merged.get(c.id)
            if (prev) {
              prev.total_episode_count = (prev.total_episode_count ?? 0) + 1
              if (role.character && !prev.roles?.some((r) => r.character === role.character))
                prev.roles = [...(prev.roles ?? []), role]
            } else {
              merged.set(c.id, {
                ...c,
                roles: role.character ? [role] : [],
                total_episode_count: 1,
              })
            }
          }
        }
        setCast(normalizeTvCast([...merged.values()]).slice(0, 30))
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
    return () => {
      cancelled = true
    }
  }, [details, upToSeason, upToEpisode, id, isTV])

  if (error) return <SetupNotice message={error} />
  if (!details)
    return <p className="py-20 text-center text-zinc-500">{t('loading.chars')}</p>

  const year = (details.release_date || details.first_air_date || '').slice(0, 4)
  const seasonCount = details.number_of_seasons || 0
  const episodeCount =
    upToSeason === 'all'
      ? 0
      : details.seasons?.find((s) => s.season_number === Number(upToSeason))?.episode_count || 0

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <button onClick={onBack} className="mb-6 text-sm text-zinc-400 hover:text-amber-400">
        {t('back')}
      </button>

      <div className="animate-fade-up flex items-start gap-5">
        <Poster path={details.poster_path} size="w342" className="hidden w-32 rounded-xl sm:block" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {details.title || details.name}
            {year && <span className="ml-2 font-normal text-zinc-500">({year})</span>}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2 text-zinc-400">
            {isTV
              ? seasonCount > 1
                ? t('meta.tvN', { n: seasonCount })
                : t('meta.tv1')
              : t('meta.movie')}
            <ShareButton title={document.title} />
          </p>

          {isTV && seasonCount >= 1 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-zinc-300">
              <span className="rounded-md bg-amber-400/15 px-2 py-1 font-medium text-amber-300">
                {t('shield.badge')}
              </span>
              {t('shield.watched')}
              <select
                value={upToSeason}
                onChange={(e) => {
                  setUpToSeason(e.target.value)
                  setUpToEpisode('all')
                  rememberProgress(e.target.value, 'all')
                }}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5"
              >
                <option value="all">{t('shield.whole')}</option>
                {Array.from({ length: seasonCount }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {t('shield.season', { n: i + 1 })}
                  </option>
                ))}
              </select>
              {upToSeason !== 'all' && episodeCount > 1 && (
                <select
                  value={upToEpisode}
                  onChange={(e) => {
                    setUpToEpisode(e.target.value)
                    rememberProgress(upToSeason, e.target.value)
                  }}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5"
                >
                  <option value="all">{t('shield.wholeSeason')}</option>
                  {Array.from({ length: episodeCount }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {t('shield.episode', { n: i + 1 })}
                    </option>
                  ))}
                </select>
              )}
              {t('shield.note')}
              {upToSeason !== 'all' && (
                <span className="text-xs text-zinc-500">{t('shield.saved')}</span>
              )}
            </div>
          )}

          {isTV && seasonCount >= 1 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-zinc-500">{t('seasonGuides')}</span>
              {Array.from({ length: seasonCount }, (_, i) => {
                const n = i + 1
                const href = seasonUrl(details.id, n, details.name)
                return (
                  <a
                    key={n}
                    href={href}
                    onClick={(e) => {
                      e.preventDefault()
                      navigate(href)
                    }}
                    className="rounded-lg border border-zinc-700 px-2.5 py-1 text-zinc-300 hover:border-amber-400/50 hover:text-amber-400"
                  >
                    S{n}
                  </a>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {!cast ? (
        <p className="py-16 text-center text-zinc-500">{t('loading.filter')}</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {cast.map((c, i) => (
            <CharacterCard
              key={c.id}
              person={c}
              isTV={isTV}
              currentTitleId={details.id}
              titleName={details.title || details.name || ''}
              navigate={navigate}
              delay={Math.min(i * 40, 600)}
            />
          ))}
        </div>
      )}
    </main>
  )
}

function SeasonPage({
  id,
  season,
  navigate,
}: {
  id: number
  season: number
  navigate: Navigate
}) {
  const [details, setDetails] = useState<TmdbDetails | null>(null)
  const [cast, setCast] = useState<TmdbCastMember[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDetails(null)
    setCast(null)
    Promise.all([
      tmdb<TmdbDetails>(`/tv/${id}`),
      tmdb<TmdbSeasonCredits>(`/tv/${id}/season/${season}/aggregate_credits`),
    ])
      .then(([d, credits]) => {
        setDetails(d)
        setCast(normalizeTvCast(credits.cast || []).slice(0, 30))
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [id, season])

  useEffect(() => {
    if (!details) return
    document.title = t('title.season', { name: details.name, n: season })
    setCanonical(`${window.location.origin}${seasonUrl(id, season, details.name)}`)
  }, [details, id, season])

  if (error) return <SetupNotice message={error} />
  if (!details || !cast)
    return <p className="py-20 text-center text-zinc-500">{t('loading.chars')}</p>

  const showHref = `/tv/${id}/${slugify(details.name)}`
  const seasonCount = details.number_of_seasons || 0

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <nav className="mb-6 text-sm text-zinc-400">
        <a
          href={showHref}
          onClick={(e) => {
            e.preventDefault()
            navigate(showHref)
          }}
          className="hover:text-amber-400"
        >
          &larr; {t('season.all', { name: details.name })}
        </a>
      </nav>

      <div className="animate-fade-up flex items-start gap-5">
        <Poster path={details.poster_path} size="w342" className="hidden w-32 rounded-xl sm:block" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {details.name} <span className="text-amber-400">{t('season.label', { n: season })}</span>
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2 text-zinc-400">
            {t('season.sub', { n: season })}
            <ShareButton title={document.title} />
          </p>
          {seasonCount > 1 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-zinc-500">{t('seasonsLabel')}</span>
              {Array.from({ length: seasonCount }, (_, i) => {
                const n = i + 1
                const href = seasonUrl(id, n, details.name ?? '')
                return n === season ? (
                  <span
                    key={n}
                    className="rounded-lg bg-amber-400 px-2.5 py-1 font-medium text-zinc-950"
                  >
                    {n}
                  </span>
                ) : (
                  <a
                    key={n}
                    href={href}
                    onClick={(e) => {
                      e.preventDefault()
                      navigate(href)
                    }}
                    className="rounded-lg border border-zinc-700 px-2.5 py-1 text-zinc-300 hover:border-amber-400/50 hover:text-amber-400"
                  >
                    {n}
                  </a>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {cast.length === 0 ? (
        <p className="py-16 text-center text-zinc-500">{t('season.empty')}</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {cast.map((c, i) => (
            <CharacterCard
              key={c.id}
              person={c}
              isTV
              currentTitleId={id}
              titleName={details.name || ''}
              navigate={navigate}
              delay={Math.min(i * 40, 600)}
            />
          ))}
        </div>
      )}
    </main>
  )
}

const STATIC_PAGES_ZH = {
  about: {
    title: "关于 | Who's That?",
    heading: '关于 Who\u2019s That?',
    body: [
      'Who\u2019s That? 只回答一个问题——\u201c这个人是谁来着？\u201d——而且绝不剧透。搜索任何电影或剧集，就能得到一份干净的角色对照表：每个角色的脸、名字和扮演者，除此之外什么都没有。',
      '这个产品的灵感来自身边的观众（包括脸盲症患者）在群像剧面前的挣扎：追剧途中去搜某个角色简直是雷区——搜索结果、剧情回顾甚至演员表都会毫不留情地剧透死亡、背叛和第三季才登场的角色。所以我们做了\u201c剧透护盾\u201d：告诉我们你看到哪里，我们只显示已出场的角色。',
      '角色与演员数据来自社区共建的电影数据库 TMDB。本产品使用 TMDB API，但未经 TMDB 认可或认证。',
    ],
  },
  faq: {
    title: "常见问题 | Who's That?",
    heading: '常见问题',
    faqs: [
      [
        'Who\u2019s That? 是什么？',
        '一份影视剧的无剧透角色指南。搜索任何作品，就能看到每个角色的脸、名字和扮演者——没有剧情信息、没有剧集回顾、没有意外剧透。',
      ],
      [
        '剧透护盾是怎么工作的？',
        '在任意剧集页面告诉我们你看到第几季（第几集），我们就只显示到那个进度为止已出场的角色，底层使用每季、每集的演员数据——之后才登场的角色会被完全隐藏。',
      ],
      ['免费吗？', '免费。核心功能无需注册即可使用，你的观看进度只保存在你自己的设备上。'],
      [
        '可以安装成 App 吗？',
        '可以——Who\u2019s That? 是一个 PWA。在浏览器里选择\u201c添加到主屏幕\u201d（手机）或\u201c安装\u201d（桌面）即可。',
      ],
      [
        '数据从哪来？',
        '所有演员、角色和图片数据来自 TMDB（themoviedb.org）。本产品使用 TMDB API，但未经 TMDB 认可或认证。',
      ],
      [
        '我发现演员数据有错或缺失，能修吗？',
        '数据直接来自社区编辑的 TMDB——你可以在 themoviedb.org 上修正，修改会自动同步到这里。',
      ],
    ],
  },
  privacy: {
    title: "隐私政策 | Who's That?",
    heading: '隐私政策',
    body: [
      '我们尽可能少地收集数据：没有账号、无需注册，也从不索要个人信息。',
      '观看进度和主题偏好保存在你浏览器的 localStorage 中，只存在于你的设备上，绝不会发送到我们的服务器。清除浏览器数据或在\u201c我在追的\u201d里移除剧集即可随时删除。',
      '我们使用 Vercel Web Analytics 了解整体流量（页面浏览量、国家、设备类型）。它不使用 Cookie，不会跨站追踪你，也不会为你建立画像。',
      '影视数据（含图片）来自 TMDB（themoviedb.org），你的浏览器会直接向 TMDB 的服务器请求图片，适用 TMDB 自己的隐私政策。',
      '本站托管在 Vercel 上，标准服务器日志（IP 地址、User Agent）可能出于安全和运维目的被处理。',
      '有问题？欢迎在我们的 GitHub 仓库提 issue。',
    ],
  },
}

const STATIC_PAGES = {
  about: {
    title: "About | Who's That?",
    heading: "About Who's That?",
    body: [
      "Who's That? answers one question — \u201cwait, who is that again?\u201d — without ruining the story. Look up any movie or TV show and get a clean guide to every character: their face, their name, and the actor who plays them. Nothing else.",
      'The idea came from watching people (including people with face blindness, or prosopagnosia) struggle with big ensemble casts. Googling a character mid-episode is a minefield: search results, recaps, and even cast lists happily reveal deaths, betrayals, and season-three arrivals. We built the spoiler shield so you can tell us how far you\u2019ve watched, and we\u2019ll only ever show characters who have already appeared.',
      'Character and cast data comes from TMDB, the community-built movie database. This product uses the TMDB API but is not endorsed or certified by TMDB.',
    ],
  },
  faq: {
    title: "FAQ | Who's That?",
    heading: 'Frequently asked questions',
    faqs: [
      [
        "What is Who's That?",
        'A spoiler-free character guide for movies and TV shows. Search any title and see every character\u2019s face, name, and actor — with no plot details, episode recaps, or accidental spoilers.',
      ],
      [
        'How does the spoiler shield work?',
        'On any TV show page, tell us the last season (and episode) you watched. We then only show characters who have already appeared up to that point, using per-season and per-episode cast data — so a character who first shows up later stays hidden.',
      ],
      [
        'Is it free?',
        'Yes. The core guide is free to use, no account needed. Your watch progress is saved on your own device.',
      ],
      [
        'Can I install it as an app?',
        'Yes — Who\u2019s That? is a PWA. In your browser, choose \u201cAdd to Home Screen\u201d (mobile) or \u201cInstall\u201d (desktop) to get it as an app.',
      ],
      [
        'Where does the data come from?',
        'All cast, character, and image data comes from TMDB (themoviedb.org). This product uses the TMDB API but is not endorsed or certified by TMDB.',
      ],
      [
        'I found wrong or missing cast data. Can you fix it?',
        'Data comes directly from TMDB, which is community-edited — you can fix it at themoviedb.org and the change will show up here automatically.',
      ],
    ],
  },
  privacy: {
    title: "Privacy Policy | Who's That?",
    heading: 'Privacy policy',
    body: [
      'We collect as little as possible. There are no accounts, no sign-ups, and we never ask for personal information.',
      'Watch progress and theme preference are stored in your browser\u2019s localStorage, on your device only. They are never sent to our servers. You can clear them anytime by clearing your browser data or removing shows from \u201cYour shows\u201d.',
      'We use Vercel Web Analytics to understand aggregate traffic (page views, country, device type). It is cookie-free and does not track you across sites or build a profile of you.',
      'Movie and TV data, including images, is loaded from TMDB (themoviedb.org). Your browser requests images directly from TMDB\u2019s servers, which is subject to TMDB\u2019s own privacy policy.',
      'This site is hosted on Vercel. Standard server logs (IP address, user agent) may be processed for security and operations.',
      'Questions? Open an issue on our GitHub repository.',
    ],
  },
}

type StaticContent = {
  title: string
  heading: string
  body?: string[]
  faqs?: [string, string][]
}

function StaticPage({ page, navigate }: { page: StaticPageId; navigate: Navigate }) {
  const pages = (getLang() === 'zh' ? STATIC_PAGES_ZH : STATIC_PAGES) as Record<
    StaticPageId,
    StaticContent
  >
  const content = pages[page]

  useEffect(() => {
    document.title = content.title
    setCanonical(`${window.location.origin}/${page}`)
  }, [content, page])

  // FAQPage JSON-LD is injected server-side by functions/_lib/page.ts.

  return (
    <main className="animate-fade-up mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">{content.heading}</h1>
      {content.body?.map((p, i) => (
        <p key={i} className="mt-4 text-sm leading-relaxed text-zinc-400">
          {p}
        </p>
      ))}
      {content.faqs?.map(([q, a]) => (
        <section key={q} className="mt-6">
          <h2 className="font-semibold text-zinc-200">{q}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{a}</p>
        </section>
      ))}
      <p className="mt-10 text-sm">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault()
            navigate('/')
          }}
          className="text-amber-400 hover:underline"
        >
          {t('back')}
        </a>
      </p>
    </main>
  )
}

function normalizeTvCast(list: TmdbCastMember[]): TmdbCastMember[] {
  return list
    .map((c) => ({
      ...c,
      character: c.roles?.map((r) => r.character).filter(Boolean).join(' / ') || '—',
      episodes: c.total_episode_count,
    }))
    .sort((a, b) => (b.episodes ?? 0) - (a.episodes ?? 0))
}

function CharacterCard({
  person,
  isTV,
  currentTitleId,
  titleName,
  navigate,
  delay = 0,
}: {
  person: TmdbCastMember
  isTV: boolean
  currentTitleId: number
  titleName: string
  navigate: Navigate
  delay?: number
}) {
  const [open, setOpen] = useState(false)
  const [knownFor, setKnownFor] = useState<TmdbTitle[] | null>(null)

  useEffect(() => {
    if (!open || knownFor) return
    tmdb<{ cast: TmdbTitle[] }>(`/person/${person.id}/combined_credits`)
      .then((d) => {
        const seen = new Set<number>()
        const top = d.cast
          .filter((c) => {
            if (c.id === currentTitleId || !c.poster_path || seen.has(c.id)) return false
            seen.add(c.id)
            return true
          })
          .sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0))
          .slice(0, 4)
        setKnownFor(top)
      })
      .catch(() => setKnownFor([]))
  }, [open, knownFor, person.id, currentTitleId])

  return (
    <div
      className="animate-fade-up overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 transition duration-200 hover:-translate-y-1 hover:border-amber-400/40 hover:shadow-lg hover:shadow-black/30"
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      <Poster path={person.profile_path} size="w342" className="aspect-3/4 w-full object-cover" />
      <div className="p-3">
        <p className="truncate font-semibold" title={person.character}>
          <a
            href={whoPlaysUrl(
              isTV ? 'tv' : 'movie',
              currentTitleId,
              person.id,
              person.character ?? '—',
              titleName,
            )}
            onClick={(e) => {
              e.preventDefault()
              navigate(
                whoPlaysUrl(
                  isTV ? 'tv' : 'movie',
                  currentTitleId,
                  person.id,
                  person.character ?? '—',
                  titleName,
                ),
              )
            }}
            className="hover:text-amber-400 hover:underline"
          >
            {person.character || '—'}
          </a>
        </p>
        <p className="truncate text-sm text-zinc-400">{person.name}</p>
        {isTV && person.episodes != null && (
          <p className="mt-0.5 text-xs text-zinc-500">{t('episodes', { n: person.episodes })}</p>
        )}
        <button
          onClick={() => setOpen(!open)}
          className="mt-2 text-xs font-medium text-amber-400 hover:underline"
        >
          {open ? t('card.hide') : t('card.know')}
        </button>
        {open && (
          <div className="animate-pop-in mt-2">
            {!knownFor ? (
              <p className="text-xs text-zinc-500">{t('card.loading')}</p>
            ) : knownFor.length === 0 ? (
              <p className="text-xs text-zinc-500">{t('card.none')}</p>
            ) : (
              <ul className="grid grid-cols-4 gap-1.5">
                {knownFor.map((k) => (
                  <li key={k.credit_id || k.id} title={`${k.title || k.name} — ${t('wp.as', { c: k.character || '?' })}`}>
                    <Poster path={k.poster_path} className="w-full rounded" />
                    <span className="mt-0.5 block truncate text-[10px] leading-tight text-zinc-400">
                      {k.title || k.name}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function WhoPlaysPage({
  mediaType,
  mediaId,
  personId,
  navigate,
}: {
  mediaType: MediaType
  mediaId: number
  personId: number
  navigate: Navigate
}) {
  const isTV = mediaType === 'tv'
  const [details, setDetails] = useState<TmdbDetails | null>(null)
  const [person, setPerson] = useState<TmdbPerson | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDetails(null)
    setPerson(null)
    setError(null)
    Promise.all([
      tmdb<TmdbDetails>(`/${mediaType}/${mediaId}`, {
        append_to_response: isTV ? 'aggregate_credits' : 'credits',
      }),
      tmdb<TmdbPerson>(`/person/${personId}`, { append_to_response: 'combined_credits' }),
    ])
      .then(([d, p]) => {
        setDetails(d)
        setPerson(p)
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [mediaType, mediaId, personId, isTV])

  const titleName = details ? details.title || details.name || '' : ''
  const castList = details ? (isTV ? details.aggregate_credits : details.credits)?.cast || [] : []
  const credit = castList.find((c) => c.id === personId)
  const character = credit
    ? isTV
      ? credit.roles?.map((r) => r.character).filter(Boolean).join(' / ') || '—'
      : credit.character || '—'
    : null

  useEffect(() => {
    if (!details || !person || !character) return
    document.title = t('title.wp', { c: character, t: titleName, p: person.name })
    setCanonical(
      `${window.location.origin}${whoPlaysUrl(mediaType, mediaId, personId, character, titleName)}`,
    )
  }, [details, person, character, titleName, mediaType, mediaId, personId])

  if (error) return <SetupNotice message={error} />
  if (!details || !person)
    return <p className="py-20 text-center text-zinc-500">{t('loading.answer')}</p>

  const titleHref = `/${mediaType}/${mediaId}/${slugify(titleName)}`

  if (!credit) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <p className="py-16 text-center text-zinc-500">
          {t('wp.notFound', { p: person.name, t: titleName })}{' '}
          <a
            href={titleHref}
            onClick={(e) => {
              e.preventDefault()
              navigate(titleHref)
            }}
            className="text-amber-400 hover:underline"
          >
            {t('wp.seeFull')}
          </a>
        </p>
      </main>
    )
  }

  const age = person.birthday ? computeAge(person.birthday, person.deathday) : null

  const seen = new Set<number>()
  const knownFor = (person.combined_credits?.cast || [])
    .filter((c) => {
      if (c.id === details.id || !c.poster_path || seen.has(c.id)) return false
      seen.add(c.id)
      return true
    })
    .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
    .slice(0, 6)

  const others = castList
    .filter((c) => c.id !== personId)
    .slice(0, 8)
    .map((c) => ({
      ...c,
      character: isTV
        ? c.roles?.map((r) => r.character).filter(Boolean).join(' / ') || '—'
        : c.character || '—',
    }))

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <nav className="mb-6 text-sm text-zinc-400">
        <a
          href={titleHref}
          onClick={(e) => {
            e.preventDefault()
            navigate(titleHref)
          }}
          className="hover:text-amber-400"
        >
          &larr; {t('wp.back', { t: titleName })}
        </a>
      </nav>

      <h1 className="animate-fade-up text-3xl font-bold tracking-tight sm:text-4xl">
        {t('wp.h1', { c: character, t: titleName })}
      </h1>

      <div
        className="animate-fade-up mt-6 flex flex-col gap-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:flex-row sm:items-start"
        style={{ animationDelay: '90ms' }}
      >
        <Poster
          path={person.profile_path}
          size="w342"
          className="aspect-3/4 w-40 rounded-xl sm:w-48"
        />
        <div className="min-w-0">
          <p className="text-xl font-semibold">
            <span className="text-amber-400">{character}</span>
            {t('wp.playedBy')}
            <span className="text-amber-400">{person.name}</span>
          </p>
          <ul className="mt-3 space-y-1 text-sm text-zinc-400">
            {person.birthday && (
              <li>
                {t('wp.born', { d: person.birthday })}
                {age != null &&
                  ` (${person.deathday ? t('wp.diedAt', { n: age }) : t('wp.age', { n: age })})`}
              </li>
            )}
            {person.place_of_birth && <li>{t('wp.from', { p: person.place_of_birth })}</li>}
            {isTV && credit.total_episode_count != null && (
              <li>
                {credit.total_episode_count === 1
                  ? t('wp.appears1')
                  : t('wp.appearsN', { n: credit.total_episode_count })}
              </li>
            )}
          </ul>
          <p className="mt-3 text-xs text-zinc-500">{t('wp.spoilerNote', { t: titleName })}</p>
          <div className="mt-3">
            <ShareButton title={document.title} />
          </div>
        </div>
      </div>

      {knownFor.length > 0 && (
        <section className="animate-fade-up mt-10" style={{ animationDelay: '180ms' }}>
          <h2 className="mb-4 text-lg font-bold tracking-tight">
            {t('wp.elsewhere', { p: person.name })}
          </h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {knownFor.map((k) => (
              <a
                key={k.id}
                href={titleUrl(k)}
                onClick={(e) => {
                  e.preventDefault()
                  navigate(titleUrl(k))
                }}
                className="group block"
              >
                <Poster
                  path={k.poster_path}
                  size="w342"
                  className="aspect-2/3 w-full rounded-xl transition group-hover:scale-[1.03] group-hover:ring-2 group-hover:ring-amber-400"
                />
                <span className="mt-1.5 block truncate text-sm text-zinc-300">
                  {k.title || k.name}
                </span>
                {k.character && (
                  <span className="block truncate text-xs text-zinc-500">
                    {t('wp.as', { c: k.character })}
                  </span>
                )}
              </a>
            ))}
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section className="animate-fade-up mt-10" style={{ animationDelay: '270ms' }}>
          <h2 className="mb-4 text-lg font-bold tracking-tight">
            {t('wp.others', { t: titleName })}
          </h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {others.map((c) => {
              const href = whoPlaysUrl(mediaType, mediaId, c.id, c.character, titleName)
              return (
                <li key={c.id}>
                  <a
                    href={href}
                    onClick={(e) => {
                      e.preventDefault()
                      navigate(href)
                    }}
                    className="block rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 hover:border-amber-400/50"
                  >
                    <span className="block truncate text-sm font-medium">{c.character}</span>
                    <span className="block truncate text-xs text-zinc-500">{c.name}</span>
                  </a>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </main>
  )
}

function computeAge(birthday: string, deathday: string | null | undefined): number | null {
  const birth = new Date(birthday)
  if (Number.isNaN(birth.getTime())) return null
  const end = deathday ? new Date(deathday) : new Date()
  let age = end.getFullYear() - birth.getFullYear()
  const m = end.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && end.getDate() < birth.getDate())) age--
  return age
}

function Poster({
  path,
  size = 'w185',
  className = '',
}: {
  path: string | null | undefined
  size?: string
  className?: string
}) {
  const [loaded, setLoaded] = useState(false)
  const src = img(path, size)
  if (!src)
    return (
      <div className={`grid shrink-0 place-items-center bg-zinc-800 text-zinc-600 ${className}`}>
        ?
      </div>
    )
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      ref={(el: HTMLImageElement | null) => {
        // Cached images can be complete before onLoad is attached.
        if (el?.complete) setLoaded(true)
      }}
      onLoad={() => setLoaded(true)}
      className={`shrink-0 bg-zinc-800 object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
    />
  )
}

function SetupNotice({ message }: { message: string }) {
  return (
    <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-amber-400/30 bg-amber-400/5 p-5 text-left">
      <p className="font-semibold text-amber-300">Almost there — API not connected yet</p>
      <p className="mt-1 text-sm text-zinc-400">{message}</p>
      <p className="mt-2 text-sm text-zinc-400">
        Add <code className="rounded bg-zinc-800 px-1">TMDB_API_KEY=…</code> to{' '}
        <code className="rounded bg-zinc-800 px-1">.env</code> and restart the dev server.
      </p>
    </div>
  )
}
