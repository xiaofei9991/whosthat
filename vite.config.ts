import { defineConfig, loadEnv } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import type { IncomingMessage, ServerResponse } from 'node:http'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const ALLOWED_PATH = /^\/(search|movie|tv|person|trending)\//

// Dev-only proxy so the TMDB key never reaches the browser.
// In production the same logic runs as a Cloudflare Pages Function (functions/api/tmdb.ts).
function tmdbDevProxy(apiKey: string | undefined): Plugin {
  return {
    name: 'tmdb-dev-proxy',
    configureServer(server) {
      server.middlewares.use('/api/tmdb', (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        void (async () => {
        const url = new URL(req.url ?? '', 'http://localhost')
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
        })().catch(next)
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      react(),
      tailwindcss(),
      tmdbDevProxy(env.TMDB_API_KEY),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'inline',
        manifest: {
          name: "Who's That? — Spoiler-Free Character Guide",
          short_name: "Who's That?",
          description:
            'Spoiler-free cast & character guides for movies and TV shows.',
          start_url: '/',
          display: 'standalone',
          background_color: '#09090b',
          theme_color: '#09090b',
          icons: [
            { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
            {
              src: '/pwa-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          // Custom workbox config replaces the plugin's autoUpdate defaults,
          // so skipWaiting/clientsClaim must be set explicitly or new deploys
          // sit in the "waiting" state forever and users keep the old bundle.
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          // App shell for offline; never intercept server-rendered SEO routes'
          // data or the sitemap. TMDB API responses are cached at runtime.
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//, /^\/sitemap\.xml$/, /^\/sitemap-hot\.xml$/, /^\/robots\.txt$/],
          runtimeCaching: [
            {
              urlPattern: /^\/api\/tmdb/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'tmdb-api',
                expiration: { maxEntries: 200, maxAgeSeconds: 86400 },
              },
            },
            {
              urlPattern: /^https:\/\/image\.tmdb\.org\//,
              handler: 'CacheFirst',
              options: {
                cacheName: 'tmdb-images',
                expiration: { maxEntries: 500, maxAgeSeconds: 604800 },
              },
            },
          ],
        },
      }),
    ],
  }
})
