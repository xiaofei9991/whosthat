import React from 'react'
import { ImageResponse } from 'workers-og'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const e = React.createElement

type OgCastMember = {
  id: number
  name: string
  character?: string
  profile_path?: string | null
  roles?: { character?: string }[]
}

type OgDetails = {
  title?: string
  name?: string
  release_date?: string
  first_air_date?: string
  poster_path?: string | null
  credits?: { cast?: OgCastMember[] }
  aggregate_credits?: { cast?: OgCastMember[] }
}

function brandRow() {
  return e(
    'div',
    { style: { display: 'flex', alignItems: 'center', gap: 16 } },
    e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 56,
          height: 56,
          borderRadius: 14,
          background: '#fbbf24',
          color: '#09090b',
          fontSize: 34,
          fontWeight: 700,
        },
      },
      '?',
    ),
    e('div', { style: { fontSize: 34, fontWeight: 700, color: '#fafafa' } }, "Who's That?"),
  )
}

function card({
  imageUrl,
  kicker,
  title,
  accent,
  footer,
}: {
  imageUrl: string | null
  kicker: string
  title: string
  accent?: string | null
  footer: string
}) {
  return e(
    'div',
    {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        background: '#09090b',
        padding: 56,
        gap: 48,
        alignItems: 'center',
      },
    },
    imageUrl
      ? e('img', {
          src: imageUrl,
          width: 346,
          height: 518,
          style: { borderRadius: 20, objectFit: 'cover' },
        })
      : e('div', {
          style: { width: 346, height: 518, borderRadius: 20, background: '#27272a' },
        }),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: 518,
          flex: 1,
        },
      },
      brandRow(),
      e(
        'div',
        { style: { display: 'flex', flexDirection: 'column', gap: 18 } },
        e(
          'div',
          {
            style: {
              fontSize: 26,
              color: '#fbbf24',
              textTransform: 'uppercase',
              letterSpacing: 4,
            },
          },
          kicker,
        ),
        e(
          'div',
          {
            style: {
              fontSize: title.length > 60 ? 44 : 56,
              fontWeight: 700,
              color: '#fafafa',
              lineHeight: 1.15,
            },
          },
          title,
        ),
        accent
          ? e('div', { style: { fontSize: 34, color: '#fbbf24', fontWeight: 700 } }, accent)
          : null,
      ),
      e('div', { style: { fontSize: 24, color: '#71717a' } }, footer),
    ),
  )
}

export async function onRequest(context: EventContext<Env, string, Record<string, never>>): Promise<Response> {
  const url = new URL(context.request.url)
  const type = url.searchParams.get('type')
  const id = url.searchParams.get('id')
  const personId = url.searchParams.get('personId')
  const apiKey = context.env.TMDB_API_KEY

  if ((type !== 'movie' && type !== 'tv') || !/^\d+$/.test(String(id)) || !apiKey) {
    return new Response('bad request', { status: 400 })
  }
  const isTV = type === 'tv'

  let details: OgDetails
  try {
    const target = new URL(`${TMDB_BASE}/${type}/${id}`)
    target.searchParams.set('append_to_response', isTV ? 'aggregate_credits' : 'credits')
    target.searchParams.set('api_key', apiKey)
    const r = await fetch(target)
    if (!r.ok) throw new Error()
    details = (await r.json()) as OgDetails
  } catch {
    return new Response('tmdb error', { status: 502 })
  }

  const name = details.title || details.name || ''
  const year = (details.release_date || details.first_air_date || '').slice(0, 4)
  const poster = details.poster_path
    ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
    : null

  let node
  if (personId && /^\d+$/.test(personId)) {
    const rawCast = (isTV ? details.aggregate_credits : details.credits)?.cast || []
    const credit = rawCast.find((c) => c.id === Number(personId))
    if (!credit) return new Response('not found', { status: 404 })
    const character = isTV
      ? credit.roles?.map((r) => r.character).filter(Boolean).join(' / ') || '—'
      : credit.character || '—'
    const profile = credit.profile_path
      ? `https://image.tmdb.org/t/p/w500${credit.profile_path}`
      : poster
    node = card({
      imageUrl: profile,
      kicker: 'Spoiler-free answer',
      title: `Who plays ${character} in ${name}?`,
      accent: credit.name,
      footer: 'whosthatcast.com',
    })
  } else {
    node = card({
      imageUrl: poster,
      kicker: 'No spoilers, just faces & names',
      title: `${name}${year ? ` (${year})` : ''}`,
      accent: 'Cast & Character Guide',
      footer: 'whosthatcast.com',
    })
  }

  try {
    return new ImageResponse(node, {
      width: 1200,
      height: 630,
      headers: {
        'cache-control': 'public, s-maxage=604800, stale-while-revalidate=2592000',
      },
    })
  } catch {
    if (poster) return Response.redirect(poster, 302)
    return new Response('og error', { status: 500 })
  }
}
