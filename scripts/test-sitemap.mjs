import { readFileSync } from 'node:fs'
import handler from '../api/sitemap.js'

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

async function run(label, fakeNow) {
  const realNow = Date.now
  if (fakeNow) Date.now = () => fakeNow
  const res = makeRes()
  const t0 = realNow()
  await handler({}, res)
  Date.now = realNow
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
            : 'home'
    byType[seg] = (byType[seg] || 0) + 1
  }
  console.log(label, '| status', res.code, '| total', urls.length, '|', JSON.stringify(byType), '|', Date.now() - t0 + 'ms')
  return urls
}

const today = await run('today     ')
const later = await run('+30 days  ', Date.UTC(2026, 7, 19)) // 2026-08-19

const prefixStable = today.every((u, i) => later[i] === u)
console.log('prefix stable (growth is additive):', prefixStable)
