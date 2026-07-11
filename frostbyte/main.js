// main.js — Frostbyte KAPLAY boot, scene wiring, input capture, os-bridge glue (IMPURE).
// Pure logic lives in engine/*.js and is imported, never re-derived here (Engine & World
// Architecture §1). Boot config + setAnim/camera conventions are forked from game1/main.js.
import kaplay from './vendor/kaplay.mjs';
import { ROOM_REGISTRY } from './content/rooms.js';
import { buildRoom } from './world/build-room.js';
import { resolveMoveVector, clampToBounds, resolveObstacles, resolveFacing } from './engine/movement.js';
import { computeCamPos, computeCamScale } from './engine/camera.js';

// ?embedded=1 -> running inside a DominikOS window: the OS chrome provides close/back.
const embedded = new URLSearchParams(location.search).get('embedded') === '1';
if (embedded) {
  const backLink = document.getElementById('back-link');
  if (backLink) backLink.hidden = true;
}

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
k.loadSprite('penguin', './assets/penguin.png', {
  sliceX: 4, sliceY: 5,
  anims: {
    'idle-down': 0, 'waddle-down': { from: 0, to: 3, loop: true, speed: 8 },
    'idle-side': 4, 'waddle-side': { from: 4, to: 7, loop: true, speed: 8 },
    'idle-up': 8,   'waddle-up':   { from: 8, to: 11, loop: true, speed: 8 },
    'emote': { from: 12, to: 15, loop: false, speed: 8 },
    'throw': { from: 16, to: 19, loop: false, speed: 10 },
  },
});

/* ------------------------------------------------------------------ *
 * Room scene — parameterized by room id (Engine & World Architecture §3);
 * a second room is a ROOM_REGISTRY data addition, not a new scene function.
 * ------------------------------------------------------------------ */
k.scene('room', (roomId) => {
  const room = ROOM_REGISTRY[roomId];
  buildRoom(k, room);

  const spawn = room.spawnPoints.default;
  const player = k.add([
    k.sprite('penguin', { anim: 'idle-down' }),
    k.pos(spawn.x, spawn.y),
    k.anchor('bot'),
    k.scale(room.scale),
    k.z(spawn.y),
  ]);

  let curAnim = 'idle-down';
  let facing = spawn.facing === 'left' ? 'left' : 'down';
  let moveTarget = null;

  function setAnim(name, flip) {
    player.flipX = !!flip;
    if (curAnim !== name) { curAnim = name; player.play(name); }
  }
  const dirGroup = (f) => (f === 'left' || f === 'right' ? 'side' : f);

  k.onMousePress(() => { moveTarget = k.toWorld(k.mousePos()); });
  k.onTouchStart((pos) => { moveTarget = k.toWorld(pos); }); // touchToMouse also covers this

  k.onUpdate(() => {
    const dt = Math.min(k.dt(), 0.05); // defensive clamp against tab-switch spikes
    const keys = {
      left: k.isKeyDown('left') || k.isKeyDown('a'),
      right: k.isKeyDown('right') || k.isKeyDown('d'),
      up: k.isKeyDown('up') || k.isKeyDown('w'),
      down: k.isKeyDown('down') || k.isKeyDown('s'),
    };
    const { dxPx, dyPx, moving, arrived, keysCancelTarget } =
      resolveMoveVector({ keys, moveTarget, pos: player.pos, dt });

    if (keysCancelTarget) moveTarget = null;
    if (arrived) moveTarget = null;

    let next = { x: player.pos.x + dxPx, y: player.pos.y + dyPx };
    next = resolveObstacles(next, PLAYER_RADIUS, room.solids ?? []);
    next = clampToBounds(next, room.bounds);
    player.pos.x = next.x;
    player.pos.y = next.y;

    facing = resolveFacing(dxPx, dyPx, facing);
    setAnim(moving ? `waddle-${dirGroup(facing)}` : `idle-${dirGroup(facing)}`, facing === 'left');

    player.z = player.pos.y; // y-sort, same as game1

    const cam = computeCamPos(player.pos);
    k.setCamPos(cam.x, cam.y);
  });

  function fitCam() { k.setCamScale(k.vec2(computeCamScale(k.width() / k.height()))); }
  fitCam();
  k.onResize(fitCam);
});

k.go('room', 'plaza');
