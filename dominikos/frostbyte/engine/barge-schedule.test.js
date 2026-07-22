import { describe, expect, it } from 'vitest';
import {
  BARGE_PORT_PATTERN,
  bargeStateForDate,
  dateOrdinal,
  isBargeInPort,
  nextBargeArrival,
} from './barge-schedule.js';

describe('Driftwood Gull schedule', () => {
  it('uses a deterministic eight-day pattern with three port days', () => {
    expect(BARGE_PORT_PATTERN).toHaveLength(8);
    expect(BARGE_PORT_PATTERN.filter(Boolean)).toHaveLength(3);
    expect(bargeStateForDate('2026-07-22')).toMatchObject({ cycleIndex: 0, inPort: true, atSea: false });
    expect(isBargeInPort('2026-07-23')).toBe(false);
    expect(isBargeInPort('2026-07-25')).toBe(true);
  });

  it('reports the next arrival without using the wall clock', () => {
    expect(nextBargeArrival('2026-07-22')).toEqual({ dateKey: '2026-07-25', days: 3 });
    expect(nextBargeArrival('2026-07-23')).toEqual({ dateKey: '2026-07-25', days: 2 });
    expect(bargeStateForDate('2026-07-23').daysUntilNextArrival).toBe(2);
  });

  it('rejects malformed and impossible calendar keys', () => {
    for (const bad of ['', '2026-7-22', '2026-02-30', null]) {
      expect(dateOrdinal(bad)).toBe(null);
      expect(bargeStateForDate(bad)).toBe(null);
      expect(isBargeInPort(bad)).toBe(false);
    }
  });
});
