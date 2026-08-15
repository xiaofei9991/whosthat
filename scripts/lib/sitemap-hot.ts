const TMDB_BASE = 'https://api.themoviedb.org/3'
const DEFAULT_SITE = 'https://whosthatcast.com'

// Premiere-week "hot lane" — separate from the ramped main sitemap so titles
// can appear/disappear without shifting Google's already-crawled prefix.
const WINDOW_PAST_DAYS = 7
const WINDOW_FUTURE_DAYS = 14
const NEW_TV_FIRST_AIR_DAYS = 45
const MAX_HOT_TITLES = 50
const WHO_PLAYS_CAST_LIMIT = 8
const CREDIT_CHUNK = 5

type TmdbItem = {
  id: number
  media_type?: 'movie' | 'tv' | string
  title?: string
  name?: string
  popularity?: number
  release_date?: string
  first_air_date?: string
}
type CastMember = { id: number; character?: string; roles?: { character?: string }[] }
type CastEntry = { item: TmdbItem; cast: CastMember[]; seasons: number }

// Keep in sync with src/slugify.ts.
function slugify(text: string | null | undefined): string {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function escapeXml(s: string): string {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function utcDay(d = new Date()): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

function parseDate(s: string | undefined): number | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s)) return null
  const parts = s.slice(0, 10).split('-').map(Number)
  const y = parts[0]
  const m = parts[1]
  const day = parts[2]
  if (y == null || m == null || day == null) return null
  return Date.UTC(y, m - 1, day)
}

function inWindow(
  dateStr: string | undefined,
  pastDays: number,
  futureDays: number,
  today = utcDay(),
): boolean {
  const t = parseDate(dateStr)
  if (t == null) return false
  const past = today - pastDays * 86400000
  const future = today + futureDays * 86400000
  return t >= past && t <= future
}

async function fetchPage(path: string, apiKey: string, page = 1): Promise<TmdbItem[]> {
  const url = new URL(TMDB_BASE + path)
  url.searchParams.set('page', String(page))
  url.searchParams.set('api_key', apiKey)
  try {
    const r = await fetch(url)
    if (!r.ok) return []
    const d = (await r.json()) as { results?: TmdbItem[] }
    return d.results || []
  } catch {
    return []
  }
}

async function mapInChunks<T, R>(items: T[], chunkSize: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = []
  for (let i = 0; i < items.length; i += chunkSize) {
    out.push(...(await Promise.all(items.slice(i, i + chunkSize).map(fn))))
  }
  return out
}

