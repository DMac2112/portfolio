# Portfolio Rework — Astro 5

The 2026 rebuild of dominikmachowiak.com. Replaces the CRA SPA
(`Personal Website/frontend_react`, untouched) with a fully static Astro site:
all Sanity content is fetched **at build time** and shipped as crawlable HTML,
with **zero framework JavaScript** in the browser.

## What's inside

- **Astro 5, static output** — one page, `src/pages/index.astro`
- **Sanity at build time** — `src/lib/sanity.ts` (CDN query API, no token, no
  Sanity JS shipped to the client; image URLs derived from asset refs with
  `w/q/auto=format` transforms)
- **No framework JS** — all interactivity (mobile nav, work filter,
  testimonial carousel, contact form, scroll reveals, section dots) is ~130
  lines of vanilla script, inlined by Astro into the HTML
- **SEO layer** — name+role H1/title, meta description, Open Graph/Twitter,
  Person/WebSite/ProfilePage JSON-LD, canonical, sitemap (incl. /os/ and
  /game1/), robots.txt with AI-crawler allow
- **DominikOS integration** — `OsLaunch.astro` (the XP-window boot card in the
  hero), a mid-page showcase section, a crawlable footer link; /os/ warmed on
  intent (prefetch on hover + Speculation Rules `moderate`); cross-document
  View Transition into the OS's own boot screen
- **/os/ and /game1/ vendored** into `public/` (copies patched: self-canonical
  + view-transition opt-in). Rebuilds always ship the complete site.
- **Contact form** → `netlify/functions/contact.mjs` (dependency-free; the
  Sanity write token lives ONLY in Netlify env vars)
- Self-hosted DM Sans (fontsource, woff2) — no Google Fonts request chain

## Requirements

**Node 20+.** The system Node on this machine is 16, so a portable Node 20
lives at `C:\Users\domin\.tools\node-v20.x-win-x64` — use the wrapper:

```cmd
npm20 install       # once
npm20 run dev       # dev server (fetches Sanity live)
npm20 run build     # production build -> dist/
npm20 run preview   # serve dist/ locally
```

(Direct equivalent: prepend the portable Node dir to PATH, then npm as usual.)

## Deploying

`dist/` is the complete publish folder (site + /os/ + /game1/ + _headers +
_redirects).

- **Drag-and-drop** dist/ to Netlify: everything works EXCEPT the contact
  form (functions don't ship via drag-drop; the form shows its error message).
- **Git-linked or `netlify deploy --prod`**: functions ship too. Set
  `SANITY_API_TOKEN` in Site settings > Environment variables first.

Content edits in Sanity appear after a rebuild — wire a Sanity webhook to a
Netlify build hook for automatic rebuilds.

## Syncing the OS / game

If `dominikos/os/dist` or `dominikos/game1` are rebuilt, re-copy them into
`public/os` / `public/game1` and re-apply the two patches to `public/os/index.html`:
self-canonical (`https://dominikmachowiak.com/os/`) and the
`@view-transition { navigation: auto }` style.

## TODO (from the enhancement roadmap)

- Branded 1200×630 og:image (DominikOS screenshot + name/role), then switch
  `twitter:card` to `summary_large_image` (see TODO in `src/layouts/Base.astro`)
- Scoped CSP in `_headers` (needs testing against /os/ + /game1/ inline scripts)
- P5: case studies (`/work/[slug]`), dark mode, single accent color
- Rotate the old leaked Sanity token if not already done (see
  `Personal Website/frontend_react` history)
