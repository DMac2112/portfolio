// content/minigames-registry.js — DATA: maps a minigame id to the plaza hotspot that launches it
// and the KAPLAY scene it enters (Minigames §"Room ↔ minigame contract"). Adding a second minigame
// (e.g. Glasswind Court's glide-and-spin) is a data addition here, not an engine change.
export const MINIGAMES = {
  snowdrift: { hotspotId: 'minigame-snowdrift', sceneId: 'minigame-snowdrift' },
};

/** The minigame whose hotspot id matches, or null. */
export function minigameForHotspot(hotspotId) {
  return Object.values(MINIGAMES).find((m) => m.hotspotId === hotspotId) ?? null;
}
