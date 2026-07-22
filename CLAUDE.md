# portfolio-rework

**Read [AGENTS.md](AGENTS.md) in this folder before changing or publishing anything.** It is the
single source of truth for both Claude and Codex, so the rules can't drift apart between agents.

The short version:

- **Everything lives here now** — the Astro site *and* the OS/Frostbyte/game1 source at
  `dominikos/`. `Websites/dominikos/` is a dead archive: never work there.
- `.\deploy.cmd` from this folder does the whole job in one command: rebuilds the OS, re-vendors
  it, builds the site, publishes it live, then commits and pushes this repo's source.
- It builds from the **working tree**, so uncommitted edits go live too. Read the whole
  `git status` before deploying — anyone else's in-progress work ships as well.
- `public/os`, `public/frostbyte`, `public/game1` are generated output — never hand-edit them.

The `frontend-design` skill is mandatory for any UI work here (see the design section in AGENTS.md).
