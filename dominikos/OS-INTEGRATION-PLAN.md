# OS-INTEGRATION-PLAN — shipping DominikOS inside the Astro rework

> Analysis date 2026-07-10 (5-lens review of both codebases). Companion to
> DOMINIKOS-PLAN.md and the rework at `Websites/portfolio-rework/`.
> Verdict: the integration is **already half-built and well-designed** — the rework was
> authored around the OS living at `/os/` on one origin. What's left is a **pipeline
> problem** (staleness, hand-patches, deploy mode) plus four seam bugs. No architecture
> change needed; the subdomain option is rejected (§5).

## §0 What already works (verified, do not rebuild)
- **UI seam**: navbar "DominikOS" link → `#dominikos`; `OsShowcase.astro` section with
  `/os/?boot=chooser|desktop|game` deep links; `OsLaunch.astro` XP boot card with
  prefetch-on-hover; Speculation-Rules prerender for `/os/*` (moderate) in `Base.astro`;
  cross-document `@view-transition` on both sides.
- **Hosting config**: `public/_redirects` (`/os/* → /os/index.html 200`), `public/_headers`
  (CSP `frame-src 'self' https://dominikmachowiak.com` on /os/index.html — required by DM
  Explorer; immutable caching for `/os/assets/*`, `/game1/assets/*`), sitemap customPages
  for `/os/` + `/game1/`, robots.txt.
- **OS side**: vite `base:'/os/'`; every exit link is root-relative `/` (boot chooser,
  skip links, Start menu, shutdown) — all point at the Astro site automatically; game1
  referenced as root-absolute peer `/game1/`; `resume.json` self-contained under `/os/`.
- **game1**: `public/game1` is byte-identical to source — fresh, no action.

## §1 P0 — the staleness + patch problem (do first)
`portfolio-rework/public/os` is a **one-off manual copy from 2026-07-07 23:48**. Current
`dominikos/os/dist` (2026-07-09 21:23) has 85 files vs its 81: **PaintApp and DialtoneApp
are entirely absent from the rework**, plus older MinesApp/OSShell/Desktop chunks.
Deploying the rework today ships an OS missing its two newest apps.

The vendored `index.html` carries **two hand-edits that exist nowhere in source** and die
on any re-copy:
1. canonical `https://dominikmachowiak.com/` → `https://dominikmachowiak.com/os/`
2. added `<style>@view-transition { navigation: auto; }</style>`

**Steps:**
1. **Upstream both edits into `dominikos/os/index.html`** — set the self-canonical
   `/os/` (update the §11.4 comment: now that the Astro root is a real content site AND
   the sitemap lists /os/, self-canonical is correct; the old home-canonical actively
   contradicts the sitemap) and add the `@view-transition` style. Builds become
   reproducible; the vendored copy stops being special.
2. **Add the sync script**: extend `os/scripts/deploy-local.mjs` with a second target
   `portfolio-rework/public` (dist → `public/os`, `../game1` → `public/game1`),
   **delete-then-copy** (else ~470KB of orphaned hashed chunks linger, cached immutable).
   Wire as `npm run deploy:rework` (or make deploy:local do both targets).
3. Run `timeout 200 npm run ci` in os/, then the sync, then rebuild the rework
   (`npm20 run build`). Verify `public/os/assets` contains `PaintApp-*.js`,
   `DialtoneApp-*.js` and index.html references the new entry hash + keeps both edits.

## §2 P1 — deploy mode (the contact form is dead until this is fixed)
Neither repo is a git repo; no Netlify CLI exists on the machine. Drag-dropping `dist/`
**does not ship `netlify/functions/contact.mjs`** (netlify.toml's own warning) — the form
fails in prod. Pick one:
- **(preferred)** `git init` portfolio-rework (`.gitignore` already correct; `public/os`
  commits fine at 1.9MB), push to GitHub, link the Netlify site → CI builds + functions
  + Sanity-webhook rebuilds.
- **(minimum)** `npm20 install -g netlify-cli`, deploy with `netlify deploy --prod`.
Also owed by Dominik (unchanged): rotate the old exposed Sanity token; set
`SANITY_API_TOKEN` in Netlify env.

## §3 P2 — unify the contact stack (kills the owed Web3Forms key)
OS ContactApp posts `{access_key, from_name, email, subject, message}` to Web3Forms with
`access_key: ""` in **every** copy → the OS form is mailto-only today. The rework already
has a working first-party function (`contact.mjs` → Sanity mutate, server-side token).
1. `contact.mjs`: accept `payload.name || payload.from_name` (optionally fold `subject`
   into the message).
2. `os/public/content/contact.json`: endpoint → `/.netlify/functions/contact`.
3. `ContactApp.tsx`: same-origin endpoint (starts with `/`) bypasses the access_key gate.
4. Rebuild + resync. One inbox (Sanity contact docs), zero third-party keys.

## §4 P3 — seam bugs
- **DM Explorer recursion**: `explorer.json` frames `https://dominikmachowiak.com`, whose
  page now contains `/os/` CTAs → OS-inside-OS in a sandboxed (opaque-origin) frame.
  Host-side fix: tiny inline script — when `window.self !== window.top`, add
  `target="_top"` to `/os/` links (and optionally post `{ch:'os-embed-ack'}`, which
  IframeHost.tsx already anticipates to hide its fallback bar). Also beware any future
  Astro-side localStorage use: it throws in the opaque-origin frame — guard like the OS's
  `storage.ts` does.
- **legal-gate blind spot**: `legal-gate.mjs` never scans the vendored copies. Rule:
  vendored copies are never hand-edited (enforced by §1's upstreaming) — or extend
  SCAN_ROOTS.
- **OG card for /os/** (nice-to-have): os/index.html has no og:image — sharing
  `dominikmachowiak.com/os/` unfurls bare. Base.astro already carries the TODO for a
  branded 1200×630; reuse it for the OS head.
- **Retire portfolio-2026** once the rework is live at dominikmachowiak.com: drop the
  legacy deploy target + `dev-server.js` (`astro dev` serves `public/os` + `public/game1`
  verbatim, reproducing the three-peer topology `/`, `/os/`, `/game1/` on one origin).

## §5 Rejected: subdomain (os.dominikmachowiak.com)
Breaks cross-document View Transitions (same-origin-only), breaks DM Explorer's CSP/frame
assumptions, splits link equity across hosts, degrades prefetch/prerender warming — all to
"save" 1.9MB that is free-tier-trivial. Single-origin `/os/` stays.

## §6 Verification checklist (after §1–§3)
- `astro dev` (npm20): `/` renders; boot card + showcase links land on the chooser;
  Paint and Dialtone icons present on the OS desktop; game1 loads at `/game1/`.
- `dist/` build: `public/os/index.html` self-canonical + @view-transition present;
  no orphaned old-hash chunks in `public/os/assets`.
- Prod (after Netlify link/CLI deploy): contact form round-trips from BOTH the Astro
  footer and the OS ContactApp (check Sanity for the two docs); DM Explorer inside the
  OS shows the homepage and its "Boot DominikOS" click escapes to top (no recursion).
