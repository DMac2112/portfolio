// engine/favors.js — PURE cross-room favor chains (World Plan W0). Definitions are data; state is
// additive under save.favors. Coin rewards go through economy.js so all reward events keep the
// project's existing shape.
import { earnCoins } from './economy.js';

export const FAVOR_STATUS = Object.freeze({
  OFFERED: 'offered',
  IN_PROGRESS: 'in-progress',
  DONE: 'done',
});

function ensureFavors(save) {
  if (!save.favors || typeof save.favors !== 'object' || Array.isArray(save.favors)) save.favors = {};
  return save.favors;
}

export function favorState(save, favorId) {
  return save?.favors?.[favorId] ?? null;
}

export function currentFavorStep(save, definition) {
  const state = favorState(save, definition.id);
  if (state?.status !== FAVOR_STATUS.IN_PROGRESS) return null;
  return definition.steps[state.stepIndex] ?? null;
}

export function favorProgress(save, definition) {
  const state = favorState(save, definition.id);
  const completed = state?.status === FAVOR_STATUS.DONE
    ? definition.steps.length
    : Math.min(state?.stepIndex ?? 0, definition.steps.length);
  return {
    status: state?.status ?? null,
    completed,
    total: definition.steps.length,
    complete: state?.status === FAVOR_STATUS.DONE,
  };
}

export function canOfferFavor(save, definition) {
  if (favorState(save, definition.id)) return false;
  return (definition.requires ?? []).every((favorId) => favorState(save, favorId)?.status === FAVOR_STATUS.DONE);
}

export function offerFavor(save, definition, ev = []) {
  if (!canOfferFavor(save, definition)) return false;
  ensureFavors(save)[definition.id] = { status: FAVOR_STATUS.OFFERED, stepIndex: 0 };
  ev.push({ type: 'favor-offered', favorId: definition.id });
  return true;
}

export function startFavor(save, definition, ev = []) {
  const state = favorState(save, definition.id);
  if (state?.status !== FAVOR_STATUS.OFFERED) return false;
  state.status = FAVOR_STATUS.IN_PROGRESS;
  state.stepIndex = 0;
  ev.push({ type: 'favor-started', favorId: definition.id });
  return true;
}

function completeFavor(save, definition, state, ev) {
  state.status = FAVOR_STATUS.DONE;
  state.stepIndex = definition.steps.length;
  ev.push({ type: 'favor-done', favorId: definition.id });
  if ((definition.reward?.coins ?? 0) > 0) {
    earnCoins(save, definition.reward.coins, `favor:${definition.id}`, ev);
  }
}

/** Advance only when `stepId` is the exact next step; completion and reward are idempotent. */
export function advanceFavor(save, definition, stepId, ev = []) {
  const state = favorState(save, definition.id);
  if (state?.status !== FAVOR_STATUS.IN_PROGRESS) return false;
  const expected = definition.steps[state.stepIndex];
  if (!expected || expected.id !== stepId) return false;

  state.stepIndex += 1;
  ev.push({ type: 'favor-step', favorId: definition.id, stepId, stepIndex: state.stepIndex });
  if (state.stepIndex === definition.steps.length) completeFavor(save, definition, state, ev);
  return true;
}

export function validateFavorDefinitions(definitions) {
  const errors = [];
  if (!Array.isArray(definitions)) return ['definitions must be an array'];
  const favorIds = new Set();
  for (const [index, definition] of definitions.entries()) {
    const id = definition?.id;
    if (!id || typeof id !== 'string') errors.push(`favor[${index}] is missing id`);
    else if (favorIds.has(id)) errors.push(`duplicate favor id ${id}`);
    else favorIds.add(id);
    if ((definition?.reward?.coins ?? 0) < 0) errors.push(`${id ?? `favor[${index}]`} has a negative coin reward`);
    if (!Array.isArray(definition?.steps) || definition.steps.length === 0) {
      errors.push(`${id ?? `favor[${index}]`} must have at least one step`);
      continue;
    }
    const stepIds = new Set();
    for (const step of definition.steps) {
      if (!step?.id || stepIds.has(step.id)) errors.push(`${id} has an invalid or duplicate step id`);
      stepIds.add(step?.id);
    }
  }
  return errors;
}
