# Working in portfolio-rework — read this before you change or publish anything

This folder is the **single publish point** for Dominik's whole site. Everything the world sees —
the Astro portfolio, DominikOS, Frostbyte, game1 — goes out from here, together, in one command.
Work was previously scattered across folders and repos and things got lost. Don't reintroduce that.

## The rule

**One command publishes everything: `.\deploy.cmd` from this folder.**

Never hand-copy files to a host, never publish a subset, never "just push the one folder".
If a change is meant to be live, it goes out with everything else that is currently in this folder.

## What `.\deploy.cmd` actually does (verified 2026-07-22)

1. Builds the Astro site with the portable Node 20 (`npm20.cmd run build`) — **from the working
   tree, not from git**. Uncommitted edits in `src/` are compiled in and published.
2. `public/` passes through to `dist/` verbatim, so the vendored `public/os`, `public/frostbyte`
   and `public/game1` ship exactly as they currently sit on disk.
3. Wipes the deploy clone (`.ghio-deploy/`, everything but `.git`), copies the fresh `dist/` in,
   writes `.nojekyll`. Deletions propagate — no stale files survive a deploy.
4. `git add -A`, commit, push to `DMac2112.github.io`. Live in ~1–2 minutes.

So: **everything inside this folder does go at once.** That part is settled — you do not need to
stage, order, or batch anything.

## The two things it does NOT do — this is where work gets lost

**1. It does not rebuild DominikOS.** It publishes whatever is already vendored in `public/os`.
If you touched anything in `../dominikos/` (the OS, Frostbyte, game1), re-vendor FIRST:

```bash
cd ../dominikos/os && npm run build && node scripts/deploy-rework.mjs
```

Skip that and the deploy still prints success while silently shipping the *old* OS. Nothing warns
you. `deploy-rework.mjs` syncs all three peers (`/os`, `/game1`, `/frostbyte`) in one go.

**2. It does not commit this repo.** It pushes the *built output* to the deploy repo only. Source
changes here can be live on the internet while still uncommitted locally — one bad `git checkout`
and the live site has code that exists nowhere in history. Commit your source, in this repo, as
part of finishing the job.

## Pre-flight, every time

1. Touched `../dominikos/`? → rebuild + `deploy-rework.mjs` (above).
2. `git status` here — look at **everything** that is modified, not just your own files. It is all
   about to go live. If someone else's uncommitted work is in the tree, that ships too: say so in
   your handback rather than discovering it afterwards.
3. `.\deploy.cmd`
4. Commit the source in this repo (and in `dominikos/` if you changed it) by explicit paths.
5. Verify the live URL, don't assume: `https://dmac2112.github.io/`.

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
| `public/os`, `public/frostbyte`, `public/game1` | **vendored build output** from `../dominikos/` — never hand-edit; regenerate and re-vendor |
| `plans/` | planning docs |
| `.ghio-deploy/` | throwaway clone of the deploy repo (gitignored) — never edit |
| `deploy.cmd` / `scripts/deploy.mjs` | the one publish path |
