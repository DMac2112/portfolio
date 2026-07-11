# Deploying DominikOS (`/os/`)

The hosting target for dominikmachowiak.com is still an open decision, so this folder holds
ready-to-copy configs for the three likely hosts (DOMINIKOS-PLAN §12.4). The deploy shape is
always the same — three static peers on ONE origin:

```
dominikmachowiak.com/        ← existing classic build (portfolio-2026/, unchanged artifact)
dominikmachowiak.com/os/     ← os/dist/* (this app)
dominikmachowiak.com/game1/  ← the EDITED game1 (os-bridge.js + vendor/kaplay.mjs + tweaks)
```

Steps for any host:
1. `npm run ci` in `os/` (typecheck + tests + build + legal gate).
2. Upload `os/dist/*` to `/os/` on the host.
3. Upload the edited `game1/` folder over the live `/game1/`.
4. Upload the updated root `index.html` (its game CTAs now point at `/os/?boot=game` and
   `/os/?boot=desktop`).
5. Copy the matching host config from this folder (see below).

**Note on rewrites:** DominikOS deep links use QUERY STRINGS only (`/os/?boot=game`), never
sub-paths, so it works on a dumb static host with directory indexes and NO rewrite rules.
The SPA rewrite in these configs is future-proofing for path-based routes; the headers
(cache + CSP) are the part that matters today.

- **Netlify:** copy `_redirects` + `netlify.toml` to the PUBLISH ROOT of the site.
- **Vercel:** copy `vercel.json` to the project root.
- **Apache / classic shared hosting:** copy `htaccess-os.txt` to `/os/.htaccess`.

The CSP `frame-src 'self' https://dominikmachowiak.com` is REQUIRED — the DM Explorer app
frames the classic site (§7.9); a bare `frame-src 'self'` would break it.
