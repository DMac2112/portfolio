// world/npc-runtime.js — IMPURE KAPLAY-side glue for the NPC crowd (NPC Crowd §7).
// Owns RoomCrowdState, drives tickRoomCrowd() from k.onUpdate, syncs the pure NPC state onto real
// KAPLAY game objects (reusing the same layered avatar compositor as the player, per Avatar §1's
// "NPCs use the exact same makeAvatarActor(), fed a seeded config" note), and turns 'speak' events
// into floating in-canvas speech bubbles (game1's floating-label technique — a k.rect+k.text child,
// not a DOM overlay, so it tracks the moving NPC for free via parent/child transform).
// Obeys the §8.4 pause contract for free: tickRoomCrowd is simply never called while
// k.getTreeRoot().paused === true, since k.onUpdate itself doesn't fire.
import { spawnRoomCrowd, tickRoomCrowd } from '../engine/npc-fsm.js';
import { syncFrame } from '../engine/avatar-layers.js';
import { makeAvatarActor } from './build-avatar.js';
import { personaById } from '../content/npc-roster.js';
import { LINE_POOLS, emoteById } from '../content/dialogue-lines.js';

// Persona.paletteId (an art-direction hint, not an engine concept) -> an actual BODY_COLORS id,
// so NPCs render as visually varied penguins using the S2 body-tint system. A few personas share
// a colour; that's fine — real distinctiveness comes from position/behaviour/dialogue, not paint.
const PALETTE_TO_BODY_COLOR = {
  rust: 'sunrise-orange', sunbeam: 'harbor-gold', slate: 'slate', blush: 'blush-pink',
  moss: 'moss', iron: 'deep-teal', plum: 'lilac', cocoa: 'harbor-gold', petal: 'blush-pink',
};

function avatarCfgForPersona(persona) {
  return {
    bodyColorId: PALETTE_TO_BODY_COLOR[persona?.paletteId] ?? 'classic-charcoal',
    equipped: { hat: null, eyewear: null, neck: null, held: null },
  };
}

// engine/npc-fsm.js is intentionally content-agnostic — it emits synthetic 'line-N'/'emote-N' ids
// so it never has to import dialogue-lines.js/npc-roster.js (kept the Haiku build fully parallel-
// safe). This layer resolves those synthetic ids to real, PERSONA-FLAVORED content: a weighted pool
// built from persona.poolWeights (Crinkle mostly WEATHER, Marzi mostly COSMETIC_COMPLIMENT, etc.),
// indexed by the synthetic roll — so the crowd reads as characters despite the generic FSM.
function personaLinePool(persona) {
  const pool = [];
  for (const [poolId, weight] of Object.entries(persona?.poolWeights ?? {})) {
    if (weight <= 0) continue;
    const lines = LINE_POOLS[poolId] ?? [];
    for (let i = 0; i < weight; i++) pool.push(...lines);
  }
  return pool.length ? pool : LINE_POOLS.AMBIENT;
}
function realLineFor(persona, syntheticLineId) {
  const pool = personaLinePool(persona);
  const idx = parseInt(String(syntheticLineId).split('-')[1] ?? '0', 10) || 0;
  return pool[idx % pool.length];
}
// Exported (not yet called below) for the future Chat & Emotes phase, which will render this as a
// tween/particle overlay per Avatar §3 ("emote is a UI-layer overlay, not new body frames") — the
// S2 layered avatar sheet is 4x3 (down/side/up only) and has no emote frame row to animate today.
export function realEmoteFor(persona, syntheticEmoteId) {
  const ids = persona?.emoteIds?.length ? persona.emoteIds : ['wave-flipper'];
  const idx = parseInt(String(syntheticEmoteId).split('-')[1] ?? '0', 10) || 0;
  return emoteById(ids[idx % ids.length]);
}

const ROW_BASE = { down: 0, side: 4, up: 8 };
const dirGroup = (f) => (f === 'left' || f === 'right' ? 'side' : f);

