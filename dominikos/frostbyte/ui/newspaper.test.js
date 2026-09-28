import { describe, it, expect } from 'vitest';
import { readerReports } from './newspaper.js';

describe('reader reports', () => {
  const definitions = Array.from({ length: 7 }, (_, index) =>
    ({ id: 'favor-' + index, report: 'Report ' + index }));

  it('shows an empty list before any favor is done', () => {
    expect(readerReports({ favors: {} }, definitions)).toEqual([]);
  });

  it('orders completed favors newest first and limits the strip to five', () => {
    const favors = Object.fromEntries(definitions.map((definition, index) =>
      [definition.id, { status: index === 3 ? 'in-progress' : 'done', reportOrder: index + 1 }]));
    expect(readerReports({ favors }, definitions)).toEqual([
      'Report 6', 'Report 5', 'Report 4', 'Report 2', 'Report 1',
    ]);
  });
});
