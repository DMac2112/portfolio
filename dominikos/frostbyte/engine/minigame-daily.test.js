import { describe, it, expect } from 'vitest';
import { DAILY_CAP, coinsToday, remainingToday, recordCoins } from './minigame-daily.js';

// Minimal save factory — dailyCoins intentionally omitted by default to exercise the
// "older save with no map" defensive paths.
function mkSave(over = {}) {
  return {
    coins: 50,
    avatar: { bodyColorId: 'classic-charcoal', equipped: { hat: null, eyewear: null, neck: null, held: null } },
    ownedItems: [],
    npcGreetedOn: {}, pickupsCollectedOn: {}, lastLoginDate: null, loginStreak: 0,
    ...over,
  };
}

describe('coinsToday', () => {
  it('returns 0 for a save with no dailyCoins map', () => {
    const s = mkSave();
    expect(coinsToday(s, '2026-07-12')).toBe(0);
  });
  it('returns the stored value for the given day when present', () => {
    const s = mkSave({ dailyCoins: { '2026-07-12': 45 } });
    expect(coinsToday(s, '2026-07-12')).toBe(45);
  });
  it('returns 0 for a day not present in an existing map', () => {
    const s = mkSave({ dailyCoins: { '2026-07-11': 30 } });
    expect(coinsToday(s, '2026-07-12')).toBe(0);
  });
});

describe('remainingToday', () => {
  it('equals the cap when nothing earned yet', () => {
    const s = mkSave();
    expect(remainingToday(s, '2026-07-12')).toBe(DAILY_CAP);
  });
  it('is 0 when exactly at the cap', () => {
    const s = mkSave({ dailyCoins: { '2026-07-12': DAILY_CAP } });
    expect(remainingToday(s, '2026-07-12')).toBe(0);
  });
  it('is 0 (not negative) when over the cap', () => {
    const s = mkSave({ dailyCoins: { '2026-07-12': DAILY_CAP + 100 } });
    expect(remainingToday(s, '2026-07-12')).toBe(0);
  });
  it('decreases as coins are recorded', () => {
    const s = mkSave();
    expect(remainingToday(s, '2026-07-12')).toBe(DAILY_CAP);
    recordCoins(s, '2026-07-12', 10);
    expect(remainingToday(s, '2026-07-12')).toBe(DAILY_CAP - 10);
    recordCoins(s, '2026-07-12', 5);
    expect(remainingToday(s, '2026-07-12')).toBe(DAILY_CAP - 15);
  });
  it('respects a custom cap argument', () => {
    const s = mkSave({ dailyCoins: { '2026-07-12': 5 } });
    expect(remainingToday(s, '2026-07-12', 10)).toBe(5);
  });
});

describe('recordCoins', () => {
  it('on a fresh save creates the map and stores the amount', () => {
    const s = mkSave();
    recordCoins(s, '2026-07-12', 20);
    expect(s.dailyCoins).toEqual({ '2026-07-12': 20 });
  });
  it('a second call the same day adds to the running total', () => {
    const s = mkSave();
    recordCoins(s, '2026-07-12', 20);
    recordCoins(s, '2026-07-12', 15);
    expect(coinsToday(s, '2026-07-12')).toBe(35);
  });
  it('never pushes the day total above the cap', () => {
    const s = mkSave();
    recordCoins(s, '2026-07-12', 50);
    recordCoins(s, '2026-07-12', 50); // would be 100 uncapped
    expect(coinsToday(s, '2026-07-12')).toBe(DAILY_CAP);
  });
  it('never decreases the day total (defensive clamp on negative/zero input)', () => {
    const s = mkSave();
    recordCoins(s, '2026-07-12', 20);
    recordCoins(s, '2026-07-12', -100);
    expect(coinsToday(s, '2026-07-12')).toBe(20);
  });
  it('respects a custom cap argument', () => {
    const s = mkSave();
    recordCoins(s, '2026-07-12', 100, 10);
    expect(coinsToday(s, '2026-07-12')).toBe(10);
  });
  it('tracks a different todayKey separately from an existing day', () => {
    const s = mkSave({ dailyCoins: { '2026-07-11': 40 } });
    recordCoins(s, '2026-07-12', 20);
    expect(s.dailyCoins).toEqual({ '2026-07-11': 40, '2026-07-12': 20 });
  });
  it('returns the same save object (mutate-in-place convention)', () => {
    const s = mkSave();
    const result = recordCoins(s, '2026-07-12', 10);
    expect(result).toBe(s);
  });
  it('never throws on a save missing dailyCoins', () => {
    const s = mkSave();
    delete s.dailyCoins;
    expect(() => recordCoins(s, '2026-07-12', 10)).not.toThrow();
    expect(() => coinsToday(s, '2026-07-12')).not.toThrow();
    expect(() => remainingToday(s, '2026-07-12')).not.toThrow();
  });
});
