import { beforeEach, describe, expect, it } from 'vitest';
import { getPins, pin, unpin } from './quickLaunchStore';

beforeEach(() => {
  if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
  for (const id of getPins()) unpin(id);
  pin('explorer');
});

describe('Quick Launch session', () => {
  it('starts with Explorer and toggles shortcuts', () => {
    expect(getPins()).toEqual(['explorer']);
    expect(pin('paint')).toBe(true);
    expect(pin('paint')).toBe(false);
    unpin('paint');
    expect(getPins()).toEqual(['explorer']);
  });

  it('never pins the Recycle Bin or Dev District', () => {
    expect(pin('recycle-bin')).toBe(false);
    expect(pin('game1')).toBe(false);
    expect(getPins()).toEqual(['explorer']);
  });

  it('holds at eight shortcuts', () => {
    for (let i = 1; i < 8; i++) expect(pin(`shortcut-${i}`)).toBe(true);
    expect(pin('extra')).toBe(false);
    expect(getPins()).toHaveLength(8);
  });
});
