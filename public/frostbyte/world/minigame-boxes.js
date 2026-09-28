import { createGame, legalLines, applyLine, toveMove, score, isOver } from '../engine/minigame-boxes.js';
import { fadeIn, fadeTo } from './game-feel.js';

const W = 960;
const H = 540;
const X = 304;
const Y = 94;
const GAP = 88;
const GLASS = '#6f93c4';
const EDGE = '#d9f4ff';
const WOOD = '#3b2a1f';

function ends(line) {
  if (line < 20) {
    const row = Math.floor(line / 4);
    const col = line % 4;
    return [X + col * GAP, Y + row * GAP, X + (col + 1) * GAP, Y + row * GAP];
  }
  const edge = line - 20;
  const row = Math.floor(edge / 5);
  const col = edge % 5;
  return [X + col * GAP, Y + row * GAP, X + col * GAP, Y + (row + 1) * GAP];
}

export function registerMinigameBoxes(k, { reducedMotion = false } = {}) {
  k.scene('minigame-boxes', ({ from } = {}) => {
    let state = createGame();
    let cursor = 0;
    let hover = null;
    let thinking = false;
    let leaving = false;
    const wipes = new Map();
    const ink = k.Color.fromHex('#59738d');
    const bright = k.Color.fromHex(EDGE);
    k.setCamPos(W / 2, H / 2);
    function fitCam() { k.setCamScale(k.vec2(Math.min(k.width() / W, k.height() / H))); }
    fitCam();
    k.add([k.sprite('room-court'), k.pos(0, -50), k.scale(2 / 3), k.z(-1000)]);
    k.add([k.rect(W, H), k.pos(0, 0), k.color(k.Color.fromHex('#6f93c4')),
      k.opacity(0.56), k.z(-999)]);
    k.add([k.rect(W, H), k.pos(0, 0), k.color(k.Color.fromHex('#dfe9f2')),
      k.opacity(0.84), k.z(-998)]);
    fadeIn(k, reducedMotion);

    function label(value, x, y, size = 18) {
      return k.add([k.text(value, { size }), k.pos(x, y), k.color(ink), k.z(20)]);
    }
    // Top ~40 units sit under the page's header bar, so the score starts below it.
    label('You', 42, 58);
    label('Tove', 804, 58);
    const status = label('Your line', 414, 476, 18);
    const ending = label('', 254, 452, 17);
    const again = label('', 315, 507, 18);
    const back = label('', 527, 507, 18);
    label('×', 919, 52, 26);

    function rect(x, y, w, h, color, opacity = 1) {
      k.drawRect({ pos: k.vec2(x, y), width: w, height: h,
        color: k.Color.fromHex(color), opacity });
    }
    function stroke(x1, y1, x2, y2, width, color, opacity = 1) {
      k.drawLine({ p1: k.vec2(x1, y1), p2: k.vec2(x2, y2), width, color, opacity });
    }
    function tally(owner, start) {
      const count = score(state)[owner];
      for (let i = 0; i < count; i++) {
        const group = Math.floor(i / 5);
        const mark = i % 5;
        const x = start + group * 42;
        if (mark < 4) stroke(x + mark * 7, 92, x + mark * 7 - 2, 111, 2, ink, 0.74);
        else stroke(x - 3, 108, x + 28, 93, 2, ink, 0.74);
      }
    }
    function doodle(box, owner) {
      const x = X + (box % 4 + 0.5) * GAP;
      const y = Y + (Math.floor(box / 4) + 0.5) * GAP;
      rect(x - 36, y - 36, 72, 72, GLASS, 0.48);
      if (owner === 'you') {
        stroke(x - 18, y, x - 6, y - 10, 2, ink, 0.76);
        stroke(x - 6, y - 10, x + 17, y, 2, ink, 0.76);
        stroke(x + 17, y, x - 6, y + 10, 2, ink, 0.76);
        stroke(x - 6, y + 10, x - 18, y, 2, ink, 0.76);
        stroke(x - 18, y, x - 25, y - 8, 2, ink, 0.76);
        stroke(x - 18, y, x - 25, y + 8, 2, ink, 0.76);
        rect(x + 5, y - 3, 3, 3, '#eaf8ff');
      } else {
        for (let i = 0; i < 3; i++) {
          const angle = i * Math.PI / 3;
          const dx = Math.cos(angle) * 20;
          const dy = Math.sin(angle) * 20;
          stroke(x - dx, y - dy, x + dx, y + dy, 2, ink, 0.76);
          for (const sign of [-1, 1]) {
            const ex = x + sign * dx;
            const ey = y + sign * dy;
            stroke(ex, ey, ex - sign * dx * 0.26 - dy * 0.18, ey - sign * dy * 0.26 + dx * 0.18, 2, ink, 0.76);
            stroke(ex, ey, ex - sign * dx * 0.26 + dy * 0.18, ey - sign * dy * 0.26 - dx * 0.18, 2, ink, 0.76);
          }
        }
      }
    }
    k.add([k.z(1), { draw() {
      // Painted wood frames the fogged pane; the blue strokes are cleared glass.
      rect(246, 76, 12, 390, WOOD);
      rect(702, 76, 12, 390, WOOD);
      rect(246, 76, 468, 12, WOOD);
      rect(246, 454, 468, 12, WOOD);
      for (let box = 0; box < 16; box++) if (state.boxes[box]) doodle(box, state.boxes[box]);
      for (let line = 0; line < 40; line++) {
        const [x1, y1, x2, y2] = ends(line);
        if (state.lines[line]) {
          const progress = wipes.get(line) ?? 1;
          const tx = x1 + (x2 - x1) * progress;
          const ty = y1 + (y2 - y1) * progress;
          stroke(x1, y1, tx, ty, 15, k.Color.fromHex(GLASS), 0.9);
          stroke(x1, y1 - 5, tx, ty - 5, 2, bright, 0.78);
          if (!reducedMotion && progress >= 1) {
            const drip = Math.min(15, Math.max(0, (progress - 0.8) * 75));
            stroke(x1, y1 + 5, x1, y1 + 5 + drip, 2, k.Color.fromHex(GLASS), 0.6);
            stroke(x2, y2 + 5, x2, y2 + 5 + drip, 2, k.Color.fromHex(GLASS), 0.6);
          }
        } else if (!isOver(state) && !thinking && state.turn === 'you' && line === (hover ?? cursor)) {
          stroke(x1, y1, x2, y2, 12, k.Color.fromHex(GLASS), 0.3);
        }
      }
      for (let row = 0; row < 5; row++) for (let col = 0; col < 5; col++) {
        rect(X + col * GAP - 3, Y + row * GAP - 3, 6, 6, '#f3fbff', 0.9);
      }
      tally('you', 43);
      tally('tove', 772);
    } }]);

    function finish() {
      if (!isOver(state)) return;
      const scores = score(state);
      const won = scores.you > scores.tove;
      ending.text = won ? 'Hm. The glass is yours. Buns are on me.'
        : scores.you < scores.tove ? 'Mine. Wipe it down and we’ll go again.'
          : 'Even. The fog can’t decide either.';
      status.text = '';
      again.text = 'Play again';
      back.text = 'Back to the café';
    }
    function leave(collect = false) {
      if (leaving) return;
      leaving = true;
      const scores = score(state);
      const coinsEarned = collect && isOver(state)
        ? scores.you > scores.tove ? 12 : scores.you === scores.tove ? 6 : 2 : 0;
      fadeTo(k, reducedMotion, () => k.go('room', from || 'bluehour', {
        from, spawn: 'fromMinigame', coinsEarned,
        result: { gameId: 'window-boxes', won: collect && isOver(state) && scores.you > scores.tove },
      }));
    }
    function play(line) {
      if (leaving || thinking || isOver(state) || state.lines[line] !== null) return;
      const move = applyLine(state, line);
      state = move.state;
      wipes.set(line, reducedMotion ? 1 : 0);
      cursor = legalLines(state)[0] ?? 0;
      hover = null;
      finish();
      if (!isOver(state) && state.turn === 'tove') {
        thinking = true;
        status.text = 'Tove is thinking…';
        k.wait(0.5, () => {
          if (leaving || isOver(state)) return;
          thinking = false;
          play(toveMove(state));
        });
      } else if (!isOver(state)) status.text = 'Your line';
    }
    function nearest(point) {
      let best = null;
      let distance = 26;
      for (const line of legalLines(state)) {
        const [x1, y1, x2, y2] = ends(line);
        const d = Math.hypot(point.x - (x1 + x2) / 2, point.y - (y1 + y2) / 2);
        if (d < distance) { best = line; distance = d; }
      }
      return best;
    }
    function pointer(point, press = false) {
      const pos = k.toWorld(point);
      if (press && pos.x >= 900 && pos.y >= 40 && pos.y < 90) { leave(); return; }
      if (isOver(state)) {
        if (press && pos.y >= 496) {
          if (pos.x < 500) k.go('minigame-boxes', { from });
          else leave(true);
        }
        return;
      }
      hover = nearest(pos);
      if (press && hover !== null && state.turn === 'you') play(hover);
    }
    function moveCursor(dx, dy) {
      const choices = legalLines(state).filter((line) => line !== cursor);
      const [x1, y1, x2, y2] = ends(cursor);
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      const ahead = choices.filter((line) => {
        const [a, b, c, d] = ends(line);
        return ((a + c) / 2 - cx) * dx + ((b + d) / 2 - cy) * dy > 0;
      });
      ahead.sort((a, b) => {
        const metric = (line) => {
          const [x, y, u, v] = ends(line);
          const along = ((x + u) / 2 - cx) * dx + ((y + v) / 2 - cy) * dy;
          const across = ((x + u) / 2 - cx) * dy - ((y + v) / 2 - cy) * dx;
          return along + Math.abs(across) * 2;
        };
        return metric(a) - metric(b);
      });
      if (ahead.length) { cursor = ahead[0]; hover = null; }
    }
    k.onMouseMove((point) => pointer(point));
    k.onMousePress(() => pointer(k.mousePos(), true));
    k.onTouchStart((point) => pointer(point, true));
    for (const [key, dx, dy] of [['left', -1, 0], ['right', 1, 0], ['up', 0, -1], ['down', 0, 1]]) {
      k.onKeyPress(key, () => { if (!thinking && !isOver(state)) moveCursor(dx, dy); });
    }
    for (const key of ['space', 'enter']) k.onKeyPress(key, () => {
      if (isOver(state)) k.go('minigame-boxes', { from });
      else if (state.turn === 'you') play(cursor);
    });
    k.onKeyPress('escape', () => leave(isOver(state)));
    k.onResize(fitCam);
    k.onUpdate(() => {
      if (reducedMotion) return;
      for (const [line, progress] of wipes) {
        if (progress < 1) wipes.set(line, Math.min(1, progress + k.dt() * 5));
      }
    });
  });
}
