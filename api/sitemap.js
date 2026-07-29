const TMDB_BASE = 'https://api.themoviedb.org/3'
const SITE = process.env.SITE_ORIGIN || 'https://whosthatcast.com'

// --- Gradual rollout ---------------------------------------------------------
// A brand-new domain gets a tiny crawl budget; dumping thousands of URLs into
// the sitemap on day one just piles up "Discovered - not indexed" and risks a
// thin-content impression. Instead the sitemap grows by RAMP_PER_DAY URLs each
// day, from RAMP_BASE up to RAMP_MAX, with no manual intervention. URL order is
// stable and additive: growth only ever appends lower-priority URLs at the
// tail, it never removes or reshuffles what Google has already seen.
const RAMP_START_UTC = Date.UTC(2026, 6, 20) // 2026-07-20
const RAMP_BASE = 1000
const RAMP_PER_DAY = 20 // 1000 -> 5000 over ~200 days
const RAMP_MAX = 5000

function currentCap() {
  const days = Math.max(0, Math.floor((Date.now() - RAMP_START_UTC) / 86400000))
  return Math.min(RAMP_MAX, RAMP_BASE + days * RAMP_PER_DAY)
}

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

// Core sources form the stable head of the sitemap (matches what was submitted
// to GSC before the ramp existed). Extra sources are the long-tail titles that
// get released as the cap grows.
const CORE_SOURCES = [
  { path: '/trending/all/week', from: 1, to: 2 },
  { path: '/movie/popular', from: 1, to: 3 },
  { path: '/tv/popular', from: 1, to: 3 },
  { path: '/movie/top_rated', from: 1, to: 3 },
  { path: '/tv/top_rated', from: 1, to: 3 },
]
const EXTRA_SOURCES = [
  { path: '/movie/popular', from: 4, to: 10 },
  { path: '/tv/popular', from: 4, to: 10 },
  { path: '/movie/top_rated', from: 4, to: 10 },
  { path: '/tv/top_rated', from: 4, to: 10 },
]

const WHO_PLAYS_TITLE_BASE = 60
const WHO_PLAYS_CAST_LIMIT = 8

async function mapInChunks(items, chunkSize, fn) {
  const out = []
  for (let i = 0; i < items.length; i += chunkSize) {
    out.push(...(await Promise.all(items.slice(i, i + chunkSize).map(fn))))
  }
  return out
}

function fetchTitles(sources, apiKey) {
  const requests = sources.flatMap(({ path, from, to }) =>
    Array.from({ length: to - from + 1 }, (_, i) => {
      const url = new URL(TMDB_BASE + path)
      url.searchParams.set('page', String(from + i))
      url.searchParams.set('api_key', apiKey)
      const impliedType = path.startsWith('/movie/') ? 'movie' : path.startsWith('/tv/') ? 'tv' : null
      return fetch(url)
        .then((r) => (r.ok ? r.json() : { results: [] }))
        .then((d) =>
          (d.results || []).map((item) => ({ ...item, media_type: item.media_type || impliedType })),
        )
        .catch(() => [])
    }),
  )
  return Promise.all(requests).then((pages) => pages.flat())
}

