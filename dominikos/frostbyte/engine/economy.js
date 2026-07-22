// engine/economy.js — PURE single-player coin economy (Avatar §8). No DOM, no wall clock.
// Calendar-gated rewards take `todayISO` ("YYYY-MM-DD") as a param (injected-time discipline,
// mirroring os/.../mines/engine.ts's out-param events). Functions mutate `save` in place and
// push {type,...} into a caller-owned `ev` array for the UI to replay into sound/toasts.

export function earnCoins(save, amount, reason, ev) {
  save.coins += amount;
  ev.push({ type: 'coins-earned', amount, reason });
  return save;
}

// Returns false and leaves state untouched when the balance is insufficient.
export function spendCoins(save, amount) {
  if (save.coins < amount) return false;
  save.coins -= amount;
  return true;
}

// Atomic: on insufficient funds nothing is mutated. Re-buying an owned item is a no-op success.
export function unlockItem(save, itemId, price, ev) {
  if (save.ownedItems.includes(itemId)) return true;
  if (!spendCoins(save, price)) return false;
  save.ownedItems.push(itemId);
  ev.push({ type: 'item-unlocked', itemId });
  return true;
}

// Equip a slot (or unequip with itemId === null). Rejects equipping an unowned item.
export function equipItem(save, slot, itemId, ev) {
  if (itemId !== null && !save.ownedItems.includes(itemId)) return false;
  save.avatar.equipped[slot] = itemId;
  ev.push({ type: 'item-equipped', slot, itemId });
  return true;
}

// Set body colour; rejects an unowned dye (bodyColorId lives in ownedItems too).
export function setBodyColor(save, bodyColorId, ev) {
  if (!save.ownedItems.includes(bodyColorId)) return false;
  save.avatar.bodyColorId = bodyColorId;
  ev.push({ type: 'body-color-set', bodyColorId });
  return true;
}

// "YYYY-MM-DD" one day earlier (UTC-safe; input is a plain calendar date).
export function prevDay(todayISO) {
  const [y, m, d] = todayISO.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

// Daily login bonus: 5 flat, +2 per consecutive day, caps at day 7+ (5..17). Idempotent per day.
export function checkDailyLogin(save, todayISO, ev) {
  if (save.lastLoginDate === todayISO) return save; // already counted today, no-op
  const isConsecutive = save.lastLoginDate === prevDay(todayISO);
  save.loginStreak = isConsecutive ? save.loginStreak + 1 : 1;
  save.lastLoginDate = todayISO;
  const bonus = 5 + Math.min(save.loginStreak - 1, 6) * 2;
  return earnCoins(save, bonus, 'daily-login', ev);
}

// Plaza sparkle pickup: 1 coin, once per pickup per calendar day.
export function collectPickup(save, pickupId, todayISO, ev) {
  if (save.pickupsCollectedOn[pickupId] === todayISO) return false;
  save.pickupsCollectedOn[pickupId] = todayISO;
  earnCoins(save, 1, 'pickup', ev);
  return true;
}

// First talk to an NPC each day: 2 coins.
export function greetNpc(save, npcId, todayISO, ev) {
  if (save.npcGreetedOn[npcId] === todayISO) return false;
  save.npcGreetedOn[npcId] = todayISO;
  earnCoins(save, 2, 'npc-greet', ev);
  return true;
}

// Minigame reward: full (base + perf bonus) for the first `FULL_PLAYS`/day, then a flat taper.
export const FULL_PLAYS_PER_DAY = 3;
export function minigameReward(save, playsToday, perfBonus, ev) {
  const base = playsToday < FULL_PLAYS_PER_DAY ? 10 + Math.max(0, Math.min(15, perfBonus)) : 3;
  return earnCoins(save, base, 'minigame', ev);
}
