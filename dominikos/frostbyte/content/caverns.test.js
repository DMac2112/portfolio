import { describe, expect, it } from 'vitest';
import { ROOM_REGISTRY } from './rooms.js';
import { cavernsAreUnlocked, resolveCavernEntrances } from './caverns.js';

describe('Hollowfrost paired entrances', () => {
  it('keeps both foreshadowed routes locked until Vesper reveals them', () => {
    const workshop = resolveCavernEntrances(ROOM_REGISTRY.workshop, { secrets: {} });
    const hollow = resolveCavernEntrances(ROOM_REGISTRY.whisperpine, { secrets: {} });
    expect(workshop.doors.find((door) => door.id === 'door-cavern-dumbwaiter').locked).toBe(true);
    expect(hollow.doors.find((door) => door.id === 'door-cavern-crack').locked).toBe(true);
    expect(cavernsAreUnlocked({ secrets: {} })).toBe(false);
  });

  it('opens both routes together without mutating the authored registry', () => {
    const save = { secrets: { cavernsUnlocked: true } };
    const workshop = resolveCavernEntrances(ROOM_REGISTRY.workshop, save);
    const hollow = resolveCavernEntrances(ROOM_REGISTRY.whisperpine, save);
    expect(workshop.doors.find((door) => door.id === 'door-cavern-dumbwaiter')).toMatchObject({
      locked: false, targetRoom: 'caverns', targetSpawn: 'fromWorkshop',
    });
    expect(workshop.clickables.find((prop) => prop.id === 'dumbwaiter-hatch').line).toContain('stands open');
    expect(hollow.doors.find((door) => door.id === 'door-cavern-crack')).toMatchObject({
      locked: false, targetRoom: 'caverns', targetSpawn: 'fromWhisperpine',
    });
    expect(ROOM_REGISTRY.workshop.doors.find((door) => door.id === 'door-cavern-dumbwaiter').locked).toBe(true);
    expect(ROOM_REGISTRY.whisperpine.doors.find((door) => door.id === 'door-cavern-crack').locked).toBe(true);
  });
});
