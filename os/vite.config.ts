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
const GAME1_DIR = path.resolve(here, '..', 'game1');

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

// Deployed topology (§3): /os/ and /game1/ are static peers on one origin. dev-server.js has no
// proxy (§12.5), so for iteration this middleware serves the sibling ../game1 folder at /game1/
// on the SAME origin as the Vite dev/preview server — the iframe embed then behaves exactly as
// it will in production (same-origin, postMessage bridge, no CORS).
function serveGame1(): Plugin {
  const handler: Connect.NextHandleFunction = (req, res, next) => {
    const url = (req.url ?? '').split('?')[0];
    if (url === '/game1') {
      res.statusCode = 302;
      res.setHeader('Location', '/game1/');
      res.end();
      return;
    }
    if (!url.startsWith('/game1/')) return next();
    let rel = decodeURIComponent(url.slice('/game1'.length));
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.join(GAME1_DIR, path.normalize(rel));
    if (!file.startsWith(GAME1_DIR + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      return next();
    }
    res.setHeader('Content-Type', MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  };
  return {
    name: 'dominikos:serve-game1',
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
  plugins: [react(), serveGame1()],
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
