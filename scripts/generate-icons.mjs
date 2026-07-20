// One-off: renders PWA PNG icons from the favicon artwork. Run with:
//   node scripts/generate-icons.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'

const favicon = readFileSync('public/favicon.svg', 'utf8')

// Maskable variant: full-bleed square (no rounded corners) with the glyph
// scaled into the ~80% safe zone, so launcher masks don't clip it.
const glyph = favicon.match(/<g transform[^>]*>[\s\S]*?<\/g>/)[0]
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#fbbf24"/>
  <g transform="translate(6.4 6.4) scale(0.8)">
    ${glyph.replace(/<g transform="[^"]*"/, '<g transform="translate(0 0)"').replace('translate(4 4)', 'translate(0 0)')}
  </g>
</svg>`

const jobs = [
  { src: favicon, size: 192, out: 'public/pwa-192.png' },
  { src: favicon, size: 512, out: 'public/pwa-512.png' },
  { src: favicon, size: 180, out: 'public/apple-touch-icon.png' },
  { src: maskable, size: 512, out: 'public/pwa-maskable-512.png' },
]

for (const { src, size, out } of jobs) {
  const buf = await sharp(Buffer.from(src), { density: 300 }).resize(size, size).png().toBuffer()
  writeFileSync(out, buf)
  console.log('wrote', out, buf.length, 'bytes')
}
