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
import { checkDailyLogin, earnCoins } from './engine/economy.js';
import { createDressUp } from './ui/dress-up.js';
import { initRoomCrowd } from './world/npc-runtime.js';
import { ROOM_SPAWN } from './content/npc-spawn.js';
import { registerMinigameSnowdrift } from './world/minigame-snowdrift.js';
import { findNearestInteractable, mergeInteractables } from './engine/interaction.js';
import { minigameForHotspot } from './content/minigames-registry.js';
import { recordCoins, remainingToday } from './engine/minigame-daily.js';
import { newChat, addBubble, tick as tickChat, active as activeChat } from './engine/chat.js';
import { createChat } from './ui/chat.js';
import { createEmotes, emoteSymbol } from './ui/emotes.js';
import { createMap } from './ui/map.js';
import { nodeByRoom } from './content/map.js';
import { canTravel, arriveSpawnId } from './engine/travel.js';

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
k.loadSprite('room-den', './assets/room-den.png');
loadAvatarSprites(k);
k.loadSprite('snowpal', './assets/minigame/snowpal.png');
k.loadSprite('snowball', './assets/minigame/snowball.png');
k.loadSprite('toss-bg', './assets/minigame/toss-bg.png');

// Register the Snowdrift Toss scene (a sibling scene entered/exited via the room ↔ minigame contract).
registerMinigameSnowdrift(k);

/* ------------------------------------------------------------------ *
 * Coin HUD
 * ------------------------------------------------------------------ */
const coinEl = document.getElementById('coin-counter');
function refreshCoins() {
  coinEl.hidden = false;
  coinEl.textContent = `${save.coins} coins`;
}

const coinToastEl = document.getElementById('coin-toast');
let coinToastTimer = null;
function showCoinToast(msg) {
  coinToastEl.textContent = msg;
  coinToastEl.classList.add('show');
  clearTimeout(coinToastTimer);
  coinToastTimer = setTimeout(() => coinToastEl.classList.remove('show'), 2600);
}

/* ------------------------------------------------------------------ *
 * Dialogue overlay — the index.html #dialogue-overlay, wired minimally
 * (H1: locked-door copy; NPC dialogue can reuse it in later phases).
 * ------------------------------------------------------------------ */
const dlgOverlay = document.getElementById('dialogue-overlay');
const dlgTitle = document.getElementById('dialogue-title');
const dlgBody = document.getElementById('dialogue-body');
const dlgClose = document.getElementById('dialogue-close');
let dlgLastFocus = null;
function dialogueIsOpen() { return dlgOverlay ? !dlgOverlay.classList.contains('hidden') : false; }
function showDialogue(title, body) {
  if (!dlgOverlay) return;
  dlgLastFocus = document.activeElement;
  dlgTitle.textContent = title ?? '';
  dlgBody.textContent = body ?? '';
  dlgOverlay.classList.remove('hidden');
  dlgClose?.focus();
}
function closeDialogue() {
  dlgOverlay?.classList.add('hidden');
  dlgLastFocus?.focus?.();
  dlgLastFocus = null;
}
if (dlgClose) dlgClose.onclick = closeDialogue;
dlgOverlay?.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDialogue(); });

/* ------------------------------------------------------------------ *
 * HUD visibility — the social/map buttons are persistent DOM, so they'd
 * float over (and act on, via stale scene closures) the minigame scene.
 * Hidden on minigame entry, restored on every room entry (H1 review fix).
 * ------------------------------------------------------------------ */
const HUD_BTN_IDS = ['map-btn', 'say-btn', 'dressup-btn', 'emote-bar'];
let inMinigame = false;
function setHudVisible(v) {
  for (const id of HUD_BTN_IDS) { const el = document.getElementById(id); if (el) el.hidden = !v; }
}

/* ------------------------------------------------------------------ *
 * Room scene — parameterized by room id (Engine & World Architecture §3).
 * ------------------------------------------------------------------ */
