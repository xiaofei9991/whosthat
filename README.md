# Who's That? — Spoiler-Free Character Guide

Look up any movie or TV show and get a clean character guide: faces, character names,
who plays them, and where you've seen the actor before — with zero plot spoilers.
For TV shows, a "spoiler shield" lets you hide characters from seasons you haven't watched yet.

## Stack

- Vite + React 19 + Tailwind CSS 4
- TMDB API (proxied server-side so the key is never exposed)
- Deploys to Vercel (`api/tmdb.js` is the production proxy function)

## Local development

1. `npm install`
2. Create `.env` with `TMDB_API_KEY=your_key` (get one free at themoviedb.org → Settings → API)
3. `npm run dev`
