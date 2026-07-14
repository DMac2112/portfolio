// engine/home-editor.js — PURE furniture-placement reducer for the igloo (FROSTBYTE-HOME-PLAN §4).
// No DOM/KAPLAY/Date/Math.random — mirrors economy.js/chat.js: mutate-in-place state, push
// {type,...} events into a caller-owned `ev` out-param array. Content-agnostic (like npc-fsm.js):
// callers pass catalog entries ({id,w,h}) in directly rather than this module importing a catalog.
//
// State shape (lives inside the save under keys the integrator owns):
//   home = { placed: [{ id, x, y, flip }] }   — x,y are WORLD-coordinate CENTERS
//   furniture = { [itemId]: count }            — owned UNplaced stock (placing decrements, storing increments)

export const SNAP = 12; // world px — native 4px grid x scale 3

// Snap a single world coordinate to the SNAP grid.
function snapValue(v) {
  return Math.round(v / SNAP) * SNAP;
}

// Clamp v into [lo, hi]; if the range is inverted (item wider/taller than the bounds), center it.
function clampValue(v, lo, hi) {
  if (lo > hi) return (lo + hi) / 2;
  return Math.max(lo, Math.min(hi, v));
}

// Snap then clamp so the item's WORLD half-extents (w*3/2, h*3/2) stay inside `bounds`.
function snapAndClamp(x, y, item, bounds) {
  const hw = (item.w * 3) / 2;
  const hh = (item.h * 3) / 2;
  return {
    x: clampValue(snapValue(x), bounds.x0 + hw, bounds.x1 - hw),
    y: clampValue(snapValue(y), bounds.y0 + hh, bounds.y1 - hh),
  };
}

// +1 owned (unplaced) stock of itemId, creating the key if absent. ev {type:'furniture-added', id}.
export function addToInventory(furniture, itemId, ev = []) {
  furniture[itemId] = (furniture[itemId] || 0) + 1;
  ev.push({ type: 'furniture-added', id: itemId });
  return furniture;
}

// True while under the placed-items cap.
export function canPlace(home, maxPlaced) {
  return home.placed.length < maxPlaced;
}

// Place one unit of `item` ({id,w,h}) at (x,y). Rejects without mutating state when out of stock
// or at cap. On success: snaps+clamps, decrements inventory, pushes a placed entry, returns its index.
export function place(home, furniture, item, x, y, bounds, maxPlaced, ev = []) {
  if (!furniture[item.id]) {
    return { ok: false, reason: 'no-stock' };
  }
  if (!canPlace(home, maxPlaced)) {
    return { ok: false, reason: 'cap' };
  }
  const { x: px, y: py } = snapAndClamp(x, y, item, bounds);
  furniture[item.id] -= 1;
  home.placed.push({ id: item.id, x: px, y: py, flip: false });
  const index = home.placed.length - 1;
  ev.push({ type: 'furniture-placed', id: item.id, x: px, y: py });
  return { ok: true, index };
}

// Reposition an already-placed entry (same snap+clamp as place). `item` is the catalog entry for
// the entry at `index` (needed for its half-extents). {ok:false, reason:'bad-index'} out of range.
export function move(home, index, x, y, item, bounds, ev = []) {
  const entry = home.placed[index];
  if (!entry) {
    return { ok: false, reason: 'bad-index' };
  }
  const { x: px, y: py } = snapAndClamp(x, y, item, bounds);
  entry.x = px;
  entry.y = py;
  ev.push({ type: 'furniture-moved', id: entry.id, x: px, y: py });
  return { ok: true, index };
}

// Toggle horizontal flip on a placed entry. {ok:false, reason:'bad-index'} out of range.
export function flip(home, index, ev = []) {
  const entry = home.placed[index];
  if (!entry) {
    return { ok: false, reason: 'bad-index' };
  }
  entry.flip = !entry.flip;
  ev.push({ type: 'furniture-flipped', id: entry.id, flip: entry.flip });
  return { ok: true, index };
}

// Remove a placed entry back into inventory (+1 count, creates key if absent).
// {ok:false, reason:'bad-index'} out of range.
export function store(home, furniture, index, ev = []) {
  const entry = home.placed[index];
  if (!entry) {
    return { ok: false, reason: 'bad-index' };
  }
  home.placed.splice(index, 1);
  furniture[entry.id] = (furniture[entry.id] || 0) + 1;
  ev.push({ type: 'furniture-stored', id: entry.id });
  return { ok: true, id: entry.id };
}

// Topmost placed index whose world rect (center +/- half-extents from catalogById[entry.id].w/h x3)
// contains (x,y); -1 on miss. Iterates from the END of `placed` so later (on-top) entries win ties.
export function hitTest(home, catalogById, x, y) {
  for (let i = home.placed.length - 1; i >= 0; i--) {
    const entry = home.placed[i];
    const item = catalogById[entry.id];
    if (!item) continue;
    const hw = (item.w * 3) / 2;
    const hh = (item.h * 3) / 2;
    if (x >= entry.x - hw && x <= entry.x + hw && y >= entry.y - hh && y <= entry.y + hh) {
      return i;
    }
  }
  return -1;
}
