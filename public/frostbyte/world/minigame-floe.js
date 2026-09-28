import { newGame, tick, ROUND_MS, SURFACE_Y, DEPTHS } from '../engine/minigame-floe.js';
import { fadeIn, fadeTo } from './game-feel.js';

const W = 960;
const H = 540;
const HOOK_X = 480;
const ICE = '#dff3ff';
const WATER = ['#0e2a3f', '#0c2639', '#0a2234', '#081d2e'];

export function registerMinigameFloe(k, { reducedMotion = false, isMuted = () => false } = {}) {
  k.scene('minigame-floe', ({ from } = {}) => {
    let state = newGame(Date.now() >>> 0);
    let leaving = false;
    let pointerY = null;
    let pulseMs = 0;
    const textColor = k.Color.fromHex('#f5fbff');
    const mint = k.Color.fromHex('#6fe0b2');
    k.setCamPos(W / 2, H / 2);
    function fitCam() { k.setCamScale(k.vec2(Math.min(k.width() / W, k.height() / H))); }
    fitCam();
    fadeIn(k, reducedMotion);

    function label(value, x, y, size = 16, color = textColor) {
      return k.add([k.text(value, { size }), k.pos(x, y), k.color(color), k.z(20)]);
    }
    const timeText = label('90 s', 24, 20, 20);
    const lineText = label('Lines: 3', 24, 48, 16);
    const coinText = label('0 coins', 806, 20, 20);
    const statusText = label('', 276, 120, 24, mint);
    const endText = label('', 278, 470, 18);
    label('UP / DOWN   W / S   or touch the water', 290, 506, 14);
    label('X', 912, 20, 20);

    function box(x, y, w, h, color, opacity = 1) {
      k.drawRect({ pos: k.vec2(Math.round(x / 4) * 4, Math.round(y / 4) * 4),
        width: Math.max(4, Math.round(w / 4) * 4), height: Math.max(4, Math.round(h / 4) * 4),
        color: k.Color.fromHex(color), opacity });
    }
    function fishShape(fish, x = fish.x, y = fish.y) {
      const color = fish.color;
      box(x - 12, y - 8, 24, 16, color);
      box(x + (fish.dir > 0 ? -20 : 12), y - 4, 8, 8, color);
      box(x - 4, y - 12, 8, 4, color);
      box(x + (fish.dir > 0 ? 4 : -8), y - 4, 4, 4, '#0e2a3f');
      if (fish.humming) {
        box(x - 16, y - 12, 4, 4, '#6fe0b2');
        box(x + 12, y + 8, 4, 4, '#6fe0b2');
      }
    }
    k.add([k.z(-100), { draw() {
      box(0, 0, W, 160, '#253e52');
      box(0, 76, W, 40, '#647d8d');
      box(0, 116, W, 32, '#8ca5b2');
      box(0, 148, W, 12, ICE);
      for (let i = 0; i < 4; i++) {
        const lit = !reducedMotion && pulseMs > 0 && Math.floor((700 - pulseMs) / 140) === 3 - i;
        box(0, 160 + i * 72, W, 72, lit ? '#6fe0b2' : WATER[i]);
      }
      box(0, 448, W, 92, '#081824');
      // Pier posts, ice hole and a seated penguin above the waterline.
      for (const x of [96, 264, 692, 860]) {
        box(x, 112, 16, 48, '#4b6575');
        box(x - 4, 108, 24, 8, '#a8c1cc');
      }
      box(424, 140, 112, 20, ICE);
      box(456, 144, 48, 16, '#0e2a3f');
      box(432, 88, 40, 48, '#324958');
      box(432, 72, 40, 32, '#324958');
      box(440, 100, 24, 20, '#f5fbff');
      box(464, 84, 8, 4, '#f5fbff');
      box(468, 92, 12, 8, '#ff784f');
      box(440, 68, 24, 8, ICE);
      for (const fish of state.fish) fishShape(fish);
      for (const crab of state.crabs) {
        box(crab.x - 16, crab.y - 4, 32, 12, '#ff784f');
        box(crab.x - 24, crab.y - 12, 8, 12, '#ff784f');
        box(crab.x + 16, crab.y - 12, 8, 12, '#ff784f');
        box(crab.x - 12, crab.y + 8, 4, 8, '#ff784f');
        box(crab.x + 8, crab.y + 8, 4, 8, '#ff784f');
      }
      for (const jelly of state.jellies) {
        box(jelly.x - 12, jelly.y - 12, 24, 12, '#b9c8ff');
        box(jelly.x - 16, jelly.y - 4, 32, 8, '#b9c8ff');
        for (const x of [-12, 0, 12]) box(jelly.x + x, jelly.y + 4, 4, 16, '#b9c8ff');
      }
      box(HOOK_X, 160, 4, Math.max(4, state.hookY - 160), '#f5fbff');
      box(HOOK_X - 4, state.hookY, 12, 4, '#f5fbff');
      box(HOOK_X + 4, state.hookY - 4, 4, 12, '#f5fbff');
      if (state.carrying) fishShape(state.carrying, HOOK_X - 24, state.hookY + 8);
      if (state.stunMs > 0) box(HOOK_X - 8, state.hookY - 16, 16, 4, '#b9c8ff');
      for (let i = 0; i < state.lines; i++) {
        box(112 + i * 24, 52, 4, 16, '#f5fbff');
        box(112 + i * 24, 68, 12, 4, '#f5fbff');
      }
      box(900, 12, 48, 44, '#324958');
    } }]);

    function leave(collect = false) {
      if (leaving) return;
      leaving = true;
      fadeTo(k, reducedMotion, () => k.go('room', from || 'docks', {
        from, spawn: 'fromMinigame', coinsEarned: collect ? state.coins : 0,
        result: { gameId: 'floe', won: collect && state.won },
      }));
    }
    function pointY(pos) {
      const point = k.toWorld(pos);
      if (point.x >= 900 && point.y <= 60) { leave(); return; }
      if (state.phase === 'over') { leave(true); return; }
      pointerY = Math.max(SURFACE_Y, Math.min(DEPTHS[3], point.y));
    }
    k.onMousePress(() => pointY(k.mousePos()));
    k.onTouchStart(pointY);
    k.onTouchMove(pointY);
    k.onKeyPress('escape', () => leave());
    k.onKeyPress('enter', () => { if (state.phase === 'over') leave(true); });
    k.onResize(fitCam);
    k.onUpdate(() => {
      if (leaving) return;
      if (k.isMouseDown()) pointerY = Math.max(SURFACE_Y, Math.min(DEPTHS[3], k.toWorld(k.mousePos()).y));
      const direction = Number(k.isKeyDown('down') || k.isKeyDown('s')) - Number(k.isKeyDown('up') || k.isKeyDown('w'));
      if (direction) pointerY = null;
      const before = state.phase;
      state = tick(state, pointerY === null ? { direction } : { targetY: pointerY }, Math.min(k.dt(), 0.05) * 1000);
      timeText.text = `${Math.max(0, Math.ceil((ROUND_MS - state.elapsedMs) / 1000))} s`;
      lineText.text = `Lines: ${state.lines}`;
      coinText.text = `${state.coins} coins`;
      if (state.event === 'note') {
        statusText.text = 'The Floe note is yours';
        if (!reducedMotion) pulseMs = 700;
      } else if (state.event === 'snap') statusText.text = 'Line snapped!';
      else if (state.event === 'stun') statusText.text = 'Jellyfish!';
      else if (state.event === 'land' || state.event === 'hook') statusText.text = '';
      if (pulseMs > 0) pulseMs = Math.max(0, pulseMs - k.dt() * 1000);
      if (before !== 'over' && state.phase === 'over') endText.text = state.won ? 'Tap or Enter: collect and return' : 'Round over - tap or Enter to return';
      void isMuted; // This game has no audio to bypass the saved mute preference.
    });
  });
}