k.scene('room', (roomId, opts = {}) => {
  const room = ROOM_REGISTRY[roomId];
  buildRoom(k, room);

  // Remember where the player is — the map's "You are here" pin reads this (H1).
  save.prefs.lastRoom = roomId;
  persist(save);

  // Back in a room: restore the HUD the minigame hid, and let travel guards relax.
  setHudVisible(true);
  inMinigame = false;

  // In-world markers so the actionable hotspots (shop, minigame) are findable — a small floating
  // pill label, game1's technique. Non-actionable hotspots stay unmarked until they get real props.
  for (const h of room.hotspots ?? []) {
    if (h.kind !== 'minigame' && h.kind !== 'shop') continue;
    const lw = Math.max(64, (h.label?.length ?? 4) * 9 + 18);
    k.add([k.rect(lw, 22, { radius: 6 }), k.pos(h.x, h.y - 46), k.anchor('center'),
      k.color(k.Color.fromHex('#0d1c2b')), k.opacity(0.82), k.z(100000)]);
    k.add([k.text(h.label ?? '', { size: 12 }), k.pos(h.x, h.y - 46), k.anchor('center'),
      k.color(k.Color.fromHex('#f4f8fc')), k.z(100001)]);
  }

  const spawn = room.spawnPoints[opts.spawn] ?? room.spawnPoints.default;
  const avatar = makeAvatarActor(k, save.avatar, spawn, room.scale);
  const player = avatar.root;

  // Returning from the minigame: credit the earned coins (re-clamped to today's remaining cap).
  if (opts.coinsEarned > 0) {
    const credited = Math.min(opts.coinsEarned, remainingToday(save, todayISO));
    if (credited > 0) {
      earnCoins(save, credited, 'minigame', []);
      recordCoins(save, todayISO, credited);
      persist(save);
      showCoinToast(`+${credited} coins!`);
    } else {
      showCoinToast('Daily coin cap reached');
    }
  }

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
  const crowd = spawnConfig ? initRoomCrowd(k, roomId, spawnConfig, room.scale) : null;

  // Interaction: nearest hotspot/door/NPC scan → interact prompt → launch. 'minigame', 'shop'
  // and 'door' are actionable (locked doors show their copy); NPCs/landmarks stay promptless and
  // are skipped by the isActionable filter so they can't shadow a real action (H1 audit fix).
  const hotspotInteractables = (room.hotspots ?? []).map((h) => ({ id: h.id, pos: { x: h.x, y: h.y }, kind: h.kind, label: h.label }));
  const doorInteractables = (room.doors ?? []).map((d) => ({ id: d.id, pos: { x: d.x, y: d.y }, kind: 'door', label: d.label, door: d }));
  const interactPrompt = document.getElementById('interact-prompt');
  let nearest = null;

  const actionFor = (hit) => {
    if (!hit) return null;
    if (hit.kind === 'minigame' && minigameForHotspot(hit.id)) return 'minigame';
    if (hit.kind === 'shop') return 'shop';
    if (hit.kind === 'door') return 'door';
    return null;
  };
  function doInteract() {
    if (anyOverlayOpen()) return; // 'e' typed into the chat box (or any open modal) must not interact
    const action = actionFor(nearest);
    if (action === 'minigame') {
      if (interactPrompt) interactPrompt.classList.remove('show'); // hide before leaving the scene
      setHudVisible(false); // persistent DOM buttons must not float over (or act on) the minigame
      inMinigame = true;
      k.go(minigameForHotspot(nearest.id).sceneId, { from: roomId });
    } else if (action === 'shop') {
      dressUp.open();
    } else if (action === 'door') {
      const d = nearest.door;
      if (d.locked) { showDialogue(d.label, d.lockedCopy ?? 'Snowed in for now.'); return; }
      if (interactPrompt) interactPrompt.classList.remove('show');
      k.go('room', d.targetRoom, { spawn: d.targetSpawn ?? arriveSpawnId(roomId) });
    }
  }
  k.onKeyPress('e', doInteract);
  if (interactPrompt) interactPrompt.onclick = doInteract;

  /* ------------------------------------------------------------------ *
   * Chat & emotes — strictly LOCAL. Player text renders only as their own
   * in-canvas bubble and an sr-only aria-live mirror; it is never sent
   * anywhere (no fetch/postMessage/etc.). Bubbles age on KAPLAY dt, so they
   * freeze with the world under the pause contract.
   * ------------------------------------------------------------------ */
  const playerChat = newChat();
  const chatLive = document.getElementById('chat-live');
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  function announce(msg) { if (chatLive) chatLive.textContent = msg; }

  const chatUI = createChat({
    onSay: (text) => {
      if (!text) return;
      addBubble(playerChat, { speaker: 'you', text });
      announce(`You: ${text}`);
    },
  });
  const sayBtn = document.getElementById('say-btn');
  if (sayBtn) sayBtn.onclick = () => (chatUI.isOpen() ? chatUI.close() : chatUI.open());

  // Floating emote symbol above the player + a11y announce (no body-frame animation — Avatar §3).
  function playEmote(id) {
    const sym = k.add([
      k.text(emoteSymbol(id), { size: 14 }), k.pos(player.pos.x, player.pos.y - 84),
      k.anchor('center'), k.z(100002), k.opacity(1),
    ]);
    let life = 0;
    sym.onUpdate(() => {
      life += k.dt();
      if (!reduceMotion) sym.pos = k.vec2(player.pos.x, player.pos.y - 84 - life * 30);
      else sym.pos = k.vec2(player.pos.x, player.pos.y - 84);
      sym.opacity = Math.max(0, 1 - life);
      if (life >= 1) k.destroy(sym);
    });
    announce(`You ${id}`);
  }
  const emotes = createEmotes({ onEmote: playEmote });
  // digits typed into the chat box (or with any modal open) must not fire emotes
  emotes.ids.forEach((id, i) => {
    if (i < 9) k.onKeyPress(String(i + 1), () => { if (!anyOverlayOpen()) playEmote(id); });
  });

  // Island-map travel (H1) — the ui singleton renders pins from content/map.js; the pure
  // engine/travel.js guard decides legality so the rules stay testable headless.
  const mapUI = createMap({
    getCurrent: () => roomId,
    onTravel: (target) => {
      // frozen:false is correct (the map closed itself before calling back); inMinigame is the
      // real module-level flag so a stale scene closure can never travel out of a running game.
      const res = canTravel({ frozen: false, inMinigame, currentRoomId: roomId }, nodeByRoom(target));
      if (!res.ok) return;
      if (interactPrompt) interactPrompt.classList.remove('show');
      k.go('room', target, { spawn: 'fromMap' });
    },
  });
  const anyOverlayOpen = () =>
    dressUp.isOpen() || chatUI.isOpen() || mapUI.isOpen() || dialogueIsOpen();
  const mapBtn = document.getElementById('map-btn');
  if (mapBtn) mapBtn.onclick = () => { if (mapUI.isOpen()) mapUI.close(); else if (!anyOverlayOpen()) mapUI.open(); };
  k.onKeyPress('m', () => { if (!anyOverlayOpen()) mapUI.open(); });

  // Player speech bubble — recreated only when the visible bubble changes, opacity tracks its fade.
  let curBubbleId = null;
  let bubbleObjs = null;
  function clearPlayerBubble() {
    if (bubbleObjs) { k.destroy(bubbleObjs.bg); k.destroy(bubbleObjs.txt); bubbleObjs = null; }
    curBubbleId = null;
  }
  function renderPlayerBubble() {
    const list = activeChat(playerChat);
    const top = list.length ? list[list.length - 1] : null;
    if (!top) { clearPlayerBubble(); return; }
    if (top.id !== curBubbleId) {
      clearPlayerBubble();
      const w = Math.min(180, Math.max(48, top.text.length * 6 + 16));
      const bg = player.add([k.rect(w, 22, { radius: 7 }), k.pos(0, -78), k.anchor('center'),
        k.color(k.Color.fromHex('#7fd6ff')), k.opacity(0.95), k.z(99998)]);
      const txt = player.add([k.text(top.text, { size: 9, width: w - 10 }), k.pos(0, -78), k.anchor('center'),
        k.color(k.Color.fromHex('#0d1c2b')), k.z(99999)]);
      bubbleObjs = { bg, txt }; curBubbleId = top.id;
    }
    bubbleObjs.bg.opacity = 0.95 * top.alpha;
    bubbleObjs.txt.opacity = top.alpha;
  }

  // Movement input is ignored while ANY overlay (dress-up/chat/map/dialogue) is open — one
  // shared frozen predicate so pointer, keys and prompts can never disagree (H1 audit fix).
  k.onMousePress(() => { if (!anyOverlayOpen()) moveTarget = k.toWorld(k.mousePos()); });
  k.onTouchStart((pos) => { if (!anyOverlayOpen()) moveTarget = k.toWorld(pos); });

  k.onUpdate(() => {
    const dt = Math.min(k.dt(), 0.05); // defensive clamp against tab-switch spikes
    const frozen = anyOverlayOpen();
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

    // Age + render the player's local speech bubbles.
    tickChat(playerChat, dt * 1000);
    renderPlayerBubble();

    // Nearest-ACTIONABLE scan (hotspots + doors + live NPCs) — NPCs have no action yet, so the
    // isActionable filter keeps a nearby waddler from shadowing a shop/minigame/door prompt.
    const liveNpcs = crowd ? crowd.getRoom().npcs : [];
    nearest = findNearestInteractable(
      player.pos,
      mergeInteractables(hotspotInteractables.concat(doorInteractables), liveNpcs),
      undefined,
      { isActionable: (c) => actionFor(c) !== null },
    );
    const action = actionFor(nearest);
    if (interactPrompt) {
      if (action && !frozen) {
        interactPrompt.textContent =
          action === 'minigame' ? `▶ Play ${nearest.label ?? 'game'}` :
          action === 'shop' ? '👕 Dress Up' :
          nearest.door?.locked ? `🔒 ${nearest.label}` : `🚪 ${nearest.label}`;
        interactPrompt.classList.add('show');
      } else {
        interactPrompt.classList.remove('show');
      }
    }
  });

  function fitCam() { k.setCamScale(k.vec2(computeCamScale(k.width() / k.height()))); }
  fitCam();
  k.onResize(fitCam);
});

k.go('room', 'plaza');
