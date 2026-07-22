import { describe, expect, it } from 'vitest';
import { lighthouseLogbookPages, telescopeVistaForDate } from './lighthouse.js';

describe('Palefire Light content', () => {
  it('resolves complete painted vista records from the pure calendar selection', () => {
    expect(telescopeVistaForDate('2026-07-22')).toMatchObject({ id: 'breaching-whale' });
    expect(telescopeVistaForDate('2026-07-23')).toMatchObject({
      id: 'salka-at-sea', asset: './assets/vistas/salka-at-sea.png',
    });
    expect(telescopeVistaForDate('bad-date')).toBeNull();
  });

  it('grows the logbook only as Maren sightings are reported complete', () => {
    const save = { favors: {} };
    expect(lighthouseLogbookPages(save)).toHaveLength(2);
    save.favors['maren-sighting-vista'] = { status: 'done' };
    expect(lighthouseLogbookPages(save)).toHaveLength(2);
    expect(lighthouseLogbookPages(save).at(-1)).toContain('looking slowly');
    save.favors['maren-sighting-trail'] = { status: 'done' };
    save.favors['maren-sighting-gull'] = { status: 'done' };
    expect(lighthouseLogbookPages(save)).toHaveLength(4);
  });
});
