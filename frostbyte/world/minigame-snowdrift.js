// world/minigame-snowdrift.js — IMPURE KAPLAY renderer for "Snowdrift Toss". Every RULE (spawns,
// hits, scoring, combo, timing) lives in engine/minigame-snowdrift.js; this file only feeds
// {aimX,aimY,toss} + dt into tick() each frame and renders whatever state/events come back. No
// scoring math here beyond calling the engine's own coinsFor() once at game-over.
import { newGame, tick, coinsFor } from '../engine/minigame-snowdrift.js';

// Fixed world-space play rect. toss-bg is 480x270 and gets scaled 2x to fill it exactly.
const BOUNDS = { x0: 0, x1: 960, y0: 0, y1: 540 };
const BG_NATIVE_W = 480;

const TARGET_SCALE = 1.5;
const HIT_FLASH_S = 0.18;
const COMBO_PULSE_S = 0.15;

export function registerMinigameSnowdrift(k) {
  k.scene('minigame-snowdrift', ({ from } = {}) => {
    /* ---------------------------------------------------------------- *
     * Backdrop + camera (fixed play rect, fit-to-viewport zoom, same
     * fitCam-on-resize convention as main.js / game1).
     * ---------------------------------------------------------------- */
    k.add([
      k.sprite('toss-bg'),
      k.pos(BOUNDS.x0, BOUNDS.y0),
      k.scale((BOUNDS.x1 - BOUNDS.x0) / BG_NATIVE_W),
      k.z(-1000),
    ]);

    function fitCam() {
      const scale = Math.min(
        k.width() / (BOUNDS.x1 - BOUNDS.x0),
        k.height() / (BOUNDS.y1 - BOUNDS.y0),
      );
      k.setCamScale(k.vec2(scale));
    }
    k.setCamPos((BOUNDS.x0 + BOUNDS.x1) / 2, (BOUNDS.y0 + BOUNDS.y1) / 2);
    fitCam();

    /* ---------------------------------------------------------------- *
     * Pure engine state — boot seed only, never re-derived.
     * ---------------------------------------------------------------- */
    let state = newGame(Date.now() >>> 0, BOUNDS);
    const targetSprites = new Map(); // target id -> kaplay game object
    let coinsEarned = 0;
    let endHandled = false;
    let endPanelObjs = [];
    let endHit = null; // { collectRect, leaveRect } in screen space, set once the end panel exists

    /* ---------------------------------------------------------------- *
     * Input — queue a toss on the frame it was pressed; read+clear in onUpdate.
     * ---------------------------------------------------------------- */
    let tossQueued = false;
    k.onMousePress(() => {
      if (state.phase === 'over') { handleEndClick(k.mousePos()); return; }
      tossQueued = true;
    });
    k.onKeyPress('space', () => { tossQueued = true; });
    k.onKeyPress('enter', () => {
      if (state.phase === 'over') goToPlaza(coinsEarned);
    });
    // Leave is available both mid-play and on the end panel — always exits with 0 coins.
    k.onKeyPress('escape', () => goToPlaza(0));

    function goToPlaza(coins) {
      // The plaza is the parameterized 'room' scene (main.js: k.scene('room', (roomId, opts) => …)),
      // entered as k.go('room', 'plaza', opts) — not a standalone 'plaza' scene.
      k.go('room', from || 'plaza', { spawn: 'fromMinigame', coinsEarned: coins });
    }

    /* ---------------------------------------------------------------- *
     * World-space actors: aim cursor + per-target sprites.
     * ---------------------------------------------------------------- */
    const cursor = k.add([
      k.sprite('snowball'),
      k.anchor('center'),
      k.pos((BOUNDS.x0 + BOUNDS.x1) / 2, (BOUNDS.y0 + BOUNDS.y1) / 2),
      k.z(500000), // always above targets (targets y-sort within 0..540)
    ]);

    function ensureTargetSprite(id, x, y) {
      let obj = targetSprites.get(id);
      if (!obj) {
        obj = k.add([k.sprite('snowpal'), k.anchor('center'), k.pos(x, y), k.scale(TARGET_SCALE), k.z(y)]);
        targetSprites.set(id, obj);
      }
      return obj;
    }
    function destroyTargetSprite(id) {
      const obj = targetSprites.get(id);
      if (!obj) return;
      k.destroy(obj);
      targetSprites.delete(id);
    }
    function spawnHitFlash(x, y) {
      const flash = k.add([
        k.rect(10, 10, { radius: 5 }),
        k.anchor('center'),
        k.pos(x, y),
        k.color(k.Color.fromHex('#ffffff')),
        k.opacity(0.9),
        k.z(500001),
      ]);
      k.wait(HIT_FLASH_S, () => k.destroy(flash));
    }

    /* ---------------------------------------------------------------- *
     * HUD (screen-fixed — k.fixed() takes NO args).
     * ---------------------------------------------------------------- */
    const timerText = k.add([
      k.text('', { size: 20 }), k.pos(16, 12), k.fixed(), k.z(200000),
      k.color(k.Color.fromHex('#f4f4f8')),
    ]);
    const scoreText = k.add([
      k.text('', { size: 18 }), k.pos(16, 40), k.fixed(), k.z(200000),
      k.color(k.Color.fromHex('#f4f4f8')),
    ]);
    const comboText = k.add([
      k.text('', { size: 16 }), k.pos(16, 66), k.fixed(), k.z(200000),
      k.color(k.Color.fromHex('#ffcf6b')),
    ]);
    const countdownText = k.add([
      k.text('', { size: 64 }), k.anchor('center'), k.pos(k.width() / 2, k.height() / 2),
      k.fixed(), k.z(200001), k.color(k.Color.fromHex('#ffffff')), k.opacity(0),
    ]);
    const leaveHint = k.add([
      k.text('Esc: Leave', { size: 12 }), k.pos(16, k.height() - 24), k.fixed(), k.z(200000),
      k.color(k.Color.fromHex('#c9d2e3')), k.opacity(0.75),
    ]);

    function pulseCombo() {
      comboText.scale = k.vec2(1.3);
      k.wait(COMBO_PULSE_S, () => { comboText.scale = k.vec2(1); });
    }

    function repositionHud() {
      countdownText.pos = k.vec2(k.width() / 2, k.height() / 2);
      leaveHint.pos = k.vec2(16, k.height() - 24);
    }

    /* ---------------------------------------------------------------- *
     * End panel — built once on 'end', screen-fixed rect + text + two
     * click targets (also reachable via Enter/Esc key prompts above).
     * ---------------------------------------------------------------- */
    function pointInRect(pt, r) {
      return pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h;
    }
    function handleEndClick(screenPos) {
      if (!endHit) return;
      if (pointInRect(screenPos, endHit.collectRect)) goToPlaza(coinsEarned);
      else if (pointInRect(screenPos, endHit.leaveRect)) goToPlaza(0);
    }
    function destroyEndPanel() {
      for (const o of endPanelObjs) k.destroy(o);
      endPanelObjs = [];
      endHit = null;
    }
    function buildEndPanel(score, coins) {
      destroyEndPanel();
      const w = k.width(), h = k.height();
      const panelW = Math.min(420, w - 40);
      const panelH = 220;
      const px = (w - panelW) / 2, py = (h - panelH) / 2;

      const scrim = k.add([
        k.rect(w, h), k.pos(0, 0), k.fixed(), k.z(300000),
        k.color(k.Color.fromHex('#05070c')), k.opacity(0.55),
      ]);
      const panel = k.add([
        k.rect(panelW, panelH, { radius: 10 }), k.pos(px, py), k.fixed(), k.z(300001),
        k.color(k.Color.fromHex('#12203a')), k.opacity(0.95),
      ]);
      const title = k.add([
        k.text(`Time! Score ${score} — ${coins} coins`, { size: 18, width: panelW - 32 }),
        k.pos(px + panelW / 2, py + 40), k.anchor('center'), k.fixed(), k.z(300002),
        k.color(k.Color.fromHex('#f4f4f8')),
      ]);

      const btnW = 150, btnH = 44, gap = 20;
      const bx0 = px + (panelW - (btnW * 2 + gap)) / 2;
      const by = py + panelH - 70;
      const collectRect = { x: bx0, y: by, w: btnW, h: btnH };
      const leaveRect = { x: bx0 + btnW + gap, y: by, w: btnW, h: btnH };

      const collectBtn = k.add([
        k.rect(btnW, btnH, { radius: 8 }), k.pos(collectRect.x, collectRect.y), k.fixed(), k.z(300002),
        k.color(k.Color.fromHex('#2d7d46')),
      ]);
      const collectLabel = k.add([
        k.text('Collect (Enter)', { size: 14 }),
        k.pos(collectRect.x + btnW / 2, collectRect.y + btnH / 2), k.anchor('center'), k.fixed(), k.z(300003),
        k.color(k.Color.fromHex('#ffffff')),
      ]);
      const leaveBtn = k.add([
        k.rect(btnW, btnH, { radius: 8 }), k.pos(leaveRect.x, leaveRect.y), k.fixed(), k.z(300002),
        k.color(k.Color.fromHex('#5a3030')),
      ]);
      const leaveLabel = k.add([
        k.text('Leave (Esc)', { size: 14 }),
        k.pos(leaveRect.x + btnW / 2, leaveRect.y + btnH / 2), k.anchor('center'), k.fixed(), k.z(300003),
        k.color(k.Color.fromHex('#ffffff')),
      ]);

      endPanelObjs = [scrim, panel, title, collectBtn, collectLabel, leaveBtn, leaveLabel];
      endHit = { collectRect, leaveRect };
    }

    function onGameEnd(score) {
      if (endHandled) return;
      endHandled = true;
      coinsEarned = coinsFor(score, 0); // daily cap re-clamped by the plaza; pass 0 here
      cursor.opacity = 0; // freeze further play
      buildEndPanel(score, coinsEarned);
    }

    k.onResize(() => {
      fitCam();
      repositionHud();
      if (state.phase === 'over') buildEndPanel(state.score, coinsEarned);
    });

    /* ---------------------------------------------------------------- *
     * Event -> render mapping. No rule logic — only what to draw.
     * ---------------------------------------------------------------- */
    function handleEvent(e) {
      switch (e.type) {
        case 'spawn':
          ensureTargetSprite(e.id, e.x, e.y);
          break;
        case 'hit': {
          const obj = targetSprites.get(e.id);
          const at = obj ? { x: obj.pos.x, y: obj.pos.y } : null;
          destroyTargetSprite(e.id);
          if (at) spawnHitFlash(at.x, at.y);
          break;
        }
        case 'escape':
          destroyTargetSprite(e.id);
          break;
        case 'miss':
          break; // subtle cue optional — kept silent to stay thin
        case 'combo':
          pulseCombo();
          break;
        case 'end':
          onGameEnd(e.score);
          break;
        default:
          break;
      }
    }

    /* ---------------------------------------------------------------- *
     * Main loop — feed input+dt into the pure engine, render what comes back.
     * ---------------------------------------------------------------- */
    k.onUpdate(() => {
      const aim = k.toWorld(k.mousePos());

      if (state.phase !== 'over') {
        cursor.pos = k.vec2(aim.x, aim.y);
      }

      if (state.phase === 'over') return; // tick() is a no-op past 'over'; nothing left to feed

      const dtMs = Math.min(50, k.dt() * 1000);
      const toss = tossQueued;
      tossQueued = false;

      const ev = [];
      state = tick(state, dtMs, { aimX: aim.x, aimY: aim.y, toss }, ev);
      for (const e of ev) handleEvent(e);

      // Sync sprites to the engine's target list (defensive create/destroy backstop).
      for (const t of state.targets) {
        if (t.alive) {
          const obj = ensureTargetSprite(t.id, t.x, t.y);
          obj.pos = k.vec2(t.x, t.y);
          obj.z = t.y;
        } else if (targetSprites.has(t.id)) {
          destroyTargetSprite(t.id);
        }
      }

      // HUD text.
      if (state.phase === 'countdown') {
        countdownText.text = String(Math.max(1, Math.ceil(state.tMs / 1000)));
        countdownText.opacity = 1;
        timerText.text = '';
      } else {
        countdownText.opacity = 0;
        timerText.text = `${Math.ceil(state.tMs / 1000)}s`;
      }
      scoreText.text = `Score: ${state.score}`;
      comboText.text = state.combo > 0 ? `Combo x${state.comboMult.toFixed(1)}` : '';
    });
  });
}
