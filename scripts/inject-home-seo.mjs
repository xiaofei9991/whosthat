// Post-build step: inject crawler-visible content into dist/index.html for the
// homepage. Vercel serves static files before rewrites, so "/" can never hit
// api/page.js — instead the internal links, canonical, and JSON-LD are baked in
// at build time. Everything is wrapped in HOME-HEAD / HOME-BODY markers so
// api/page.js can strip them when it reuses index.html as the template for
// movie/tv/season/who-plays pages.
//
// IMPORTANT: the body block must not contain a literal "</div>" (api/page.js
// replaces the root div with a non-greedy regex).
import { readFileSync, writeFileSync } from 'node:fs'

const SITE = process.env.SITE_ORIGIN || 'https://whosthatcast.com'
const OUT = new URL('../dist/index.html', import.meta.url)

let apiKey = process.env.TMDB_API_KEY
if (!apiKey) {
  try {
    apiKey = readFileSync(new URL('../.env', import.meta.url), 'utf8').match(
      /TMDB_API_KEY=(.+)/,
    )?.[1]?.trim()
  } catch {
    /* no .env */
  }
}

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

let trending = []
if (apiKey) {
  try {
    const url = new URL('https://api.themoviedb.org/3/trending/all/week')
    url.searchParams.set('api_key', apiKey)
    const r = await fetch(url)
    if (r.ok) {
      trending = ((await r.json()).results || [])
        .filter((x) => x.media_type === 'movie' || x.media_type === 'tv')
        .slice(0, 18)
    } else {
      console.warn(`inject-home-seo: TMDB responded ${r.status}, proceeding without trending links`)
    }
  } catch (e) {
    console.warn(`inject-home-seo: TMDB fetch failed (${e.message}), proceeding without trending links`)
  }
} else {
  console.warn('inject-home-seo: no TMDB_API_KEY, proceeding without trending links')
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: "Who's That?",
  url: `${SITE}/`,
  description:
    'Spoiler-free cast and character guides for movies and TV shows. See every face, name, and actor — with zero plot spoilers.',
}

const head = `<!--HOME-HEAD-START-->
    <link rel="canonical" href="${SITE}/" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="Who's That? — Spoiler-Free Character Guide for Movies &amp; TV" />
    <meta property="og:description" content="Can't remember who a character is? Get a spoiler-free character guide for any movie or TV show — faces, names, and who plays them. Zero plot spoilers." />
    <meta property="og:url" content="${SITE}/" />
    <meta name="twitter:card" content="summary" />
    <script type="application/ld+json">${JSON.stringify(jsonLd).replaceAll('<', '\\u003c')}</script>
    <!--HOME-HEAD-END-->`

const trendingLinks = trending
  .map((t) => {
    const name = t.title || t.name
    const href = `/${t.media_type}/${t.id}/${slugify(name)}`
    return `<li><a href="${href}">${escapeHtml(name)} cast &amp; character guide — no spoilers</a></li>`
  })
  .join('\n        ')

const body = `<!--HOME-BODY-START-->
      <h1>Spoiler-Free Cast &amp; Character Guides for Movies &amp; TV</h1>
      <p>Ever paused a show to ask &ldquo;wait, who is that again?&rdquo; Googling a character mid-season is a minefield: search results, IMDb cast lists, and wiki pages happily reveal deaths, betrayals, and late-season arrivals. Who&rsquo;s That? shows you every character&rsquo;s face, name, and the actor who plays them &mdash; and nothing else.</p>
      <p>Watching a TV series? The spoiler shield only shows characters who have appeared up to your season and episode, so nothing from later in the story is ever revealed.</p>
      ${trendingLinks ? `<h2>Trending this week</h2>\n      <ul>\n        ${trendingLinks}\n      </ul>` : ''}
      <ul>
        <li><a href="/about">About Who's That?</a></li>
        <li><a href="/faq">Frequently asked questions</a></li>
        <li><a href="/privacy">Privacy policy</a></li>
      </ul>
      <!--HOME-BODY-END-->`

let html = readFileSync(OUT, 'utf8')
if (html.includes('HOME-HEAD-START')) {
  console.log('inject-home-seo: already injected, skipping')
  process.exit(0)
}
html = html
  .replace('</head>', () => `    ${head}\n  </head>`)
  .replace('<div id="root"></div>', () => `<div id="root">${body}</div>`)
writeFileSync(OUT, html)
console.log(
  `inject-home-seo: injected ${trending.length} trending links${apiKey ? '' : ' (no TMDB key — static content only)'}`,
)
