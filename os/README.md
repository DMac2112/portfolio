# DominikOS — `/os/`

Dominik Machowiak's portfolio as a retro desktop OS. Vite + React 18 + TypeScript (strict),
Zustand (window manager) + XState v5 (session) + XP.css (in-window controls only).
Built from `../DOMINIKOS-PLAN.md`; phases P0–P6 are implemented (P7 = later).

## Commands

| Command | What |
|---|---|
| `npm run dev` | dev server on **:4183** (serves the sibling `../game1` at `/game1/` on the same origin) |
| `npm run ci` | typecheck + unit tests + build + legal grep-gate |
| `npm run build` | typecheck + `vite build` + legal gate |
| `npm test` | window-store unit tests (vitest) |
| `npm run gate` | legal gate only (scans repo + dist + ../game1 for MS-asset fingerprints) |
| `npm run deploy:local` | copy `dist/` → `../../portfolio-2026/os/` and `../game1` → `.../game1/` (production topology for `dev-server.js` :4178) |

Deep links: `/os/?boot=desktop` · `/os/?boot=game` (skips login, opens Dev District) ·
`/os/?boot=resume` (→ classic site) · `/os/?boot=chooser` (always show the start screen).

## Environment note (IMPORTANT)

This machine runs **Node 16**, so the app is pinned to **Vite 4 / vitest 0.34 / Tailwind 3**
(Vite 5 + Tailwind 4 need Node 18/20+). The config surface is identical — after upgrading
Node, bump `vite` to `^5`, `vitest` to `^1`, `tailwindcss` to `^4` and everything else stays.

## Deviations from DOMINIKOS-PLAN.md (all documented in code too)

- **Manifests live at `<root>/registry/*.json`** (not `<root>/os/registry/`): with
  `base:'/os/'`, Vite strips the leading `/os` from absolute module ids, so a source dir named
  `os/` can never resolve from `import.meta.glob`. Same add-a-file contract.
- **Runtime content lives in `public/content|media|assets`** → served at `/os/content/...`
  exactly as the plan's URLs expect.
- **No `scripts/build-resume-pdf.mjs`** — §15.5 locked "Dominik supplies his own PDF"
  (`public/assets/cv.pdf`, currently the CV found in the workspace).
- **`game1.json` has no `aspectRatio`** — game1's canvas is fully responsive (fills any
  window size), so locking a ratio would only letterbox it needlessly.
- **Iframe sandbox uses real tokens** — §7.9's `allow-fullscreen` sandbox token doesn't exist
  in the HTML spec; fullscreen is granted via `allow="fullscreen"` + `allowFullScreen`.
- **`aria-label="DominikOS desktop"`** on the main landmark (not §11.1's sample
  "Windows XP desktop", which §6 bans from user-facing copy).
- **Explorer block-detection**: the classic site frames fine today; a real blocked-frame
  signal needs site cooperation (§7.9's handshake ack isn't sent by the classic site), so the
  window ships an always-available "Open in new tab" affordance + hint strip instead of a
  fake timeout heuristic.
- **`user-scalable=no` dropped** (§10.4) — it violates WCAG 1.4.4 zoom (§11.3); a11y wins.
- **Session machine additions**: `LOGOFF` event (required by §7.10's Log Off) and
  `SHUTDOWN` from `login` (the login screen has a Turn Off button).
- **XP.css ships its own MIT pixel-font recreations** (`ms_sans_serif`, PerfectDOS) into
  `dist/assets` — they're redrawn bitmap fonts from the MIT xp.css package, not Microsoft
  files (credited in ASSET-CREDITS.md).

## What Dominik still owns

- **Web3Forms access key** → paste into `public/content/contact.json` (`access_key`). It's
  public-by-design (submit-only). Until then the Contact app falls back to `mailto:`.
- **Hosting choice** → see `deploy/README.md`, configs ready for Netlify/Vercel/Apache.
- **Real-device QA** (P5 DoD items that need hardware): iPhone Safari / Android Chrome pass,
  NVDA + VoiceOver read-through, real 60fps drag measurement on a mid-range Android
  (bundle ceilings in `.size-limit.json` are set from local measurements +15%).
- **Sanity write token** (unrelated to DominikOS): the classic build still exposes a write
  token — revoke at manage.sanity.io.
