import { useEffect, useRef, useState } from 'react'
import { tmdb, img } from './api.js'
import { slugify } from './slugify.js'

const DEFAULT_TITLE = "Who's That? — Spoiler-Free Character Guide for Movies & TV"

// Parses /movie/:id/:slug, /tv/:id/:slug and /who-plays/:type/:mediaId/:personId/:slug;
// anything else is home.
function parseRoute(pathname) {
  const w = pathname.match(/^\/who-plays\/(movie|tv)\/(\d+)\/(\d+)(?:\/|$)/)
  if (w)
    return { type: 'whoplays', mediaType: w[1], mediaId: Number(w[2]), personId: Number(w[3]) }
  const m = pathname.match(/^\/(movie|tv)\/(\d+)(?:\/|$)/)
  if (m) return { type: 'title', mediaType: m[1], id: Number(m[2]) }
  return { type: 'home' }
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
            <span className="grid size-8 place-items-center rounded-lg bg-amber-400 text-zinc-950">?</span>
            Who&rsquo;s That?
          </a>
          <span className="hidden text-sm text-zinc-500 sm:inline">
            Spoiler-free character guides for movies &amp; TV
          </span>
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
      ) : (
        <TitlePage
          key={`${route.mediaType}-${route.id}`}
          mediaType={route.mediaType}
          id={route.id}
          onBack={() => navigate('/')}
          navigate={navigate}
        />
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
                  <a
                    href={titleUrl(r)}
                    onClick={(e) => {
                      e.preventDefault()
                      onPick(r)
                    }}
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
                  </a>
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
              <a
                key={`${r.media_type}-${r.id}`}
                href={titleUrl(r)}
                onClick={(e) => {
                  e.preventDefault()
                  onPick(r)
                }}
                className="group block text-left"
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
  const [error, setError] = useState(null)

  useEffect(() => {
    setDetails(null)
    setCast(null)
    setUpToSeason('all')
    const path = isTV ? `/tv/${id}` : `/movie/${id}`
    tmdb(path, { append_to_response: isTV ? 'aggregate_credits' : 'credits' })
      .then(setDetails)
      .catch((e) => setError(e.message))
  }, [id, isTV])

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
    // Spoiler-safe mode: only people who appear in seasons the viewer has seen.
    const n = Number(upToSeason)
    setCast(null)
    Promise.all(
      Array.from({ length: n }, (_, i) =>
        tmdb(`/tv/${id}/season/${i + 1}/aggregate_credits`).catch(() => ({ cast: [] })),
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
  }, [details, upToSeason, id, isTV])

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
            <CharacterCard
              key={c.id}
              person={c}
              isTV={isTV}
              currentTitleId={details.id}
              titleName={details.title || details.name}
              navigate={navigate}
            />
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

function CharacterCard({ person, isTV, currentTitleId, titleName, navigate }) {
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

      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Who plays {character} in {titleName}?
      </h1>

      <div className="mt-6 flex flex-col gap-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:flex-row sm:items-start">
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
        <section className="mt-10">
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
        <section className="mt-10">
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
