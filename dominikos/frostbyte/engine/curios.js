// engine/curios.js — PURE Curio Log rules (World Plan W0). Registry data is injected so every
// room can add discoveries without changing this engine. Mutations follow economy.js's event-out
// pattern and never use DOM, randomness, or wall-clock time.
import { earnCoins } from './economy.js';

export const ROOM_COMPLETION_COINS = 5;

export function createCurioState() {
  return { found: {}, roomRewards: {}, isleRewardClaimed: false };
}

function stateOf(saveOrState) {
  return saveOrState?.curios ?? saveOrState ?? createCurioState();
}

function ensureState(save) {
  const existing = save.curios && typeof save.curios === 'object' ? save.curios : {};
  save.curios = {
    ...createCurioState(),
    ...existing,
    found: existing.found && typeof existing.found === 'object' ? existing.found : {},
    roomRewards: existing.roomRewards && typeof existing.roomRewards === 'object' ? existing.roomRewards : {},
  };
  return save.curios;
}

export function validateCurioRegistry(registry) {
  const errors = [];
  if (!Array.isArray(registry)) return ['registry must be an array'];
  const ids = new Set();
  for (const [index, curio] of registry.entries()) {
    if (!curio?.id || typeof curio.id !== 'string') errors.push(`curio[${index}] is missing id`);
    else if (ids.has(curio.id)) errors.push(`duplicate curio id ${curio.id}`);
    else ids.add(curio.id);
    if (!curio?.roomId || typeof curio.roomId !== 'string') errors.push(`${curio?.id ?? `curio[${index}]`} is missing roomId`);
    if (!curio?.label || typeof curio.label !== 'string') errors.push(`${curio?.id ?? `curio[${index}]`} is missing label`);
  }
  return errors;
}

export function curioById(registry, curioId) {
  return registry.find((curio) => curio.id === curioId) ?? null;
}

export function isCurioFound(saveOrState, curioId) {
  return stateOf(saveOrState).found?.[curioId] === true;
}

export function roomProgress(registry, saveOrState, roomId) {
  const roomCurios = registry.filter((curio) => curio.roomId === roomId);
  const found = roomCurios.filter((curio) => isCurioFound(saveOrState, curio.id)).length;
  return { roomId, found, total: roomCurios.length, complete: roomCurios.length > 0 && found === roomCurios.length };
}

export function totalProgress(registry, saveOrState) {
  const found = registry.filter((curio) => isCurioFound(saveOrState, curio.id)).length;
  return { found, total: registry.length, complete: registry.length > 0 && found === registry.length };
}

/**
 * Register a first-time discovery. A room's final curio pays one small, once-only coin bonus.
 * Returns false for an unknown/already-found id; otherwise mutates save and returns true.
 */
export function discoverCurio(save, registry, curioId, ev = [], roomReward = ROOM_COMPLETION_COINS) {
  const curio = curioById(registry, curioId);
  if (!curio) return false;
  const state = ensureState(save);
  if (state.found[curioId] === true) return false;

  state.found[curioId] = true;
  ev.push({ type: 'curio-found', curioId, roomId: curio.roomId });
  const progress = roomProgress(registry, state, curio.roomId);
  if (progress.complete && state.roomRewards[curio.roomId] !== true) {
    state.roomRewards[curio.roomId] = true;
    earnCoins(save, roomReward, `curio-room:${curio.roomId}`, ev);
  }
  return true;
}