function showSpeechBubble(k, actor, text) {
  if (!text) return;
  const w = Math.min(160, Math.max(50, text.length * 6 + 16));
  const bg = actor.root.add([
    k.rect(w, 24, { radius: 9 }), k.pos(0, -76), k.anchor('center'),
    k.color(k.Color.fromHex('#eaf7ff')), k.opacity(0.96), k.z(99999),
  ]);
  const tail = actor.root.add([
    k.text('▼', { size: 11 }), k.pos(0, -61), k.anchor('center'),
    k.color(k.Color.fromHex('#eaf7ff')), k.z(99999),
  ]);
  const label = actor.root.add([
    k.text(text, { size: 9, width: w - 10 }), k.pos(0, -76), k.anchor('center'),
    k.color(k.Color.fromHex('#122a42')), k.z(100000),
  ]);
  return { bg, label, tail };
}

/**
 * Boots a room's NPC crowd and wires its per-frame tick + rendering. Call once per room scene.
 * @param {*} k KAPLAY instance
 * @param {string} roomId
 * @param {import('../content/npc-spawn.js').RoomSpawnConfig} config
 * @param {number} scale room scale (matches build-room's SCALE)
 * @returns {{ getRoom: () => import('../engine/npc-fsm.js').RoomCrowdState }}
 */
export function initRoomCrowd(k, roomId, config, scale) {
  let room = spawnRoomCrowd(roomId, config, Date.now() >>> 0); // seed rolled once at boot only
  const actors = new Map();  // npcId -> avatar actor (from makeAvatarActor)
  const animT = new Map();   // npcId -> local anim clock, so walk cycles aren't lockstep
  const bubbles = new Map(); // npcId -> current speech bubble parts (destroyed on next speak/timeout)

  function ensureActor(npc) {
    let actor = actors.get(npc.id);
    if (!actor) {
      const persona = personaById(npc.personaId);
      actor = makeAvatarActor(k, avatarCfgForPersona(persona), npc.pos, scale);
      actors.set(npc.id, actor);
      animT.set(npc.id, 0);
    }
    return actor;
  }

  function clearBubble(npcId) {
    const b = bubbles.get(npcId);
    if (b) { b.bg.destroy(); b.label.destroy(); b.tail?.destroy(); bubbles.delete(npcId); }
  }

  k.onUpdate(() => {
    const dtMs = Math.min(0.05, k.dt()) * 1000; // same clamp discipline as the player loop
    const ev = [];
    room = tickRoomCrowd(room, dtMs, config, ev);

    for (const n of room.npcs) {
      const actor = ensureActor(n);
      actor.root.pos.x = n.pos.x;
      actor.root.pos.y = n.pos.y;
      actor.root.z = n.pos.y; // y-sort, same convention as the player

      const t = (animT.get(n.id) ?? 0) + dtMs / 1000;
      animT.set(n.id, t);
      const walkFrame = n.moved ? Math.floor(t * 8) % 4 : 0;
      syncFrame(actor.parts, ROW_BASE[dirGroup(n.facing)] + walkFrame, n.flipX);
    }

    for (const e of ev) {
      const npc = room.npcs.find((x) => x.id === e.npcId);
      if (!npc) continue;
      const persona = personaById(npc.personaId);
      const actor = ensureActor(npc);

      if (e.type === 'speak') {
        clearBubble(npc.id);
        const line = realLineFor(persona, e.lineId);
        const bubble = showSpeechBubble(k, actor, line?.text);
        if (bubble) {
          bubbles.set(npc.id, bubble);
          k.wait(Math.max(0.4, (line?.durMs ?? e.durMs) / 1000), () => clearBubble(npc.id));
        }
      }
      // 'emote' events have no dedicated visual yet — see realEmoteFor()'s doc comment above.
    }
  });

  return { getRoom: () => room };
}
