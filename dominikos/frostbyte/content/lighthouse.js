// content/lighthouse.js — Palefire vista presentation and the growing keeper's log (World Plan W4).
import { telescopeVistaIdForDate } from '../engine/telescope-vistas.js';

export const TELESCOPE_VISTAS = Object.freeze([
  Object.freeze({
    id: 'breaching-whale',
    title: 'A Silver Back in the Blue',
    copy: 'A whale clears the outer floes in one slow silver arc. Its wake points home before it fades.',
    asset: './assets/vistas/breaching-whale.png',
  }),
  Object.freeze({
    id: 'aurora-crown',
    title: 'The Aurora Wears a Crown',
    copy: 'Green fire gathers above the ridge, folds into five bright points, and loosens into ribbons.',
    asset: './assets/vistas/aurora-crown.png',
  }),
  Object.freeze({
    id: 'salka-at-sea',
    title: 'The Gull Under Sail',
    copy: 'The Driftwood Gull leans into the blue current. Salka’s orange pennant is a pinprick beyond the floes.',
    asset: './assets/vistas/salka-at-sea.png',
  }),
]);

export function telescopeVistaForDate(todayKey) {
  const id = telescopeVistaIdForDate(todayKey);
  return TELESCOPE_VISTAS.find((vista) => vista.id === id) ?? null;
}

const LOG_ENTRIES = Object.freeze([
  Object.freeze({ favorId: 'maren-sighting-vista', text: 'A visitor learned that looking slowly reveals more than looking far.' }),
  Object.freeze({ favorId: 'maren-sighting-trail', text: 'The Trail answered the lamp with a brief ribbon of blue ice-light.' }),
  Object.freeze({ favorId: 'maren-sighting-gull', text: 'The Driftwood Gull crossed the outer current safely, orange pennant eastbound.' }),
]);

export function lighthouseLogbookPages(save) {
  const pages = ['Keeper’s log. Palefire is trimmed, the balcony rail is sound, and the horizon remains usefully unfinished.'];
  for (const entry of LOG_ENTRIES) {
    if (save?.favors?.[entry.favorId]?.status === 'done') pages.push(entry.text);
  }
  if (pages.length === 1) pages.push('The next pages are blank, waiting for a careful sighting.');
  return pages;
}
