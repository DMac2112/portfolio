import { describe, expect, it } from 'vitest';
import { validateCurioRegistry } from '../engine/curios.js';
import { CURIO_REGISTRY } from './curios.js';

describe('Curio content registry', () => {
  it('ships the six W1 Court discoveries as valid unique contracts', () => {
    expect(validateCurioRegistry(CURIO_REGISTRY)).toEqual([]);
    expect(CURIO_REGISTRY).toHaveLength(6);
    expect(CURIO_REGISTRY.every((curio) => curio.roomId === 'court')).toBe(true);
    expect(new Set(CURIO_REGISTRY.map((curio) => curio.id)).size).toBe(6);
  });
});
