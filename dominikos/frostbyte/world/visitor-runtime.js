// world/visitor-runtime.js — IMPURE KAPLAY glue for Open House den visitors (Home Plan §7, H3).
// Deliberately standalone: the ambient plaza/cafe crowd (world/npc-runtime.js, engine/npc-fsm.js)
// is a different system with its own FSM and is left untouched. A visitor is a single disposable
// avatar actor driven by explicit events from the integrator (main.js — future work); this module
// owns no scheduling, no save access, and imports nothing from engine/ — the avatar-build call and
// the in-canvas speech-bubble pattern are replicated locally (by hand, kept in lockstep) rather than
// imported from npc-runtime.js, per this session's file-touch boundary.
import { makeAvatarActor } from './build-avatar.js';
import { personaById } from '../content/npc-roster.js';
import { LINE_POOLS } from '../content/dialogue-lines.js';

// Copied from world/npc-runtime.js's PALETTE_TO_BODY_COLOR (art-direction hint -> S2 body-tint id).
// Keep these two tables in sync by hand if the roster's paletteIds ever change.
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

// Same 4x3 sheet convention as build-avatar.js/npc-runtime.js: row0 down, row1 side (flipX for
// left), row2 up; head is stationary during a walk cycle, only feet bob across 4 frames.
const ROW_BASE = { down: 0, side: 4, up: 8 };
const dirGroup = (f) => (f === 'left' || f === 'right' ? 'side' : f);
function applyFrame(parts, frameIdx, flipX) {
  for (const p of parts) {
    if (!p) continue;
    p.frame = frameIdx;
    p.flipX = flipX;
  }
}

// Speed convention borrowed from engine/npc-fsm.js's MOVE_SPEED (0.12 px/ms == 120 px/s @ mul 1),
// re-expressed in px/s since this layer's tick(dt) takes seconds (KAPLAY's k.dt() convention).
const SPEED_PX_PER_S = 120;
const DT_CLAMP_S = 0.05; // same clamp discipline as npc-runtime/minigame-snowdrift (tab-switch guard)
const ARRIVE_EPS = 2;
const FURNITURE_OFFSET = 40;
const FALLBACK_TARGET = { x: 720, y: 500 };
const MIN_TARGET_Y = 380; // plan §7: targets stay below the hearth, which sits near the room's top
// Loose den-interior clamp (content/rooms.js `den.bounds` is {x0:400,x1:1040,y0:240,y1:800}) so a
// furniture-relative offset can never push a target into/through the ice-block wall.
const TARGET_X_MIN = 420, TARGET_X_MAX = 1020, TARGET_Y_MAX = 780;

const FALLBACK_LINE = { text: 'What a lovely den!', durMs: 2400 };

function resolveVisitorLine(lineId) {
  const idx = parseInt(String(lineId ?? '').split('-')[1] ?? '0', 10) || 0;
  return LINE_POOLS.VISITOR?.[idx] ?? FALLBACK_LINE;
}

function pickTarget(getPlaced) {
  const placed = (typeof getPlaced === 'function' ? getPlaced() : null) ?? [];
  if (!placed.length) return { ...FALLBACK_TARGET };
  const item = placed[Math.floor(Math.random() * placed.length)];
  const angle = Math.random() * Math.PI * 2;
  const x = Math.min(TARGET_X_MAX, Math.max(TARGET_X_MIN, item.x + Math.cos(angle) * FURNITURE_OFFSET));
  const y = Math.min(TARGET_Y_MAX, Math.max(MIN_TARGET_Y, item.y + Math.sin(angle) * FURNITURE_OFFSET));
  return { x, y };
}

// Local re-implementation of npc-runtime.js's showSpeechBubble: a k.rect+k.text pair parented to
// the actor's root so it tracks the moving avatar for free via KAPLAY's parent/child transform.
function showBubble(k, root, text) {
  if (!text) return null;
  const w = Math.min(160, Math.max(50, text.length * 6 + 16));
  const bg = root.add([
    k.rect(w, 24, { radius: 9 }), k.pos(0, -76), k.anchor('center'),
    k.color(k.Color.fromHex('#eaf7ff')), k.opacity(0.96), k.z(99999),
  ]);
  const tail = root.add([
    k.text('▼', { size: 11 }), k.pos(0, -61), k.anchor('center'),
    k.color(k.Color.fromHex('#eaf7ff')), k.z(99999),
  ]);
  const label = root.add([
    k.text(text, { size: 9, width: w - 10 }), k.pos(0, -76), k.anchor('center'),
    k.color(k.Color.fromHex('#122a42')), k.z(100000),
  ]);
  return { bg, label, tail };
}

