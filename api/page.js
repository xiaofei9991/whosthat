import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const SITE = process.env.SITE_ORIGIN || 'https://whosthat-app.vercel.app'

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

  // Rewrites in vercel.json pass type + id (and kind/personId for who-plays
  // pages); fall back to parsing the path.
  let { kind, type, id, personId } = req.query
  if (!type || !id) {
    const w = (req.url || '').match(/\/who-plays\/(movie|tv)\/(\d+)\/(\d+)/)
    if (w) {
      kind = 'whoplays'
      ;[, type, id, personId] = w
    } else {
      const m = (req.url || '').match(/\/(movie|tv)\/(\d+)/)
      if (m) [, type, id] = m
    }
  }
  if ((type !== 'movie' && type !== 'tv') || !/^\d+$/.test(String(id))) {
    return serveFallback()
  }
  const isWhoPlays = kind === 'whoplays' && /^\d+$/.test(String(personId))
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
  const poster = details.poster_path
    ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
    : null

  let pageTitle, description, canonical, ogType, ogImage, jsonLdList, crawlerBlock

  if (isWhoPlays) {
    const rawCast = (isTV ? details.aggregate_credits : details.credits)?.cast || []
    const credit = rawCast.find((c) => c.id === Number(personId))
    if (!credit) return serveFallback()
    const character = isTV
      ? credit.roles?.map((r) => r.character).filter(Boolean).join(' / ') || '—'
      : credit.character || '—'
    const actor = credit.name
    const profile = credit.profile_path
      ? `https://image.tmdb.org/t/p/w500${credit.profile_path}`
      : null

    canonical = `${SITE}/who-plays/${type}/${details.id}/${credit.id}/${slugify(`who plays ${character} in ${name}`)}`
    pageTitle = `Who Plays ${character} in ${name}${year ? ` (${year})` : ''}? — ${actor} | Who's That?`
    description = `${character} in ${name} is played by ${actor}. See their photo, age, and where else you've seen them — spoiler-free.`
    ogType = 'article'
    ogImage = profile || poster
    const titleUrl = `/${type}/${details.id}/${slugify(name)}`
    const answer = `${character} in ${name}${year ? ` (${year})` : ''} is played by ${actor}.`

    jsonLdList = [
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: `Who plays ${character} in ${name}?`,
            acceptedAnswer: { '@type': 'Answer', text: answer },
          },
        ],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: actor,
        url: canonical,
        ...(profile ? { image: profile } : {}),
        performerIn: {
          '@type': isTV ? 'TVSeries' : 'Movie',
          name,
          url: SITE + titleUrl,
          actor: {
            '@type': 'PerformanceRole',
            characterName: character,
            actor: { '@type': 'Person', name: actor },
          },
        },
      },
    ]

    crawlerBlock = `<h1>Who plays ${escapeHtml(character)} in ${escapeHtml(name)}?</h1>
      <p>${escapeHtml(answer)}</p>
      <p><a href="${escapeHtml(titleUrl)}">See the full spoiler-free cast &amp; character guide for ${escapeHtml(name)}</a></p>`
  } else {
    const cast = extractCast(details, isTV)
    canonical = `${SITE}/${type}/${details.id}/${slugify(name)}`
    pageTitle = `${name}${year ? ` (${year})` : ''} Cast & Character Guide — No Spoilers | Who's That?`
    // Deliberately not TMDB's overview: it can contain plot spoilers.
    description = `Who plays who in ${name}${year ? ` (${year})` : ''}? Browse a spoiler-free character guide with photos of every major character and the actors behind them${cast[0] ? `, including ${cast.slice(0, 3).map((c) => c.name).join(', ')}` : ''}.`
    ogType = isTV ? 'video.tv_show' : 'video.movie'
    ogImage = poster

    jsonLdList = [
      {
        '@context': 'https://schema.org',
        '@type': isTV ? 'TVSeries' : 'Movie',
        name,
        url: canonical,
        ...(poster ? { image: poster } : {}),
        ...(details.release_date ? { datePublished: details.release_date } : {}),
        ...(details.first_air_date ? { startDate: details.first_air_date } : {}),
        actor: cast.map((c) => ({ '@type': 'Person', name: c.name })),
      },
    ]

    crawlerBlock = `<h1>${escapeHtml(pageTitle)}</h1>
      <p>${escapeHtml(description)}</p>
      <ul>
        ${cast
          .map((c) => `<li>${escapeHtml(c.character)} — played by ${escapeHtml(c.name)}</li>`)
          .join('\n        ')}
      </ul>`
  }

  const headExtras = [
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    `<meta property="og:type" content="${ogType}" />`,
    `<meta property="og:title" content="${escapeHtml(pageTitle)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    ogImage ? `<meta property="og:image" content="${escapeHtml(ogImage)}" />` : '',
    `<meta name="twitter:card" content="${ogImage ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${escapeHtml(pageTitle)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    ogImage ? `<meta name="twitter:image" content="${escapeHtml(ogImage)}" />` : '',
    ...jsonLdList.map(
      (jsonLd) =>
        `<script type="application/ld+json">${JSON.stringify(jsonLd).replaceAll('<', '\\u003c')}</script>`,
    ),
  ]
    .filter(Boolean)
    .join('\n    ')

  // Crawler-readable content placed inside #root; React's createRoot render
  // replaces it on the client, which is expected for this pattern.

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
