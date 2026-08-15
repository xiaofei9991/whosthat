const TMDB_BASE = 'https://api.themoviedb.org/3'
const ALLOWED_PATH = /^\/(search|movie|tv|person|trending)\//

export async function onRequest(context: EventContext<Env, string, Record<string, never>>): Promise<Response> {
  const apiKey = context.env.TMDB_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'TMDB_API_KEY is not configured' }, { status: 500 })
  }

  const url = new URL(context.request.url)
  const path = url.searchParams.get('path') || ''
  if (!ALLOWED_PATH.test(path)) {
    return Response.json({ error: 'path not allowed' }, { status: 400 })
  }

  const target = new URL(TMDB_BASE + path)
  url.searchParams.forEach((v, k) => {
    if (k !== 'path') target.searchParams.set(k, v)
  })
  target.searchParams.set('api_key', apiKey)

  const r = await fetch(target)
  return new Response(await r.text(), {
    status: r.status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 's-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
