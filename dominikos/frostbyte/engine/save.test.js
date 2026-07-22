import { describe, it, expect } from 'vitest';
import { DEFAULT_SAVE, DEFAULT_VISITED_ROOMS, migrateSave, load, persist, SAVE_KEY, SCHEMA_VERSION } from './save.js';

// Map-backed fake localStorage — lets save.test.js run in the node environment (no jsdom).
function fakeStore(initial = {}) {
  const m = new Map(Object.entries(initial));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    _map: m,
  };
}

describe('DEFAULT_SAVE', () => {
  it('has the v1 shape with 50 coins and 4 starter dyes owned', () => {
    const s = DEFAULT_SAVE('2026-07-12T00:00:00.000Z');
    expect(s.schemaVersion).toBe(SCHEMA_VERSION);
    expect(s.coins).toBe(50);
    expect(s.ownedItems).toEqual(['classic-charcoal', 'powder-blue', 'blush-pink', 'mint']);
    expect(s.avatar.equipped).toEqual({ hat: null, eyewear: null, neck: null, held: null });
    expect(s.curios).toEqual({ found: {}, roomRewards: {}, isleRewardClaimed: false });
    expect(s.favors).toEqual({});
    expect(s.secrets).toEqual({
      vesperHints: [], moonwellUnlocked: false, cavernsUnlocked: false, auroraIntensified: false,
    });
    expect(s.visitedRooms).toEqual(DEFAULT_VISITED_ROOMS);
    expect(s.visitedRooms).not.toContain('docks');
    expect(s.visitedRooms).not.toContain('lighthouse-rest');
    expect(s.visitedRooms).not.toContain('whisperpine');
    expect(s.createdAt).toBe('2026-07-12T00:00:00.000Z');
  });
});

