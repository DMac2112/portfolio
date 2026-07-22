import { describe, expect, it } from 'vitest';
import { ITEM_CATALOG } from './cosmetics.js';
import {
  BOTTLE_MESSAGES,
  bottleMessageForDate,
  resolveDocksRoom,
  salkaStockForDate,
} from './docks.js';

describe('Driftgate Docks date-resolved content', () => {
  it('rotates two distinct existing-catalog items without creating new art contracts', () => {
    const catalogIds = new Set(ITEM_CATALOG.map((item) => item.id));
    const rotations = ['2026-07-22', '2026-07-25', '2026-07-28', '2026-07-30']
      .map((date) => salkaStockForDate(date));
    for (const stock of rotations) {
      expect(stock).toHaveLength(2);
      expect(stock[0].id).not.toBe(stock[1].id);
      expect(stock.every((item) => catalogIds.has(item.id))).toBe(true);
      expect(stock.every((item) => !item.rewardOnly)).toBe(true);
    }
    expect(new Set(rotations.map((stock) => stock.map((item) => item.id).join('|'))).size).toBeGreaterThan(1);
  });

  it('never puts earned-only cosmetics in Salka’s cargo rotation', () => {
    const catalog = [
      { id: 'one' }, { id: 'two' }, { id: 'reward', rewardOnly: true },
    ];
    for (const date of ['2026-07-22', '2026-07-25', '2026-07-28']) {
      expect(salkaStockForDate(date, catalog).map((item) => item.id)).not.toContain('reward');
    }
  });

  it('keeps one bottle message stable for a Monday–Sunday issue week', () => {
    expect(bottleMessageForDate('2026-07-20')).toEqual(bottleMessageForDate('2026-07-26'));
    expect(BOTTLE_MESSAGES.some((message) => message.id === bottleMessageForDate('2026-07-20').id)).toBe(true);
  });

  it('switches backdrop, Salka, stall, and future telescope contract with port state', () => {
    const room = {
      stateAssets: { inPort: 'port', away: 'away' },
      hotspots: [{ id: 'stall', bargeState: 'in-port' }, { id: 'marker' }],
      anchors: [{ characterId: 'captain-salka', bargeState: 'in-port' }],
      clickables: [{ id: 'bottle-post' }, { id: 'cargo', bargeState: 'in-port' }],
    };
    const port = resolveDocksRoom(room, '2026-07-22');
    expect(port.mapAsset).toBe('port');
    expect(port.anchors).toHaveLength(1);
    expect(port.hotspots.map((entry) => entry.id)).toContain('stall');
    expect(port.docksState.futureVistaId).toBe(null);

    const away = resolveDocksRoom(room, '2026-07-23');
    expect(away.mapAsset).toBe('away');
    expect(away.anchors).toEqual([]);
    expect(away.hotspots.map((entry) => entry.id)).not.toContain('stall');
    expect(away.clickables.map((entry) => entry.id)).not.toContain('cargo');
    expect(away.docksState).toMatchObject({ atSea: true, futureVistaId: 'salka-at-sea' });
    expect(room.anchors).toHaveLength(1);
  });
});
