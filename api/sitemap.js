const TMDB_BASE = 'https://api.themoviedb.org/3'
const SITE = 'https://whosthat-app.vercel.app'

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

const SOURCES = [
  { path: '/trending/all/week', pages: 2 },
  { path: '/movie/popular', pages: 3 },
  { path: '/tv/popular', pages: 3 },
  { path: '/movie/top_rated', pages: 3 },
  { path: '/tv/top_rated', pages: 3 },
]

// Titles from these sources also get who-plays question pages in the sitemap.
const WHO_PLAYS_SOURCES = new Set(['/trending/all/week', '/movie/popular', '/tv/popular'])
const WHO_PLAYS_TITLE_LIMIT = 60
const WHO_PLAYS_CAST_LIMIT = 8
const MAX_URLS = 1000

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

  const requests = SOURCES.flatMap(({ path, pages }) =>
    Array.from({ length: pages }, (_, i) => {
      const url = new URL(TMDB_BASE + path)
      url.searchParams.set('page', String(i + 1))
      url.searchParams.set('api_key', apiKey)
      // Media type is implied by the endpoint except for /trending/all.
      const impliedType = path.startsWith('/movie/') ? 'movie' : path.startsWith('/tv/') ? 'tv' : null
      const forWhoPlays = WHO_PLAYS_SOURCES.has(path) && (path === '/trending/all/week' || i === 0)
      return fetch(url)
        .then((r) => (r.ok ? r.json() : { results: [] }))
        .then((d) =>
          (d.results || []).map((item) => ({
            ...item,
            media_type: item.media_type || impliedType,
            forWhoPlays,
          })),
        )
        .catch(() => [])
    }),
  )

  const items = (await Promise.all(requests)).flat()
  const seen = new Set()
  const urls = [`${SITE}/`]
  const whoPlaysTitles = []
  for (const item of items) {
    if (item.media_type !== 'movie' && item.media_type !== 'tv') continue
    const key = `${item.media_type}-${item.id}`
    if (seen.has(key)) continue
    seen.add(key)
    const slug = slugify(item.title || item.name)
    urls.push(`${SITE}/${item.media_type}/${item.id}${slug ? `/${slug}` : ''}`)
    if (item.forWhoPlays && whoPlaysTitles.length < WHO_PLAYS_TITLE_LIMIT) whoPlaysTitles.push(item)
  }

  // Who-plays question pages for the top billed cast of the most visible titles.
  const castLists = await mapInChunks(whoPlaysTitles, 10, (item) => {
    const isTV = item.media_type === 'tv'
    const url = new URL(
      `${TMDB_BASE}/${item.media_type}/${item.id}/${isTV ? 'aggregate_credits' : 'credits'}`,
    )
    url.searchParams.set('api_key', apiKey)
    return fetch(url)
      .then((r) => (r.ok ? r.json() : { cast: [] }))
      .then((d) => ({ item, cast: (d.cast || []).slice(0, WHO_PLAYS_CAST_LIMIT) }))
      .catch(() => ({ item, cast: [] }))
  })

  for (const { item, cast } of castLists) {
    const isTV = item.media_type === 'tv'
    const titleName = item.title || item.name
    for (const c of cast) {
      if (urls.length >= MAX_URLS) break
      const character = isTV
        ? (c.roles || []).map((r) => r.character).filter(Boolean).join(' / ')
        : c.character
      if (!character) continue
      const slug = slugify(`who plays ${character} in ${titleName}`)
      urls.push(
        `${SITE}/who-plays/${item.media_type}/${item.id}/${c.id}${slug ? `/${slug}` : ''}`,
      )
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${escapeXml(u)}</loc></url>`).join('\n')}
</urlset>
`

  res.setHeader('content-type', 'application/xml; charset=utf-8')
  res.setHeader('cache-control', 'public, s-maxage=86400, stale-while-revalidate=604800')
  res.status(200).send(xml)
}
