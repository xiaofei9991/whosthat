import { readFileSync } from 'node:fs'
import { buildHotSitemapXml } from './lib/sitemap-hot'

const envMatch = process.env.TMDB_API_KEY
  ? null
  : readFileSync(new URL('../.env', import.meta.url), 'utf8').match(/TMDB_API_KEY=(.+)/)
const apiKey = process.env.TMDB_API_KEY || envMatch?.[1]?.trim()
if (!apiKey) throw new Error('TMDB_API_KEY is not configured')

const SITE = process.env.SITE_ORIGIN || 'https://whosthatcast.com'

const t0 = Date.now()
const xml = await buildHotSitemapXml({ apiKey, site: SITE })
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].flatMap((m) => (m[1] ? [m[1]] : []))
const byType: Record<string, number> = {}
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
