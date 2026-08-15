import { readFileSync } from 'node:fs'
import { buildHotSitemapXml } from './lib/sitemap-hot.mjs'

const apiKey =
  process.env.TMDB_API_KEY ||
  readFileSync(new URL('../.env', import.meta.url), 'utf8').match(/TMDB_API_KEY=(.+)/)[1].trim()

const SITE = process.env.SITE_ORIGIN || 'https://whosthatcast.com'

const t0 = Date.now()
const xml = await buildHotSitemapXml({ apiKey, site: SITE })
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
const byType = {}
for (const u of urls) {
  const seg = u.includes('/season-')
    ? 'season'
    : u.includes('/who-plays/')
      ? 'who-plays'
      : u.includes('/movie/')
        ? 'movie'
        : u.includes('/tv/')
          ? 'tv'
          : 'other'
  byType[seg] = (byType[seg] || 0) + 1
}

console.log('total', urls.length, '|', JSON.stringify(byType), '|', Date.now() - t0 + 'ms')
console.log('sample', urls.slice(0, 5))
if (urls.length < 1) process.exit(1)
