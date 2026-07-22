import { describe, expect, it } from 'vitest';
import { isBargeInPort } from './barge-schedule.js';
import { TELESCOPE_VISTA_IDS, telescopeVistaIdForDate } from './telescope-vistas.js';

describe('Palefire telescope vistas', () => {
  it('always shows The Driftwood Gull under sail while Salka is away', () => {
    for (const date of ['2026-07-23', '2026-07-24', '2026-07-26', '2026-07-27']) {
      expect(isBargeInPort(date)).toBe(false);
      expect(telescopeVistaIdForDate(date)).toBe('salka-at-sea');
    }
  });

  it('date-seeds the whale and aurora vistas on occupied-port days', () => {
    const vistas = ['2026-07-22', '2026-07-25', '2026-07-28', '2026-07-30']
      .map(telescopeVistaIdForDate);
    expect(vistas.every((id) => ['breaching-whale', 'aurora-crown'].includes(id))).toBe(true);
    expect(new Set(vistas).size).toBe(2);
    expect(vistas.every((id) => TELESCOPE_VISTA_IDS.includes(id))).toBe(true);
  });

  it('rejects malformed calendar keys', () => {
    expect(telescopeVistaIdForDate('2026-02-30')).toBeNull();
    expect(telescopeVistaIdForDate(null)).toBeNull();
  });
});
