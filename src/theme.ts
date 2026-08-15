export type ThemePref = 'system' | 'light' | 'dark'

const KEY = 'theme'

export function getThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    /* private mode */
  }
  return 'system'
}

export function systemWantsLight(): boolean {
  return window.matchMedia('(prefers-color-scheme: light)').matches
}

export function resolvedLight(pref: ThemePref = getThemePref()): boolean {
  return pref === 'light' || (pref === 'system' && systemWantsLight())
}

export function applyTheme(pref: ThemePref, { animate = false } = {}): void {
  const root = document.documentElement
  const light = resolvedLight(pref)
  const reduce =
    animate && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (animate && !reduce) root.classList.add('theme-switching')
  root.classList.toggle('light', light)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', light ? '#fafafa' : '#09090b')
  if (animate && !reduce) {
    window.setTimeout(() => root.classList.remove('theme-switching'), 350)
  }
}

export function setThemePref(pref: ThemePref): void {
  try {
    localStorage.setItem(KEY, pref)
  } catch {
    /* private mode */
  }
  applyTheme(pref, { animate: true })
}

export function cycleThemePref(pref: ThemePref): ThemePref {
  return pref === 'system' ? 'light' : pref === 'light' ? 'dark' : 'system'
}
