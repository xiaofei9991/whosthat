import { readFileSync } from 'node:fs'
import {
  assembleSitemapXml,
  currentCap,
  fetchSitemapData,
} from './lib/sitemap.mjs'

const apiKey =
  process.env.TMDB_API_KEY ||
  readFileSync(new URL('../.env', import.meta.url), 'utf8').match(/TMDB_API_KEY=(.+)/)[1].trim()

const SITE = process.env.SITE_ORIGIN || 'https://whosthatcast.com'

function summarize(label, xml, ms) {
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
