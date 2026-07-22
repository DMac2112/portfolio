import { describe, expect, it } from 'vitest';
import { ROOM_REGISTRY } from './rooms.js';
import { resolveWhisperpineRoom } from './whisperpine.js';

describe('resolveWhisperpineRoom', () => {
  it('places exactly one Vesper at today’s authored den without mutating the registry', () => {
    const base = ROOM_REGISTRY.whisperpine;
    const first = resolveWhisperpineRoom(base, '2026-07-22', { secrets: {} });
    const again = resolveWhisperpineRoom(base, '2026-07-22', { secrets: {} });
    expect(first.anchors).toHaveLength(1);
    expect(first.anchors[0]).toEqual(again.anchors[0]);
    expect(base.anchors).toEqual([]);
    expect(base.vesperDens.map((den) => den.id)).toEqual(['root-den', 'owl-den', 'fallen-den']);
  });

  it('keeps the Moonwell gap absent until the saved Vesper hint reveals it', () => {
    const base = ROOM_REGISTRY.whisperpine;
    const hidden = resolveWhisperpineRoom(base, '2026-07-22', { secrets: { moonwellUnlocked: false } });
    const revealed = resolveWhisperpineRoom(base, '2026-07-22', { secrets: { moonwellUnlocked: true } });
    expect(hidden.doors.find((door) => door.id === 'door-moonwell')).toMatchObject({ locked: true, hidden: true });
    expect(revealed.doors.find((door) => door.id === 'door-moonwell')).toMatchObject({
      locked: false, hidden: false, targetRoom: 'moonwell', targetSpawn: 'fromWhisperpine',
    });
    expect(base.doors.find((door) => door.id === 'door-moonwell')).toMatchObject({ locked: true, hidden: true });
  });
});
