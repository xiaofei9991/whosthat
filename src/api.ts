import { tmdbLang } from './i18n'

const cache = new Map<string, unknown>()

export async function tmdb<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const qs = new URLSearchParams({ path, language: tmdbLang(), ...params })
  const url = `/api/tmdb?${qs}`
  const hit = cache.get(url)
  if (hit) return hit as T
  const res = await fetch(url)
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error || `TMDB request failed (${res.status})`)
  }
  const data = (await res.json()) as T
  cache.set(url, data)
  return data
}

export function img(path: string | null | undefined, size = 'w185'): string | null {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null
}
