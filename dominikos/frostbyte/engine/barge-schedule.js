// engine/barge-schedule.js — PURE Driftwood Gull port ritual (World Plan W3).
// An injected YYYY-MM-DD key selects one of eight authored day states. The eight-day cycle drifts
// across weekdays, so Salka feels like a returning trader rather than a weekend shop.

const DAY_MS = 86_400_000;
export const BARGE_PORT_PATTERN = Object.freeze([true, false, false, true, false, false, true, false]);

export function dateOrdinal(todayKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(todayKey ?? '')) return null;
  const [year, month, day] = todayKey.split('-').map(Number);
  const ms = Date.UTC(year, month - 1, day);
  if (new Date(ms).toISOString().slice(0, 10) !== todayKey) return null;
  return Math.floor(ms / DAY_MS);
}

function dateKeyFromOrdinal(ordinal) {
  return new Date(ordinal * DAY_MS).toISOString().slice(0, 10);
}

export function isBargeInPort(todayKey) {
  const ordinal = dateOrdinal(todayKey);
  if (ordinal == null) return false;
  const index = ((ordinal % BARGE_PORT_PATTERN.length) + BARGE_PORT_PATTERN.length) % BARGE_PORT_PATTERN.length;
  return BARGE_PORT_PATTERN[index];
}

export function nextBargeArrival(todayKey) {
  const ordinal = dateOrdinal(todayKey);
  if (ordinal == null) return null;
  for (let days = 1; days <= BARGE_PORT_PATTERN.length; days++) {
    const candidate = dateKeyFromOrdinal(ordinal + days);
    if (isBargeInPort(candidate)) return { dateKey: candidate, days };
  }
  return null;
}

export function bargeStateForDate(todayKey) {
  const ordinal = dateOrdinal(todayKey);
  if (ordinal == null) return null;
  const cycleIndex = ((ordinal % BARGE_PORT_PATTERN.length) + BARGE_PORT_PATTERN.length) % BARGE_PORT_PATTERN.length;
  const inPort = BARGE_PORT_PATTERN[cycleIndex];
  const nextArrival = nextBargeArrival(todayKey);
  return {
    dateKey: todayKey,
    cycleIndex,
    inPort,
    atSea: !inPort,
    nextArrival: nextArrival?.dateKey ?? null,
    daysUntilNextArrival: nextArrival?.days ?? null,
  };
}
