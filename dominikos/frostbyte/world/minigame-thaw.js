import { FLOORS, newGame, move, restart, nextFloor } from '../engine/minigame-thaw.js';
import { fadeIn, fadeTo } from './game-feel.js';

const W = 960;
const H = 540;
const CELL = 56;
const TOP = 88;
const ICE = '#dff3ff';
const RIM = '#7fd6ff';
const THICK = '#9cc9e6';
const WATER = '#0e2a3f';
const MINT = '#6fe0b2';

export function registerMinigameThaw(k, { reducedMotion = false, isMuted = () => false } = {}) {
  k.scene('minigame-thaw', ({ from } = {}) => {
    let state = newGame();
    let leaving = false;
    let lightMs = 0;
    let touchStart = null;
    let swiped = false;
    void isMuted; // This floor has no audio to bypass the saved mute preference.
    k.add([k.sprite('room-moonwell'), k.pos(0, -50), k.scale(2 / 3), k.z(-1000)]);
    k.add([k.rect(W, H), k.pos(0, 0), k.color(k.Color.fromHex('#000000')),
      k.opacity(0.65), k.z(-999)]);
    k.setCamPos(W / 2, H / 2);
    function fitCam() { k.setCamScale(k.vec2(Math.min(k.width() / W, k.height() / H))); }
    fitCam();
    fadeIn(k, reducedMotion);

    function label(value, x, y, size = 16, color = '#f5fbff') {
      return k.add([k.text(value, { size }), k.pos(x, y), k.color(k.Color.fromHex(color)), k.z(20)]);
    }
    const floorText = label('Floor 1/5', 24, 20, 20);
    const coinText = label('0 coins', 804, 20, 20);
    const statusText = label('', 288, 52, 18, MINT);
    const helpText = label('ARROWS / WASD   tap a neighbor   swipe   R: restart', 228, 510, 14);
    label('X', 912, 20, 20);

    function box(x, y, w, h, color) {
      k.drawRect({ pos: k.vec2(Math.round(x / 4) * 4, Math.round(y / 4) * 4),
        width: Math.max(4, Math.round(w / 4) * 4), height: Math.max(4, Math.round(h / 4) * 4),
        color: k.Color.fromHex(color) });
    }
    function origin() {
      return { x: (W - FLOORS[state.floorIndex].rows[0].length * CELL) / 2, y: TOP };
    }
    k.add([k.z(0), { draw() {
      const floor = FLOORS[state.floorIndex];
      const start = origin();
      for (let y = 0; y < floor.rows.length; y++) {
        for (let x = 0; x < floor.rows[y].length; x++) {
          const mark = floor.rows[y][x];
          if (mark === '#') continue;
          const left = start.x + x * CELL;
          const top = start.y + y * CELL;
          const strength = state.tiles[y][x];
          box(left, top, 52, 52, strength ? RIM : WATER);
          if (strength) box(left + 4, top + 4, 44, 44, ICE);
          if (mark === '2' && strength === 2) {
            box(left + 8, top + 8, 36, 36, THICK);
            box(left + 12, top + 12, 28, 28, ICE);
          }
          if (mark === 'E') {
            box(left + 12, top + 12, 28, 28, MINT);
            box(left + 16, top + 16, 20, 20, strength ? ICE : WATER);
          }
        }
      }
      if (state.phase === 'won' && !reducedMotion) {
        const count = Math.min(state.path.length, Math.floor(lightMs / 90) + 1);
        for (let i = 0; i < count; i++) {
          const [x, y] = state.path[i].split(',').map(Number);
          box(start.x + x * CELL + 20, start.y + y * CELL + 20, 12, 12, MINT);
          if (i > 0) {
            const [px, py] = state.path[i - 1].split(',').map(Number);
            const cx = start.x + x * CELL + 24;
            const cy = start.y + y * CELL + 24;
            const ox = start.x + px * CELL + 24;
            const oy = start.y + py * CELL + 24;
            box(Math.min(cx, ox), Math.min(cy, oy), Math.abs(cx - ox) + 4, Math.abs(cy - oy) + 4, MINT);
          }
        }
      }
      const px = start.x + state.x * CELL;
      const py = start.y + state.y * CELL;
      box(px + 12, py + 20, 28, 24, '#324958');
      box(px + 16, py + 12, 20, 16, '#324958');
      box(px + 20, py + 24, 12, 16, '#f5fbff');
      box(px + 32, py + 20, 8, 4, '#ff784f');
      box(900, 12, 48, 44, '#324958');
    } }]);

    function leave(collect = false) {
      if (leaving) return;
      leaving = true;
      fadeTo(k, reducedMotion, () => k.go('room', from || 'moonwell', {
        from, spawn: 'fromMinigame', coinsEarned: collect ? state.coins : 0,
        result: { gameId: 'thaw', won: collect && state.phase === 'won' },
      }));
    }
    function showState() {
      floorText.text = `Floor ${state.floorIndex + 1}/${FLOORS.length}`;
      coinText.text = `${state.coins} coins`;
      if (state.event === 'refreeze') statusText.text = 'No path remains. The floor refreezes.';
      else if (state.phase === 'clear') statusText.text = state.fullCoverage ? 'Every tile thawed! +4 coins' : 'Floor clear! +2 coins';
      else if (state.phase === 'won') statusText.text = reducedMotion ? 'The Moon note is yours' : '';
      else statusText.text = '';
      helpText.text = state.phase === 'clear' ? 'Tap or Enter: next floor'
        : state.phase === 'won' ? 'Tap or Enter: collect and return' : 'ARROWS / WASD   tap a neighbor   swipe   R: restart';
    }
    function step(direction) {
      if (leaving || state.phase !== 'play') return;
      state = move(state, direction);
      if (state.phase === 'won') lightMs = 0;
      showState();
    }
    function press(pos) {
      const point = k.toWorld(pos);
      if (point.x >= 900 && point.y <= 60) { leave(); return; }
      if (state.phase === 'won') { leave(true); return; }
      if (state.phase === 'clear') { state = nextFloor(state); showState(); return; }
      const start = origin();
      const x = Math.floor((point.x - start.x) / CELL);
      const y = Math.floor((point.y - start.y) / CELL);
      if (Math.abs(x - state.x) + Math.abs(y - state.y) !== 1) return;
      step(x > state.x ? 'R' : x < state.x ? 'L' : y > state.y ? 'D' : 'U');
    }
    for (const [key, direction] of Object.entries({ up: 'U', w: 'U', down: 'D', s: 'D', left: 'L', a: 'L', right: 'R', d: 'R' })) {
      k.onKeyPress(key, () => step(direction));
    }
    k.onKeyPress('r', () => { if (state.phase === 'play') { state = restart(state); showState(); } });
    k.onKeyPress('escape', () => leave());
    k.onKeyPress('enter', () => {
      if (state.phase === 'won') leave(true);
      else if (state.phase === 'clear') { state = nextFloor(state); showState(); }
    });
    k.onMousePress(() => press(k.mousePos()));
    k.onTouchStart((pos) => { touchStart = k.toWorld(pos); swiped = false; });
    k.onTouchMove((pos) => {
      if (!touchStart || swiped || state.phase !== 'play') return;
      const point = k.toWorld(pos);
      const dx = point.x - touchStart.x;
      const dy = point.y - touchStart.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 36) return;
      swiped = true;
      step(Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'R' : 'L' : dy > 0 ? 'D' : 'U');
    });
    k.onResize(fitCam);
    k.onUpdate(() => {
      if (state.phase !== 'won' || reducedMotion) return;
      lightMs += Math.min(k.dt(), 0.05) * 1000;
      if (lightMs >= state.path.length * 90) statusText.text = 'The Moon note is yours';
    });
  });
}
