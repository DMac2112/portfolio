import { describe, expect, it } from 'vitest';
import { validateCurioRegistry } from '../engine/curios.js';
import { CURIO_REGISTRY } from './curios.js';

describe('Curio content registry', () => {
  it('ships the W1-W5 room discoveries as valid unique contracts', () => {
    expect(validateCurioRegistry(CURIO_REGISTRY)).toEqual([]);
    expect(CURIO_REGISTRY.filter((curio) => curio.roomId === 'court')).toHaveLength(6);
    expect(CURIO_REGISTRY.filter((curio) => curio.roomId === 'workshop')).toHaveLength(5);
    expect(CURIO_REGISTRY.filter((curio) => curio.roomId === 'docks')).toHaveLength(7);
    expect(CURIO_REGISTRY.filter((curio) => curio.roomId === 'lighthouse-rest')).toHaveLength(4);
    expect(CURIO_REGISTRY.filter((curio) => curio.roomId === 'lighthouse-gallery')).toHaveLength(4);
    expect(CURIO_REGISTRY.filter((curio) => curio.roomId === 'whisperpine')).toHaveLength(6);
    expect(CURIO_REGISTRY.filter((curio) => curio.roomId === 'moonwell')).toHaveLength(1);
    expect(new Set(CURIO_REGISTRY.map((curio) => curio.id)).size).toBe(CURIO_REGISTRY.length);
  });
});
