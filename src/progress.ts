import type { EpisodeOrAll, ListedProgress, SeasonOrAll, ShowProgress } from './types'

const KEY = 'wt.progress'

type ProgressMap = Record<string, ShowProgress>

export function readProgress(): ProgressMap {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (raw && typeof raw === 'object') return raw as ProgressMap
    return {}
  } catch {
    return {}
  }
}

function write(all: ProgressMap): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    /* storage full or private mode */
  }
}

export function getShowProgress(id: number): ShowProgress | null {
  return readProgress()[`tv-${id}`] ?? null
}

export function saveShowProgress(
  id: number,
  {
    season,
    episode,
    name,
    poster_path,
  }: {
    season: SeasonOrAll
    episode: EpisodeOrAll
    name: string
    poster_path: string | null | undefined
  },
): void {
  const all = readProgress()
  all[`tv-${id}`] = {
    season,
    episode,
    name,
    poster_path: poster_path ?? null,
    updatedAt: Date.now(),
  }
  write(all)
}

export function removeShowProgress(id: number): void {
  const all = readProgress()
  delete all[`tv-${id}`]
  write(all)
}

export function listProgress(limit = 12): ListedProgress[] {
  return Object.entries(readProgress())
    .map(([key, v]) => ({ id: Number(key.slice(3)), ...v }))
    .filter((v) => v.id && v.name)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, limit)
}
