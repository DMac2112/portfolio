# DominikOS — Session Context / Catch-Up (for a fresh chat)

> Dense handoff so a new chat needs neither the old transcript nor re-derivation. Read this, then `DOMINIKOS-PLAN.md` (the build spec) + `CONTENT.md` (real data). Reference/background in `./reference/`.

## What this is
Dominik Machowiak (front-end dev → Salesforce Marketing Cloud Dev @ Deloitte) is turning his portfolio into a **retro Windows-XP desktop OS** ("**DominikOS**") where the résumé and games are desktop apps. Inspired by mewmewdevart's dev.to "retro gamified portfolio". **Fable will build it** (later — after more tokens). This folder is the self-contained workspace.

## The goal (verbatim intent)
Portfolio buttons launch into an OS experience; résumé + games as desktop icons; **Windows XP or Vista** era; goes **fullscreen**, feels real (boot→login→desktop); **smooth, fast, works on mobile**; games ("my own, added later") are extensible desktop icons. Full detail = `DOMINIKOS-PLAN.md`.

## Locked decisions (from the plan — don't re-litigate)
- **Theme:** Windows **XP "Luna"** primary (user shown an XP-vs-Vista mockup; XP defaulted for speed/mobile). **Vista/Aero = documented swap-in alt** (plan §5.9), one `data-theme` flag.
- **Stack:** Vite 5 + React 18 + **TypeScript strict**; new standalone app deployed at **`/os/`**. State = **Zustand** (windows) + **XState v5** (boot/session machine) + Context (settings). **XP.css** for in-window controls only; window manager is custom (BEM `.win__*`).
- **Manifest-driven:** apps/projects/games = JSON `AppManifest` + code `componentMap`. Add a game/project later = drop a manifest + SVG icon. (Type + examples in plan §0/§7/§8.)
- **game1 embeds** via same-origin `<iframe>` in a window; game1 **IS edited** (pause-on-blur hook; **vendor KAPLAY locally**, drop the unpkg CDN import). "game1 untouched" is FALSE.
- **Boot chooser:** Full Desktop / Just the résumé (classic site) / Play a game. Classic React+Sanity site stays as **SEO + a11y fallback** (canvas OS isn't crawlable → ship a hidden semantic résumé).
- **Mobile (honest):** phones/tablets get **single-window/maximized** + bottom app dock; free-float windows only ≥1024px + fine pointer.
- **⚠️ LEGAL — ship NO Microsoft assets.** No Bliss wallpaper, no XP/Vista sounds, no MS icons/logos, never the word "Windows" in UI. Use **original/CC0 look-alikes** (custom hill SVG wallpaper, royalty-free sounds, recreated SVG icons). Product name = "DominikOS". Homage/parody framing. (Plan §6 = do-not-ship list + CC0 sources.)
- **Perf budget:** ≤120 KB shell JS gz; ≤2.5 s to desktop (mid Android/4G); 60 fps drag desktop / ≥50 mobile; per-app lazy chunks. Roadmap MVP = phases **P0–P5** (plan §13).

## The existing landscape (absolute paths on this machine)
- **Deployed portfolio (classic site):** `C:\Users\domin\OneDrive\Desktop\Websites\portfolio-2026\` — a COMPILED Create-React-App + Sanity build (an artifact; do NOT edit its React source). Real content lives in Sanity: projectId `vh789wfu`, dataset `production`, read via `https://vh789wfu.apicdn.sanity.io/v2022-02-01/data/query/production?query=<GROQ>`. Live at dominikmachowiak.com.
  - **Landing-page CTAs already injected** into `portfolio-2026/index.html` (outside React's #root, kept alive by a MutationObserver): a centered arcade "mini-game" card under Contact Me (walking game1 sprite + coin-pop) and a bottom-right **bubble** that expands to a pill (revealed past the hero; on touch: tap-to-expand → tap-to-enter/exit). All link to `/game1/`. These launch game1 today; they should later point at the OS boot chooser.
- **game1 "Dev District"** (THIS is the first game to embed): a copy is here at `./game1/` (canonical live copy: `portfolio-2026/game1/`). Buildless KAPLAY (currently `kaplay@3001` from unpkg — Fable must vendor it locally). Files: index.html, main.js, content.js, gen-assets.js (a zero-dep Node PNG generator → run `node gen-assets.js` to regen `assets/`). 17 hotspots, custom pixel art, mobile tap controls. See `reference/2D-GAME-PORTFOLIO-PLAN.md` for its full design.
- **game2** (Gemini's rival rendition, for reference only): `C:\Users\domin\OneDrive\Desktop\Websites\game2\` — a Vite+KAPLAY "archipelago" prototype. NOT used by DominikOS. Comparison verdict in `reference/GAME1-vs-GAME2-COMPARISON.md` (game1 won on polish; borrow game2's data-driven tilemap + 20-hotspot idea IF game1 is ever upgraded).
- **Local preview:** `portfolio-2026/dev-server.js` (zero-dep static server, `node dev-server.js` → :4178) + `.claude/launch.json`.

## Session history (compressed — what led here)
1. Built **game1** (Dev District) into `portfolio-2026/game1/` from `2D-GAME-PORTFOLIO-PLAN.md`; added the landing CTAs; iterated the CTA UX (banner→removed; navbar rainbow button→removed; settled on the arcade card + expand-bubble described above).
2. Explored **game2** (Gemini) and produced the side-by-side comparison.
3. Drafted `MOBILE-VERTICAL-LAYOUT-PLAN.md` (how game1 could go top-to-bottom on mobile — recommends a data-driven tilemap refactor; not yet done).
4. Pivoted to this: the **DominikOS** Windows-XP desktop-OS portfolio → `DOMINIKOS-PLAN.md` (built by an 8-agent design workflow). **This is the active deliverable Fable will build.**

## Gotchas / notes
- **Preview quirk:** KAPLAY is `requestAnimationFrame`-driven; a backgrounded/hidden browser tab PAUSES rAF, so the game scene won't boot & screenshots hang. Not a bug — ensure `document.visibilityState==='visible'` when verifying via a preview tool (a fresh preview server usually opens a visible tab).
- **Security (unrelated, flag to Dominik):** the deployed `portfolio-2026/static/js/main.5cbcff64.js` has a Sanity **write** token baked in (public). Should be revoked at manage.sanity.io; rebuild public reads token-less. Not DominikOS's problem but worth fixing.
- **Testimonials** are CMS descriptions, not verbatim quotes — render as attributed paraphrase, no fake quotation marks.

## What Fable does next (start here)
1. Read `DOMINIKOS-PLAN.md` fully (§0 canonical contracts first — types/tokens/store/boot are the single source of truth).
2. Scaffold the Vite+React+TS app for `/os/` (plan §3–§4). Build MVP phases **P0–P5** in order; each has a verifiable DoD (§13).
3. Populate apps from `CONTENT.md`. Embed `./game1/` per §8 (vendor KAPLAY, add pause hook).
4. Honor §6 legal (no MS assets) and §9 perf budget throughout.
5. Open decisions for Dominik (plan §15): confirm XP vs Vista primary; hosting; PDF résumé asset.
