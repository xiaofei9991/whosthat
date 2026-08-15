const TMDB_BASE = 'https://api.themoviedb.org/3'
const DEFAULT_SITE = 'https://whosthatcast.com'

// Keep in sync with src/slugify.ts (functions can't import from src/).
function slugify(text: string | null | undefined): string {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function escapeHtml(s: string | number | null | undefined): string {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function breadcrumbLd(items: [string, string?][]): Record<string, unknown> {
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

function htmlResponse(
  html: string,
  { status = 200, maxAge = 86400, swr = 604800 }: { status?: number; maxAge?: number; swr?: number } = {},
): Response {
  return new Response(html, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': `public, s-maxage=${maxAge}, stale-while-revalidate=${swr}`,
    },
  })
}

// Static-page meta. FAQ answers are duplicated from src/App.tsx STATIC_PAGES
// (functions can't import from src/); keep the two in sync.
type StaticMeta = {
  title: string
  description: string
  h1: string
  faqs?: [string, string][]
}

const STATIC_META: Record<'about' | 'faq' | 'privacy', StaticMeta> = {
  about: {
    title: "About | Who's That?",
    description:
      "Who's That? answers \u201cwait, who is that again?\u201d without ruining the story — spoiler-free cast & character guides for any movie or TV show.",
    h1: "About Who's That?",
  },
  faq: {
    title: "FAQ | Who's That?",
    description:
      "Frequently asked questions about Who's That? — the spoiler-free character guide: how the spoiler shield works, where the data comes from, and more.",
    h1: 'Frequently asked questions',
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
    description:
      "Who's That? privacy policy: no accounts, no sign-ups, watch progress stays on your device, cookie-free analytics.",
    h1: 'Privacy policy',
  },
}

type TmdbRole = { character?: string }
type TmdbPersonCredit = {
  id?: number
  name?: string
  character?: string
  profile_path?: string | null
  roles?: TmdbRole[]
}
type TmdbDetails = {
  id: number
  title?: string
  name?: string
  release_date?: string
  first_air_date?: string
  poster_path?: string | null
  number_of_seasons?: number
  credits?: { cast?: TmdbPersonCredit[] }
  aggregate_credits?: { cast?: TmdbPersonCredit[] }
}

function extractCast(details: TmdbDetails, isTV: boolean): { name: string; character: string }[] {
  const raw = (isTV ? details.aggregate_credits : details.credits)?.cast || []
  return raw.slice(0, 20).map((c) => ({
    name: c.name ?? '',
    character: isTV
      ? c.roles?.map((r) => r.character).filter(Boolean).join(' / ') || '—'
      : c.character || '—',
  }))
}

type ParsedRoute =
  | { kind: 'static'; page: 'about' | 'faq' | 'privacy' }
  | { kind: 'whoplays'; type: 'movie' | 'tv'; id: string; personId: string }
  | { kind: 'season'; type: 'tv'; id: string; season: string }
  | { kind: 'title'; type: 'movie' | 'tv'; id: string }

function parseRoute(pathname: string): ParsedRoute | null {
  const staticPage = pathname.match(/^\/(about|faq|privacy)\/?$/)
  if (staticPage) return { kind: 'static', page: staticPage[1] as 'about' | 'faq' | 'privacy' }

  const who = pathname.match(/^\/who-plays\/(movie|tv)\/(\d+)\/(\d+)/)
  if (who) return { kind: 'whoplays', type: who[1] as 'movie' | 'tv', id: who[2]!, personId: who[3]! }

  const season = pathname.match(/^\/tv\/(\d+)\/season-(\d+)/)
  if (season) return { kind: 'season', type: 'tv', id: season[1]!, season: season[2]! }

  const title = pathname.match(/^\/(movie|tv)\/(\d+)/)
  if (title) return { kind: 'title', type: title[1] as 'movie' | 'tv', id: title[2]! }

  return null
}

async function loadTemplate(env: Env, request: Request): Promise<string> {
  const asset = await env.ASSETS.fetch(new URL('/index.html', request.url))
  if (!asset.ok) throw new Error('index.html missing from deployment')
  return (await asset.text())
    .replace(/\s*<!--HOME-HEAD-START-->[\s\S]*?<!--HOME-HEAD-END-->/, '')
    .replace(/<!--HOME-BODY-START-->[\s\S]*?<!--HOME-BODY-END-->/, '')
}

export async function renderPage({
  request,
  env,
}: {
  request: Request
  env: Env
}): Promise<Response> {
  const site = env.SITE_ORIGIN || DEFAULT_SITE
  const url = new URL(request.url)
  const route = parseRoute(url.pathname)

  if (!route) {
    return env.ASSETS.fetch(request)
  }

  let html: string
  try {
    html = await loadTemplate(env, request)
  } catch {
    return new Response('index.html missing from deployment', { status: 500 })
  }

  const serveFallback = () => htmlResponse(html, { maxAge: 300, swr: 86400 })

  if (route.kind === 'static') {
    const staticMeta = STATIC_META[route.page]
    if (!staticMeta) return serveFallback()
    const canonical = `${site}/${route.page}`
    const extras = [
      `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
      `<meta property="og:type" content="website" />`,
      `<meta property="og:title" content="${escapeHtml(staticMeta.title)}" />`,
      `<meta property="og:description" content="${escapeHtml(staticMeta.description)}" />`,
      `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
      staticMeta.faqs
        ? `<script type="application/ld+json">${JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: staticMeta.faqs.map(([q, a]) => ({
              '@type': 'Question',
              name: q,
              acceptedAnswer: { '@type': 'Answer', text: a },
            })),
          }).replaceAll('<', '\\u003c')}</script>`
        : '',
    ]
      .filter(Boolean)
      .join('\n    ')
    const block = `<h1>${escapeHtml(staticMeta.h1)}</h1>
      ${(staticMeta.faqs || [])
        .map(([q, a]) => `<h2>${escapeHtml(q)}</h2>\n      <p>${escapeHtml(a)}</p>`)
        .join('\n      ')}
      <p><a href="/">Who's That? — spoiler-free character guides for movies &amp; TV</a></p>`
    const out = html
      .replace(/<title>.*?<\/title>/s, `<title>${escapeHtml(staticMeta.title)}</title>`)
      .replace(
        /<meta\s+name="description"[^>]*>/s,
        `<meta name="description" content="${escapeHtml(staticMeta.description)}" />`,
      )
      .replace('</head>', `    ${extras}\n  </head>`)
      .replace('<div id="root"></div>', `<div id="root">${block}</div>`)
    return htmlResponse(out)
  }

  const kind = route.kind
  const type = route.type
  const id = route.id
  const personId = route.kind === 'whoplays' ? route.personId : undefined
  const season = route.kind === 'season' ? route.season : undefined
  if ((type !== 'movie' && type !== 'tv') || !/^\d+$/.test(String(id))) {
    return serveFallback()
  }
  const isWhoPlays = kind === 'whoplays' && /^\d+$/.test(String(personId))
  const isSeason = kind === 'season' && /^\d+$/.test(String(season))
  const isTV = type === 'tv'

  const apiKey = env.TMDB_API_KEY
  if (!apiKey) return serveFallback()

  let details: TmdbDetails
  try {
    const target = new URL(`${TMDB_BASE}/${type}/${id}`)
    target.searchParams.set('append_to_response', isTV ? 'aggregate_credits' : 'credits')
    target.searchParams.set('api_key', apiKey)
    const r = await fetch(target)
    if (!r.ok) throw new Error(`TMDB ${r.status}`)
    details = (await r.json()) as TmdbDetails
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
    let seasonCast: { name: string; character: string }[] = []
    try {
      const target = new URL(`${TMDB_BASE}/tv/${id}/season/${n}/aggregate_credits`)
      target.searchParams.set('api_key', apiKey)
      const r = await fetch(target)
      if (r.ok)
        seasonCast = (((await r.json()) as { cast?: TmdbPersonCredit[] }).cast || [])
          .slice(0, 20)
          .map((c) => ({
            name: c.name ?? '',
            character: c.roles?.map((r2) => r2.character).filter(Boolean).join(' / ') || '—',
          }))
    } catch {
      /* keep empty cast */
    }
    if (n < 1 || n > (details.number_of_seasons || 0)) return serveFallback()

    const showUrl = `/tv/${details.id}/${slugify(name)}`
    canonical = `${site}/tv/${details.id}/season-${n}/${slugify(name)}`
    pageTitle = `${name} Season ${n} Characters & Cast — No Spoilers | Who's That?`
    description = `Every character in ${name} season ${n} with photos and the actors who play them${seasonCast[0] ? `, including ${seasonCast.slice(0, 3).map((c) => c.name).join(', ')}` : ''} — spoiler-free, nothing from later seasons.`
    ogType = 'video.tv_show'
    ogImage = poster ? `${site}/api/og?type=tv&id=${details.id}` : null

    jsonLdList = [
      {
        '@context': 'https://schema.org',
        '@type': 'TVSeason',
        name: `${name} Season ${n}`,
        seasonNumber: n,
        url: canonical,
        partOfSeries: { '@type': 'TVSeries', name, url: site + showUrl },
        actor: seasonCast.map((c) => ({ '@type': 'Person', name: c.name })),
      },
      breadcrumbLd([
        ["Who's That?", `${site}/`],
        [name, site + showUrl],
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

    canonical = `${site}/who-plays/${type}/${details.id}/${credit.id}/${slugify(`who plays ${character} in ${name}`)}`
    pageTitle = `Who Plays ${character} in ${name}${year ? ` (${year})` : ''}? — ${actor} | Who's That?`
    description = `${character} in ${name} is played by ${actor}. See their photo, age, and where else you've seen them — spoiler-free.`
    ogType = 'article'
    ogImage =
      profile || poster
        ? `${site}/api/og?type=${type}&id=${details.id}&personId=${credit.id}`
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
          url: site + titleUrl,
          actor: {
            '@type': 'PerformanceRole',
            characterName: character,
            actor: { '@type': 'Person', name: actor },
          },
        },
      },
      breadcrumbLd([
        ["Who's That?", `${site}/`],
        [name, site + titleUrl],
        [`Who plays ${character}?`],
      ]),
    ]

    crawlerBlock = `<h1>Who plays ${escapeHtml(character)} in ${escapeHtml(name)}?</h1>
      <p>${escapeHtml(answer)}</p>
      <p><a href="${escapeHtml(titleUrl)}">See the full spoiler-free cast &amp; character guide for ${escapeHtml(name)}</a></p>`
  } else {
    const cast = extractCast(details, isTV)
    canonical = `${site}/${type}/${details.id}/${slugify(name)}`
    pageTitle = `${name}${year ? ` (${year})` : ''} Cast & Character Guide — No Spoilers | Who's That?`
    // Deliberately not TMDB's overview: it can contain plot spoilers.
    description = `Who plays who in ${name}${year ? ` (${year})` : ''}? Browse a spoiler-free character guide with photos of every major character and the actors behind them${cast[0] ? `, including ${cast.slice(0, 3).map((c) => c.name).join(', ')}` : ''}.`
    ogType = isTV ? 'video.tv_show' : 'video.movie'
    ogImage = poster ? `${site}/api/og?type=${type}&id=${details.id}` : null

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
        ["Who's That?", `${site}/`],
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

  html = html
    .replace(/<title>.*?<\/title>/s, `<title>${escapeHtml(pageTitle)}</title>`)
    .replace(
      /<meta\s+name="description"[^>]*>/s,
      `<meta name="description" content="${escapeHtml(description)}" />`,
    )
    .replace('</head>', `    ${headExtras}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${crawlerBlock}</div>`)

  return htmlResponse(html)
}
