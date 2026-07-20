# DESIGN.md — Who's That?

Design contract for whosthatcast.com. Any new page, component, or restyle must follow this document. When a rule here conflicts with a convenient default (a component library, an AI habit, a Tailwind example), this document wins.

## 1. Product character

Who's That? is a **lookup tool, not a destination**. People arrive mid-episode with one question — "who is that?" — and should leave with the answer in under 30 seconds. The design's job:

1. **Get out of the way of the answer.** Faces and names are the content; chrome stays quiet.
2. **Feel trustworthy about spoilers.** The visual language must read as careful and deliberate — a site that feels chaotic doesn't feel spoiler-safe.
3. **Work in the dark.** People use this on a couch, at night, next to a TV. Dark is the default, not a mode.

The personality is a knowledgeable friend on the couch: warm, quick, a little wry ("Wait… who is that again?"), never breathless or salesy.

## 2. Color

Built entirely on Tailwind's `zinc` neutrals plus **one** accent: `amber-400`.

### Dark theme (default)

| Role | Token | Notes |
|---|---|---|
| Page background | `bg-zinc-950` | Near-black, never pure `#000` |
| Surface (cards, inputs, dropdowns) | `bg-zinc-900` | One step up from page |
| Hairline borders | `border-zinc-800` (surfaces), `border-zinc-700` (inputs/chips) | Borders separate; shadows are secondary |
| Primary text | `text-zinc-100` | |
| Secondary text | `text-zinc-300` / `text-zinc-400` | Body copy, descriptions |
| Tertiary / captions | `text-zinc-500` | Metadata, section labels, placeholders |
| Faintest (footer, disabled) | `text-zinc-600` | |
| Accent | `amber-400` | See usage rules below |
| Accent on dark chip | `text-amber-300` on `bg-amber-400/15` | e.g. the Spoiler shield badge |
| Text on accent | `text-zinc-950` | Never white on amber |

### Accent usage rules

Amber = **"this is the answer or the action."** Use it for: key nouns in an answer sentence, links on hover, focused input borders, the active chip in a set, the logo tile, progress captions. Never use it for large fills, backgrounds of whole sections, or more than one competing element per view. If everything is amber, nothing is.

No second accent color. Success/error states may use Tailwind defaults sparingly, but decorative palette stays zinc + amber.

### Light theme

Light mode is implemented by **remapping CSS variables under `html.light`** in `src/index.css` — the neutral scale inverts (`zinc-950` → near-white page, `zinc-900` → white surfaces) and amber darkens for contrast (`amber-400` → `#d97706`, `amber-300` → `#92400e`).

**Rule: never write `dark:` variants in components.** Components are written dark-first with normal zinc/amber classes; the theme layer handles the rest. If a new color is needed, add its light-mode mapping in `index.css` instead of forking the component.

## 3. Typography

- **Family:** system UI sans (Tailwind default stack). `--font-display: Georgia, serif` exists for occasional editorial moments; body UI stays sans.
- **Headings:** `font-bold` (or `font-extrabold` for the hero) + `tracking-tight`, always.
- **Scale in use:** hero `text-4xl sm:text-5xl`; page h1 `text-3xl` (`sm:text-4xl` on question pages); section h2 `text-lg`–`text-xl`; body `text-sm leading-relaxed`; captions `text-xs`.
- **Section labels** (e.g. "Trending this week", "Your shows"): `text-sm font-semibold uppercase tracking-widest text-zinc-500`. This is the only place uppercase is allowed.
- Questions and answers are sentences, not labels — the hero and page titles use natural phrasing with punctuation ("Wait… who is that again?", "Who plays X in Y?").

## 4. Layout & spacing

- **Containers:** `max-w-5xl` for browse/grid pages, `max-w-4xl` for answer (who-plays) pages, `max-w-2xl` for prose (About/FAQ/Privacy). Always `mx-auto px-4`.
- **Vertical rhythm:** page top padding `py-8`; hero sections `py-14 sm:py-20`; between sections `mt-8`–`mt-10`.
- **Grids:** posters `grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3`; character cards `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4`; compact link lists `grid-cols-2 sm:grid-cols-4 gap-2`.
- **Header:** sticky, `bg-zinc-950/90 backdrop-blur`, hairline bottom border, `z-20`. Content never scrolls above it.

## 5. Shape & elevation

- **Radii scale:** `rounded-2xl` for cards, inputs, dropdown panels · `rounded-xl` for posters and inner tiles · `rounded-lg` for chips, small buttons, the logo tile · `rounded-full` only for tiny circular controls (remove ✕).
- **Elevation:** hairline border first, shadow second. Floating panels (search dropdown) get `shadow-2xl`; hovering cards get `shadow-lg shadow-black/30`. No glows, no colored shadows.

