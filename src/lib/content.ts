// Local content layer — replaces the build-time Sanity fetch (src/lib/sanity.ts).
// Content lives as plain JSON in src/data/*, images as files in src/assets/content/*.
// Zero network at build time, zero third-party runtime: the images are handed to
// astro:assets <Image>, which emits optimised, origin-served WebP/AVIF.
import type { ImageMetadata } from 'astro';

import siteData from '../data/site.json';
import aboutData from '../data/about.json';
import workData from '../data/work.json';
import skillsData from '../data/skills.json';
import experienceData from '../data/experience.json';
import testimonialsData from '../data/testimonials.json';
import revisedData from '../data/content-revised.json';
import humanData from '../data/content-human.json';

export interface AboutItem { title: string; description: string; image: string; }
export interface WorkItem { title: string; description: string; projectLink?: string; tags: string[]; image: string; }
export interface Skill { name: string; image: string; bgColor?: string; }
export interface WorkExperience { name: string; company: string; year?: string; desc: string; }
export interface ExperienceGroup { type: string; works: WorkExperience[]; }
export interface Testimonial { name: string; company: string; feedback: string; image: string; }
export type RevisedContent = typeof revisedData;
export type HumanContent = typeof humanData;

// Eager glob so a filename string in the JSON ("about-frontend.svg") resolves to an
// imported, build-optimisable asset. Keys look like '../assets/content/<file>'.
const assets = import.meta.glob<{ default: ImageMetadata }>('../assets/content/*', { eager: true });

/** Resolve a content-image filename to its imported asset (for <Image src={...} />). */
export function contentImage(name: string): ImageMetadata {
  const mod = assets[`../assets/content/${name}`];
  if (!mod) throw new Error(`Content image not found: src/assets/content/${name} (referenced in a data/*.json file)`);
  return mod.default;
}

export const site = siteData;
export const revised = revisedData;
export const human = humanData;

export function loadContent() {
  return {
    site: siteData,
    abouts: aboutData as AboutItem[],
    works: workData as WorkItem[],
    skills: skillsData as Skill[],
    experiences: experienceData as ExperienceGroup[],
    testimonials: testimonialsData as Testimonial[],
    revised: revisedData,
    human: humanData,
  };
}
