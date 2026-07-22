# portfolio-rework

**Read [AGENTS.md](AGENTS.md) in this folder before changing or publishing anything.** It is the
single source of truth for both Claude and Codex, so the rules can't drift apart between agents.

The short version:

- `.\deploy.cmd` from this folder publishes **everything here, at once** — and it builds from the
  working tree, so uncommitted edits go live too.
- It does **not** rebuild DominikOS. Touched `../dominikos/`? Re-vendor first:
  `cd ../dominikos/os && npm run build && node scripts/deploy-rework.mjs`
- It does **not** commit this repo. Commit your source separately or it exists only on the live site.
- `public/os`, `public/frostbyte`, `public/game1` are vendored build output — never hand-edit them.

The `frontend-design` skill is mandatory for any UI work here (see the design section in AGENTS.md).
