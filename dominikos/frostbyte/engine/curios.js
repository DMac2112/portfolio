// engine/curios.js — PURE Curio Log rules (World Plan W0). Registry data is injected so every
// room can add discoveries without changing this engine. Mutations follow economy.js's event-out
// pattern and never use DOM, randomness, or wall-clock time.
import { earnCoins } from './economy.js';

export const ROOM_COMPLETION_COINS = 5;
export const ISLE_REWARD_ITEM_ID = 'echoglass-lantern';
export const ISLE_REWARD_FURNITURE_ID = 'hollowfrost-trophy';

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

/**
 * Claim the once-only full-journal reward after every registered Curio has been found.
 * The cosmetic, den trophy, and ambient flag are additive fields on the existing v1 save.
 */
export function claimIsleCompletionReward(save, registry, ev = []) {
  if (!save || !Array.isArray(registry)) return false;
  const state = ensureState(save);
  if (state.isleRewardClaimed || !totalProgress(registry, state).complete) return false;

  state.isleRewardClaimed = true;
  save.ownedItems = Array.isArray(save.ownedItems) ? save.ownedItems : [];
  if (!save.ownedItems.includes(ISLE_REWARD_ITEM_ID)) save.ownedItems.push(ISLE_REWARD_ITEM_ID);
  save.furniture = save.furniture && typeof save.furniture === 'object' && !Array.isArray(save.furniture)
    ? save.furniture : {};
  save.furniture[ISLE_REWARD_FURNITURE_ID] = (save.furniture[ISLE_REWARD_FURNITURE_ID] ?? 0) + 1;
  save.secrets = save.secrets && typeof save.secrets === 'object' && !Array.isArray(save.secrets)
    ? save.secrets : {};
  save.secrets.auroraIntensified = true;

  ev.push({ type: 'item-unlocked', itemId: ISLE_REWARD_ITEM_ID, source: 'curio-isle' });
  ev.push({ type: 'furniture-added', itemId: ISLE_REWARD_FURNITURE_ID, amount: 1, source: 'curio-isle' });
  ev.push({ type: 'aurora-intensified' });
  ev.push({ type: 'isle-reward-claimed' });
  return true;
}
