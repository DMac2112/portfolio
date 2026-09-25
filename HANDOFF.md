# Handoff — start here (2026-09-25)

**State: everything is live, pushed, backed up and green. Nothing is pending. Ready for new work.**

## The product (one thing, not three)
Website → boot **DominikOS** (`/os/`) → play **Frostbyte** inside the OS (in-OS browser window,
`/frostbyte/index.html?embedded=1`). Dev District (`game1`) also lives inside the OS.
Never describe these as separate projects; never suggest putting the game on the homepage.

## Where things are
| What | Path |
|---|---|
| Website | `src/` |
| DominikOS | `dominikos/os/` |
| Frostbyte | `dominikos/frostbyte/` |
| Dev District | `dominikos/game1/` |
| Generated copies — **never edit** | `public/os`, `public/frostbyte`, `public/game1` |

Only this folder is real. `Websites\portfolio-2026` and `Websites\ARCHIVE\*` are dead leftovers.

## Commands (PowerShell blocks .ps1 scripts — use the .cmd files)
| Do | Command |
|---|---|
| Test everything locally | `.\preview.cmd` or Desktop **Preview Portfolio.cmd** → http://localhost:4321/ |
| Frostbyte tests | `cd dominikos\frostbyte; npx.cmd vitest run` (502 pass) |
| OS checks | `cd dominikos\os; npm.cmd run ci` |
| Publish | `.\deploy.cmd` — builds + publishes + commits + pushes. Read full `git status` first. |

Live: https://dmac2112.github.io/ · Source repo: DMac2112/portfolio · Site repo: DMac2112.github.io
Git auth works (credential manager, account DMac2112).

## Last session (2026-09-25)
- Shipped the unpushed Frostbyte work: plaza + den collision re-traced to the painted art.
- Fixed den exit (off-centre players got stranded on the doormat) → `autoEnterHalfWidth`.
- Fixed `deploy.cmd`/`npm20.cmd` for this PC; added `preview.cmd`.
- Live: site `104e4cd`. Source: `29ea4e5`+.

## Rollback if ever needed
- Tags `pre-deploy-2026-09-25` on both GitHub repos.
- Full bundles: `Websites\BACKUPS\2026-09-25-pre-frostbyte-deploy\`.

## Rules
- Read `AGENTS.md` (publishing rules) and `TLDR.md` (collision incident lessons).
- Any UI work: invoke the `frontend-design` skill first.
- Collision/doorway changes: add frame-by-frame traversal tests **and** walk it in a browser.
- Dominik: TL;DR first, short, bold / ⚠️ / ✅, decisions up top with a recommendation.

## Open idea (not started, needs Dominik's OK)
Move `Websites\portfolio-2026` into `ARCHIVE` and drop a `DO-NOT-USE.txt` in each dead folder.
