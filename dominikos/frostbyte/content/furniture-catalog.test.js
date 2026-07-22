import { describe, it, expect } from 'vitest';
import {
  FURNITURE_CLASSES,
  MAX_PLACED,
  FURNITURE_CATALOG,
  furnitureById,
  byClass,
  spritePathFor,
} from './furniture-catalog.js';

describe('FURNITURE_CATALOG', () => {
  it('has exactly 19 items', () => {
    expect(FURNITURE_CATALOG.length).toBe(19);
  });

  it('all ids are unique', () => {
    const ids = FURNITURE_CATALOG.map((item) => item.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('all ids are kebab-case', () => {
    for (const item of FURNITURE_CATALOG) {
      expect(item.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('all classes are in FURNITURE_CLASSES', () => {
    for (const item of FURNITURE_CATALOG) {
      expect(FURNITURE_CLASSES).toContain(item.cls);
    }
  });

  it('every class has at least 2 items', () => {
    for (const cls of FURNITURE_CLASSES) {
      const count = FURNITURE_CATALOG.filter((item) => item.cls === cls).length;
      expect(count).toBeGreaterThanOrEqual(2);
    }
  });

  it('all prices are within 50–800 inclusive', () => {
    for (const item of FURNITURE_CATALOG) {
      expect(item.price).toBeGreaterThanOrEqual(50);
      expect(item.price).toBeLessThanOrEqual(800);
    }
  });

  it('all widths are positive and <= 48', () => {
    for (const item of FURNITURE_CATALOG) {
      expect(item.w).toBeGreaterThan(0);
      expect(item.w).toBeLessThanOrEqual(48);
    }
  });

  it('all heights are positive and <= 48', () => {
    for (const item of FURNITURE_CATALOG) {
      expect(item.h).toBeGreaterThan(0);
      expect(item.h).toBeLessThanOrEqual(48);
    }
  });

  it('all labels are non-empty strings', () => {
    for (const item of FURNITURE_CATALOG) {
      expect(typeof item.label).toBe('string');
      expect(item.label.length).toBeGreaterThan(0);
    }
  });
});

describe('FURNITURE_CLASSES', () => {
  it('has 6 categories', () => {
    expect(FURNITURE_CLASSES.length).toBe(6);
  });

  it('all are strings', () => {
    for (const cls of FURNITURE_CLASSES) {
      expect(typeof cls).toBe('string');
      expect(cls.length).toBeGreaterThan(0);
    }
  });
});

describe('MAX_PLACED', () => {
  it('is 30', () => {
    expect(MAX_PLACED).toBe(30);
  });
});

describe('furnitureById', () => {
  it('returns the item for a valid id', () => {
    const item = furnitureById('snow-sofa');
    expect(item).toBeDefined();
    expect(item.id).toBe('snow-sofa');
    expect(item.label).toBe('Snow Sofa');
  });

  it('returns undefined for a non-existent id', () => {
    const item = furnitureById('nonexistent');
    expect(item).toBeUndefined();
  });

  it('finds all items in FURNITURE_CATALOG', () => {
    for (const catalogItem of FURNITURE_CATALOG) {
      const found = furnitureById(catalogItem.id);
      expect(found).toEqual(catalogItem);
    }
  });

  it('returns undefined for null', () => {
    const item = furnitureById(null);
    expect(item).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    const item = furnitureById(undefined);
    expect(item).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    const item = furnitureById('');
    expect(item).toBeUndefined();
  });
});

describe('byClass', () => {
  it('returns all items of a valid class', () => {
    const seatingItems = byClass('seating');
    expect(seatingItems.length).toBeGreaterThanOrEqual(2);
    for (const item of seatingItems) {
      expect(item.cls).toBe('seating');
    }
  });

  it('returns empty array for a non-existent class', () => {
    const items = byClass('nonexistent');
    expect(items).toEqual([]);
  });

  it('returns empty array for null', () => {
    const items = byClass(null);
    expect(items).toEqual([]);
  });

  it('returns empty array for undefined', () => {
    const items = byClass(undefined);
    expect(items).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    const items = byClass('');
    expect(items).toEqual([]);
  });

  it('each class returns the correct count', () => {
    for (const cls of FURNITURE_CLASSES) {
      const items = byClass(cls);
      const expected = FURNITURE_CATALOG.filter((item) => item.cls === cls).length;
      expect(items.length).toBe(expected);
    }
  });
});

describe('spritePathFor', () => {
  it('returns the correct path for a valid id', () => {
    const path = spritePathFor('snow-sofa');
    expect(path).toBe('./assets/furniture/snow-sofa.png');
  });

  it('returns path with the id in it', () => {
    const path = spritePathFor('ice-stool');
    expect(path).toContain('ice-stool');
    expect(path).toContain('./assets/furniture/');
    expect(path).toContain('.png');
  });

  it('works for all items in catalog', () => {
    for (const item of FURNITURE_CATALOG) {
      const path = spritePathFor(item.id);
      expect(path).toContain(item.id);
      expect(path).toMatch(/^\.\/assets\/furniture\/[a-z0-9-]+\.png$/);
    }
  });

  it('returns a path even for non-existent ids', () => {
    const path = spritePathFor('fake-item');
    expect(path).toBe('./assets/furniture/fake-item.png');
  });
});
