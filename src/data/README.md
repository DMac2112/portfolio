# Editing your site content

All the words and pictures on the site live in this folder as plain `.json` files.
Change a file, save, rebuild (or push to GitHub) — the site updates. No Sanity, no login.

## Which file is what
| File | Controls |
|---|---|
| `site.json` | Hero text, section headings, your email/LinkedIn, footer |
| `about.json` | The four "What am I about?" cards |
| `work.json` | Project cards |
| `skills.json` | Skill bubbles |
| `experience.json` | Employment + Education timeline |
| `testimonials.json` | Client quotes |
| `images/` (see `src/assets/content/`) | The actual picture files |

## The only 3 rules of JSON (so you never break it)
1. **Text goes between double quotes:** `"title": "My New Project"`. Change what's inside the quotes, keep the quotes.
2. **Every item ends with a comma — except the last one.** Look at the existing items and copy the pattern.
3. **Curly braces `{ }` wrap one item; square brackets `[ ]` wrap the list.** To add a project, copy an existing `{ ... }` block, paste it, add a comma between them.

Tip: open these in VS Code — it underlines mistakes in red *before* you save. If nothing is red, it's valid.

## Adding an image
1. Drop the image file into `src/assets/content/` (e.g. `work-newproject.png`).
2. In the JSON, set `"image": "work-newproject.png"` (just the filename).
That's it — the build resizes and optimises it automatically.

## Common edits
- **Change your job tagline:** `site.json` → `hero.tagline`.
- **Add a project:** copy a block in `work.json`. Fields: `title`, `description`, `projectLink` (optional), `tags`, `image`.
- **Add a job:** `experience.json` → the `"Employment"` group → copy a block in its `works` list.
- **Fix a typo anywhere:** find the words, retype them.
