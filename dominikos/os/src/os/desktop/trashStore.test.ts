import { beforeEach, describe, expect, it } from 'vitest';
import { getTrash, trash, restore, restoreAll } from './trashStore';

beforeEach(() => {
  if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
  restoreAll();
});

describe('Recycle Bin session', () => {
  it('accepts only the four removable shortcuts without duplicates', () => {
    expect(trash('paint')).toBe(true);
    expect(trash('paint')).toBe(false);
    expect(trash('game1')).toBe(false);
    expect(trash('recycle-bin')).toBe(false);
    expect(getTrash()).toEqual(['paint']);
  });

  it('restores one shortcut or all shortcuts', () => {
    trash('paint');
    trash('resume');
    restore('paint');
    expect(getTrash()).toEqual(['resume']);
    restoreAll();
    expect(getTrash()).toEqual([]);
  });
});