## 6. Components

- **Character/poster card:** `rounded-2xl border border-zinc-800 bg-zinc-900`, image on top (`aspect-3/4` people, `aspect-2/3` posters), text block `p-3`: character name `font-semibold truncate` (links to its who-plays page), actor `text-sm text-zinc-400`, metadata `text-xs text-zinc-500`. Hover: `-translate-y-1`, border → `amber-400/40`, shadow (200ms transition).
- **Poster hover (grids):** `group-hover:scale-[1.03] group-hover:ring-2 group-hover:ring-amber-400`.
- **Chips (season nav, filters):** `rounded-lg border border-zinc-700 px-2.5 py-1 text-zinc-300`, hover amber border + text; active chip is solid `bg-amber-400 text-zinc-950 font-medium`.
- **Search input:** large and friendly — `rounded-2xl px-5 py-4 text-lg`, focus = amber border + `ring-4 ring-amber-400/10`.
- **Badge (Spoiler shield):** `rounded-md bg-amber-400/15 px-2 py-1 font-medium text-amber-300`.
- **Empty/loading states:** centered `text-zinc-500`, human phrasing ("Filtering out spoilers…", "Loading answer…"). Never a bare spinner.
- **Buttons:** this product has almost no buttons — actions are links and selects. Keep it that way; don't introduce big CTA blocks.

## 7. Motion

Motion is an *entrance detail*, not a feature. Two keyframes exist (`src/index.css`):

- `.animate-fade-up` — 0.6s `cubic-bezier(0.16, 1, 0.3, 1)` (fast start, soft landing), 14px rise. For page/section entrances. Stagger siblings 40–90ms apart, capped at 500–600ms total (`animationDelay` inline style).
- `.animate-pop-in` — 0.18s ease-out, slight scale. For popovers/dropdowns/expanding panels.

Rules:

- **`animation-fill-mode` must be `backwards`, never `both`/`forwards`.** Retained fill values keep a `transform` applied forever, which creates permanent stacking contexts (broke the search dropdown's z-index) and overrides hover transforms (broke card lift). This bug shipped once; don't reintroduce it.
- Hover transitions: `transition duration-200`. Theme switch crossfades colors over 0.3s via `html.theme-switching`.
- Images fade in over 0.5s on load (Poster component handles cached-image edge case via ref).
- Everything respects `prefers-reduced-motion` — new animations must be added to the existing reduced-motion block.

## 8. Iconography & imagery

- **Icons:** [Reicon](https://github.com/dqev/reicon) only, inlined as 24×24 SVG with `fill="currentColor"`. Brand mark = `face-scan-circle` on an amber `rounded-lg` tile with `text-zinc-950`. Theme toggle = `sun`/`moon`. Don't mix icon sets; don't add icon fonts.
- **Imagery:** TMDB posters and profile photos are the only imagery. No stock photos, no illustrations, no emoji in UI (emoji allowed in content-less fallbacks only if already present). Missing images = `bg-zinc-800` block with a `?`.

## 9. Voice & content rules

- English, sentence case everywhere (headings included), except the uppercase section-label pattern.
- The spoiler promise is part of the brand: every page finds a way to say "no spoilers" plainly. Never display plot summaries — TMDB `overview` is forbidden in UI and meta descriptions.
- Numbers and metadata stay small and grey; names and faces stay prominent.
- Required footer line: TMDB attribution ("This product uses the TMDB API but is not endorsed or certified by TMDB.").

## 10. Accessibility

- Interactive elements need visible hover *and* focus treatment (amber), `aria-label` on icon-only buttons, `aria-expanded`/`role` on the search combobox.
- Maintain contrast when touching the light-theme mappings: amber on white must stay at the darkened values, body text at zinc-400-mapped (`#3f3f46`) or darker.
- Keyboard: search supports ↑/↓/Enter/Esc; anything newly interactive must be reachable and operable by keyboard.

## 11. Don'ts (the AI-default traps)

- No gradients, no glassmorphism panels beyond the existing header blur, no purple.
- No new accent colors, no `dark:` variants, no second font.
- No hero CTA buttons, pricing-page patterns, or marketing sections on tool pages.
- No spinners-as-personality, no skeleton screens unless layout is truly predictable.
- No emoji headers, no exclamation-point copy, no "🚀 Blazing fast".
- Don't animate layout properties (width/height/top) — transform and opacity only.
