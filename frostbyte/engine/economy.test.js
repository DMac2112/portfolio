import { describe, it, expect } from 'vitest';
import {
  earnCoins, spendCoins, unlockItem, equipItem, setBodyColor,
  prevDay, checkDailyLogin, collectPickup, greetNpc, minigameReward,
} from './economy.js';

// Minimal save factory for tests — mirrors save.js DEFAULT_SAVE shape, no localStorage needed.
function mkSave(over = {}) {
  return {
    coins: 50,
    avatar: { bodyColorId: 'classic-charcoal', equipped: { hat: null, eyewear: null, neck: null, held: null } },
    ownedItems: ['classic-charcoal', 'powder-blue', 'blush-pink', 'mint'],
    npcGreetedOn: {}, pickupsCollectedOn: {}, lastLoginDate: null, loginStreak: 0,
    ...over,
  };
}

describe('earnCoins / spendCoins', () => {
  it('earnCoins increases balance and appends exactly one event', () => {
    const s = mkSave(); const ev = [];
    earnCoins(s, 10, 'test', ev);
    expect(s.coins).toBe(60);
    expect(ev).toEqual([{ type: 'coins-earned', amount: 10, reason: 'test' }]);
  });
  it('spendCoins succeeds when affordable', () => {
    const s = mkSave(); expect(spendCoins(s, 20)).toBe(true); expect(s.coins).toBe(30);
  });
  it('spendCoins returns false and leaves coins unchanged when insufficient', () => {
    const s = mkSave({ coins: 5 }); expect(spendCoins(s, 20)).toBe(false); expect(s.coins).toBe(5);
  });
});

describe('unlockItem', () => {
  it('affordable purchase debits coins, adds ownership, emits event', () => {
    const s = mkSave({ coins: 40 }); const ev = [];
    expect(unlockItem(s, 'snug-beanie', 20, ev)).toBe(true);
    expect(s.coins).toBe(20);
    expect(s.ownedItems).toContain('snug-beanie');
    expect(ev).toContainEqual({ type: 'item-unlocked', itemId: 'snug-beanie' });
  });
  it('is atomic: insufficient funds leaves ownedItems and coins untouched', () => {
    const s = mkSave({ coins: 5 }); const before = [...s.ownedItems]; const ev = [];
    expect(unlockItem(s, 'ice-crown', 60, ev)).toBe(false);
    expect(s.coins).toBe(5);
    expect(s.ownedItems).toEqual(before);
    expect(ev).toEqual([]);
  });
  it('re-buying an owned item is a no-op success and does not double-charge', () => {
    const s = mkSave({ coins: 40 }); const ev = [];
    unlockItem(s, 'snug-beanie', 20, ev);
    expect(unlockItem(s, 'snug-beanie', 20, ev)).toBe(true);
    expect(s.coins).toBe(20); // charged once
    expect(s.ownedItems.filter((i) => i === 'snug-beanie').length).toBe(1);
  });
});

describe('equipItem / setBodyColor', () => {
  it('equips an owned item and can unequip with null', () => {
    const s = mkSave({ ownedItems: ['classic-charcoal', 'snug-beanie'] }); const ev = [];
    expect(equipItem(s, 'hat', 'snug-beanie', ev)).toBe(true);
    expect(s.avatar.equipped.hat).toBe('snug-beanie');
    expect(equipItem(s, 'hat', null, ev)).toBe(true);
    expect(s.avatar.equipped.hat).toBe(null);
  });
  it('rejects equipping an unowned id for every slot', () => {
    const s = mkSave(); const ev = [];
    for (const slot of ['hat', 'eyewear', 'neck', 'held']) {
      expect(equipItem(s, slot, 'not-owned', ev)).toBe(false);
      expect(s.avatar.equipped[slot]).toBe(null);
    }
  });
  it('setBodyColor rejects an unowned dye and accepts an owned one', () => {
    const s = mkSave(); const ev = [];
    expect(setBodyColor(s, 'berry', ev)).toBe(false);
    expect(s.avatar.bodyColorId).toBe('classic-charcoal');
    expect(setBodyColor(s, 'mint', ev)).toBe(true);
    expect(s.avatar.bodyColorId).toBe('mint');
  });
});

