import { useEffect, useRef, useState } from 'react'
import { tmdb, img } from './api.js'
import { slugify } from './slugify.js'
import {
  getShowProgress,
  saveShowProgress,
  removeShowProgress,
  listProgress,
  formatProgress,
} from './progress.js'

const DEFAULT_TITLE = "Who's That? — Spoiler-Free Character Guide for Movies & TV"

// Parses /movie/:id/:slug, /tv/:id/:slug, /tv/:id/season-:n/:slug,
// /who-plays/:type/:mediaId/:personId/:slug and static pages; anything else is home.
function parseRoute(pathname) {
  const w = pathname.match(/^\/who-plays\/(movie|tv)\/(\d+)\/(\d+)(?:\/|$)/)
  if (w)
    return { type: 'whoplays', mediaType: w[1], mediaId: Number(w[2]), personId: Number(w[3]) }
  const s = pathname.match(/^\/tv\/(\d+)\/season-(\d+)(?:\/|$)/)
  if (s) return { type: 'season', id: Number(s[1]), season: Number(s[2]) }
  const m = pathname.match(/^\/(movie|tv)\/(\d+)(?:\/|$)/)
  if (m) return { type: 'title', mediaType: m[1], id: Number(m[2]) }
  const st = pathname.match(/^\/(about|faq|privacy)\/?$/)
  if (st) return { type: 'static', page: st[1] }
  return { type: 'home' }
}

function seasonUrl(id, season, name) {
  const slug = slugify(name)
  return `/tv/${id}/season-${season}${slug ? `/${slug}` : ''}`
}

function titleUrl(item) {
  const type = item.media_type === 'tv' ? 'tv' : 'movie'
  const slug = slugify(item.title || item.name)
  return `/${type}/${item.id}${slug ? `/${slug}` : ''}`
}

function whoPlaysUrl(mediaType, mediaId, personId, character, titleName) {
  const slug = slugify(`who plays ${character} in ${titleName}`)
  return `/who-plays/${mediaType}/${mediaId}/${personId}${slug ? `/${slug}` : ''}`
}

