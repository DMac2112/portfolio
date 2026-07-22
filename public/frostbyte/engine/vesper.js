// engine/vesper.js — PURE daily-den and Curio-for-hint rules for Whisperpine Hollow (World Plan W5).
// Dates, Curio registry, and save state are injected; this module has no DOM, storage, or wall clock.
import { dateOrdinal } from './barge-schedule.js';
import { totalProgress } from './curios.js';

export const VESPER_DEN_IDS = Object.freeze(['root-den', 'owl-den', 'fallen-den']);

export const VESPER_HINTS = Object.freeze([
  Object.freeze({
    id: 'court-cobble', requiredCurios: 6,
    text: 'The cobble in the Court isn’t loose by accident. It is keeping a three-note door from forgetting itself.',
  }),
  Object.freeze({
    id: 'moonwell-gap', requiredCurios: 14, unlocks: 'moonwell',
    text: 'Behind the north pines, moonlight falls through a gap that daylight refuses to admit is there.',
  }),
  Object.freeze({
    id: 'hollow-crack', requiredCurios: 22, unlocks: 'caverns',
    text: 'Two ways run below the isle: the cold hatch in Pat’s floor, and the root-crack at Whisperpine’s east edge.',
  }),
]);

export function vesperDenIndexForDate(todayKey) {
  const ordinal = dateOrdinal(todayKey);
  if (ordinal == null) return null;
  return ((ordinal % VESPER_DEN_IDS.length) + VESPER_DEN_IDS.length) % VESPER_DEN_IDS.length;
}

export function vesperDenForDate(dens, todayKey) {
  const index = vesperDenIndexForDate(todayKey);
  if (index == null || !Array.isArray(dens) || dens.length !== VESPER_DEN_IDS.length) return null;
  const expectedId = VESPER_DEN_IDS[index];
  return dens.find((den) => den.id === expectedId) ?? null;
}

function ensureSecrets(save) {
  const current = save.secrets && typeof save.secrets === 'object' && !Array.isArray(save.secrets)
    ? save.secrets : {};
  const hints = Array.isArray(current.vesperHints)
    ? [...new Set(current.vesperHints.filter((id) => typeof id === 'string'))] : [];
  save.secrets = {
    ...current,
    vesperHints: hints,
    moonwellUnlocked: current.moonwellUnlocked === true,
    cavernsUnlocked: current.cavernsUnlocked === true,
    auroraIntensified: current.auroraIntensified === true,
  };
  return save.secrets;
}

export function nextVesperHint(save, registry) {
  const claimedIds = Array.isArray(save?.secrets?.vesperHints) ? save.secrets.vesperHints : [];
  const claimed = new Set(claimedIds);
  const hint = VESPER_HINTS.find((entry) => !claimed.has(entry.id)) ?? null;
  const found = totalProgress(registry, save).found;
  if (!hint) return { hint: null, found, remaining: 0, available: false, complete: true };
  return {
    hint,
    found,
    remaining: Math.max(0, hint.requiredCurios - found),
    available: found >= hint.requiredCurios,
    complete: false,
  };
}

/** Claim the next sequential hint when its Curio threshold is met. Returns the hint or null. */
export function claimVesperHint(save, registry, events = []) {
  if (!save || !Array.isArray(registry)) return null;
  const next = nextVesperHint(save, registry);
  if (!next.available || !next.hint) return null;
  const secrets = ensureSecrets(save);
  if (secrets.vesperHints.includes(next.hint.id)) return null;
  secrets.vesperHints.push(next.hint.id);
  if (next.hint.unlocks === 'moonwell') secrets.moonwellUnlocked = true;
  if (next.hint.unlocks === 'caverns') secrets.cavernsUnlocked = true;
  events.push({
    type: 'vesper-hint', hintId: next.hint.id,
    requiredCurios: next.hint.requiredCurios,
    unlocks: next.hint.unlocks ?? null,
  });
  return next.hint;
}
