import { readFileSync } from 'node:fs'
import handler from '../api/sitemap-hot.js'

process.env.TMDB_API_KEY ||= readFileSync(new URL('../.env', import.meta.url), 'utf8')
  .match(/TMDB_API_KEY=(.+)/)[1]
  .trim()

function makeRes() {
  return {
    headers: {},
    setHeader(k, v) {
      this.headers[k] = v
    },
    status(c) {
      this.code = c
      return this
    },
    send(body) {
      this.body = body
    },
  }
}

const res = makeRes()
const t0 = Date.now()
await handler({}, res)
const urls = [...res.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
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

console.log('status', res.code)
console.log('cache', res.headers['cache-control'])
console.log('total', urls.length, '|', JSON.stringify(byType), '|', Date.now() - t0 + 'ms')
console.log('sample', urls.slice(0, 5))
if (res.code !== 200 || urls.length < 1) process.exit(1)
