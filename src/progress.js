// Watch-progress memory, stored locally. Shape:
// { "tv-94997": { season: 2, episode: 5|'all', name, poster_path, updatedAt } }
// season may be 'all' (finished / no shield). Used to restore the spoiler
// shield on return visits and to build the "Your shows" section on Home.

const KEY = 'wt.progress'

export function readProgress() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {}
  } catch {
    return {}
  }
}

function write(all) {
  try {
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    /* storage full or private mode */
  }
}

export function getShowProgress(id) {
  return readProgress()[`tv-${id}`] || null
}

export function saveShowProgress(id, { season, episode, name, poster_path }) {
  const all = readProgress()
  all[`tv-${id}`] = { season, episode, name, poster_path, updatedAt: Date.now() }
  write(all)
}

export function removeShowProgress(id) {
  const all = readProgress()
  delete all[`tv-${id}`]
  write(all)
}

// Sorted list for the Home "Your shows" section, most recent first.
export function listProgress(limit = 12) {
  return Object.entries(readProgress())
    .map(([key, v]) => ({ id: Number(key.slice(3)), ...v }))
    .filter((v) => v.id && v.name)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, limit)
}

export function formatProgress(p) {
  if (p.season === 'all') return 'Whole show'
  if (p.episode && p.episode !== 'all') return `Up to S${p.season} · E${p.episode}`
  return `Up to season ${p.season}`
}
