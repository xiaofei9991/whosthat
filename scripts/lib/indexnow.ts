// Ping IndexNow after sitemap writes so Bing/Yandex/Naver learn about new
// URLs without waiting to recrawl. Google does not use this protocol.
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'
export const INDEXNOW_KEY = 'a7f3c91e2b4d6805f1e8c0a93d6b7e24'
const BATCH = 10_000

export function urlsFromSitemap(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].flatMap((m) => (m[1] ? [m[1]] : []))
}

export async function submitIndexNow(site: string, urls: string[]): Promise<void> {
  const unique = [...new Set(urls)].filter((u) => u.startsWith(site))
  if (unique.length === 0) return

  const host = new URL(site).host
  const keyLocation = `${site}/${INDEXNOW_KEY}.txt`

  for (let i = 0; i < unique.length; i += BATCH) {
    const urlList = unique.slice(i, i + BATCH)
    const r = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host, key: INDEXNOW_KEY, keyLocation, urlList }),
    })
    if (!r.ok) {
      const body = await r.text().catch(() => '')
      throw new Error(`IndexNow ${r.status}${body ? `: ${body.slice(0, 200)}` : ''}`)
    }
  }
}
