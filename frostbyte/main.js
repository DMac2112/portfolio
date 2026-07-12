// main.js — Frostbyte KAPLAY boot, scene wiring, input capture, os-bridge glue (IMPURE).
// Pure logic lives in engine/*.js and is imported, never re-derived here (Engine & World
// Architecture §1). Boot config + camera conventions are forked from game1/main.js.
import kaplay from './vendor/kaplay.mjs';
import { ROOM_REGISTRY } from './content/rooms.js';
import { buildRoom } from './world/build-room.js';
import { loadAvatarSprites, makeAvatarActor } from './world/build-avatar.js';
import { resolveMoveVector, clampToBounds, resolveObstacles, resolveFacing } from './engine/movement.js';
import { computeCamPos, computeCamScale } from './engine/camera.js';
import { syncFrame } from './engine/avatar-layers.js';
import { load, persist } from './engine/save.js';
import { checkDailyLogin } from './engine/economy.js';
import { createDressUp } from './ui/dress-up.js';
import { initRoomCrowd } from './world/npc-runtime.js';
import { ROOM_SPAWN } from './content/npc-spawn.js';

// ?embedded=1 -> running inside a DominikOS window: the OS chrome provides close/back.
const embedded = new URLSearchParams(location.search).get('embedded') === '1';
if (embedded) {
  const backLink = document.getElementById('back-link');
  if (backLink) backLink.hidden = true;
}

/* ------------------------------------------------------------------ *
 * Save (loaded once; grant the daily-login bonus on boot)
 * ------------------------------------------------------------------ */
const save = load();
const todayISO = new Date().toISOString().slice(0, 10);
checkDailyLogin(save, todayISO, []);
persist(save);

/* ------------------------------------------------------------------ *
 * Engine
 * ------------------------------------------------------------------ */
const k = kaplay({
  global: false,
  touchToMouse: true,
  canvas: document.getElementById('game'),
  pixelDensity: Math.min(window.devicePixelRatio || 1, 2),
  crisp: true,
  background: [18, 30, 42],
  debug: false,
});

// DominikOS pause contract — KAPLAY's real pause, never a requestAnimationFrame monkey-patch.
window.__osBridge?.onReady({
  pause:  () => { k.getTreeRoot ? (k.getTreeRoot().paused = true)  : (k.debug.paused = true);  k.audioCtx?.suspend?.(); },
  resume: () => { k.getTreeRoot ? (k.getTreeRoot().paused = false) : (k.debug.paused = false); k.audioCtx?.resume?.(); },
  setMute: (b) => { k.setVolume?.(b ? 0 : 1); },
});

const PLAYER_RADIUS = 12;

/* ------------------------------------------------------------------ *
 * Asset loading
 * ------------------------------------------------------------------ */
k.loadSprite('room-plaza', './assets/room-plaza.png');
loadAvatarSprites(k);

/* ------------------------------------------------------------------ *
 * Coin HUD
 * ------------------------------------------------------------------ */
const coinEl = document.getElementById('coin-counter');
function refreshCoins() {
  coinEl.hidden = false;
  coinEl.textContent = `${save.coins} coins`;
}

/* ------------------------------------------------------------------ *
 * Room scene — parameterized by room id (Engine & World Architecture §3).
 * ------------------------------------------------------------------ */
k.scene('room', (roomId) => {
  const room = ROOM_REGISTRY[roomId];
  buildRoom(k, room);

  const spawn = room.spawnPoints.default;
  const avatar = makeAvatarActor(k, save.avatar, spawn, room.scale);
  const player = avatar.root;

  let facing = spawn.facing === 'left' ? 'left' : 'down';
  let moveTarget = null;
  let animT = 0;

  const dirGroup = (f) => (f === 'left' || f === 'right' ? 'side' : f);
  const ROW_BASE = { down: 0, side: 4, up: 8 };

  // Dress-up overlay: re-composite the avatar + refresh the coin HUD after any change.
  const dressUp = createDressUp({
    save,
    persist,
    onChange: (s) => { avatar.apply(s.avatar); refreshCoins(); },
  });
  const dressBtn = document.getElementById('dressup-btn');
  if (dressBtn) dressBtn.onclick = () => (dressUp.isOpen() ? dressUp.close() : dressUp.open());
  refreshCoins();

  // NPC crowd — the "it only pretends" fake-multiplayer layer. Ticks and pauses for free, since
  // it's driven from this same k.onUpdate, which KAPLAY simply never calls while paused.
  const spawnConfig = ROOM_SPAWN[roomId];
  if (spawnConfig) initRoomCrowd(k, roomId, spawnConfig, room.scale);

  // Movement input is ignored while the dress-up overlay is open (frozen-flag pattern).
  k.onMousePress(() => { if (!dressUp.isOpen()) moveTarget = k.toWorld(k.mousePos()); });
  k.onTouchStart((pos) => { if (!dressUp.isOpen()) moveTarget = k.toWorld(pos); });

  k.onUpdate(() => {
    const dt = Math.min(k.dt(), 0.05); // defensive clamp against tab-switch spikes
    const frozen = dressUp.isOpen();
    const keys = frozen ? {} : {
      left: k.isKeyDown('left') || k.isKeyDown('a'),
      right: k.isKeyDown('right') || k.isKeyDown('d'),
      up: k.isKeyDown('up') || k.isKeyDown('w'),
      down: k.isKeyDown('down') || k.isKeyDown('s'),
    };
    const { dxPx, dyPx, moving, arrived, keysCancelTarget } =
      resolveMoveVector({ keys, moveTarget: frozen ? null : moveTarget, pos: player.pos, dt });

    if (keysCancelTarget) moveTarget = null;
    if (arrived) moveTarget = null;

    let next = { x: player.pos.x + dxPx, y: player.pos.y + dyPx };
    next = resolveObstacles(next, PLAYER_RADIUS, room.solids ?? []);
    next = clampToBounds(next, room.bounds);
    player.pos.x = next.x;
    player.pos.y = next.y;

    facing = resolveFacing(dxPx, dyPx, facing);
    animT += dt;
    const walkFrame = moving ? Math.floor(animT * 8) % 4 : 0;
    syncFrame(avatar.parts, ROW_BASE[dirGroup(facing)] + walkFrame, facing === 'left');

    player.z = player.pos.y; // y-sort, same as game1

    const cam = computeCamPos(player.pos);
    k.setCamPos(cam.x, cam.y);
  });

  function fitCam() { k.setCamScale(k.vec2(computeCamScale(k.width() / k.height()))); }
  fitCam();
  k.onResize(fitCam);
});

k.go('room', 'plaza');