/**
 * Boots the den's single-visitor layer. Everything is event-driven from the integrator — no
 * internal scheduling, no polling of save/economy state.
 * @param {*} k KAPLAY instance
 * @param {{ scale: number, doorPos: {x:number,y:number}, getPlaced: () => Array<{id:string,x:number,y:number,flip?:boolean}> }} opts
 * @returns {{ handle: (event: {type:string,[key:string]:any}) => void, tick: (dt:number) => void, clear: () => void }}
 */
export function initVisitorLayer(k, { scale, doorPos, getPlaced }) {
  let actor = null;
  let persona = null;
  let target = null;
  let facing = 'down';
  let flipX = false;
  let animT = 0;
  let bubble = null;

  function clearBubble() {
    if (!bubble) return;
    bubble.bg?.destroy?.();
    bubble.label?.destroy?.();
    bubble.tail?.destroy?.();
    bubble = null;
  }

  function destroyActor() {
    clearBubble();
    if (actor?.root) actor.root.destroy?.();
    actor = null;
    persona = null;
    target = null;
    facing = 'down';
    flipX = false;
    animT = 0;
  }

  function handle(event) {
    if (!event || typeof event.type !== 'string') return;
    switch (event.type) {
      case 'visit-start': {
        destroyActor(); // defensive: never stack two visitor actors even if events arrive out of order
        persona = personaById(event.personaId);
        const pos = { x: doorPos.x, y: doorPos.y };
        actor = makeAvatarActor(k, avatarCfgForPersona(persona), pos, scale);
        actor.root.z = pos.y;
        target = pickTarget(getPlaced);
        break;
      }
      case 'visit-line': {
        if (!actor) break;
        clearBubble();
        const line = resolveVisitorLine(event.lineId);
        bubble = showBubble(k, actor.root, line.text);
        if (bubble) {
          const mine = bubble;
          k.wait(Math.max(0.4, (line.durMs ?? FALLBACK_LINE.durMs) / 1000), () => {
            if (bubble === mine) clearBubble();
          });
        }
        break;
      }
      case 'visit-leaving': {
        if (!actor) break;
        target = { x: doorPos.x, y: doorPos.y };
        break;
      }
      case 'visit-end': {
        destroyActor();
        break;
      }
      default:
        break; // unknown event types are ignored, not thrown (defensive per this layer's contract)
    }
  }

  function tick(dt) {
    if (!actor) return;
    const dtC = Math.min(DT_CLAMP_S, Math.max(0, dt || 0));
    animT += dtC;
    let moved = false;

    if (target) {
      const dx = target.x - actor.root.pos.x;
      const dy = target.y - actor.root.pos.y;
      const dist = Math.hypot(dx, dy);
      if (dist > ARRIVE_EPS) {
        const speed = SPEED_PX_PER_S * (persona?.speedMul ?? 1);
        const step = Math.min(dist, speed * dtC);
        const ratio = dist > 0 ? step / dist : 0;
        const nx = actor.root.pos.x + dx * ratio;
        const ny = actor.root.pos.y + dy * ratio;
        const adx = nx - actor.root.pos.x, ady = ny - actor.root.pos.y;
        if (Math.abs(ady) >= Math.abs(adx)) { facing = ady < 0 ? 'up' : 'down'; flipX = false; }
        else { facing = 'side'; flipX = adx < 0; }
        actor.root.pos.x = nx;
        actor.root.pos.y = ny;
        moved = true;
      }
    }

    actor.root.z = actor.root.pos.y; // y-sort, same convention as the player + room crowd
    const walkFrame = moved ? Math.floor(animT * 8) % 4 : 0;
    applyFrame(actor.parts, ROW_BASE[dirGroup(facing)] + walkFrame, flipX);
  }

  function clear() { destroyActor(); }

  return { handle, tick, clear };
}
