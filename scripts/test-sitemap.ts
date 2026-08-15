import { readFileSync } from 'node:fs'
import {
  assembleSitemapXml,
  currentCap,
  fetchSitemapData,
} from './lib/sitemap'

const envMatch = process.env.TMDB_API_KEY
  ? null
  : readFileSync(new URL('../.env', import.meta.url), 'utf8').match(/TMDB_API_KEY=(.+)/)
const apiKey = process.env.TMDB_API_KEY || envMatch?.[1]?.trim()
if (!apiKey) throw new Error('TMDB_API_KEY is not configured')

const SITE = process.env.SITE_ORIGIN || 'https://whosthatcast.com'

function summarize(label: string, xml: string, ms: number): string[] {
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
            : 'home'
    byType[seg] = (byType[seg] || 0) + 1
  }
  console.log(label, '| total', urls.length, '|', JSON.stringify(byType), '|', ms + 'ms')
  return urls
}

const todayCap = currentCap()
const laterCap = currentCap(Date.now() + 30 * 86400000)

const t0 = Date.now()
// Fetch once at the larger cap so both assemblies share the same TMDB snapshot.
const data = await fetchSitemapData(apiKey, laterCap)
const fetchMs = Date.now() - t0

const today = summarize(
  'today     ',
  assembleSitemapXml({ ...data, site: SITE, cap: todayCap }),
  fetchMs,
)
const later = summarize(
  '+30 days  ',
  assembleSitemapXml({ ...data, site: SITE, cap: laterCap }),
  0,
)

const prefixStable = today.every((u, i) => later[i] === u)
console.log('prefix stable (growth is additive):', prefixStable)
if (!prefixStable) process.exit(1)
