// content/docks.js — date-resolved Driftgate Docks content (World Plan W3).
import { ITEM_CATALOG } from './cosmetics.js';
import { chirperWeekKey } from './chirper-issues.js';
import { bargeStateForDate } from '../engine/barge-schedule.js';

export const BOTTLE_MESSAGES = Object.freeze([
  Object.freeze({ id: 'north-current', text: 'Bottle post: “North current calm. Lantern visible. Soup acceptable.”' }),
  Object.freeze({ id: 'three-feathers', text: 'Bottle post: “Three white feathers at sea. None admit belonging to a gull.”' }),
  Object.freeze({ id: 'blue-rope', text: 'Bottle post: “Blue rope on the outer marker. Leave it; the tide is measuring something.”' }),
  Object.freeze({ id: 'warm-stone', text: 'Bottle post: “Found one warm stone beyond the floes. Sending the story, keeping the stone.”' }),
]);

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function salkaStockForDate(todayKey, catalog = ITEM_CATALOG) {
  const saleCatalog = Array.isArray(catalog) ? catalog.filter((item) => !item.rewardOnly) : [];
  if (!bargeStateForDate(todayKey) || saleCatalog.length < 2) return [];
  const seed = hashString(`salka-stock:${todayKey}`);
  const first = seed % saleCatalog.length;
  const gap = 1 + ((seed >>> 9) % (saleCatalog.length - 1));
  const second = (first + gap) % saleCatalog.length;
  return [saleCatalog[first], saleCatalog[second]];
}

export function bottleMessageForDate(todayKey) {
  const weekOf = chirperWeekKey(todayKey);
  if (!weekOf) return null;
  const index = hashString(`bottle-post:${weekOf}`) % BOTTLE_MESSAGES.length;
  return { ...BOTTLE_MESSAGES[index], weekOf };
}

function matchesBargeState(entry, inPort) {
  if (!entry.bargeState) return true;
  return entry.bargeState === (inPort ? 'in-port' : 'away');
}

export function resolveDocksRoom(room, todayKey) {
  const state = bargeStateForDate(todayKey);
  if (!room || !state) return room ?? null;
  const bottle = bottleMessageForDate(todayKey);
  const inPort = state.inPort;
  return {
    ...room,
    mapAsset: inPort ? room.stateAssets.inPort : room.stateAssets.away,
    hotspots: (room.hotspots ?? []).filter((entry) => matchesBargeState(entry, inPort)),
    anchors: (room.anchors ?? []).filter((entry) => matchesBargeState(entry, inPort)),
    clickables: (room.clickables ?? [])
      .filter((entry) => matchesBargeState(entry, inPort))
      .map((entry) => entry.id === 'bottle-post' ? { ...entry, line: bottle?.text ?? entry.line } : entry),
    docksState: {
      ...state,
      futureVistaId: state.atSea ? 'salka-at-sea' : null,
    },
  };
}