export default async function handler(req, res) {
  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) return res.status(500).send('TMDB_API_KEY is not configured')

  const cap = currentCap()

  const coreItems = await fetchTitles(CORE_SOURCES, apiKey)
  // Long-tail titles are only worth fetching once the cap outgrows the core set
  // (~950 core URLs).
  const extraItems = cap > RAMP_BASE ? await fetchTitles(EXTRA_SOURCES, apiKey) : []

  const coreKeys = new Set(
    coreItems
      .filter((i) => i.media_type === 'movie' || i.media_type === 'tv')
      .map((i) => `${i.media_type}-${i.id}`),
  )
  const seen = new Set()
  const titles = []
  for (const item of [...coreItems, ...extraItems]) {
    if (item.media_type !== 'movie' && item.media_type !== 'tv') continue
    const key = `${item.media_type}-${item.id}`
    if (seen.has(key)) continue
    seen.add(key)
    item._core = coreKeys.has(key)
    titles.push(item)
  }
  // Deterministic order for prefix stability (sort by media_type + id)
  titles.sort((a, b) => {
    if (a.media_type !== b.media_type) return a.media_type === 'movie' ? -1 : 1
    return a.id - b.id
  })

  const titleUrl = (item) => {
    const slug = slugify(item.title || item.name)
    return `${SITE}/${item.media_type}/${item.id}${slug ? `/${slug}` : ''}`
  }

  // Each candidate title yields ~10 extra URLs (8 who-plays + ~2 seasons), so
  // only fetch the credits we can actually publish under today's cap.
  const budget = Math.max(0, cap - (1 + titles.length))
  const beyondBase = Math.max(0, Math.ceil((budget - WHO_PLAYS_TITLE_BASE * 10) / 10))
  const whoPlaysTitleLimit = Math.min(titles.length, WHO_PLAYS_TITLE_BASE + beyondBase)
  const candidates = titles.slice(0, whoPlaysTitleLimit)

  const castLists = []
  for (const item of candidates) {
    const isTV = item.media_type === 'tv'
    const url = isTV
      ? new URL(`${TMDB_BASE}/tv/${item.id}`)
      : new URL(`${TMDB_BASE}/movie/${item.id}/credits`)
    if (isTV) url.searchParams.set('append_to_response', 'aggregate_credits')
    url.searchParams.set('api_key', apiKey)
    const res = await fetch(url)
    const d = res.ok ? await res.json() : {}
    let cast = (isTV ? d.aggregate_credits?.cast : d.cast) || []
    cast = cast.slice(0, WHO_PLAYS_CAST_LIMIT)
    // Sort cast by id for stable order
    cast.sort((a, b) => a.id - b.id)
    castLists.push({
      item,
      cast,
      seasons: isTV ? d.number_of_seasons || 0 : 0,
    })
  }

  const seasonUrls = (entry) => {
    const slug = slugify(entry.item.title || entry.item.name)
    return Array.from(
      { length: entry.seasons },
      (_, i) => `${SITE}/tv/${entry.item.id}/season-${i + 1}${slug ? `/${slug}` : ''}`,
    )
  }
  const whoPlaysUrls = (entry) => {
    const isTV = entry.item.media_type === 'tv'
    const titleName = entry.item.title || entry.item.name
    const out = []
    for (const c of entry.cast) {
      const character = isTV
        ? (c.roles || []).map((r) => r.character).filter(Boolean).join(' / ')
        : c.character
      if (!character) continue
      const slug = slugify(`who plays ${character} in ${titleName}`)
      out.push(`${SITE}/who-plays/${entry.item.media_type}/${entry.item.id}/${c.id}${slug ? `/${slug}` : ''}`)
    }
    // Sort who-plays URLs for stable order
    return out.sort()
  }

  // Stable, additive ordering: the head reproduces the pre-ramp sitemap, and
  // everything the ramp releases later only appends after it. Core-title
  // groups must come before any extra-title URLs so that a growing candidate
  // list never shifts the position of URLs Google has already seen.
  const headEntries = castLists.slice(0, WHO_PLAYS_TITLE_BASE)
  const tailEntries = castLists.slice(WHO_PLAYS_TITLE_BASE)
  const tailCore = tailEntries.filter((e) => e.item._core)
  const tailExtra = tailEntries.filter((e) => !e.item._core)
  const urls = [
    `${SITE}/`,
    ...titles.filter((t) => t._core).map(titleUrl),
    ...headEntries.flatMap(seasonUrls),
    ...headEntries.flatMap(whoPlaysUrls),
    ...tailCore.flatMap((e) => [...seasonUrls(e), ...whoPlaysUrls(e)]),
    ...titles.filter((t) => !t._core).map(titleUrl),
    ...tailExtra.flatMap((e) => [...seasonUrls(e), ...whoPlaysUrls(e)]),
  ].slice(0, cap)

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${escapeXml(u)}</loc></url>`).join('\n')}
</urlset>
`

  res.setHeader('content-type', 'application/xml; charset=utf-8')
  res.setHeader('cache-control', 'public, s-maxage=86400, stale-while-revalidate=604800')
  res.status(200).send(xml)
}
