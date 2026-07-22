// engine/save.js — versioned localStorage save (Avatar §6/§7). A deliberate clone of the OS's
// storage NS/version/try-catch pattern (os/src/os/storage.ts), scoped UNDER the OS namespace so
// a global OS version-bump wipes Frostbyte's save too (accepted, intentional — Avatar §7).
//
// Testable without jsdom: load/persist take an optional `store` (defaults to real localStorage)
// and an optional `now` timestamp. Tests pass a Map-backed fake store + fixed timestamps.
import { starterDyeIds } from '../content/cosmetics.js';
import { createCurioState } from './curios.js';

export const OS_NS = 'dmos.v1';                    // MUST match os/src/os/storage.ts NS exactly
export const SAVE_KEY = `${OS_NS}.frostbyte.save`;
export const SCHEMA_VERSION = 1;                   // Frostbyte-internal, independent of OS_NS version
export const DEFAULT_VISITED_ROOMS = Object.freeze(['plaza', 'den', 'trail', 'court', 'workshop']);

function defaultStore() {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}
function prefersReducedMotion() {
  try { return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}
function nowISO() { return new Date().toISOString(); }

export function DEFAULT_SAVE(now = nowISO()) {
  return {
    schemaVersion: SCHEMA_VERSION,
    coins: 50,
    avatar: {
      bodyColorId: 'classic-charcoal',
      equipped: { hat: null, eyewear: null, neck: null, held: null },
    },
    ownedItems: starterDyeIds(),                   // 4 free starter dyes
    npcGreetedOn: {},
    pickupsCollectedOn: {},
    dailyCoins: {},                                // { "YYYY-MM-DD": minigame coins earned that day }
    home: { open: false, shell: 'dome-basic', placed: [] }, // den decorating (H2): placed = [{id,x,y,flip}] world coords
    furniture: {},                                 // { itemId: count } owned-but-not-placed stock (H2)
    curios: createCurioState(),                     // Curio Log (W0): found ids + once-only completion rewards
    favors: {},                                     // { favorId: {status,stepIndex} } cross-room threads (W0)
    secrets: {
      vesperHints: [], moonwellUnlocked: false, cavernsUnlocked: false, auroraIntensified: false,
    },                                                    // W5/W6: persistent secret gates + isle payoff
    visitedRooms: [...DEFAULT_VISITED_ROOMS],        // W3+: new map pins appear after first walk-in
    lastLoginDate: null,
    loginStreak: 0,
    prefs: { muted: false, reducedMotion: prefersReducedMotion(), lastRoom: 'plaza' },
    createdAt: now,
    updatedAt: now,
  };
}

// Pure, stepwise, never throws. Fills forward-defaults so an old blob never loses coins/cosmetics.
export function migrateSave(raw, now = nowISO()) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return DEFAULT_SAVE(now);
  let s = raw;
  if (s.schemaVersion == null) s = migrateLegacyToV1(s);
  // Future: if (s.schemaVersion === 1) s = migrateV1ToV2(s);
  const base = DEFAULT_SAVE(now);
  const savedCurios = s.curios && typeof s.curios === 'object' && !Array.isArray(s.curios) ? s.curios : {};
  const savedFavors = s.favors && typeof s.favors === 'object' && !Array.isArray(s.favors) ? s.favors : {};
  const savedSecrets = s.secrets && typeof s.secrets === 'object' && !Array.isArray(s.secrets) ? s.secrets : {};
  const savedHintIds = Array.isArray(savedSecrets.vesperHints)
    ? [...new Set(savedSecrets.vesperHints.filter((id) => typeof id === 'string'))]
    : base.secrets.vesperHints;
  const savedFound = savedCurios.found && typeof savedCurios.found === 'object' && !Array.isArray(savedCurios.found)
    ? savedCurios.found : {};
  const savedRoomRewards = savedCurios.roomRewards && typeof savedCurios.roomRewards === 'object' && !Array.isArray(savedCurios.roomRewards)
    ? savedCurios.roomRewards : {};
  const savedVisitedRooms = Array.isArray(s.visitedRooms)
    ? s.visitedRooms.filter((roomId) => typeof roomId === 'string')
    : base.visitedRooms;
  return {
    ...base,
    ...s,
    schemaVersion: SCHEMA_VERSION,
    // targeted deep-merge so a partial legacy avatar/prefs can't drop required sub-fields
    avatar: {
      ...base.avatar,
      ...(s.avatar ?? {}),
      equipped: { ...base.avatar.equipped, ...((s.avatar && s.avatar.equipped) ?? {}) },
    },
    prefs: { ...base.prefs, ...(s.prefs ?? {}) },
    home: { ...base.home, ...(s.home ?? {}) },
    curios: {
      ...base.curios,
      ...savedCurios,
      found: { ...base.curios.found, ...savedFound },
      roomRewards: { ...base.curios.roomRewards, ...savedRoomRewards },
    },
    favors: { ...savedFavors },
    secrets: {
      ...base.secrets,
      ...savedSecrets,
      vesperHints: savedHintIds,
      moonwellUnlocked: savedSecrets.moonwellUnlocked === true,
      cavernsUnlocked: savedSecrets.cavernsUnlocked === true || savedHintIds.includes('hollow-crack'),
      auroraIntensified: savedSecrets.auroraIntensified === true || savedCurios.isleRewardClaimed === true,
    },
    visitedRooms: [...new Set(savedVisitedRooms)],
  };
}

function migrateLegacyToV1(s) {
  return { ...s, schemaVersion: 1 };
}

export function load(store = defaultStore(), now = nowISO()) {
  if (!store) return DEFAULT_SAVE(now);
  try {
    const raw = store.getItem(SAVE_KEY);
    if (!raw) return DEFAULT_SAVE(now);
    return migrateSave(JSON.parse(raw), now);
  } catch {
    return DEFAULT_SAVE(now); // corrupted JSON -> fresh save, never throw into the game loop
  }
}

export function persist(save, store = defaultStore(), now = nowISO()) {
  if (!store) return;
  save.updatedAt = now;
  try { store.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* quota / private-mode: no-op */ }
}
