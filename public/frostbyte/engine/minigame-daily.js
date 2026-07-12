// engine/minigame-daily.js — PURE daily coin-cap tracking for minigame earnings. No DOM, no wall
// clock: `todayKey` ("YYYY-MM-DD") is always caller-supplied (injected-time discipline, matching
// engine/economy.js). save.dailyCoins is a { todayKey -> coins earned that day } map that may be
// absent on older saves — every read/write here defaults it defensively with `?? {}`.

/** Coins earned from minigames beyond this cap are not credited for a given calendar day. */
export const DAILY_CAP = 60;

/** Coins already earned from minigames on `todayKey` (0 if none / no map). Pure read. */
export function coinsToday(save, todayKey) {
  return save.dailyCoins?.[todayKey] ?? 0;
}

/** How many more minigame coins can be earned today. max(0, cap - coinsToday). Pure read. */
export function remainingToday(save, todayKey, cap = DAILY_CAP) {
  return Math.max(0, cap - coinsToday(save, todayKey));
}

/**
 * Records `coins` minigame-earnings against `todayKey`. Mutates save in place (creating
 * save.dailyCoins if absent) and returns save. `coins` is assumed already clamped by the caller,
 * but clamp defensively so the day's total never exceeds `cap` and never decreases. Existing keys
 * (other days) are left untouched — no time-based pruning here (no wall clock); a global
 * save-version wipe handles long-term cleanup elsewhere.
 */
export function recordCoins(save, todayKey, coins, cap = DAILY_CAP) {
  save.dailyCoins = save.dailyCoins ?? {};
  const before = coinsToday(save, todayKey);
  const added = Math.max(0, coins);
  save.dailyCoins[todayKey] = Math.min(cap, before + added);
  return save;
}
