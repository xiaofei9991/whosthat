import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const ALLOWED_PATH = /^\/(search|movie|tv|person|trending)\//

// Dev-only proxy so the TMDB key never reaches the browser.
// In production the same logic runs as a Vercel function (api/tmdb.js).
function tmdbDevProxy(apiKey) {
  return {
    name: 'tmdb-dev-proxy',
    configureServer(server) {
      server.middlewares.use('/api/tmdb', async (req, res) => {
        const url = new URL(req.url, 'http://localhost')
        const path = url.searchParams.get('path') || ''
        res.setHeader('content-type', 'application/json')
        if (!apiKey) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'TMDB_API_KEY is not set in .env' }))
          return
        }
        if (!ALLOWED_PATH.test(path)) {
          res.statusCode = 400
          res.end(JSON.stringify({ error: 'path not allowed' }))
          return
        }
        const target = new URL(TMDB_BASE + path)
        url.searchParams.forEach((v, k) => {
          if (k !== 'path') target.searchParams.set(k, v)
        })
        target.searchParams.set('api_key', apiKey)
        try {
          const r = await fetch(target)
          res.statusCode = r.status
          res.end(await r.text())
        } catch (e) {
          res.statusCode = 502
          res.end(JSON.stringify({ error: String(e) }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss(), tmdbDevProxy(env.TMDB_API_KEY)],
  }
})
