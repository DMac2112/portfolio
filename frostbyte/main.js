// main.js — Frostbyte KAPLAY boot, scene wiring, input capture, os-bridge glue (IMPURE).
// Pure logic lives in engine/*.js and is imported, never re-derived here (Engine & World
// Architecture §1). Boot config + camera conventions are forked from game1/main.js.
import kaplay from './vendor/kaplay.mjs';
import { ROOM_REGISTRY } from './content/rooms.js';
import { buildRoom } from './world/build-room.js';
import { loadAvatarSprites, makeAvatarActor } from './world/build-avatar.js';
import { resolveMoveVector, resolveFacing } from './engine/movement.js';
import { computeCamPos, computeCamScale } from './engine/camera.js';
import { syncFrame } from './engine/avatar-layers.js';
import { load, persist } from './engine/save.js';
import { checkDailyLogin, earnCoins, spendCoins, greetNpc, collectPickup } from './engine/economy.js';
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
import { FURNITURE_CATALOG, furnitureById, MAX_PLACED } from './content/furniture-catalog.js';
import { SNAP, addToInventory, place as placeFurn, move as moveFurn, flip as flipFurn, store as storeFurn, hitTest } from './engine/home-editor.js';
import { loadFurnitureSprites, initFurnitureLayer } from './world/furniture.js';
import { createEditMode } from './ui/edit-mode.js';
import { createCatalog } from './ui/catalog.js';
import { newVisitorScheduler, tick as tickVisitors } from './engine/visitors.js';
import { initVisitorLayer } from './world/visitor-runtime.js';
import { ROSTER } from './content/npc-roster.js';
import { addSnowfall, createWalkPuffs, fadeIn, fadeTo, showCoinSparkle, showMovePing } from './world/game-feel.js';
import { resolveRoomCollision } from './world/room-collision.js';

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
const reduceMotion = Boolean(save.prefs?.reducedMotion || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
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
k.loadSprite('room-trail', './assets/room-trail.png');
k.loadSprite('pickup-glint', './assets/pickup-glint.png');
loadAvatarSprites(k);
loadFurnitureSprites(k);
k.loadSprite('den-sign-open', './assets/den-sign-open.png');
k.loadSprite('den-sign-closed', './assets/den-sign-closed.png');
k.loadSprite('snowpal', './assets/minigame/snowpal.png');
k.loadSprite('snowball', './assets/minigame/snowball.png');
k.loadSprite('toss-bg', './assets/minigame/toss-bg.png');

// Register the Snowdrift Toss scene (a sibling scene entered/exited via the room ↔ minigame contract).
registerMinigameSnowdrift(k, { reducedMotion: reduceMotion });

/* ------------------------------------------------------------------ *
 * Coin HUD
 * ------------------------------------------------------------------ */
const coinEl = document.getElementById('coin-counter');
function refreshCoins(pulse = false) {
  coinEl.hidden = false;
  coinEl.textContent = `${save.coins} coins`;
  if (pulse && !reduceMotion) {
    coinEl.classList.remove('bump');
    void coinEl.offsetWidth;
    coinEl.classList.add('bump');
  }
}

const coinToastEl = document.getElementById('coin-toast');
let coinToastTimer = null;
function showCoinToast(msg) {
  coinToastEl.textContent = msg;
  coinToastEl.classList.remove('show');
  void coinToastEl.offsetWidth;
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
  addSnowfall(k, room, reduceMotion);
  fadeIn(k, reduceMotion);

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
      refreshCoins(true);
      showCoinSparkle(k, player.pos, reduceMotion);
      showCoinToast(`+${credited} coins!`);
    } else {
      showCoinToast('Daily coin cap reached');
    }
  }

  let facing = spawn.facing === 'left' ? 'left' : 'down';
  let moveTarget = null;
  let animT = 0;
  let transitioning = false;
  const walkPuffs = createWalkPuffs(k, reduceMotion);
  const changeScene = (go) => {
    if (transitioning) return;
    transitioning = true;
    fadeTo(k, reduceMotion, go);
  };

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
    if (hit.kind === 'sign') return 'sign';
    return null;
  };
  function doInteract() {
    if (anyOverlayOpen()) return; // 'e' typed into the chat box (or any open modal) must not interact
    const action = actionFor(nearest);
    if (action === 'minigame') {
      if (interactPrompt) interactPrompt.classList.remove('show'); // hide before leaving the scene
      setHudVisible(false); // persistent DOM buttons must not float over (or act on) the minigame
      inMinigame = true;
      changeScene(() => k.go(minigameForHotspot(nearest.id).sceneId, { from: roomId }));
    } else if (action === 'shop') {
      dressUp.open();
    } else if (action === 'door') {
      const d = nearest.door;
      if (d.locked) { showDialogue(d.label, d.lockedCopy ?? 'Snowed in for now.'); return; }
      if (interactPrompt) interactPrompt.classList.remove('show');
      changeScene(() => k.go('room', d.targetRoom, { spawn: d.targetSpawn ?? arriveSpawnId(roomId) }));
    } else if (action === 'sign') {
      save.home.open = !save.home.open;
      persist(save);
      if (signSprite) signSprite.sprite = save.home.open ? 'den-sign-open' : 'den-sign-closed';
      showCoinToast(save.home.open ? 'Den open — visitors welcome!' : 'Den closed.');
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
      k.anchor('center'), k.z(100002), k.opacity(1), k.scale(reduceMotion ? 1 : 0.45),
    ]);
    let life = 0;
    sym.onUpdate(() => {
      life += k.dt();
      sym.pos.x = player.pos.x;
      sym.pos.y = player.pos.y - 84 - (reduceMotion ? 0 : life * 30);
      if (!reduceMotion) {
        const u = Math.min(1, life / 0.24), v = u - 1;
        const s = 0.45 + 0.55 * (1 + 2.70158 * v ** 3 + 1.70158 * v ** 2);
        sym.scale.x = s; sym.scale.y = s;
      }
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

  /* ---------------------------------------------------------------- *
   * Den decorating (H2) — pure rules in engine/home-editor.js; sprites
   * mirrored by world/furniture.js; tray/catalogue are ui singletons.
   * Canvas owns pick-to-place, click-select and drag-move below.
   * ---------------------------------------------------------------- */
  const isHome = roomId === 'den';
  const furnLayer = isHome ? initFurnitureLayer(k, save.home, room.scale) : null;
  const catalogById = Object.fromEntries(FURNITURE_CATALOG.map((it) => [it.id, it]));
  const collidePlayer = (pos) => resolveRoomCollision(room, pos, PLAYER_RADIUS, save.home.placed, catalogById);
  let pickId = null;   // tray item armed for placement
  let selIdx = -1;     // selected placed-furniture index
  let dragging = false;

  const invList = () =>
    Object.entries(save.furniture)
      .filter(([, n]) => n > 0)
      .map(([id, n]) => ({ id, label: furnitureById(id)?.label ?? id, count: n }));

  function syncEditUI() {
    furnLayer?.sync();
    editMode.refresh();
    if (catalogUI.isOpen()) catalogUI.refresh();
    refreshCoins();
    persist(save);
  }
  const selectPlaced = (idx) => {
    selIdx = idx;
    editMode.setSelected(idx >= 0 ? { label: furnitureById(save.home.placed[idx].id)?.label ?? '' } : null);
  };

  const editMode = createEditMode({
    getInventory: invList,
    getPlacedCount: () => save.home.placed.length,
    maxPlaced: MAX_PLACED,
    onSelectItem: (id) => { pickId = id; selectPlaced(-1); },
    onStoreSelected: () => {
      if (selIdx < 0) return;
      if (storeFurn(save.home, save.furniture, selIdx, []).ok) { selectPlaced(-1); syncEditUI(); }
    },
    onFlipSelected: () => { if (selIdx >= 0 && flipFurn(save.home, selIdx, []).ok) syncEditUI(); },
    onOpenCatalog: () => catalogUI.open(),
    onExit: () => { editMode.close(); pickId = null; dragging = false; editMode.clearPick(); selectPlaced(-1); },
  });
  const catalogUI = createCatalog({
    getCoins: () => save.coins,
    getOwnedCount: (id) => save.furniture[id] ?? 0,
    onBuy: (id) => {
      const item = furnitureById(id);
      if (!item || !spendCoins(save, item.price)) return;
      addToInventory(save.furniture, id, []);
      syncEditUI();
    },
  });

  // Canvas press while editing: armed item -> place; otherwise select (and start dragging) a hit.
  function editPress(w) {
    if (pickId) {
      const item = furnitureById(pickId);
      const r = placeFurn(save.home, save.furniture, item, w.x, w.y, room.bounds, MAX_PLACED, []);
      if (r.ok) {
        if ((save.furniture[pickId] ?? 0) <= 0) { pickId = null; editMode.clearPick(); }
        selectPlaced(r.index);
        syncEditUI();
      }
      return;
    }
    const hit = hitTest(save.home, catalogById, w.x, w.y);
    selectPlaced(hit);
    dragging = hit >= 0;
  }
  k.onMouseRelease(() => { if (dragging) { dragging = false; persist(save); } });

  // Keyboard editing path (a11y): arrows nudge one snap step, R flips, Delete stores.
  const nudge = (dx, dy) => {
    if (!editMode.isOpen() || chatUI.isOpen() || selIdx < 0) return;
    const p = save.home.placed[selIdx];
    const item = p && furnitureById(p.id);
    if (item && moveFurn(save.home, selIdx, p.x + dx, p.y + dy, item, room.bounds, []).ok) syncEditUI();
  };
  k.onKeyPress('left', () => nudge(-SNAP, 0));
  k.onKeyPress('right', () => nudge(SNAP, 0));
  k.onKeyPress('up', () => nudge(0, -SNAP));
  k.onKeyPress('down', () => nudge(0, SNAP));
  k.onKeyPress('r', () => {
    if (editMode.isOpen() && !chatUI.isOpen() && selIdx >= 0 && flipFurn(save.home, selIdx, []).ok) syncEditUI();
  });
  const storeSelectedKey = () => {
    if (!editMode.isOpen() || chatUI.isOpen() || selIdx < 0) return;
    if (storeFurn(save.home, save.furniture, selIdx, []).ok) { selectPlaced(-1); syncEditUI(); }
  };
  k.onKeyPress('delete', storeSelectedKey);
  k.onKeyPress('backspace', storeSelectedKey);

  /* ---------------------------------------------------------------- *
   * Open House visitors (H3) — the pure scheduler decides WHEN a
   * visit happens (engine/visitors.js); the world layer renders HOW
   * (world/visitor-runtime.js). Tips pay through economy.greetNpc,
   * which already daily-gates +2 per persona.
   * ---------------------------------------------------------------- */
  const signHotspot = isHome ? room.hotspots.find((h) => h.kind === 'sign') : null;
  const signSprite = signHotspot ? k.add([
    k.sprite(save.home.open ? 'den-sign-open' : 'den-sign-closed'),
    k.pos(signHotspot.x, signHotspot.y), k.anchor('center'), k.scale(room.scale), k.z(signHotspot.y),
  ]) : null;
  const visitorSched = isHome ? newVisitorScheduler((Date.now() % 2147483647) | 0) : null;
  const visitorLayer = isHome
    ? initVisitorLayer(k, { scale: room.scale, doorPos: { x: 720, y: 800 }, getPlaced: () => save.home.placed })
    : null;
  const visitorPersonaIds = ROSTER.map((p) => p.id);
  k.onSceneLeave(() => visitorLayer?.clear());

  // Trail pickups (H4) — walk-over coin glints, +1 each, daily-gated per id via
  // economy.collectPickup (the last of the S2 economy fns to go live). Already-collected
  // glints simply don't spawn today.
  const pickupObjs = [];
  for (const p of room.pickups ?? []) {
    if (save.pickupsCollectedOn[p.id] === todayISO) continue;
    const obj = k.add([k.sprite('pickup-glint'), k.pos(p.x, p.y), k.anchor('center'),
      k.scale(room.scale), k.z(p.y), 'pickup']);
    pickupObjs.push({ id: p.id, obj });
  }

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
      changeScene(() => k.go('room', target, { spawn: 'fromMap' }));
    },
  });
  const anyOverlayOpen = () =>
    transitioning || dressUp.isOpen() || chatUI.isOpen() || mapUI.isOpen() || dialogueIsOpen() ||
    editMode.isOpen() || catalogUI.isOpen();
  const mapBtn = document.getElementById('map-btn');
  if (mapBtn) mapBtn.onclick = () => { if (mapUI.isOpen()) mapUI.close(); else if (!anyOverlayOpen()) mapUI.open(); };
  k.onKeyPress('m', () => { if (!anyOverlayOpen()) mapUI.open(); });

  // Decorate button — den-only (kept out of HUD_BTN_IDS so setHudVisible can't unhide it elsewhere).
  const editBtn = document.getElementById('edit-btn');
  if (editBtn) {
    editBtn.hidden = !isHome;
    editBtn.onclick = () => { if (isHome && !anyOverlayOpen()) { selectPlaced(-1); editMode.open(); } };
  }

  // Player speech bubble — recreated only when the visible bubble changes, opacity tracks its fade.
  let curBubbleId = null;
  let bubbleObjs = null;
  let bubblePopT = 0;
  function clearPlayerBubble() {
    if (bubbleObjs) { for (const obj of Object.values(bubbleObjs)) k.destroy(obj); bubbleObjs = null; }
    curBubbleId = null;
  }
  function renderPlayerBubble() {
    const list = activeChat(playerChat);
    const top = list.length ? list[list.length - 1] : null;
    if (!top) { clearPlayerBubble(); return; }
    if (top.id !== curBubbleId) {
      clearPlayerBubble();
      const w = Math.min(180, Math.max(48, top.text.length * 6 + 16));
      const rim = player.add([k.rect(w + 4, 26, { radius: 9 }), k.pos(0, -78), k.anchor('center'),
        k.color(k.Color.fromHex('#3b8fb8')), k.opacity(0.82), k.scale(reduceMotion ? 1 : 0.82), k.z(99997)]);
      const bg = player.add([k.rect(w, 22, { radius: 7 }), k.pos(0, -78), k.anchor('center'),
        k.color(k.Color.fromHex('#eaf7ff')), k.opacity(0.96), k.scale(reduceMotion ? 1 : 0.82), k.z(99998)]);
      const tail = player.add([k.text('▼', { size: 11 }), k.pos(0, -64), k.anchor('center'),
        k.color(k.Color.fromHex('#eaf7ff')), k.scale(reduceMotion ? 1 : 0.82), k.z(99998)]);
      const txt = player.add([k.text(top.text, { size: 9, width: w - 10 }), k.pos(0, -78), k.anchor('center'),
        k.color(k.Color.fromHex('#122a42')), k.scale(reduceMotion ? 1 : 0.82), k.z(99999)]);
      bubbleObjs = { rim, bg, tail, txt }; curBubbleId = top.id; bubblePopT = 0;
    }
    bubblePopT += Math.min(k.dt(), 0.05);
    const s = reduceMotion ? 1 : Math.min(1, 0.82 + bubblePopT * 1.35);
    bubbleObjs.rim.scale.x = bubbleObjs.rim.scale.y = s;
    bubbleObjs.bg.scale.x = bubbleObjs.bg.scale.y = s;
    bubbleObjs.tail.scale.x = bubbleObjs.tail.scale.y = s;
    bubbleObjs.txt.scale.x = bubbleObjs.txt.scale.y = s;
    bubbleObjs.rim.opacity = 0.82 * top.alpha;
    bubbleObjs.bg.opacity = 0.95 * top.alpha;
    bubbleObjs.tail.opacity = top.alpha;
    bubbleObjs.txt.opacity = top.alpha;
  }

  // Movement input is ignored while ANY overlay is open — one shared frozen predicate so
  // pointer, keys and prompts can never disagree (H1 audit fix). Edit mode instead routes
  // canvas presses to the furniture editor (the tray is non-modal by design).
  k.onMousePress(() => {
    if (editMode.isOpen() && !catalogUI.isOpen()) { editPress(k.toWorld(k.mousePos())); return; }
    if (!anyOverlayOpen()) {
      moveTarget = collidePlayer(k.toWorld(k.mousePos()));
      showMovePing(k, moveTarget, reduceMotion);
    }
  });
  k.onTouchStart((pos) => {
    // touchToMouse:true already synthesizes a mousePress for every tap, so editPress must be
    // routed ONLY through onMousePress — wiring it here too would double-fire on one tap
    // (double stock burn / duplicate placement — H2 review blocker). The idempotent moveTarget
    // assignment is safe to keep on both paths.
    if (!anyOverlayOpen()) moveTarget = collidePlayer(k.toWorld(pos));
  });

  k.onUpdate(() => {
    const dt = Math.min(k.dt(), 0.05); // defensive clamp against tab-switch spikes
    const frozen = anyOverlayOpen();

    // Drag-move a selected furniture piece while the mouse stays down (edit mode only).
    if (dragging && editMode.isOpen() && selIdx >= 0 && k.isMouseDown()) {
      const w = k.toWorld(k.mousePos());
      const p = save.home.placed[selIdx];
      const item = p && furnitureById(p.id);
      if (item && moveFurn(save.home, selIdx, w.x, w.y, item, room.bounds, []).ok) furnLayer?.sync();
    }
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
    next = collidePlayer(next);
    player.pos.x = next.x;
    player.pos.y = next.y;

    facing = resolveFacing(dxPx, dyPx, facing);
    animT += dt;
    const walkFrame = moving ? Math.floor(animT * 8) % 4 : 0;
    syncFrame(avatar.parts, ROW_BASE[dirGroup(facing)] + walkFrame, facing === 'left');

    player.z = player.pos.y; // y-sort, same as game1
    walkPuffs.tick(dt, moving && !frozen, player.pos);

    // Walk-over pickup collection (H4) — squared-distance check, ~one glint radius.
    for (let i = pickupObjs.length - 1; i >= 0; i--) {
      const p = pickupObjs[i];
      const pdx = player.pos.x - p.obj.pos.x;
      const pdy = player.pos.y - p.obj.pos.y;
      if (pdx * pdx + pdy * pdy < 40 * 40) {
        if (collectPickup(save, p.id, todayISO, [])) {
          refreshCoins(true);
          persist(save);
          showCoinSparkle(k, p.obj.pos, reduceMotion);
          showCoinToast('+1 coin!');
        }
        k.destroy(p.obj);
        pickupObjs.splice(i, 1);
      }
    }

    const cam = computeCamPos(player.pos);
    k.setCamPos(cam.x, cam.y);

    // Age + render the player's local speech bubbles.
    tickChat(playerChat, dt * 1000);
    renderPlayerBubble();

    // Open House visitors (H3) — dt-gated, so the OS pause contract holds for free.
    if (visitorSched) {
      const vev = [];
      tickVisitors(visitorSched, dt * 1000, {
        eligible: save.home.open && !anyOverlayOpen(),
        personaIds: visitorPersonaIds,
        placedCount: save.home.placed.length,
      }, vev);
      for (const e of vev) {
        if (e.type === 'visit-tip') { // economy-only event — never forwarded to the render layer
          if (greetNpc(save, e.personaId, todayISO, [])) {
            refreshCoins(true);
            persist(save);
            showCoinSparkle(k, player.pos, reduceMotion);
            showCoinToast('+2 coins — visitor tip!');
          }
          continue;
        }
        // a cut visit walks out like a normal departure — the layer only knows 'visit-leaving'
        visitorLayer.handle(e.type === 'visit-cut' ? { ...e, type: 'visit-leaving' } : e);
      }
      visitorLayer.tick(dt);
    }

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
          action === 'sign' ? (save.home.open ? '🪧 Close your den' : '🪧 Open your den') :
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
