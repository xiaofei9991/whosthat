import { useEffect, useRef, useState } from 'react'
import { tmdb, img } from './api.js'

export default function App() {
  const [view, setView] = useState({ type: 'home' })

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <button
            onClick={() => setView({ type: 'home' })}
            className="flex items-center gap-2 text-lg font-bold tracking-tight"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-amber-400 text-zinc-950">?</span>
            Who&rsquo;s That?
          </button>
          <span className="hidden text-sm text-zinc-500 sm:inline">
            Spoiler-free character guides for movies &amp; TV
          </span>
        </div>
      </header>

      {view.type === 'home' ? (
        <Home onPick={(item) => setView({ type: 'title', item })} />
      ) : (
        <TitlePage item={view.item} onBack={() => setView({ type: 'home' })} />
      )}

      <footer className="mx-auto max-w-5xl px-4 py-10 text-center text-xs text-zinc-600">
        No plot details, ever. Data from TMDB. This product uses the TMDB API but is not endorsed or
        certified by TMDB.
      </footer>
    </div>
  )
}

function Home({ onPick }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [trending, setTrending] = useState([])
  const [error, setError] = useState(null)
  const timer = useRef()

  useEffect(() => {
    tmdb('/trending/all/week')
      .then((d) => setTrending(d.results.filter((r) => r.media_type !== 'person').slice(0, 12)))
      .catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    clearTimeout(timer.current)
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
        <h1 className="mx-auto max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl">
          &ldquo;Wait&hellip; who is that again?&rdquo;
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-zinc-400">
          Look up any movie or show and get a clean character guide — faces, names, and who plays
          them. <span className="text-amber-400">Zero plot spoilers.</span>
        </p>

        <div className="relative mx-auto mt-8 max-w-xl">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a movie or TV show…"
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-5 py-4 text-lg outline-none placeholder:text-zinc-500 focus:border-amber-400"
          />
          {results && (
            <ul className="absolute z-10 mt-2 w-full overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 text-left shadow-2xl">
              {results.length === 0 && (
                <li className="px-5 py-4 text-zinc-500">No results found.</li>
              )}
              {results.map((r) => (
                <li key={`${r.media_type}-${r.id}`}>
                  <button
                    onClick={() => onPick(r)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-zinc-800"
                  >
                    <Poster path={r.poster_path} className="h-14 w-10 rounded" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{r.title || r.name}</span>
                      <span className="text-sm text-zinc-500">
                        {r.media_type === 'tv' ? 'TV' : 'Movie'} ·{' '}
                        {(r.release_date || r.first_air_date || '').slice(0, 4) || '—'}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {error && <SetupNotice message={error} />}
      </section>

      {trending.length > 0 && (
        <section className="pb-16">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-500">
            Trending this week
          </h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {trending.map((r) => (
              <button
                key={`${r.media_type}-${r.id}`}
                onClick={() => onPick(r)}
                className="group text-left"
              >
                <Poster
                  path={r.poster_path}
                  size="w342"
                  className="aspect-2/3 w-full rounded-xl transition group-hover:scale-[1.03] group-hover:ring-2 group-hover:ring-amber-400"
                />
                <span className="mt-1.5 block truncate text-sm text-zinc-300">
                  {r.title || r.name}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

function TitlePage({ item, onBack }) {
  const isTV = item.media_type === 'tv'
  const [details, setDetails] = useState(null)
  const [cast, setCast] = useState(null)
  const [upToSeason, setUpToSeason] = useState('all')
  const [error, setError] = useState(null)

  useEffect(() => {
    setDetails(null)
    setCast(null)
    setUpToSeason('all')
    const path = isTV ? `/tv/${item.id}` : `/movie/${item.id}`
    tmdb(path, { append_to_response: isTV ? 'aggregate_credits' : 'credits' })
      .then(setDetails)
      .catch((e) => setError(e.message))
  }, [item.id, isTV])

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
    // Spoiler-safe mode: only people who appear in seasons the viewer has seen.
    const n = Number(upToSeason)
    setCast(null)
    Promise.all(
      Array.from({ length: n }, (_, i) =>
        tmdb(`/tv/${item.id}/season/${i + 1}/aggregate_credits`).catch(() => ({ cast: [] })),
      ),
    )
      .then((seasons) => {
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
        setCast(normalizeTvCast([...merged.values()]).slice(0, 30))
      })
      .catch((e) => setError(e.message))
  }, [details, upToSeason, item.id, isTV])

  if (error) return <SetupNotice message={error} />
  if (!details)
    return <p className="py-20 text-center text-zinc-500">Loading characters…</p>

  const year = (details.release_date || details.first_air_date || '').slice(0, 4)
  const seasonCount = details.number_of_seasons || 0

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <button onClick={onBack} className="mb-6 text-sm text-zinc-400 hover:text-amber-400">
        &larr; Back to search
      </button>

      <div className="flex items-start gap-5">
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

          {isTV && seasonCount > 1 && (
            <label className="mt-4 flex flex-wrap items-center gap-2 text-sm text-zinc-300">
              <span className="rounded-md bg-amber-400/15 px-2 py-1 font-medium text-amber-300">
                Spoiler shield
              </span>
              I&rsquo;ve watched up to
              <select
                value={upToSeason}
                onChange={(e) => setUpToSeason(e.target.value)}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5"
              >
                <option value="all">the whole show</option>
                {Array.from({ length: seasonCount }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    season {i + 1}
                  </option>
                ))}
              </select>
              — only characters from those seasons are shown.
            </label>
          )}
        </div>
      </div>

      {!cast ? (
        <p className="py-16 text-center text-zinc-500">Filtering out spoilers…</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {cast.map((c) => (
            <CharacterCard key={c.id} person={c} isTV={isTV} currentTitleId={details.id} />
          ))}
        </div>
      )}
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

function CharacterCard({ person, isTV, currentTitleId }) {
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
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
      <Poster path={person.profile_path} size="w342" className="aspect-3/4 w-full object-cover" />
      <div className="p-3">
        <p className="truncate font-semibold" title={person.character}>
          {person.character || '—'}
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
          <div className="mt-2">
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

function Poster({ path, size = 'w185', className = '' }) {
  const src = img(path, size)
  if (!src)
    return (
      <div className={`grid shrink-0 place-items-center bg-zinc-800 text-zinc-600 ${className}`}>
        ?
      </div>
    )
  return <img src={src} alt="" loading="lazy" className={`shrink-0 bg-zinc-800 object-cover ${className}`} />
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
