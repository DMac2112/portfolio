import { nextFloat, nextInt } from './rng.js';

export const ROUND_MS = 90000;
export const SURFACE_Y = 160;
export const DEPTHS = [224, 288, 352, 416];
export const MAX_COINS = 24;
const HOOK_X = 480;
const HOOK_SPEED = 240;
const FISH_COLORS = ['#7c9bb0', '#66869d', '#536e83'];

export function newGame(seed) {
  return {
    seed: seed >>> 0, elapsedMs: 0, spawnMs: 600, nextId: 0,
    hookY: SURFACE_Y, targetY: SURFACE_Y, carrying: null,
    fish: [], crabs: [{ id: 'crab', x: 40, y: DEPTHS[3], dir: 1, speed: 92 }],
    jellies: [{ id: 'jelly', x: 480, y: 300, dir: 1, speed: 42 }],
    lines: 3, landed: 0, coins: 0, hummingSpawned: false,
    stunMs: 0, jellySafeMs: 0, snapSafeMs: 0, phase: 'play', won: false,
    event: null,
  };
}

function spawnFish(state, humming = false) {
  let draw = nextInt(state.seed, DEPTHS.length);
  const depth = humming ? 3 : draw.value;
  draw = nextInt(draw.seed, 2);
  const dir = draw.value ? 1 : -1;
  const colorDraw = nextInt(draw.seed, FISH_COLORS.length);
  state.seed = colorDraw.seed;
  state.fish.push({
    id: state.nextId++, x: dir > 0 ? -36 : 996, y: DEPTHS[depth], dir,
    speed: humming ? 44 : [132, 112, 92, 76][depth],
    color: humming ? '#6fe0b2' : FISH_COLORS[colorDraw.value], humming,
  });
  if (humming) state.hummingSpawned = true;
}

export function tick(previous, input = {}, dtMs = 0) {
  if (previous.phase !== 'play') return previous;
  const state = {
    ...previous, fish: previous.fish.map((fish) => ({ ...fish })),
    crabs: previous.crabs.map((crab) => ({ ...crab })),
    jellies: previous.jellies.map((jelly) => ({ ...jelly })), event: null,
  };
  const dt = Math.max(0, Math.min(dtMs, 100)) / 1000;
  state.elapsedMs += dtMs;
  state.stunMs = Math.max(0, state.stunMs - dtMs);
  state.jellySafeMs = Math.max(0, state.jellySafeMs - dtMs);
  state.snapSafeMs = Math.max(0, state.snapSafeMs - dtMs);
  if (Number.isFinite(input.targetY)) state.targetY = Math.max(SURFACE_Y, Math.min(DEPTHS[3], input.targetY));
  else if (input.direction) state.targetY = Math.max(SURFACE_Y, Math.min(DEPTHS[3], state.hookY + Math.sign(input.direction) * HOOK_SPEED * dt));
  if (!state.stunMs) {
    const move = Math.max(-HOOK_SPEED * dt, Math.min(HOOK_SPEED * dt, state.targetY - state.hookY));
    state.hookY = Math.max(SURFACE_Y, Math.min(DEPTHS[3], state.hookY + move));
  }
  state.spawnMs -= dtMs;
  while (state.spawnMs <= 0 && state.elapsedMs < ROUND_MS) {
    spawnFish(state);
    const draw = nextFloat(state.seed);
    state.seed = draw.seed;
    state.spawnMs += 950 + Math.floor(draw.value * 550);
  }
  if (state.landed >= 6 && !state.hummingSpawned) spawnFish(state, true);
  for (const fish of state.fish) fish.x += fish.dir * fish.speed * dt;
  state.fish = state.fish.filter((fish) => fish.x > -48 && fish.x < 1008);
  for (const crab of state.crabs) {
    crab.x += crab.dir * crab.speed * dt;
    if (crab.x > 960 || crab.x < 0) crab.dir *= -1;
  }
  for (const jelly of state.jellies) {
    jelly.y += jelly.dir * jelly.speed * dt;
    if (jelly.y > 396 || jelly.y < 208) jelly.dir *= -1;
  }
  if (!state.carrying && !state.stunMs) {
    const index = state.fish.findIndex((fish) => Math.abs(fish.x - HOOK_X) <= 22 && Math.abs(fish.y - state.hookY) <= 15);
    if (index >= 0) {
      state.carrying = state.fish.splice(index, 1)[0];
      state.event = 'hook';
    }
  }
  if (state.carrying && state.snapSafeMs === 0 && state.crabs.some((crab) => Math.abs(crab.x - HOOK_X) <= 18 && state.hookY >= DEPTHS[3] - 24)) {
    state.carrying = null;
    state.lines--;
    state.snapSafeMs = 900;
    state.event = 'snap';
    if (state.lines <= 0) state.phase = 'over';
  }
  if (state.phase === 'play' && state.jellySafeMs === 0 && state.jellies.some((jelly) => Math.abs(jelly.x - HOOK_X) <= 18 && Math.abs(jelly.y - state.hookY) <= 18)) {
    state.stunMs = 1500;
    state.jellySafeMs = 1900;
    state.event = 'stun';
  }
  if (state.carrying && state.hookY <= SURFACE_Y) {
    const humming = state.carrying.humming;
    state.carrying = null;
    state.landed++;
    state.coins = Math.min(MAX_COINS, state.coins + 2);
    state.event = humming ? 'note' : 'land';
    if (humming) { state.won = true; state.phase = 'over'; }
  }
  if (state.elapsedMs >= ROUND_MS) state.phase = 'over';
  return state;
}
