# CONTENT-MIGRATION-PLAN — Sanity → local JSON

> Written 2026-07-10. Extraction is DONE (the JSON + images below exist); the wiring
> and Sanity teardown are the remaining steps. Companion to OS-INTEGRATION-PLAN.md.

## §1 What was extracted (done)
Pulled from the public Sanity CDN (project `vh789wfu`, no token) into
`portfolio-rework/src/data/` + `portfolio-rework/src/assets/content/`:

| File | Items | Source |
|---|---|---|
| `site.json` | hero, headings, contact, footer | hardcoded copy in the `.astro` sections |
| `about.json` | 4 | Sanity `abouts` |
| `work.json` | 3 | Sanity `works` |
| `skills.json` | 6 | Sanity `skills` |
| `experience.json` | 2 groups (5 roles) | Sanity `experiences` |
| `testimonials.json` | 3 | Sanity `testimonials` |
| `src/assets/content/*` | 16 images (~1.2MB) | Sanity CDN, resized `w=1600 q=82` |

**Deliberately NOT migrated:** `brands` (4 docs — New Balance/Skype/Bolt/Spotify; never rendered
by the rework, dead content) and `contact` (7 visitor submissions = PII, not portfolio content).

## §2 Cleanups baked into the JSON (previously done at runtime in `sanity.ts`)
- Trimmed `"Education   "` → `"Education"`.
- Ordered Employment newest-first (Deloitte → Welcom-Inn → Rubicall → Hawthorne); Employment group before Education.
- Dropped the `"blank"` placeholder links on MERN, and redundant `codeLink`s equal to `projectLink`.
- Dropped `"All"` from stored work `tags` (it's the show-everything filter button, not a real tag — still listed in `site.json.sections.workFilters`).
- Normalised testimonial quotes (removed inconsistent wrapping quote marks — one was missing its closing quote).
- Minor consistency fixes in `experience.json`: `"cleaning company company"` → `"cleaning company"`; `"Web developer"` → `"Web Developer"`. (Flag to Dominik in case any were intentional.)
- **Employer rename (2026-07-10, per Dominik):** `"Norbert Electronics"` → `"Hawthorne Electronics"` everywhere the company name appears, as if the company rebranded. The testimonial **person** "Norbert" keeps his name; internal code slugs (`norbert`, `norbert-shop`, `testimonial-norbert`) kept to avoid breaking references. Swept across all source: rework `src/data/*`, OS `public/content/*` + `index.html` (#seo-resume), game1 `content.js` (+ rework's served `public/game1/`), game2 `src/*`, `CONTENT.md`. NOT swept: build artifacts (`*/dist/*` — regenerate on build), the stale vendored `portfolio-rework/public/os/*` (fixed on OS re-sync), legacy `Personal Website/frontend_react/*` (being retired), and archival plan docs (`2D-GAME-PORTFOLIO-PLAN.md`, `DOMINIKOS-PLAN.md` — contain literal `content.js` that would reintroduce the old name if rebuilt-from-plan; left to preserve the historical record).

## §3 Wiring step (the "for now" → "live" change — NOT yet done)
Replace the Sanity data layer with a local one. `src/lib/sanity.ts` (5 GROQ queries) becomes a
tiny `src/lib/content.ts`:
```ts
import about from '../data/about.json';
import work from '../data/work.json';
import skills from '../data/skills.json';
import experience from '../data/experience.json';
import testimonials from '../data/testimonials.json';
import site from '../data/site.json';
// images: eager glob so a filename string in JSON resolves to an optimised asset
const imgs = import.meta.glob('../assets/content/*', { eager: true });
export const img = (name) => imgs[`../assets/content/${name}`]?.default;
export function loadContent() { return { site, abouts: about, works: work, skills, experiences: experience, testimonials }; }
```
Then in each `.astro` section swap `imgUrl(x.imgUrl)` → `<Image src={img(x.image)} .../>` (astro:assets),
and read headings/hero/contact from `site.json` instead of hardcoding. `index.astro` drops the
`await loadContent()` network call — it becomes a plain import. **Alternative:** Astro Content
Collections with a `file()` loader + zod schemas (typed, validates on build) — slightly more setup,
gives editor autocomplete. Either works; plain JSON import is the simplest and is what §1 is shaped for.

**Option (upgrade path, optional):** add Keystatic for a visual editing form over these same files.
Not required — the files are directly editable per `src/data/README.md`.

## §4 Sanity teardown (do AFTER §3 is verified live)
Once the site builds and renders from local JSON with zero Sanity calls:
1. Point the contact form off Sanity (see OS-INTEGRATION-PLAN §2/§3 and the content-trends research:
   Web3Forms or new-account Netlify Forms) so nothing writes to the dataset anymore.
2. In sanity.io/manage → project `vh789wfu`: **revoke the exposed write token**, then **delete the
   project** (or the dataset). This removes the last live token AND erases the 7 world-readable
   visitor submissions in one move — no rotation needed.
3. Delete `src/lib/sanity.ts`, remove any Sanity refs from `README.md`, and the `backend_sanity`
   studio folder can be archived/deleted (legacy Sanity v2, won't build on Node 20 anyway).

## §5 Verify
`npm20 run build` → grep `dist/` for `cdn.sanity.io` and `apicdn.sanity.io`: **zero hits** means the
site is fully self-contained. Visually diff the built page against the current live site — content
should be identical (bar the §2 cleanups). Confirm images are served from the local origin as
optimised `.webp` (Astro output), not from `cdn.sanity.io`.

## §6 Suggested content improvements (noticed, NOT applied — your call)
- MERN Project has no live/code link and "in progress" copy since 2023 — consider replacing with a
  real recent project (e.g. DominikOS itself, or a Salesforce/AMPScript case study).
- `about.json` still leads with "Frontend Developer / Aspiring React Developer" framing from 2022;
  your headline role is now Salesforce Marketing Cloud. Consider a card that reflects that.
- Only 3 skills bubbles are front-end (HTML/CSS/JS/React) + 2 Salesforce certs — you list more in the
  résumé (TypeScript, Sass, Redux, Node, GraphQL, Git, Figma). Add them to `skills.json` if you want
  parity with the OS résumé.
