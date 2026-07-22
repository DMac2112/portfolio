# DominikOS — Fable Build Handoff

Self-contained workspace to build **DominikOS**: Dominik Machowiak's portfolio reimagined as a retro **Windows XP desktop operating system** (résumé + games as desktop apps, boot→login→desktop, fullscreen, mobile-aware). Handed to the model **Fable** to build.

> **Status:** Plan complete, build NOT started. Nothing here has been coded yet — this is the brief + assets for Fable to pick up in a fresh chat.

## 📖 Read order

1. **[CONTEXT.md](CONTEXT.md)** — one-page catch-up: goal, locked decisions, existing assets/paths, session history, gotchas, "what to do next". Start here.
2. **[DOMINIKOS-PLAN.md](DOMINIKOS-PLAN.md)** — the full, execution-ready build spec (16 sections). **This is what you build.** Read §0 (canonical contracts) first; it's the single source of truth for types/tokens/state/boot.
3. **[CONTENT.md](CONTENT.md)** — Dominik's real portfolio content (identity, experience, projects, testimonials, skills). The apps populate from this. Do not invent facts.
4. **`reference/`** — background, not required to build:
    - `2D-GAME-PORTFOLIO-PLAN.md` — full design of **game1** (the game you'll embed).
    - `GAME1-vs-GAME2-COMPARISON.md` — why game1 (not game2) is the one to use.
    - `MOBILE-VERTICAL-LAYOUT-PLAN.md` — optional future upgrade for game1's mobile layout.
5. **`game1/`** — the actual first game to embed (copy of the live app). Buildless KAPLAY; vendor KAPLAY locally + add a pause hook per plan §8.

## TL;DR of what to build

- **Stack:** Vite 5 + React 18 + TypeScript (strict), Zustand + XState + Context, XP.css for in-window controls only. Ships at route `/os/`.
- **Theme:** Windows XP "Luna" (Vista/Aero = documented swap-in alt).
- **Apps:** manifest-driven (JSON + componentMap) so new games/projects = drop in a file + SVG icon.
- **game1** = first game icon, embedded via same-origin `<iframe>`.
- **Boot chooser:** Full Desktop / Résumé (classic site) / Play a game.
- **⚠️ Legal:** ship NO Microsoft assets — original/CC0 look-alikes only; product name "DominikOS", never "Windows" (plan §6).
- **MVP = roadmap phases P0–P5** (plan §13), each with a verifiable Definition of Done.

## Open decisions for Dominik (plan §15)

- Hosting target for `/os/`.
- Supply a PDF résumé asset (or generate one).
