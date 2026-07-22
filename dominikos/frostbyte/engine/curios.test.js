import { describe, expect, it } from 'vitest';
import {
  ISLE_REWARD_FURNITURE_ID,
  ISLE_REWARD_ITEM_ID,
  ROOM_COMPLETION_COINS,
  claimIsleCompletionReward,
  createCurioState,
  discoverCurio,
  isCurioFound,
  roomProgress,
  totalProgress,
  validateCurioRegistry,
} from './curios.js';

const REGISTRY = [
  { id: 'court-window', roomId: 'court', label: 'Waving window' },
  { id: 'court-bell', roomId: 'court', label: 'Ice bell' },
  { id: 'trail-sign', roomId: 'trail', label: 'Old sign' },
];

const save = () => ({ coins: 10, curios: createCurioState() });

describe('Curio Log progress', () => {
  it('reports per-room and isle totals without treating an empty registry as complete', () => {
    const s = save();
    expect(roomProgress(REGISTRY, s, 'court')).toEqual({ roomId: 'court', found: 0, total: 2, complete: false });
    expect(totalProgress([], s)).toEqual({ found: 0, total: 0, complete: false });
  });

  it('records only known curios and reads either a save or bare curio state', () => {
    const s = save();
    expect(discoverCurio(s, REGISTRY, 'missing')).toBe(false);
    expect(discoverCurio(s, REGISTRY, 'court-window')).toBe(true);
    expect(isCurioFound(s, 'court-window')).toBe(true);
    expect(isCurioFound(s.curios, 'court-window')).toBe(true);
    expect(roomProgress(REGISTRY, s, 'court').found).toBe(1);
  });

  it('is idempotent and grants the room-completion bonus exactly once', () => {
    const s = save();
    const ev = [];
    discoverCurio(s, REGISTRY, 'court-window', ev);
    expect(s.coins).toBe(10);
    discoverCurio(s, REGISTRY, 'court-bell', ev);
    expect(s.coins).toBe(10 + ROOM_COMPLETION_COINS);
    expect(s.curios.roomRewards.court).toBe(true);
    expect(discoverCurio(s, REGISTRY, 'court-bell', ev)).toBe(false);
    expect(s.coins).toBe(10 + ROOM_COMPLETION_COINS);
    expect(totalProgress(REGISTRY, s)).toEqual({ found: 2, total: 3, complete: false });
  });

  it('forward-defends a save whose curio state is partial', () => {
    const s = { coins: 0, curios: { found: { 'court-window': true } } };
    expect(() => discoverCurio(s, REGISTRY, 'court-bell')).not.toThrow();
    expect(s.curios.roomRewards.court).toBe(true);
  });

  it('claims the cosmetic, trophy, and aurora payoff only after full completion and only once', () => {
    const s = save();
    expect(claimIsleCompletionReward(s, REGISTRY)).toBe(false);
    for (const curio of REGISTRY) discoverCurio(s, REGISTRY, curio.id);
    const events = [];
    expect(claimIsleCompletionReward(s, REGISTRY, events)).toBe(true);
    expect(s.curios.isleRewardClaimed).toBe(true);
    expect(s.ownedItems).toContain(ISLE_REWARD_ITEM_ID);
    expect(s.furniture[ISLE_REWARD_FURNITURE_ID]).toBe(1);
    expect(s.secrets.auroraIntensified).toBe(true);
    expect(events.map((event) => event.type)).toEqual([
      'item-unlocked', 'furniture-added', 'aurora-intensified', 'isle-reward-claimed',
    ]);
    expect(claimIsleCompletionReward(s, REGISTRY, events)).toBe(false);
    expect(s.ownedItems.filter((id) => id === ISLE_REWARD_ITEM_ID)).toHaveLength(1);
    expect(s.furniture[ISLE_REWARD_FURNITURE_ID]).toBe(1);
  });
});

describe('validateCurioRegistry', () => {
  it('accepts the fixture and catches duplicates/missing fields', () => {
    expect(validateCurioRegistry(REGISTRY)).toEqual([]);
    expect(validateCurioRegistry([{ id: 'x', roomId: 'court', label: 'A' }, { id: 'x' }]))
      .toEqual(['duplicate curio id x', 'x is missing roomId', 'x is missing label']);
  });
});
