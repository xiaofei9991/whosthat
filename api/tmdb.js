const TMDB_BASE = 'https://api.themoviedb.org/3'
const ALLOWED_PATH = /^\/(search|movie|tv|person|trending)\//

export default async function handler(req, res) {
  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'TMDB_API_KEY is not configured' })
  }
  const { path = '', ...params } = req.query
  if (!ALLOWED_PATH.test(path)) {
    return res.status(400).json({ error: 'path not allowed' })
  }
  const target = new URL(TMDB_BASE + path)
  for (const [k, v] of Object.entries(params)) {
    target.searchParams.set(k, Array.isArray(v) ? v[0] : v)
  }
  target.searchParams.set('api_key', apiKey)
  const r = await fetch(target)
  const body = await r.text()
  res.setHeader('cache-control', 's-maxage=3600, stale-while-revalidate=86400')
  res.status(r.status).send(body)
}
