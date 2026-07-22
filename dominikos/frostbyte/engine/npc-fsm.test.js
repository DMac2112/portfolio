import { describe, it, expect } from 'vitest';
import { spawnRoomCrowd, tickRoomCrowd, tickNpc } from './npc-fsm.js';
import { ROOM_SPAWN } from '../content/npc-spawn.js';

const CFG = ROOM_SPAWN.plaza;
const SEEDS = [1, 2, 3, 7, 42];

describe('spawnRoomCrowd', () => {
  it('is deterministic: same seed -> byte-identical crowd', () => {
    for (const seed of SEEDS) {
      expect(spawnRoomCrowd('plaza', CFG, seed)).toEqual(spawnRoomCrowd('plaza', CFG, seed));
    }
  });

  it('different seeds produce different rosters/positions', () => {
    const a = spawnRoomCrowd('plaza', CFG, 1);
    const b = spawnRoomCrowd('plaza', CFG, 2);
    expect(a).not.toEqual(b);
  });

  it('population size stays within configured capacity', () => {
    for (const seed of SEEDS) {
      const room = spawnRoomCrowd('plaza', CFG, seed);
      expect(room.npcs.length).toBeGreaterThanOrEqual(CFG.capacity.min);
      expect(room.npcs.length).toBeLessThanOrEqual(CFG.capacity.max);
    }
  });
});

describe('tickNpc: no-op guard', () => {
  it('dt<=0 returns the same reference (matches project convention)', () => {
    const room = spawnRoomCrowd('plaza', CFG, 1);
    const npc = room.npcs[0];
    expect(tickNpc(npc, 0, CFG, [])).toBe(npc);
    expect(tickNpc(npc, -16, CFG, [])).toBe(npc);
  });
});

describe('tickRoomCrowd: bounds & determinism', () => {
  it('never lets an NPC leave the authored room bounds', () => {
    for (const seed of SEEDS) {
      let room = spawnRoomCrowd('plaza', CFG, seed);
      const ev = [];
      for (let i = 0; i < 600; i++) room = tickRoomCrowd(room, 100, CFG, ev); // 60s, bounded
      for (const n of room.npcs) {
        expect(n.pos.x).toBeGreaterThanOrEqual(CFG.bounds.x0);
        expect(n.pos.x).toBeLessThanOrEqual(CFG.bounds.x1);
        expect(n.pos.y).toBeGreaterThanOrEqual(CFG.bounds.y0);
        expect(n.pos.y).toBeLessThanOrEqual(CFG.bounds.y1);
      }
    }
  });

  it('the same dt sequence yields identical states every run (determinism)', () => {
    const dts = [100, 250, 900, 33, 1600, 400, 5000, 16, 3000];
    const runOnce = () => {
      let room = spawnRoomCrowd('plaza', CFG, 7);
      const ev = [];
      for (const dt of dts) room = tickRoomCrowd(room, dt, CFG, ev);
      return { room, ev };
    };
    const a = runOnce(), b = runOnce();
    expect(a.room).toEqual(b.room);
    expect(a.ev).toEqual(b.ev);
  });

  it('never exceeds maxConcurrentChat, across a bounded random sweep', () => {
    for (const seed of SEEDS) {
      let room = spawnRoomCrowd('plaza', CFG, seed);
      const ev = [];
      for (let i = 0; i < 800; i++) {
        room = tickRoomCrowd(room, 120, CFG, ev);
        const chatting = room.npcs.filter((n) => n.phase === 'chatting').length;
        expect(chatting).toBeLessThanOrEqual(CFG.maxConcurrentChat);
      }
    }
  });

  it('an NPC never repeats its own last line back-to-back', () => {
    let room = spawnRoomCrowd('plaza', CFG, 3);
    const ev = [];
    const spokenByNpc = {};
    for (let i = 0; i < 1500; i++) {
      room = tickRoomCrowd(room, 100, CFG, ev);
    }
    for (const e of ev) {
      if (e.type !== 'speak') continue;
      const last = spokenByNpc[e.npcId];
      if (last) expect(e.lineId).not.toBe(last);
      spokenByNpc[e.npcId] = e.lineId;
    }
  });

  it('a single large tick resolves multiple completed phases without getting stuck', () => {
    let room = spawnRoomCrowd('plaza', CFG, 1);
    const ev = [];
    room = tickRoomCrowd(room, 20_000, CFG, ev); // one huge jump, e.g. a slow first frame
    for (const n of room.npcs) {
      expect(['idle', 'roaming', 'gathering', 'emoting', 'chatting']).toContain(n.phase);
      expect(Number.isFinite(n.pos.x) && Number.isFinite(n.pos.y)).toBe(true);
    }
  });

  it('emits at least one emote event across a 40s sweep', () => {
    let room = spawnRoomCrowd('plaza', CFG, 1);
    const ev = [];
    let emoteEvents = 0;
    for (let i = 0; i < 400; i++) {
      room = tickRoomCrowd(room, 100, CFG, ev);
      emoteEvents += ev.filter((e) => e.type === 'emote').length;
      ev.length = 0;
    }
    expect(emoteEvents).toBeGreaterThan(0);
  });
});
