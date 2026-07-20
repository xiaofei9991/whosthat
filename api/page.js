import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

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

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function readIndexHtml() {
  const candidates = [
    join(process.cwd(), 'dist', 'index.html'),
    join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'index.html'),
  ]
  for (const p of candidates) {
    try {
      return readFileSync(p, 'utf8')
    } catch {
      /* try next */
    }
  }
  throw new Error('dist/index.html not found')
}

// Normalizes movie credits and tv aggregate_credits to { character, name }.
function extractCast(details, isTV) {
  const raw = (isTV ? details.aggregate_credits : details.credits)?.cast || []
  return raw.slice(0, 20).map((c) => ({
    name: c.name,
    character: isTV
      ? c.roles?.map((r) => r.character).filter(Boolean).join(' / ') || '—'
      : c.character || '—',
  }))
}

export default async function handler(req, res) {
  let html
  try {
    html = readIndexHtml()
  } catch {
    return res.status(500).send('index.html missing from deployment')
  }

  const serveFallback = () => {
    res.setHeader('content-type', 'text/html; charset=utf-8')
    res.setHeader('cache-control', 'public, s-maxage=300, stale-while-revalidate=86400')
    res.status(200).send(html)
  }

  // Rewrites in vercel.json pass type + id; fall back to parsing the path.
  let { type, id } = req.query
  if (!type || !id) {
    const m = (req.url || '').match(/\/(movie|tv)\/(\d+)/)
    if (m) [, type, id] = m
  }
  if ((type !== 'movie' && type !== 'tv') || !/^\d+$/.test(String(id))) {
    return serveFallback()
  }
  const isTV = type === 'tv'

  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) return serveFallback()

  let details
  try {
    const url = new URL(`${TMDB_BASE}/${type}/${id}`)
    url.searchParams.set('append_to_response', isTV ? 'aggregate_credits' : 'credits')
    url.searchParams.set('api_key', apiKey)
    const r = await fetch(url)
    if (!r.ok) throw new Error(`TMDB ${r.status}`)
    details = await r.json()
  } catch {
    return serveFallback()
  }

  const name = details.title || details.name || 'Unknown title'
  const year = (details.release_date || details.first_air_date || '').slice(0, 4)
  const cast = extractCast(details, isTV)
  const canonical = `${SITE}/${type}/${details.id}/${slugify(name)}`
  const poster = details.poster_path
    ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
    : null

  const pageTitle = `${name}${year ? ` (${year})` : ''} Cast & Character Guide — No Spoilers | Who's That?`
  // Deliberately not TMDB's overview: it can contain plot spoilers.
  const description = `Who plays who in ${name}${year ? ` (${year})` : ''}? Browse a spoiler-free character guide with photos of every major character and the actors behind them${cast[0] ? `, including ${cast.slice(0, 3).map((c) => c.name).join(', ')}` : ''}.`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': isTV ? 'TVSeries' : 'Movie',
    name,
    url: canonical,
    ...(poster ? { image: poster } : {}),
    ...(details.release_date ? { datePublished: details.release_date } : {}),
    ...(details.first_air_date ? { startDate: details.first_air_date } : {}),
    actor: cast.map((c) => ({ '@type': 'Person', name: c.name })),
  }

  const headExtras = [
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    `<meta property="og:type" content="${isTV ? 'video.tv_show' : 'video.movie'}" />`,
    `<meta property="og:title" content="${escapeHtml(pageTitle)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    poster ? `<meta property="og:image" content="${escapeHtml(poster)}" />` : '',
    `<meta name="twitter:card" content="${poster ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${escapeHtml(pageTitle)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    poster ? `<meta name="twitter:image" content="${escapeHtml(poster)}" />` : '',
    `<script type="application/ld+json">${JSON.stringify(jsonLd).replaceAll('<', '\\u003c')}</script>`,
  ]
    .filter(Boolean)
    .join('\n    ')

  // Crawler-readable content placed inside #root; React's createRoot render
  // replaces it on the client, which is expected for this pattern.
  const crawlerBlock = `<h1>${escapeHtml(pageTitle)}</h1>
      <p>${escapeHtml(description)}</p>
      <ul>
        ${cast
          .map((c) => `<li>${escapeHtml(c.character)} — played by ${escapeHtml(c.name)}</li>`)
          .join('\n        ')}
      </ul>`

  html = html
    .replace(/<title>.*?<\/title>/s, `<title>${escapeHtml(pageTitle)}</title>`)
    .replace(
      /<meta\s+name="description"[^>]*>/s,
      `<meta name="description" content="${escapeHtml(description)}" />`,
    )
    .replace('</head>', `    ${headExtras}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${crawlerBlock}</div>`)

  res.setHeader('content-type', 'text/html; charset=utf-8')
  res.setHeader('cache-control', 'public, s-maxage=86400, stale-while-revalidate=604800')
  res.status(200).send(html)
}
