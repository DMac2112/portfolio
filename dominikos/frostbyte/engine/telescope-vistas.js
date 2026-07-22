// engine/telescope-vistas.js — PURE Palefire telescope ritual (World Plan W4).
// The calendar key is injected and the Gull schedule is reused, so lighthouse and harbor state
// can never disagree about whether Captain Salka is at sea.
import { bargeStateForDate, dateOrdinal } from './barge-schedule.js';

export const TELESCOPE_VISTA_IDS = Object.freeze([
  'breaching-whale',
  'aurora-crown',
  'salka-at-sea',
]);

export function telescopeVistaIdForDate(todayKey) {
  const ordinal = dateOrdinal(todayKey);
  const barge = bargeStateForDate(todayKey);
  if (ordinal == null || !barge) return null;
  if (barge.atSea) return 'salka-at-sea';
  return ordinal % 2 === 0 ? 'breaching-whale' : 'aurora-crown';
}
