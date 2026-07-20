const cache = new Map()

export async function tmdb(path, params = {}) {
  const qs = new URLSearchParams({ path, ...params })
  const url = `/api/tmdb?${qs}`
  if (cache.has(url)) return cache.get(url)
  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `TMDB request failed (${res.status})`)
  }
  const data = await res.json()
  cache.set(url, data)
  return data
}

export function img(path, size = 'w185') {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null
}