function setCanonical(url) {
  let link = document.querySelector('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }
  link.setAttribute('href', url)
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
      className="ml-auto grid size-9 place-items-center rounded-lg border border-zinc-800 text-zinc-400 transition hover:border-amber-400/50 hover:text-amber-400"
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
    const onPopState = () => setRoute(parseRoute(window.location.pathname))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = (path) => {
    if (path !== window.location.pathname) window.history.pushState(null, '', path)
    setRoute(parseRoute(path))
    window.scrollTo(0, 0)
  }

  useEffect(() => {
    if (route.type === 'home') {
      document.title = DEFAULT_TITLE
      setCanonical(`${window.location.origin}/`)
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
          <span className="hidden text-sm text-zinc-500 sm:inline">
            Spoiler-free character guides for movies &amp; TV
          </span>
          <ThemeToggle />
        </div>
      </header>

      {route.type === 'home' ? (
        <Home onPick={(item) => navigate(titleUrl(item))} />
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
          {[
            ['/about', 'About'],
            ['/faq', 'FAQ'],
            ['/privacy', 'Privacy'],
          ].map(([href, label]) => (
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
        </nav>
        No plot details, ever. Data from TMDB. This product uses the TMDB API but is not endorsed or
        certified by TMDB.
      </footer>
    </div>
  )
}

function Home({ onPick }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [trending, setTrending] = useState([])
  const [myShows, setMyShows] = useState(() => listProgress())
  const [error, setError] = useState(null)
  const timer = useRef()

  const onKeyDown = (e) => {
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
      onPick(results[activeIdx])
    } else if (e.key === 'Escape') {
      setResults(null)
    }
  }

  useEffect(() => {
    tmdb('/trending/all/week')
      .then((d) => setTrending(d.results.filter((r) => r.media_type !== 'person').slice(0, 12)))
      .catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    clearTimeout(timer.current)
    setActiveIdx(-1)
    if (!query.trim()) {
      setResults(null)
      return
    }
    timer.current = setTimeout(() => {
      tmdb('/search/multi', { query: query.trim() })
        .then((d) =>
          setResults(
            d.results
              .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
              .slice(0, 10),
          ),
        )
        .catch((e) => setError(e.message))
    }, 300)
  }, [query])

  return (
    <main className="mx-auto max-w-5xl px-4">
      <section className="py-14 text-center sm:py-20">
        <h1 className="animate-fade-up mx-auto max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl">
          &ldquo;Wait&hellip; who is that again?&rdquo;
        </h1>
        <p
          className="animate-fade-up mx-auto mt-4 max-w-xl text-zinc-400"
          style={{ animationDelay: '90ms' }}
        >
          Look up any movie or show and get a clean character guide — faces, names, and who plays
          them. <span className="text-amber-400">Zero plot spoilers.</span>
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
            onBlur={() => setTimeout(() => setResults(null), 150)}
            role="combobox"
            aria-expanded={!!results}
            aria-autocomplete="list"
            placeholder="Search a movie or TV show…"
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-5 py-4 text-lg outline-none transition duration-200 placeholder:text-zinc-500 focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10"
          />
          {results && (
            <ul className="animate-pop-in absolute z-10 mt-2 w-full overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 text-left shadow-2xl">
              {results.length === 0 && (
                <li className="px-5 py-4 text-zinc-500">No results found.</li>
              )}
              {results.map((r, i) => (
                <li key={`${r.media_type}-${r.id}`}>
                  <a
                    href={titleUrl(r)}
                    onClick={(e) => {
                      e.preventDefault()
                      onPick(r)
                    }}
                    onMouseEnter={() => setActiveIdx(i)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 ${
                      i === activeIdx ? 'bg-zinc-800' : ''
                    }`}
                  >
                    <Poster path={r.poster_path} className="h-14 w-10 rounded" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{r.title || r.name}</span>
                      <span className="text-sm text-zinc-500">
                        {r.media_type === 'tv' ? 'TV' : 'Movie'} ·{' '}
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
            Your shows
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
                    <span className="block text-xs text-amber-400/90">{formatProgress(p)}</span>
                  </a>
                  <button
                    onClick={() => {
                      removeShowProgress(p.id)
                      setMyShows(listProgress())
                    }}
                    aria-label={`Remove ${p.name} from your shows`}
                    title="Remove"
                    className="absolute right-1.5 top-1.5 hidden size-6 place-items-center rounded-full bg-zinc-950/80 text-xs text-zinc-300 backdrop-blur hover:bg-zinc-950 hover:text-amber-400 group-hover:grid"
                  >
                    ✕
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
            Trending this week
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
        <h2 className="text-xl font-bold tracking-tight text-zinc-200">
          A spoiler-free cast &amp; character guide for any movie or TV show
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-zinc-400">
          Ever paused a show to ask &ldquo;wait, who is that again?&rdquo; Who&rsquo;s That? shows
          you every character&rsquo;s face, name, and the actor who plays them — and nothing else.
          No episode recaps, no plot summaries, no accidental spoilers. It&rsquo;s the fastest way
          to figure out who plays who without risking the story.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Watching a TV series? Use the spoiler shield to tell us which season you&rsquo;re on, and
          we&rsquo;ll only show characters who have already appeared — so a surprise season-three
          arrival never gets revealed early. You can also tap any actor to see where you know them
          from, spoiler-free.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Whether you lose track of large ensemble casts, mix up look-alike actors, or live with
          face blindness (prosopagnosia), this guide keeps every face and name one glance away, for
          any movie or show on any streaming service.
        </p>
      </section>
    </main>
  )
}

function TitlePage({ mediaType, id, onBack, navigate }) {
  const isTV = mediaType === 'tv'
  const [details, setDetails] = useState(null)
  const [cast, setCast] = useState(null)
  const [upToSeason, setUpToSeason] = useState('all')
  const [upToEpisode, setUpToEpisode] = useState('all')
  const [error, setError] = useState(null)

  useEffect(() => {
    setDetails(null)
    setCast(null)
    // Restore the spoiler shield where this viewer left off last time.
    const saved = isTV ? getShowProgress(id) : null
    setUpToSeason(saved ? String(saved.season) : 'all')
    setUpToEpisode(saved && saved.episode ? String(saved.episode) : 'all')
    const path = isTV ? `/tv/${id}` : `/movie/${id}`
    tmdb(path, { append_to_response: isTV ? 'aggregate_credits' : 'credits' })
      .then(setDetails)
      .catch((e) => setError(e.message))
  }, [id, isTV])

  const rememberProgress = (season, episode) => {
    if (!isTV || !details) return
    if (season === 'all') {
      removeShowProgress(id)
      return
    }
    saveShowProgress(id, {
      season: Number(season),
      episode: episode === 'all' ? 'all' : Number(episode),
      name: details.name,
      poster_path: details.poster_path,
    })
  }

  useEffect(() => {
    if (!details) return
    const name = details.title || details.name
    const y = (details.release_date || details.first_air_date || '').slice(0, 4)
    document.title = `${name}${y ? ` (${y})` : ''} Cast & Character Guide — No Spoilers | Who's That?`
    setCanonical(
      `${window.location.origin}/${isTV ? 'tv' : 'movie'}/${details.id}/${slugify(name)}`,
    )
  }, [details, isTV])

  useEffect(() => {
    if (!details) return
    if (!isTV) {
      setCast(details.credits.cast.slice(0, 30))
      return
    }
    if (upToSeason === 'all') {
      setCast(normalizeTvCast(details.aggregate_credits.cast).slice(0, 30))
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
      tmdb(`/tv/${id}/season/${i + 1}/aggregate_credits`).catch(() => ({ cast: [] })),
    )
    // Partial season: per-episode credits so a character who first appears in
    // episode ep+1 is never revealed.
    const episodeReqs =
      ep == null
        ? []
        : Array.from({ length: ep }, (_, i) =>
            tmdb(`/tv/${id}/season/${n}/episode/${i + 1}/credits`).catch(() => null),
          )

    Promise.all([Promise.all(seasonReqs), Promise.all(episodeReqs)])
      .then(([seasons, episodes]) => {
        if (cancelled) return
        const merged = new Map()
        for (const s of seasons) {
          for (const c of s.cast) {
            const prev = merged.get(c.id)
            if (prev) {
              prev.total_episode_count += c.total_episode_count
              for (const role of c.roles)
                if (!prev.roles.some((r) => r.character === role.character)) prev.roles.push(role)
            } else {
              merged.set(c.id, { ...c, roles: [...c.roles] })
            }
          }
        }
        for (const epCredits of episodes) {
          if (!epCredits) continue
          for (const c of [...(epCredits.cast || []), ...(epCredits.guest_stars || [])]) {
            const role = { character: c.character || '' }
            const prev = merged.get(c.id)
            if (prev) {
              prev.total_episode_count += 1
              if (role.character && !prev.roles.some((r) => r.character === role.character))
                prev.roles.push(role)
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
      .catch((e) => setError(e.message))
    return () => {
      cancelled = true
    }
  }, [details, upToSeason, upToEpisode, id, isTV])

  if (error) return <SetupNotice message={error} />
  if (!details)
    return <p className="py-20 text-center text-zinc-500">Loading characters…</p>

  const year = (details.release_date || details.first_air_date || '').slice(0, 4)
  const seasonCount = details.number_of_seasons || 0
  const episodeCount =
    upToSeason === 'all'
      ? 0
      : details.seasons?.find((s) => s.season_number === Number(upToSeason))?.episode_count || 0

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <button onClick={onBack} className="mb-6 text-sm text-zinc-400 hover:text-amber-400">
        &larr; Back to search
      </button>

      <div className="animate-fade-up flex items-start gap-5">
        <Poster path={details.poster_path} size="w342" className="hidden w-32 rounded-xl sm:block" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {details.title || details.name}
            {year && <span className="ml-2 font-normal text-zinc-500">({year})</span>}
          </h1>
          <p className="mt-1 text-zinc-400">
            {isTV ? `TV series · ${seasonCount} season${seasonCount > 1 ? 's' : ''}` : 'Movie'} ·
            spoiler-free character guide
          </p>

          {isTV && seasonCount >= 1 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-zinc-300">
              <span className="rounded-md bg-amber-400/15 px-2 py-1 font-medium text-amber-300">
                Spoiler shield
              </span>
              I&rsquo;ve watched up to
              <select
                value={upToSeason}
                onChange={(e) => {
                  setUpToSeason(e.target.value)
                  setUpToEpisode('all')
                  rememberProgress(e.target.value, 'all')
                }}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5"
              >
                <option value="all">the whole show</option>
                {Array.from({ length: seasonCount }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    season {i + 1}
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
                  <option value="all">whole season</option>
                  {Array.from({ length: episodeCount }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      episode {i + 1}
                    </option>
                  ))}
                </select>
              )}
              — only characters who&rsquo;ve already appeared are shown.
              {upToSeason !== 'all' && (
                <span className="text-xs text-zinc-500">(progress saved)</span>
              )}
            </div>
          )}

          {isTV && seasonCount >= 1 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-zinc-500">Season guides:</span>
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
        <p className="py-16 text-center text-zinc-500">Filtering out spoilers…</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {cast.map((c, i) => (
            <CharacterCard
              key={c.id}
              person={c}
              isTV={isTV}
              currentTitleId={details.id}
              titleName={details.title || details.name}
              navigate={navigate}
              delay={Math.min(i * 40, 600)}
            />
          ))}
        </div>
      )}
    </main>
  )
}

function SeasonPage({ id, season, navigate }) {
  const [details, setDetails] = useState(null)
  const [cast, setCast] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    setDetails(null)
    setCast(null)
    Promise.all([tmdb(`/tv/${id}`), tmdb(`/tv/${id}/season/${season}/aggregate_credits`)])
      .then(([d, credits]) => {
        setDetails(d)
        setCast(normalizeTvCast(credits.cast || []).slice(0, 30))
      })
      .catch((e) => setError(e.message))
  }, [id, season])

  useEffect(() => {
    if (!details) return
    document.title = `${details.name} Season ${season} Characters & Cast — No Spoilers | Who's That?`
    setCanonical(`${window.location.origin}${seasonUrl(id, season, details.name)}`)
  }, [details, id, season])

  if (error) return <SetupNotice message={error} />
  if (!details || !cast)
    return <p className="py-20 text-center text-zinc-500">Loading characters…</p>

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
          &larr; {details.name} — all seasons
        </a>
      </nav>

      <div className="animate-fade-up flex items-start gap-5">
        <Poster path={details.poster_path} size="w342" className="hidden w-32 rounded-xl sm:block" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {details.name} <span className="text-amber-400">Season {season}</span>
          </h1>
          <p className="mt-1 text-zinc-400">
            Characters &amp; cast of season {season} only — nothing from later seasons.
          </p>
          {seasonCount > 1 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-zinc-500">Seasons:</span>
              {Array.from({ length: seasonCount }, (_, i) => {
                const n = i + 1
                const href = seasonUrl(id, n, details.name)
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
        <p className="py-16 text-center text-zinc-500">No cast data for this season yet.</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {cast.map((c, i) => (
            <CharacterCard
              key={c.id}
              person={c}
              isTV
              currentTitleId={id}
              titleName={details.name}
              navigate={navigate}
              delay={Math.min(i * 40, 600)}
            />
          ))}
        </div>
      )}
    </main>
  )
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

function StaticPage({ page, navigate }) {
  const content = STATIC_PAGES[page]

  useEffect(() => {
    document.title = content.title
    setCanonical(`${window.location.origin}/${page}`)
  }, [content, page])

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
          &larr; Back to search
        </a>
      </p>
    </main>
  )
}

function normalizeTvCast(list) {
  return list
    .map((c) => ({
      ...c,
      character: c.roles?.map((r) => r.character).filter(Boolean).join(' / ') || '—',
      episodes: c.total_episode_count,
    }))
    .sort((a, b) => b.episodes - a.episodes)
}

function CharacterCard({ person, isTV, currentTitleId, titleName, navigate, delay = 0 }) {
  const [open, setOpen] = useState(false)
  const [knownFor, setKnownFor] = useState(null)

  useEffect(() => {
    if (!open || knownFor) return
    tmdb(`/person/${person.id}/combined_credits`)
      .then((d) => {
        const seen = new Set()
        const top = d.cast
          .filter((c) => c.id !== currentTitleId && c.poster_path && !seen.has(c.id) && seen.add(c.id))
          .sort((a, b) => b.vote_count - a.vote_count)
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
            href={whoPlaysUrl(isTV ? 'tv' : 'movie', currentTitleId, person.id, person.character, titleName)}
            onClick={(e) => {
              e.preventDefault()
              navigate(
                whoPlaysUrl(isTV ? 'tv' : 'movie', currentTitleId, person.id, person.character, titleName),
              )
            }}
            className="hover:text-amber-400 hover:underline"
          >
            {person.character || '—'}
          </a>
        </p>
        <p className="truncate text-sm text-zinc-400">{person.name}</p>
        {isTV && person.episodes != null && (
          <p className="mt-0.5 text-xs text-zinc-500">{person.episodes} episodes</p>
        )}
        <button
          onClick={() => setOpen(!open)}
          className="mt-2 text-xs font-medium text-amber-400 hover:underline"
        >
          {open ? 'Hide' : 'Where do I know them from?'}
        </button>
        {open && (
          <div className="animate-pop-in mt-2">
            {!knownFor ? (
              <p className="text-xs text-zinc-500">Loading…</p>
            ) : knownFor.length === 0 ? (
              <p className="text-xs text-zinc-500">Nothing notable found.</p>
            ) : (
              <ul className="grid grid-cols-4 gap-1.5">
                {knownFor.map((k) => (
                  <li key={k.credit_id || k.id} title={`${k.title || k.name} — as ${k.character || '?'}`}>
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

function WhoPlaysPage({ mediaType, mediaId, personId, navigate }) {
  const isTV = mediaType === 'tv'
  const [details, setDetails] = useState(null)
  const [person, setPerson] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    setDetails(null)
    setPerson(null)
    setError(null)
    Promise.all([
      tmdb(`/${mediaType}/${mediaId}`, {
        append_to_response: isTV ? 'aggregate_credits' : 'credits',
      }),
      tmdb(`/person/${personId}`, { append_to_response: 'combined_credits' }),
    ])
      .then(([d, p]) => {
        setDetails(d)
        setPerson(p)
      })
      .catch((e) => setError(e.message))
  }, [mediaType, mediaId, personId, isTV])

  const titleName = details ? details.title || details.name : null
  const castList = details ? (isTV ? details.aggregate_credits : details.credits)?.cast || [] : []
  const credit = castList.find((c) => c.id === personId)
  const character = credit
    ? isTV
      ? credit.roles?.map((r) => r.character).filter(Boolean).join(' / ') || '—'
      : credit.character || '—'
    : null

  useEffect(() => {
    if (!details || !person || !character) return
    document.title = `Who Plays ${character} in ${titleName}? — ${person.name} | Who's That?`
    setCanonical(
      `${window.location.origin}${whoPlaysUrl(mediaType, mediaId, personId, character, titleName)}`,
    )
  }, [details, person, character, titleName, mediaType, mediaId, personId])

  if (error) return <SetupNotice message={error} />
  if (!details || !person)
    return <p className="py-20 text-center text-zinc-500">Loading answer…</p>

  const titleHref = `/${mediaType}/${mediaId}/${slugify(titleName)}`

  if (!credit) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <p className="py-16 text-center text-zinc-500">
          We couldn&rsquo;t find {person.name} in the cast of {titleName}.{' '}
          <a
            href={titleHref}
            onClick={(e) => {
              e.preventDefault()
              navigate(titleHref)
            }}
            className="text-amber-400 hover:underline"
          >
            See the full cast &rarr;
          </a>
        </p>
      </main>
    )
  }

  const age = person.birthday ? computeAge(person.birthday, person.deathday) : null

  const seen = new Set()
  const knownFor = (person.combined_credits?.cast || [])
    .filter(
      (c) =>
        c.id !== details.id && c.poster_path && !seen.has(c.id) && seen.add(c.id),
    )
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
          &larr; {titleName} cast &amp; characters
        </a>
      </nav>

      <h1 className="animate-fade-up text-3xl font-bold tracking-tight sm:text-4xl">
        Who plays {character} in {titleName}?
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
            <span className="text-amber-400">{character}</span> is played by{' '}
            <span className="text-amber-400">{person.name}</span>
          </p>
          <ul className="mt-3 space-y-1 text-sm text-zinc-400">
            {person.birthday && (
              <li>
                Born {person.birthday}
                {age != null && ` (${person.deathday ? `died at ${age}` : `age ${age}`})`}
              </li>
            )}
            {person.place_of_birth && <li>From {person.place_of_birth}</li>}
            {isTV && credit.total_episode_count != null && (
              <li>
                Appears in {credit.total_episode_count} episode
                {credit.total_episode_count === 1 ? '' : 's'}
              </li>
            )}
          </ul>
          <p className="mt-3 text-xs text-zinc-500">
            Spoiler-free: no plot details about {titleName}, just the face and the name.
          </p>
        </div>
      </div>

      {knownFor.length > 0 && (
        <section className="animate-fade-up mt-10" style={{ animationDelay: '180ms' }}>
          <h2 className="mb-4 text-lg font-bold tracking-tight">
            Where else have you seen {person.name}?
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
                  <span className="block truncate text-xs text-zinc-500">as {k.character}</span>
                )}
              </a>
            ))}
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section className="animate-fade-up mt-10" style={{ animationDelay: '270ms' }}>
          <h2 className="mb-4 text-lg font-bold tracking-tight">
            Other characters in {titleName}
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

function computeAge(birthday, deathday) {
  const birth = new Date(birthday)
  if (Number.isNaN(birth.getTime())) return null
  const end = deathday ? new Date(deathday) : new Date()
  let age = end.getFullYear() - birth.getFullYear()
  const m = end.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && end.getDate() < birth.getDate())) age--
  return age
}

function Poster({ path, size = 'w185', className = '' }) {
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
      ref={(el) => {
        // Cached images can be complete before onLoad is attached.
        if (el?.complete) setLoaded(true)
      }}
      onLoad={() => setLoaded(true)}
      className={`shrink-0 bg-zinc-800 object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
    />
  )
}

function SetupNotice({ message }) {
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