describe('migrateSave', () => {
  it('upgrades a legacy object missing schemaVersion, filling defaults, without throwing', () => {
    const legacy = { coins: 999, avatar: { bodyColorId: 'mint' } };
    const s = migrateSave(legacy, '2026-07-12T00:00:00.000Z');
    expect(s.schemaVersion).toBe(SCHEMA_VERSION);
    expect(s.coins).toBe(999);                       // preserved
    expect(s.avatar.bodyColorId).toBe('mint');       // preserved
    expect(s.avatar.equipped).toEqual({ hat: null, eyewear: null, neck: null, held: null }); // backfilled
    expect(s.prefs.lastRoom).toBe('plaza');          // backfilled
  });
  it('null / non-object / array inputs fall back to DEFAULT_SAVE', () => {
    for (const bad of [null, undefined, 42, 'x', []]) {
      const s = migrateSave(bad, '2026-07-12T00:00:00.000Z');
      expect(s.coins).toBe(50);
      expect(s.schemaVersion).toBe(SCHEMA_VERSION);
    }
  });
  it('preserves an existing partial equipped map', () => {
    const s = migrateSave({ avatar: { equipped: { hat: 'snug-beanie' } } }, '2026-07-12T00:00:00.000Z');
    expect(s.avatar.equipped.hat).toBe('snug-beanie');
    expect(s.avatar.equipped.neck).toBe(null);
  });
  it('forward-defaults the H2 home/furniture fields on a pre-H2 save', () => {
    const s = migrateSave({ coins: 77 }, '2026-07-13T00:00:00.000Z');
    expect(s.home).toEqual({ open: false, shell: 'dome-basic', placed: [] });
    expect(s.furniture).toEqual({});
  });
  it('preserves a partial home while backfilling its missing fields', () => {
    const s = migrateSave({ home: { open: true } }, '2026-07-13T00:00:00.000Z');
    expect(s.home.open).toBe(true);
    expect(s.home.shell).toBe('dome-basic');
    expect(s.home.placed).toEqual([]);
  });
  it('forward-defaults W0 curios/favors without changing schemaVersion', () => {
    const s = migrateSave({ coins: 77 }, '2026-07-22T00:00:00.000Z');
    expect(s.schemaVersion).toBe(1);
    expect(s.curios).toEqual({ found: {}, roomRewards: {}, isleRewardClaimed: false });
    expect(s.favors).toEqual({});
  });
  it('preserves partial W0 state while backfilling nested Curio fields', () => {
    const s = migrateSave({
      curios: { found: { 'fixture-curio': true } },
      favors: { 'fixture-favor': { status: 'in-progress', stepIndex: 1 } },
    }, '2026-07-22T00:00:00.000Z');
    expect(s.curios).toEqual({
      found: { 'fixture-curio': true },
      roomRewards: {},
      isleRewardClaimed: false,
    });
    expect(s.favors['fixture-favor']).toEqual({ status: 'in-progress', stepIndex: 1 });
  });
  it('backfills discovery pins and preserves unique valid visited room ids', () => {
    expect(migrateSave({ coins: 77 }, '2026-07-22T00:00:00.000Z').visitedRooms)
      .toEqual(DEFAULT_VISITED_ROOMS);
    expect(migrateSave({ visitedRooms: ['plaza', 'docks', 'docks', 42] }, '2026-07-22T00:00:00.000Z').visitedRooms)
      .toEqual(['plaza', 'docks']);
  });
  it('forward-defaults and preserves W5/W6 secret state', () => {
    expect(migrateSave({ coins: 77 }, '2026-07-22T00:00:00.000Z').secrets)
      .toEqual({
        vesperHints: [], moonwellUnlocked: false, cavernsUnlocked: false, auroraIntensified: false,
      });
    expect(migrateSave({
      secrets: {
        vesperHints: ['court-cobble', 'court-cobble', 42], moonwellUnlocked: true,
        cavernsUnlocked: true, auroraIntensified: true,
      },
    }, '2026-07-22T00:00:00.000Z').secrets).toEqual({
      vesperHints: ['court-cobble'], moonwellUnlocked: true,
      cavernsUnlocked: true, auroraIntensified: true,
    });
  });
  it('derives W6 gates from already-earned v1 contracts', () => {
    expect(migrateSave({
      secrets: { vesperHints: ['hollow-crack'] },
      curios: { isleRewardClaimed: true },
    }, '2026-07-22T00:00:00.000Z').secrets).toMatchObject({
      cavernsUnlocked: true,
      auroraIntensified: true,
    });
  });
});

describe('load / persist round-trip', () => {
  it('no stored data returns a fresh default save', () => {
    const store = fakeStore();
    const s = load(store, '2026-07-12T00:00:00.000Z');
    expect(s.coins).toBe(50);
  });
  it('persist then load returns a deep-equal save with updatedAt advanced', () => {
    const store = fakeStore();
    const save = DEFAULT_SAVE('2026-07-12T00:00:00.000Z');
    save.coins = 123;
    save.avatar.equipped.hat = 'party-cone';
    persist(save, store, '2026-07-12T09:30:00.000Z');
    const loaded = load(store, '2099-01-01T00:00:00.000Z'); // load-time "now" must NOT override stored values
    expect(loaded).toEqual(save);
    expect(loaded.updatedAt).toBe('2026-07-12T09:30:00.000Z');
    expect(loaded.updatedAt).not.toBe(loaded.createdAt);
  });
  it('corrupted JSON in storage falls back to a default save without throwing', () => {
    const store = fakeStore({ [SAVE_KEY]: '{not valid json' });
    expect(() => load(store, '2026-07-12T00:00:00.000Z')).not.toThrow();
    expect(load(store, '2026-07-12T00:00:00.000Z').coins).toBe(50);
  });
  it('a null store (private mode / no localStorage) is stateless and never throws', () => {
    expect(() => persist(DEFAULT_SAVE(), null)).not.toThrow();
    expect(load(null).coins).toBe(50);
  });
});
