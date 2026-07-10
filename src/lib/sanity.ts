// Build-time Sanity data layer. Zero runtime dependencies, zero tokens:
// public content is read over the CDN query API, and image URLs are derived
// from asset refs — so no Sanity JS ever ships to the browser.

const PROJECT_ID = 'vh789wfu';
const DATASET = 'production';
const API_BASE = `https://${PROJECT_ID}.apicdn.sanity.io/v2022-02-01/data/query/${DATASET}`;
const IMG_BASE = `https://cdn.sanity.io/images/${PROJECT_ID}/${DATASET}`;

export interface SanityImage {
  asset?: { _ref?: string };
}

export interface About {
  title: string;
  description: string;
  imgUrl: SanityImage;
}

export interface Work {
  title: string;
  description: string;
  projectLink?: string;
  codeLink?: string;
  imgUrl: SanityImage;
  tags: string[];
}

export interface Skill {
  name: string;
  bgColor?: string;
  icon: SanityImage;
}

export interface WorkExperience {
  name: string;
  company: string;
  desc: string;
  year?: string;
}

export interface ExperienceGroup {
  type: string;
  works: WorkExperience[];
}

export interface Testimonial {
  name: string;
  company: string;
  feedback: string;
  imgurl: SanityImage; // NB: lowercase in the schema
}

async function groq<T>(query: string): Promise<T> {
  const res = await fetch(`${API_BASE}?query=${encodeURIComponent(query)}`);
  if (!res.ok) {
    throw new Error(`Sanity query failed (${res.status}). The build needs network access. Query: ${query}`);
  }
  const json = await res.json();
  return json.result as T;
}

// Image ref format: image-<id>-<WxH>-<format>
export function imgUrl(img: SanityImage | undefined, width = 800, quality = 75): string {
  const ref = img?.asset?._ref;
  if (!ref) return '';
  const parts = ref.split('-');
  if (parts.length < 4) return '';
  const [, id, dims, format] = parts;
  const base = `${IMG_BASE}/${id}-${dims}.${format}`;
  if (format === 'svg') return base; // svgs are scalable; no transform params
  return `${base}?w=${width}&q=${quality}&auto=format&fit=max`;
}

export function imgDims(img: SanityImage | undefined): { width: number; height: number } | undefined {
  const ref = img?.asset?._ref;
  if (!ref) return undefined;
  const m = /-(\d+)x(\d+)-/.exec(ref);
  return m ? { width: Number(m[1]), height: Number(m[2]) } : undefined;
}

// "2024-Present" -> 9999 (sorts first), "2022-2023" -> 2023
function yearKey(year = ''): number {
  if (/present/i.test(year)) return 9999;
  let last = 0;
  for (const m of year.matchAll(/(\d{4})/g)) last = Number(m[1]);
  return last;
}

export async function loadContent() {
  const [abouts, works, skills, experiencesRaw, testimonials] = await Promise.all([
    groq<About[]>('*[_type == "abouts"] | order(_createdAt asc)'),
    groq<Work[]>('*[_type == "works"] | order(_createdAt asc)'),
    groq<Skill[]>('*[_type == "skills"] | order(name asc)'),
    groq<ExperienceGroup[]>('*[_type == "experiences"]'),
    groq<Testimonial[]>('*[_type == "testimonials"] | order(_createdAt desc)'),
  ]);

  // Schema quirks handled here so templates stay clean:
  // types have trailing spaces ("Education   "), work entries are unordered
  // (Deloitte/newest should lead), and Employment belongs above Education.
  const experiences = experiencesRaw
    .map((e) => ({
      type: (e.type || '').trim(),
      works: [...(e.works || [])].sort((a, b) => yearKey(b.year) - yearKey(a.year)),
    }))
    .sort((a, b) => Number(b.type === 'Employment') - Number(a.type === 'Employment'));

  return { abouts, works, skills, experiences, testimonials };
}

// Links in the works schema are sometimes the literal string "blank".
export function realLink(link?: string): string | undefined {
  if (!link) return undefined;
  const l = link.trim();
  if (!l || l === 'blank' || l === '#') return undefined;
  return l;
}
