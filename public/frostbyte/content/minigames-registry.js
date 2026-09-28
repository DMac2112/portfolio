// content/minigames-registry.js — DATA: maps a minigame id to the plaza hotspot that launches it
// and the KAPLAY scene it enters (Minigames §"Room ↔ minigame contract"). Adding a second minigame
// (e.g. Glasswind Court's glide-and-spin) is a data addition here, not an engine change.
import { FAVOR_STATUS, favorState } from '../engine/favors.js';
import { grantNote, notesHeld } from '../engine/story.js';

export const MINIGAMES = {
  snowdrift: { hotspotId: 'minigame-snowdrift', sceneId: 'minigame-snowdrift' },
  bell: {
    hotspotId: 'weather-bell', sceneId: 'minigame-bell', note: 'bell',
    requires: (save) => favorState(save, 'pat-weather-bell-parts')?.status === FAVOR_STATUS.DONE,
  },
  floe: { hotspotId: 'floe-fishing', sceneId: 'minigame-floe', note: 'floe' },
  thaw: {
    hotspotId: 'moonwell-floor', sceneId: 'minigame-thaw', note: 'moon',
    requires: (save) => favorState(save, 'maren-sighting-gull')?.status === FAVOR_STATUS.DONE,
    lockedLine: 'Frost seals the well floor. Maren says the lens light will find it.',
  },
};

/** The minigame whose hotspot id matches, or null. */
export function minigameForHotspot(hotspotId) {
  return Object.values(MINIGAMES).find((m) => m.hotspotId === hotspotId) ?? null;
}

export function minigameActionForHotspot(hotspotId, save, fallbackKind = null) {
  const game = minigameForHotspot(hotspotId);
  if (!game) return fallbackKind;
  if (!game.requires || game.requires(save)) return 'minigame';
  return game.lockedLine ? 'locked' : fallbackKind;
}

export function grantMinigameResultNote(save, result) {
  const game = MINIGAMES[result?.gameId];
  if (!result?.won || !game?.note || !grantNote(save, game.note)) return null;
  return { note: game.note, count: notesHeld(save) };
}
