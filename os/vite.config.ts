/// <reference types="vitest" />
// DominikOS build config (DOMINIKOS-PLAN §3, §12.5).
// NOTE: Vite 4 (not 5) because this machine runs Node 16; Vite 5 requires Node 18+.
// The config surface is identical — when Node is upgraded, bump "vite" to ^5 and this file is unchanged.
import { defineConfig, type Plugin, type Connect } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
// Sibling static game folders served on the same origin (deployed topology §3): /game1/ and
// /frostbyte/ are static peers of /os/ in production, so dev/preview must serve them too.
const SIBLING_GAMES: Record<string, string> = {
  '/game1': path.resolve(here, '..', 'game1'),
  '/frostbyte': path.resolve(here, '..', 'frostbyte'),
};

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
  '.mp3': 'audio/mpeg',
  '.wasm': 'application/wasm',
};

// Deployed topology (§3): /os/ and the game folders are static peers on one origin. dev-server.js
// has no proxy (§12.5), so for iteration this middleware serves each sibling game folder at its
// prefix on the SAME origin as the Vite dev/preview server — the iframe embeds then behave exactly
// as they will in production (same-origin, postMessage bridge, no CORS).
function serveSiblingGames(): Plugin {
  const handler: Connect.NextHandleFunction = (req, res, next) => {
    const url = (req.url ?? '').split('?')[0];
    for (const [prefix, dir] of Object.entries(SIBLING_GAMES)) {
      if (url === prefix) {
        res.statusCode = 302;
        res.setHeader('Location', prefix + '/');
        res.end();
        return;
      }
      if (!url.startsWith(prefix + '/')) continue;
      let rel = decodeURIComponent(url.slice(prefix.length));
      if (rel.endsWith('/')) rel += 'index.html';
      const file = path.join(dir, path.normalize(rel));
      if (!file.startsWith(dir + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
        return next();
      }
      res.setHeader('Content-Type', MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream');
      fs.createReadStream(file).pipe(res);
      return;
    }
    return next();
  };
  return {
    name: 'dominikos:serve-sibling-games',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

export default defineConfig({
  base: '/os/',
  plugins: [react(), serveSiblingGames()],
  server: { port: 4183, strictPort: true },
  preview: { port: 4181, strictPort: true },
  build: {
    outDir: 'dist',
    target: 'es2020',
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        // long-cached vendor chunk (§9.2)
        manualChunks: { vendor: ['react', 'react-dom'] },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
