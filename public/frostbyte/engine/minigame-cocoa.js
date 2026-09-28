export const SHIFT_SECONDS = 60;
export const PATIENCE_SECONDS = 12;
export const TOPPINGS = ['marshmallow', 'cinnamon', 'cloudberry'];
const ORDERS = [null, ...TOPPINGS];

function limitAt(time) {
  return time < 20 ? 1 : time < 40 ? 2 : 3;
}

function intervalAt(time) {
  return time < 40 ? 4 : 3.5;
}

function spawn(state) {
  const free = state.orders.flatMap((order, index) => order ? [] : [index]);
  if (free.length && state.orders.filter(Boolean).length < limitAt(state.time)) {
    const index = free[Math.min(free.length - 1, Math.floor(state.rng() * free.length))];
    const kind = ORDERS[Math.min(ORDERS.length - 1, Math.floor(state.rng() * ORDERS.length))];
    state.orders[index] = { topping: kind, patience: PATIENCE_SECONDS };
  }
}

export function createGame(rng = Math.random) {
  const state = { time: 0, nextSpawn: 4, orders: [null, null, null, null], mug: null,
    served: 0, missed: 0, rng };
  spawn(state);
  return state;
}

export function tick(state, dt) {
  if (state.time >= SHIFT_SECONDS || !Number.isFinite(dt) || dt <= 0) return state;
  const next = { ...state, orders: state.orders.map((order) => order && { ...order }) };
  const end = Math.min(SHIFT_SECONDS, next.time + dt);
  while (next.time < end) {
    const eventTime = Math.min(end, next.nextSpawn);
    const elapsed = eventTime - next.time;
    for (let i = 0; i < next.orders.length; i++) {
      const order = next.orders[i];
      if (!order) continue;
      order.patience -= elapsed;
      if (order.patience <= 0) { next.orders[i] = null; next.missed++; }
    }
    next.time = eventTime;
    if (next.time === next.nextSpawn && next.time < SHIFT_SECONDS) {
      spawn(next);
      next.nextSpawn += intervalAt(next.time);
    }
  }
  if (next.time >= SHIFT_SECONDS) next.orders = [null, null, null, null];
  return next;
}

export function fill(state) {
  if (state.time >= SHIFT_SECONDS || state.mug) return state;
  return { ...state, mug: { topping: null } };
}

export function addTopping(state, topping) {
  if (state.time >= SHIFT_SECONDS || !state.mug || state.mug.topping || !TOPPINGS.includes(topping)) return state;
  return { ...state, mug: { topping } };
}

export function serve(state, table) {
  if (state.time >= SHIFT_SECONDS || !state.mug || !Number.isInteger(table) || table < 1 || table > 4 || !state.orders[table - 1]) {
    return { state, outcome: null };
  }
  const order = state.orders[table - 1];
  if (order.topping !== state.mug.topping) {
    return { state: { ...state, mug: null }, outcome: 'wrong' };
  }
  const orders = state.orders.slice();
  orders[table - 1] = null;
  return { state: { ...state, orders, mug: null, served: state.served + 1 }, outcome: 'right' };
}

export function result(state) {
  return { won: state.served >= 6, coinsEarned: Math.min(16, state.served * 2) };
}
