# Working in portfolio-rework — read this before you change or publish anything

**This folder is the whole project.** The Astro portfolio, DominikOS, Frostbyte and game1 all live
here and all publish from here, together, in one command.

Everything used to be spread across separate folders and repos — `Websites/dominikos/` had its own
git repo with no remote, and edits made there simply never reached the site. That was consolidated
on **2026-07-22**: the OS source now lives at `dominikos/` *inside this repo*, with its full commit
history merged in. `Websites/dominikos/` is a dead archive.

## The rules

1. **Never work in `Websites/dominikos/` again.** It is archived and nothing there is published.
   All OS / Frostbyte / game1 source is at `portfolio-rework/dominikos/`.
2. **One command publishes everything: `.\deploy.cmd` from this folder.** Never hand-copy files to
   a host, never publish a subset. If a change should be live, it ships with everything else that
   is currently in this folder.

## What `.\deploy.cmd` does (verified 2026-07-22)

1. **Rebuilds DominikOS from `dominikos/os` and re-vendors it** into `public/os`, `public/game1`,
   `public/frostbyte`. You can no longer forget this step.
2. Builds the Astro site with the portable Node 20 — **from the working tree, not from git**, so
   uncommitted edits are compiled in and published.
3. `public/` passes through to `dist/` verbatim, so the vendored apps ship as they sit on disk.
4. Wipes the deploy clone (`.ghio-deploy/`, all but `.git`), copies the fresh `dist/` in, writes
   `.nojekyll`. Deletions propagate — no stale files survive a deploy.
5. Commits + pushes the built site to `DMac2112.github.io`. Live in ~1–2 minutes.
6. **Then commits and pushes this repo's source to `origin`**, so the code that produced the live
   site always exists in history. If that step fails it says so loudly — don't walk away from it.

Flags: `--skip-os` publishes without rebuilding the OS (site-only changes);
`--no-commit` publishes without touching source history. Neither is the default, on purpose.

## Pre-flight, every time

1. `git status` — look at **everything** modified, not just your own files. It is all about to go
   live, including anyone else's in-progress work. Say so in your handback rather than letting them
   discover it afterwards.
2. Changed the OS, Frostbyte or game1? Run their tests first (`cd dominikos/frostbyte && npx vitest
   run`, `cd dominikos/os && npm run ci`). The deploy does not test for you.
3. `.\deploy.cmd`
4. Verify the live URL, don't assume: `https://dmac2112.github.io/`.

## Design standard — applies to every agent, not just Claude

Dominik installed design tooling specifically to stop generic AI-slop UI, and has been burned by
an agent ignoring it. Before writing any markup or CSS:

- Design for **this** subject's real content and vernacular; take one justified aesthetic risk.
- **Banned as "a design":** dark background + neon/teal/acid accent + gradient heading underlines;
  hover-glow/lift cards and pill buttons everywhere; cream + high-contrast serif + terracotta;
  broadsheet hairlines with zero radius. Re-skinning an existing layout with finishes is not
  designing — type, hierarchy and structure are the work.
- Claude Code users: the `frontend-design` skill is mandatory, invoke it first.
- The full standard lives at `~/.claude/design-standard.md` on this machine.

## Repo layout

| Path | What it is |
|---|---|
| `src/` | the Astro portfolio site (source) |
| `dominikos/os/` | **DominikOS source** — React + TS. Build: `npm run ci` / `npm run build` |
| `dominikos/frostbyte/` | Frostbyte game source (buildless ES modules + KAPLAY). Tests: `npx vitest run` |
| `dominikos/game1/` | Dev District game source |
| `dominikos/Graphics/` | art masters (pinball kit, Frostbyte references) |
| `dominikos/*.md` | the build plans for everything above |
| `public/os`, `public/frostbyte`, `public/game1` | **generated — never hand-edit.** Overwritten from `dominikos/` on every deploy |
| `plans/` | site-level planning docs |
| `.ghio-deploy/` | throwaway clone of the deploy repo (gitignored) — never edit |
| `deploy.cmd` / `scripts/deploy.mjs` | the one publish path |

Two git repos are in play and it's worth knowing which is which: **this** repo
(`github.com/DMac2112/portfolio`) holds the source and is what you commit to; the deploy repo
(`DMac2112.github.io`) holds only built output and is written exclusively by the deploy script.
