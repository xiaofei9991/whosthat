const SITE = process.env.SITE_ORIGIN || 'https://whosthatcast.com'

// Daily warm of the hot sitemap so the CDN edge holds a fresh premiere window
// before Googlebot's next crawl. Hobby cron = once per day is enough.
export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.authorization || ''
  const isVercelCron = req.headers['x-vercel-cron'] === '1'
  if (secret && auth !== `Bearer ${secret}` && !isVercelCron) {
    return res.status(401).json({ ok: false, error: 'unauthorized' })
  }

  // Hit the function path (not the rewrite) so we still exercise generation.
  const url = `${SITE}/api/sitemap-hot?warm=${Date.now()}`
  try {
    const r = await fetch(url, {
      headers: { 'user-agent': 'whosthat-cron-hot/1.0' },
    })
    const text = await r.text()
    const count = (text.match(/<url>/g) || []).length
    return res.status(200).json({ ok: r.ok, status: r.status, urls: count })
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err?.message || err) })
  }
}
