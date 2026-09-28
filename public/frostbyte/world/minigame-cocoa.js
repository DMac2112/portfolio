import { createGame, tick, fill, addTopping, serve, result, SHIFT_SECONDS, PATIENCE_SECONDS, TOPPINGS } from '../engine/minigame-cocoa.js';
import { fadeIn, fadeTo } from './game-feel.js';

const W = 960;
const H = 540;
const TABLES = [142, 338, 534, 730];
const GOLD = '#ffd17a';
const INK = '#f9e8c5';
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];

export function registerMinigameCocoa(k, { reducedMotion = false } = {}) {
  k.scene('minigame-cocoa', ({ from } = {}) => {
    let state = createGame();
    let leaving = false;
    const effects = TABLES.map(() => ({ flare: 0, flicker: 0 }));
    const ink = k.Color.fromHex(INK);
    k.setCamPos(W / 2, H / 2);
    function fitCam() { k.setCamScale(k.vec2(Math.min(k.width() / W, k.height() / H))); }
    fitCam();
    k.add([k.sprite('room-ladle'), k.pos(0, -50), k.scale(2 / 3), k.z(-1000)]);
    k.add([k.rect(W, H), k.pos(0, 0), k.color(k.Color.fromHex('#1d1111')), k.opacity(0.68), k.z(-999)]);
    fadeIn(k, reducedMotion);

    function label(value, x, y, size = 16) {
      return k.add([k.text(value, { size }), k.pos(x, y), k.color(ink), k.z(20)]);
    }
    label('Cocoa rounds', 30, 52, 19);
    const count = label('Served: 0', 420, 52, 18);
    const ending = label('', 100, 451, 18);
    const again = label('', 308, 505, 18);
    const back = label('', 523, 505, 18);
    label('×', 918, 52, 26);
    for (let i = 0; i < 4; i++) label(`${i + 1} · serve`, TABLES[i] - 38, 320, 13);
    label('Space · ladle', 104, 489, 13);
    for (const [i, hint] of ['Z · marshmallow', 'X · cinnamon', 'C · cloudberry'].entries()) {
      label(hint, 294 + i * 143, 489, 12);
    }

    function rect(x, y, w, h, color, opacity = 1) {
      k.drawRect({ pos: k.vec2(x, y), width: w, height: h,
        color: k.Color.fromHex(color), opacity });
    }
    function circle(x, y, radius, color, opacity = 1) {
      k.drawCircle({ pos: k.vec2(x, y), radius, color: k.Color.fromHex(color), opacity });
    }
    function line(x1, y1, x2, y2, width, color, opacity = 1) {
      k.drawLine({ p1: k.vec2(x1, y1), p2: k.vec2(x2, y2), width,
        color: k.Color.fromHex(color), opacity });
    }
    function mug(x, y, topping = null, scale = 1) {
      rect(x - 17 * scale, y - 13 * scale, 29 * scale, 29 * scale, '#e9bd83');
      rect(x - 13 * scale, y - 10 * scale, 21 * scale, 6 * scale, '#6b3526');
      rect(x + 12 * scale, y - 7 * scale, 9 * scale, 16 * scale, '#e9bd83');
      rect(x + 14 * scale, y - 4 * scale, 5 * scale, 10 * scale, '#402525');
      if (topping === 'marshmallow') {
        circle(x - 4 * scale, y - 11 * scale, 6 * scale, '#fff4e2');
      } else if (topping === 'cinnamon') {
        line(x - 9 * scale, y - 15 * scale, x + 3 * scale, y - 7 * scale, 4 * scale, '#a75436');
      } else if (topping === 'cloudberry') {
        circle(x - 4 * scale, y - 12 * scale, 6 * scale, '#f4933c');
        circle(x + 1 * scale, y - 15 * scale, 2 * scale, '#ffd17a');
      }
    }
    function lantern(x, order, effect) {
      const patience = order ? Math.max(0, order.patience / PATIENCE_SECONDS) : 0;
      const flare = reducedMotion ? 0 : effect.flare / 0.4;
      const flicker = !reducedMotion && effect.flicker > 0
        ? (Math.floor(effect.flicker * 30) % 2 ? 0.22 : 1) : 1;
      const light = Math.min(1, patience * flicker + flare);
      line(x, 60, x, 122, 2, '#6f523c');
      if (light > 0) {
        for (let ring = 4; ring >= 1; ring--) {
          circle(x, 151, (16 + ring * 10) * (0.45 + light * 0.55), GOLD, light * (0.025 + (5 - ring) * 0.015));
        }
      }
      circle(x, 151, 25, '#382b2a');
      circle(x, 151, 20, light > 0 ? '#c58d40' : '#634939', 0.55 + light * 0.35);
      rect(x - 17, 130, 34, 4, '#744d31');
      rect(x - 17, 169, 34, 4, '#744d31');
      line(x - 15, 134, x - 15, 169, 2, '#a3764b');
      line(x + 15, 134, x + 15, 169, 2, '#a3764b');
      if (order) mug(x + 1, 152, order.topping, 0.58);
      if (flare > 0) circle(x, 151, 30 + (1 - flare) * 27, GOLD, flare * 0.35);
    }
    k.add([k.z(1), { draw() {
      rect(0, 355, 960, 185, '#22150f', 0.65);
      for (let i = 0; i < 4; i++) {
        const x = TABLES[i];
        lantern(x, state.orders[i], effects[i]);
        rect(x - 58, 252, 116, 27, '#71452e');
        rect(x - 47, 278, 12, 30, '#493023');
        rect(x + 35, 278, 12, 30, '#493023');
        rect(x - 48, 251, 96, 3, '#ad7750');
      }
      // The candle is the shift clock, and its shrinking wax needs no numerals.
      const wax = Math.max(0, 128 * (1 - state.time / SHIFT_SECONDS));
      rect(913, 438 - wax, 25, wax, '#e0b47b');
      rect(910, 438, 31, 9, '#5e4030');
      if (wax > 0) {
        line(925, 431 - wax, 925, 425 - wax, 2, '#493023');
        circle(925, 421 - wax, 6, '#ffce78', 0.55);
      }
      // Equipment stays quiet so the lanterns carry the room's light.
      rect(84, 405, 128, 8, '#96643e');
      rect(98, 413, 100, 50, '#44312a');
      rect(113, 418, 70, 33, '#6e3926');
      rect(106, 399, 84, 12, '#2c2728');
      for (let i = 0; i < 3; i++) {
        const x = 314 + i * 143;
        rect(x, 413, 48, 48, '#72503a');
        rect(x - 4, 408, 56, 9, '#bb8a58');
        rect(x + 10, 427, 28, 13, ['#fff4e2', '#a75436', '#f4933c'][i]);
      }
      if (state.mug) mug(764, 374, state.mug.topping, 1.45);
      else rect(748, 379, 34, 3, '#9c7151');
      if (state.time >= SHIFT_SECONDS) rect(55, 440, 850, 100, '#241712', 0.95);
    } }]);

    function finish() {
      if (state.time < SHIFT_SECONDS) return;
      const n = state.served;
      ending.text = n >= 6
        ? `${n <= 12 ? WORDS[n][0].toUpperCase() + WORDS[n].slice(1) : n} mugs and nobody scalded. Come back tomorrow.`
        : 'The cauldron forgives you. Table three might not.';
      again.text = 'Play again';
      back.text = 'Back to the Ladle';
    }
    function leave(collect = false) {
      if (leaving) return;
      leaving = true;
      const reward = collect && state.time >= SHIFT_SECONDS ? result(state) : { won: false, coinsEarned: 0 };
      fadeTo(k, reducedMotion, () => k.go('room', from || 'ladle', {
        from, spawn: 'fromMinigame', coinsEarned: reward.coinsEarned,
        result: { gameId: 'cocoa-rounds', won: reward.won },
      }));
    }
    function serveAt(table) {
      const played = serve(state, table);
      state = played.state;
      if (played.outcome === 'right') {
        count.text = `Served: ${state.served}`;
        effects[table - 1].flare = reducedMotion ? 0 : 0.4;
      } else if (played.outcome === 'wrong') {
        effects[table - 1].flicker = reducedMotion ? 0 : 0.35;
      }
    }
    function pointer(point) {
      const pos = k.toWorld(point);
      if (pos.x >= 900 && pos.y >= 44 && pos.y < 93) { leave(); return; }
      if (state.time >= SHIFT_SECONDS) {
        if (pos.y >= 490) {
          if (pos.x < 500) k.go('minigame-cocoa', { from });
          else leave(true);
        }
        return;
      }
      if (pos.y >= 395 && pos.y <= 473 && pos.x >= 75 && pos.x <= 215) { state = fill(state); return; }
      if (pos.y >= 400 && pos.y <= 470) {
        for (let i = 0; i < 3; i++) if (pos.x >= 300 + i * 143 && pos.x <= 372 + i * 143) {
          state = addTopping(state, TOPPINGS[i]); return;
        }
      }
      if (pos.y >= 212 && pos.y <= 334) {
        for (let i = 0; i < 4; i++) if (Math.abs(pos.x - TABLES[i]) <= 60) { serveAt(i + 1); return; }
      }
    }
    k.onMousePress(() => pointer(k.mousePos()));
    k.onTouchStart(pointer);
    k.onKeyPress('space', () => { if (state.time < SHIFT_SECONDS) state = fill(state); else k.go('minigame-cocoa', { from }); });
    for (const [key, topping] of [['z', 'marshmallow'], ['x', 'cinnamon'], ['c', 'cloudberry']]) {
      k.onKeyPress(key, () => { state = addTopping(state, topping); });
    }
    for (let table = 1; table <= 4; table++) k.onKeyPress(String(table), () => serveAt(table));
    k.onKeyPress('escape', () => leave());
    k.onResize(fitCam);
    k.onUpdate(() => {
      if (leaving) return;
      state = tick(state, k.dt());
      if (!reducedMotion) for (const effect of effects) {
        effect.flare = Math.max(0, effect.flare - k.dt());
        effect.flicker = Math.max(0, effect.flicker - k.dt());
      }
      finish();
    });
  });
}
