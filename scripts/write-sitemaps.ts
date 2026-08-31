// Post-build: write static sitemap.xml + sitemap-hot.xml into dist/.
// Generated at build time so Cloudflare Pages does not need a 400+ subrequest
// Worker (free plan caps subrequests at 50). Daily freshness comes from the
// Cloudflare Deploy Hook (see .github/workflows/daily-rebuild.yml).
import { readFileSync, writeFileSync } from 'node:fs'
import { submitIndexNow, urlsFromSitemap } from './lib/indexnow'
import { buildSitemapXml } from './lib/sitemap'
import { buildHotSitemapXml } from './lib/sitemap-hot'

const SITE = process.env.SITE_ORIGIN || 'https://whosthatcast.com'
const DIST = new URL('../dist/', import.meta.url)

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

if (!apiKey) {
  console.warn('write-sitemaps: no TMDB_API_KEY, skipping sitemap generation')
  process.exit(0)
}

const t0 = Date.now()
const [main, hot] = await Promise.all([
  buildSitemapXml({ apiKey, site: SITE }),
  buildHotSitemapXml({ apiKey, site: SITE }),
])

writeFileSync(new URL('sitemap.xml', DIST), main)
writeFileSync(new URL('sitemap-hot.xml', DIST), hot)

const count = (xml: string) => (xml.match(/<url>/g) || []).length
console.log(
  `write-sitemaps: sitemap.xml ${count(main)} urls, sitemap-hot.xml ${count(hot)} urls (${Date.now() - t0}ms)`,
)

try {
  const urls = [...urlsFromSitemap(main), ...urlsFromSitemap(hot)]
  await submitIndexNow(SITE, urls)
  console.log(`write-sitemaps: IndexNow accepted ${urls.length} urls`)
} catch (e) {
  const message = e instanceof Error ? e.message : String(e)
  console.warn(`write-sitemaps: IndexNow skipped (${message})`)
}
