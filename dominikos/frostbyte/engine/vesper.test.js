import { describe, expect, it } from 'vitest';
import {
  VESPER_DEN_IDS,
  VESPER_HINTS,
  claimVesperHint,
  nextVesperHint,
  vesperDenForDate,
  vesperDenIndexForDate,
} from './vesper.js';

const registry = Array.from({ length: 24 }, (_, index) => ({
  id: `curio-${index + 1}`, roomId: 'fixture', label: `Curio ${index + 1}`,
}));
const saveWithFound = (count) => ({
  curios: { found: Object.fromEntries(registry.slice(0, count).map((curio) => [curio.id, true])) },
  secrets: { vesperHints: [], moonwellUnlocked: false, cavernsUnlocked: false, auroraIntensified: false },
});

describe('Vesper’s daily den', () => {
  it('rotates deterministically through all three authored dens on consecutive dates', () => {
    const dates = ['2026-07-22', '2026-07-23', '2026-07-24'];
    const indexes = dates.map(vesperDenIndexForDate);
    expect(new Set(indexes)).toEqual(new Set([0, 1, 2]));
    expect(vesperDenIndexForDate('2026-07-22')).toBe(indexes[0]);
    expect(vesperDenIndexForDate('not-a-date')).toBeNull();
  });

  it('resolves the dated id rather than trusting authored den order', () => {
    const dens = VESPER_DEN_IDS.map((id, index) => ({ id, x: index * 10 })).reverse();
    const index = vesperDenIndexForDate('2026-07-22');
    expect(vesperDenForDate(dens, '2026-07-22').id).toBe(VESPER_DEN_IDS[index]);
    expect(vesperDenForDate(dens.slice(1), '2026-07-22')).toBeNull();
  });
});

describe('Vesper’s Curio trades', () => {
  it('withholds the first hint below its threshold and reports the remaining stamps', () => {
    expect(nextVesperHint(saveWithFound(4), registry)).toMatchObject({
      hint: VESPER_HINTS[0], found: 4, remaining: 2, available: false, complete: false,
    });
  });

  it('claims hints sequentially and the second hint permanently unlocks Moonwell', () => {
    const save = saveWithFound(24);
    const events = [];
    expect(claimVesperHint(save, registry, events)?.id).toBe('court-cobble');
    expect(save.secrets.moonwellUnlocked).toBe(false);
    expect(claimVesperHint(save, registry, events)?.id).toBe('moonwell-gap');
    expect(save.secrets.moonwellUnlocked).toBe(true);
    expect(claimVesperHint(save, registry, events)?.id).toBe('hollow-crack');
    expect(save.secrets.cavernsUnlocked).toBe(true);
    expect(claimVesperHint(save, registry, events)).toBeNull();
    expect(save.secrets.vesperHints).toEqual(['court-cobble', 'moonwell-gap', 'hollow-crack']);
    expect(events).toHaveLength(3);
    expect(events[2]).toMatchObject({ hintId: 'hollow-crack', unlocks: 'caverns' });
    expect(nextVesperHint(save, registry).complete).toBe(true);
  });

  it('forward-initializes missing secret state without dropping unrelated fields', () => {
    const save = saveWithFound(8);
    delete save.secrets;
    save.coins = 77;
    expect(claimVesperHint(save, registry)?.id).toBe('court-cobble');
    expect(save).toMatchObject({
      coins: 77,
      secrets: { vesperHints: ['court-cobble'], moonwellUnlocked: false },
    });
  });
});
