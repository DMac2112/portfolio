import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Static output (default): all Sanity content is fetched at build time in
// component frontmatter, so the deployed site is plain crawlable HTML.
export default defineConfig({
  site: 'https://dominikmachowiak.com',
  integrations: [
    sitemap({
      // /os/ and /game1/ are prebuilt apps vendored into public/ —
      // not Astro pages, so list them explicitly.
      customPages: [
        'https://dominikmachowiak.com/os/',
        'https://dominikmachowiak.com/game1/',
      ],
    }),
  ],
});