export async function buildHotSitemapXml({
  apiKey,
  site = DEFAULT_SITE,
  now = Date.now(),
}: {
  apiKey?: string
  site?: string
  now?: number
} = {}): Promise<string> {
  if (!apiKey) throw new Error('TMDB_API_KEY is not configured')

  const today = utcDay(new Date(now))
  const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10)
  const [nowPlaying, upcoming, airingToday, onTheAir, recentPremieres] = await Promise.all([
    fetchPage('/movie/now_playing', apiKey, 1),
    fetchPage('/movie/upcoming', apiKey, 1),
    fetchPage('/tv/airing_today', apiKey, 1),
    fetchPage('/tv/on_the_air', apiKey, 1),
    fetchPage(
      `/discover/tv?sort_by=popularity.desc&first_air_date.gte=${isoDay(today - NEW_TV_FIRST_AIR_DAYS * 86400000)}&first_air_date.lte=${isoDay(today)}`,
      apiKey,
      1,
    ),
  ])

  const seen = new Set<string>()
  const titles: TmdbItem[] = []

  const push = (item: TmdbItem, mediaType: 'movie' | 'tv', keep: boolean) => {
    if (!keep) return
    const id = item.id
    if (!id) return
    const key = `${mediaType}-${id}`
    if (seen.has(key)) return
    seen.add(key)
    titles.push({
      ...item,
      media_type: mediaType,
      popularity: item.popularity || 0,
    })
  }

  for (const item of nowPlaying) {
    // TMDB already curates "in theatres now" — keep the whole page.
    push(item, 'movie', true)
  }
  for (const item of upcoming) {
    push(item, 'movie', inWindow(item.release_date, WINDOW_PAST_DAYS, WINDOW_FUTURE_DAYS, today))
  }
  for (const item of airingToday) {
    // Airing today = active premiere / episode window; always keep.
    push(item, 'tv', true)
  }
  for (const item of onTheAir) {
    // Prefer brand-new series so we don't flood with long-running soaps.
    push(item, 'tv', inWindow(item.first_air_date, NEW_TV_FIRST_AIR_DAYS, WINDOW_FUTURE_DAYS, today))
  }
  for (const item of recentPremieres) {
    // Binge drops (whole season at once) vanish from airing_today/on_the_air
    // the day after premiere; discover-by-first_air_date keeps them in the
    // hot lane for the full window. Range is enforced by the API params.
    push(item, 'tv', true)
  }

  titles.sort((a, b) => (b.popularity || 0) - (a.popularity || 0) || a.id - b.id)
  const candidates = titles.slice(0, MAX_HOT_TITLES)

  const castLists = await mapInChunks(candidates, CREDIT_CHUNK, async (item): Promise<CastEntry> => {
    const isTV = item.media_type === 'tv'
    const url = isTV
      ? new URL(`${TMDB_BASE}/tv/${item.id}`)
      : new URL(`${TMDB_BASE}/movie/${item.id}/credits`)
    if (isTV) url.searchParams.set('append_to_response', 'aggregate_credits')
    url.searchParams.set('api_key', apiKey)
    try {
      const r = await fetch(url)
      const d = r.ok
        ? ((await r.json()) as {
            cast?: CastMember[]
            aggregate_credits?: { cast?: CastMember[] }
            number_of_seasons?: number
          })
        : {}
      let cast = (isTV ? d.aggregate_credits?.cast : d.cast) || []
      cast = cast.slice(0, WHO_PLAYS_CAST_LIMIT)
      cast.sort((a, b) => a.id - b.id)
      return {
        item,
        cast,
        seasons: isTV ? d.number_of_seasons || 0 : 0,
      }
    } catch {
      return { item, cast: [], seasons: 0 }
    }
  })

  // Stable within a response: movie before tv, then id. Hot set membership
  // changes day-to-day by design — that is fine because this file is separate.
  castLists.sort((a, b) => {
    if (a.item.media_type !== b.item.media_type) {
      return a.item.media_type === 'movie' ? -1 : 1
    }
    return a.item.id - b.item.id
  })

  const lastmod = new Date(today).toISOString().slice(0, 10)
  const urls: string[] = []

  for (const entry of castLists) {
    const { item, cast, seasons } = entry
    const titleName = item.title || item.name
    const slug = slugify(titleName)
    urls.push(`${site}/${item.media_type}/${item.id}${slug ? `/${slug}` : ''}`)

    if (item.media_type === 'tv' && seasons > 0) {
      // Current/latest season guide is the useful one during premiere week.
      urls.push(`${site}/tv/${item.id}/season-${seasons}${slug ? `/${slug}` : ''}`)
    }

    const isTV = item.media_type === 'tv'
    const who: string[] = []
    for (const c of cast) {
      const character = isTV
        ? (c.roles || []).map((r) => r.character).filter(Boolean).join(' / ')
        : c.character
      if (!character) continue
      const wslug = slugify(`who plays ${character} in ${titleName}`)
      who.push(
        `${site}/who-plays/${item.media_type}/${item.id}/${c.id}${wslug ? `/${wslug}` : ''}`,
      )
    }
    who.sort()
    urls.push(...who)
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((u) => `  <url><loc>${escapeXml(u)}</loc><lastmod>${lastmod}</lastmod></url>`)
  .join('\n')}
</urlset>
`
}
