const TMDB_BASE = 'https://api.themoviedb.org/3'

// Only the exact TMDB patterns the frontend in src/ actually calls
// (src/App.tsx + src/api.ts, audited 2026-11-07). Everything else is rejected
// so the proxy cannot be used as a general-purpose TMDB key oracle.
const ALLOWED_PATTERNS: RegExp[] = [
  /^\/trending\/all\/week$/,
  /^\/search\/multi$/,
  /^\/(movie|tv)\/\d+$/,
  /^\/tv\/\d+\/season\/\d+\/aggregate_credits$/,
  /^\/tv\/\d+\/season\/\d+\/episode\/\d+\/credits$/,
  /^\/person\/\d+$/,
  /^\/person\/\d+\/combined_credits$/,
]

// Query params the frontend actually sends. api_key is added server-side.
const ALLOWED_PARAMS = new Set(['language', 'query', 'append_to_response', 'page'])

function isSameSiteRequest(request: Request, url: URL): boolean {
  // Modern browsers send Sec-Fetch-Site on every fetch(); the SPA's calls
  // are always same-origin. Crawlers hitting /api/tmdb directly usually
  // send cross-site / same-site / no header at all.
  const fetchSite = request.headers.get('sec-fetch-site')
  if (fetchSite) return fetchSite === 'same-origin'

  // Fallback for browsers without Sec-Fetch-*: require Origin or Referer
  // to point back at this host.
  for (const name of ['origin', 'referer'] as const) {
    const value = request.headers.get(name)
    if (value) {
      try {
        return new URL(value).host === url.host
      } catch {
        return false
      }
    }
  }
  // No same-site signal at all: not our own frontend.
  return false
}

export async function onRequest(context: EventContext<Env, string, Record<string, never>>): Promise<Response> {
  const { request } = context
  if (request.method !== 'GET') {
    return Response.json({ error: 'method not allowed' }, { status: 405 })
  }

  const url = new URL(request.url)

  // Main gate: /api/tmdb exists only for this site's own pages.
  // This does not affect the server-rendered SEO pages in
  // functions/_lib/page.ts, which call TMDB directly server-side.
  if (!isSameSiteRequest(request, url)) {
    return Response.json({ error: 'forbidden' }, { status: 403 })
  }

  const apiKey = context.env.TMDB_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'TMDB_API_KEY is not configured' }, { status: 500 })
  }

  const path = url.searchParams.get('path') || ''
  if (!ALLOWED_PATTERNS.some((re) => re.test(path))) {
    return Response.json({ error: 'path not allowed' }, { status: 400 })
  }
  const query = url.searchParams.get('query')
  if (query && query.length > 100) {
    return Response.json({ error: 'query too long' }, { status: 400 })
  }

  // Serve repeats from the edge cache instead of re-calling TMDB.
  // NOTE: this saves the TMDB subrequest, not the Function invocation
  // itself — the same-site gate above is what stops the quota burn.
  // Cloudflare adds caches.default, which the DOM lib types don't know.
  const cache = (caches as unknown as { default: Cache }).default
  const cacheKey = new Request(url.toString(), { method: 'GET' })
  const hit = await cache.match(cacheKey)
  if (hit) return hit

  const target = new URL(TMDB_BASE + path)
  url.searchParams.forEach((v, k) => {
    if (k !== 'path' && ALLOWED_PARAMS.has(k)) target.searchParams.set(k, v)
  })
  target.searchParams.set('api_key', apiKey)

  const r = await fetch(target)
  const response = new Response(await r.text(), {
    status: r.status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 's-maxage=3600, stale-while-revalidate=86400',
    },
  })
  if (r.ok) context.waitUntil(cache.put(cacheKey, response.clone()))
  return response
}