describe('prevDay', () => {
  it('steps back one calendar day, including across month boundaries', () => {
    expect(prevDay('2026-07-12')).toBe('2026-07-11');
    expect(prevDay('2026-07-01')).toBe('2026-06-30');
    expect(prevDay('2026-01-01')).toBe('2025-12-31');
  });
});

describe('checkDailyLogin', () => {
  it('same day twice mutates nothing the second time (no double bonus)', () => {
    const s = mkSave(); const ev = [];
    checkDailyLogin(s, '2026-07-12', ev);
    const coinsAfterFirst = s.coins; const evLen = ev.length;
    checkDailyLogin(s, '2026-07-12', ev);
    expect(s.coins).toBe(coinsAfterFirst);
    expect(ev.length).toBe(evLen);
  });
  it('consecutive day increments streak; a gap resets it to 1', () => {
    const s = mkSave(); const ev = [];
    checkDailyLogin(s, '2026-07-10', ev); expect(s.loginStreak).toBe(1);
    checkDailyLogin(s, '2026-07-11', ev); expect(s.loginStreak).toBe(2);
    checkDailyLogin(s, '2026-07-12', ev); expect(s.loginStreak).toBe(3);
    checkDailyLogin(s, '2026-07-15', ev); expect(s.loginStreak).toBe(1); // 3-day gap
  });
  it('bonus grows with streak and caps at day 7+ (17 coins)', () => {
    const s = mkSave({ coins: 0 }); const ev = [];
    const dates = ['2026-07-01','2026-07-02','2026-07-03','2026-07-04','2026-07-05','2026-07-06','2026-07-07','2026-07-08'];
    let prev = 0;
    const bonuses = dates.map((d) => { const before = s.coins; checkDailyLogin(s, d, ev); const b = s.coins - before; return b; });
    expect(bonuses[0]).toBe(5);
    expect(bonuses[6]).toBe(17); // day 7
    expect(bonuses[7]).toBe(17); // day 8 caps
    for (let i = 1; i < 7; i++) expect(bonuses[i]).toBeGreaterThan(bonuses[i - 1]);
  });
});

describe('collectPickup / greetNpc — idempotent per day, re-fire next day', () => {
  it('collectPickup is once per day, re-fires on a bounded date list', () => {
    const s = mkSave({ coins: 0 }); const ev = [];
    const dates = ['2026-07-10','2026-07-11','2026-07-12','2026-07-13','2026-07-14'];
    for (const d of dates) {
      expect(collectPickup(s, 'p1', d, ev)).toBe(true);
      expect(collectPickup(s, 'p1', d, ev)).toBe(false); // second same-day fails
    }
    expect(s.coins).toBe(dates.length);
  });
  it('greetNpc is once per day per npc', () => {
    const s = mkSave({ coins: 0 }); const ev = [];
    expect(greetNpc(s, 'npc-1', '2026-07-12', ev)).toBe(true);
    expect(greetNpc(s, 'npc-1', '2026-07-12', ev)).toBe(false);
    expect(greetNpc(s, 'npc-2', '2026-07-12', ev)).toBe(true);
    expect(s.coins).toBe(4);
  });
});

describe('minigameReward', () => {
  it('gives full reward for the first 3 plays/day, then a flat taper', () => {
    const s = mkSave({ coins: 0 }); const ev = [];
    minigameReward(s, 0, 15, ev); // 25
    minigameReward(s, 1, 0, ev);  // 10
    minigameReward(s, 2, 5, ev);  // 15
    expect(s.coins).toBe(50);
    minigameReward(s, 3, 15, ev); // taper -> 3
    expect(s.coins).toBe(53);
  });
  it('clamps perf bonus into [0,15]', () => {
    const s = mkSave({ coins: 0 }); const ev = [];
    minigameReward(s, 0, 999, ev); expect(s.coins).toBe(25);
    minigameReward(s, 1, -5, ev); expect(s.coins).toBe(35);
  });
});
