import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const SITE = process.env.SITE_ORIGIN || 'https://whosthatcast.com'

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

function breadcrumbLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([label, url], i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: label,
      ...(url ? { item: url } : {}),
    })),
  }
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
  // dist/index.html carries homepage-only SEO content injected at build time
  // (scripts/inject-home-seo.mjs); strip it before using it as the template
  // for content pages, restoring the bare <div id="root"></div>.
  html = html
    .replace(/\s*<!--HOME-HEAD-START-->[\s\S]*?<!--HOME-HEAD-END-->/, '')
    .replace(/<!--HOME-BODY-START-->[\s\S]*?<!--HOME-BODY-END-->/, '')

  const serveFallback = () => {
    res.setHeader('content-type', 'text/html; charset=utf-8')
    res.setHeader('cache-control', 'public, s-maxage=300, stale-while-revalidate=86400')
    res.status(200).send(html)
  }

  // Rewrites in vercel.json pass type + id (and kind/personId/season for
  // who-plays and season pages); fall back to parsing the path.
  let { kind, type, id, personId, season } = req.query
  if (!type || !id) {
    const w = (req.url || '').match(/\/who-plays\/(movie|tv)\/(\d+)\/(\d+)/)
    const s = (req.url || '').match(/\/tv\/(\d+)\/season-(\d+)/)
    if (w) {
      kind = 'whoplays'
      ;[, type, id, personId] = w
    } else if (s) {
      kind = 'season'
      type = 'tv'
      ;[, id, season] = s
    } else {
      const m = (req.url || '').match(/\/(movie|tv)\/(\d+)/)
      if (m) [, type, id] = m
    }
  }
  if ((type !== 'movie' && type !== 'tv') || !/^\d+$/.test(String(id))) {
    return serveFallback()
  }
  const isWhoPlays = kind === 'whoplays' && /^\d+$/.test(String(personId))
  const isSeason = kind === 'season' && /^\d+$/.test(String(season))
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

  if (isSeason) {
    const n = Number(season)
    let seasonCast = []
    try {
      const url = new URL(`${TMDB_BASE}/tv/${id}/season/${n}/aggregate_credits`)
      url.searchParams.set('api_key', apiKey)
      const r = await fetch(url)
      if (r.ok)
        seasonCast = ((await r.json()).cast || []).slice(0, 20).map((c) => ({
          name: c.name,
          character: c.roles?.map((r2) => r2.character).filter(Boolean).join(' / ') || '—',
        }))
    } catch {
      /* keep empty cast */
    }
    if (n < 1 || n > (details.number_of_seasons || 0)) return serveFallback()

    const showUrl = `/tv/${details.id}/${slugify(name)}`
    canonical = `${SITE}/tv/${details.id}/season-${n}/${slugify(name)}`
    pageTitle = `${name} Season ${n} Characters & Cast — No Spoilers | Who's That?`
    description = `Every character in ${name} season ${n} with photos and the actors who play them${seasonCast[0] ? `, including ${seasonCast.slice(0, 3).map((c) => c.name).join(', ')}` : ''} — spoiler-free, nothing from later seasons.`
    ogType = 'video.tv_show'
    ogImage = poster ? `${SITE}/api/og?type=tv&id=${details.id}` : null

    jsonLdList = [
      {
        '@context': 'https://schema.org',
        '@type': 'TVSeason',
        name: `${name} Season ${n}`,
        seasonNumber: n,
        url: canonical,
        partOfSeries: { '@type': 'TVSeries', name, url: SITE + showUrl },
        actor: seasonCast.map((c) => ({ '@type': 'Person', name: c.name })),
      },
      breadcrumbLd([
        ["Who's That?", `${SITE}/`],
        [name, SITE + showUrl],
        [`Season ${n}`],
      ]),
    ]

    const otherSeasons = Array.from(
      { length: details.number_of_seasons || 0 },
      (_, i) => i + 1,
    ).filter((x) => x !== n)
    crawlerBlock = `<h1>${escapeHtml(`${name} Season ${n} Characters & Cast — No Spoilers`)}</h1>
      <p>${escapeHtml(description)}</p>
      <ul>
        ${seasonCast
          .map((c) => `<li>${escapeHtml(c.character)} — played by ${escapeHtml(c.name)}</li>`)
          .join('\n        ')}
      </ul>
      <p><a href="${escapeHtml(showUrl)}">All seasons of ${escapeHtml(name)}: full spoiler-free character guide</a></p>
      <ul>
        ${otherSeasons
          .map(
            (x) =>
              `<li><a href="/tv/${details.id}/season-${x}/${slugify(name)}">${escapeHtml(name)} season ${x} characters</a></li>`,
          )
          .join('\n        ')}
      </ul>`
  } else if (isWhoPlays) {
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
    ogImage =
      profile || poster
        ? `${SITE}/api/og?type=${type}&id=${details.id}&personId=${credit.id}`
        : null
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
      breadcrumbLd([
        ["Who's That?", `${SITE}/`],
        [name, SITE + titleUrl],
        [`Who plays ${character}?`],
      ]),
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
    ogImage = poster ? `${SITE}/api/og?type=${type}&id=${details.id}` : null

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
      breadcrumbLd([
        ["Who's That?", `${SITE}/`],
        [`${name}${year ? ` (${year})` : ''} cast & characters`],
      ]),
    ]

    const seasonLinks = isTV
      ? Array.from({ length: details.number_of_seasons || 0 }, (_, i) => i + 1)
          .map(
            (n) =>
              `<li><a href="/tv/${details.id}/season-${n}/${slugify(name)}">${escapeHtml(name)} season ${n} characters &amp; cast</a></li>`,
          )
          .join('\n        ')
      : ''
    crawlerBlock = `<h1>${escapeHtml(pageTitle)}</h1>
      <p>${escapeHtml(description)}</p>
      <ul>
        ${cast
          .map((c) => `<li>${escapeHtml(c.character)} — played by ${escapeHtml(c.name)}</li>`)
          .join('\n        ')}
      </ul>${seasonLinks ? `\n      <ul>\n        ${seasonLinks}\n      </ul>` : ''}`
  }

  const headExtras = [
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    `<meta property="og:type" content="${ogType}" />`,
    `<meta property="og:title" content="${escapeHtml(pageTitle)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    ogImage ? `<meta property="og:image" content="${escapeHtml(ogImage)}" />` : '',
    ogImage ? `<meta property="og:image:width" content="1200" />` : '',
    ogImage ? `<meta property="og:image:height" content="630" />` : '',
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
