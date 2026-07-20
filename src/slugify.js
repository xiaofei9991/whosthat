// Kebab-case slug for SEO URLs. A copy of this lives in api/ functions
// (they can't import from src/), keep both in sync.
export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
