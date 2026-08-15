/// <reference types="@cloudflare/workers-types" />

interface Env {
  TMDB_API_KEY?: string
  SITE_ORIGIN?: string
  ASSETS: Fetcher
}
