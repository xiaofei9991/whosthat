const TMDB_BASE = 'https://api.themoviedb.org/3'
const SITE = process.env.SITE_ORIGIN || 'https://whosthatcast.com'

// Premiere-week "hot lane" — separate from the ramped main sitemap so titles
// can appear/disappear without shifting Google's already-crawled prefix.
const WINDOW_PAST_DAYS = 7
const WINDOW_FUTURE_DAYS = 14
const NEW_TV_FIRST_AIR_DAYS = 45
const MAX_HOT_TITLES = 50
const WHO_PLAYS_CAST_LIMIT = 8
const CREDIT_CHUNK = 5

// Keep in sync with src/slugify.js (api functions can't import from src/).
function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function escapeXml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function utcDay(d = new Date()) {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

function parseDate(s) {
  if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s)) return null
  const [y, m, day] = s.slice(0, 10).split('-').map(Number)
  return Date.UTC(y, m - 1, day)
}

function inWindow(dateStr, pastDays, futureDays, today = utcDay()) {
  const t = parseDate(dateStr)
  if (t == null) return false
  const past = today - pastDays * 86400000
  const future = today + futureDays * 86400000
  return t >= past && t <= future
}

async function fetchPage(path, apiKey, page = 1) {
  const url = new URL(TMDB_BASE + path)
  url.searchParams.set('page', String(page))
  url.searchParams.set('api_key', apiKey)
  try {
    const r = await fetch(url)
    if (!r.ok) return []
    const d = await r.json()
    return d.results || []
  } catch {
    return []
  }
}

async function mapInChunks(items, chunkSize, fn) {
  const out = []
  for (let i = 0; i < items.length; i += chunkSize) {
    out.push(...(await Promise.all(items.slice(i, i + chunkSize).map(fn))))
  }
  return out
}

export default async function handler(req, res) {
  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) return res.status(500).send('TMDB_API_KEY is not configured')

  const today = utcDay()
  const [
    nowPlaying,
    upcoming,
    airingToday,
    onTheAir,
  ] = await Promise.all([
    fetchPage('/movie/now_playing', apiKey, 1),
    fetchPage('/movie/upcoming', apiKey, 1),
    fetchPage('/tv/airing_today', apiKey, 1),
    fetchPage('/tv/on_the_air', apiKey, 1),
  ])

  const seen = new Set()
  const titles = []

  const push = (item, mediaType, keep) => {
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

  titles.sort((a, b) => b.popularity - a.popularity || a.id - b.id)
  const candidates = titles.slice(0, MAX_HOT_TITLES)

  const castLists = await mapInChunks(candidates, CREDIT_CHUNK, async (item) => {
    const isTV = item.media_type === 'tv'
    const url = isTV
      ? new URL(`${TMDB_BASE}/tv/${item.id}`)
      : new URL(`${TMDB_BASE}/movie/${item.id}/credits`)
    if (isTV) url.searchParams.set('append_to_response', 'aggregate_credits')
    url.searchParams.set('api_key', apiKey)
    try {
      const r = await fetch(url)
      const d = r.ok ? await r.json() : {}
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
  const urls = []

  for (const entry of castLists) {
    const { item, cast, seasons } = entry
    const titleName = item.title || item.name
    const slug = slugify(titleName)
    urls.push(`${SITE}/${item.media_type}/${item.id}${slug ? `/${slug}` : ''}`)

    if (item.media_type === 'tv' && seasons > 0) {
      // Current/latest season guide is the useful one during premiere week.
      urls.push(`${SITE}/tv/${item.id}/season-${seasons}${slug ? `/${slug}` : ''}`)
    }

    const isTV = item.media_type === 'tv'
    const who = []
    for (const c of cast) {
      const character = isTV
        ? (c.roles || []).map((r) => r.character).filter(Boolean).join(' / ')
        : c.character
      if (!character) continue
      const wslug = slugify(`who plays ${character} in ${titleName}`)
      who.push(
        `${SITE}/who-plays/${item.media_type}/${item.id}/${c.id}${wslug ? `/${wslug}` : ''}`,
      )
    }
    who.sort()
    urls.push(...who)
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${escapeXml(u)}</loc><lastmod>${lastmod}</lastmod></url>`,
  )
  .join('\n')}
</urlset>
`

  res.setHeader('content-type', 'application/xml; charset=utf-8')
  // Short CDN TTL so premiere-day titles surface within an hour.
  res.setHeader('cache-control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  res.status(200).send(xml)
}
