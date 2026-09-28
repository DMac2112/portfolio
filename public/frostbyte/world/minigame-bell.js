import { CHART, judge, resultOf, scoreOf } from '../engine/minigame-bell.js';
import { playBell } from './bell-tone.js';
import { fadeIn, fadeTo } from './game-feel.js';

const W = 960;
const H = 540;
const LANE_X = [240, 480, 720];
const STRIKE_Y = 420;
const FALL_MS = 1700;
const COLORS = { brass: '#ffb45e', true: '#6fe0b2', near: '#7fd6ff', miss: '#5b4636' };

export function registerMinigameBell(k, { reducedMotion = false, isMuted = () => false } = {}) {
  k.scene('minigame-bell', ({ from } = {}) => {
    k.add([k.sprite('room-workshop'), k.pos(0, -50), k.scale(2 / 3), k.z(-1000)]);
    k.add([k.rect(W, H), k.pos(0, 0), k.color(k.Color.fromHex('#000000')),
      k.opacity(0.65), k.z(-999)]);
    k.setCamPos(W / 2, H / 2);
    function fitCam() { k.setCamScale(k.vec2(Math.min(k.width() / W, k.height() / H))); }
    fitCam();
    fadeIn(k, reducedMotion);

    function block(x, y, w, h, color, opacity = 1, z = 1) {
      return k.add([k.rect(w, h), k.pos(x, y), k.color(k.Color.fromHex(color)),
        k.opacity(opacity), k.z(z)]);
    }
    function label(value, x, y, size = 16, color = '#f5fbff') {
      return k.add([k.text(value, { size }), k.pos(x, y),
        k.color(k.Color.fromHex(color)), k.z(10)]);
    }
    // All edges sit on the same four-pixel grid as the falling rings.
    for (let lane = 0; lane < 3; lane++) {
      const x = LANE_X[lane];
      block(x - 100, 88, 200, 344, '#172334', 0.48);
      block(x - 76, 364, 152, 8, '#5b4636');
      block(x - 64, 372, 128, 28, '#ffb45e', 0.65);
      block(x - 52, 400, 104, 12, '#ffb45e', 0.65);
      block(x - 12, 412, 24, 16, '#ffb45e', 0.65);
      label(['LOW', 'MIDDLE', 'HIGH'][lane], x - 42, 452, 16);
    }
    block(112, STRIKE_Y, 736, 4, '#f5fbff', 0.6, 3);
    const phraseText = label('Phrase 1/3', 28, 24, 18);
    const coinText = label('0 coins', 792, 24, 18);
    label('← ↓ →    A S D    1 2 3', 288, 492, 14);
    block(876, 16, 60, 40, '#5b4636', 0.9, 12);
    label('X', 896, 24, 20);

    const rings = new Map();
    const flashes = [null, null, null];
    let hits = [];
    let elapsed = -1400;
    let end = false;
    let leaving = false;
    let chord = false;
    let chordElapsed = 0;
    let chordBars = [];
    let endText = null;
    const answerText = label('', 280, 212, 28, COLORS.true);

    function leave(collect = false) {
      if (leaving) return;
      leaving = true;
      const result = collect && end ? resultOf(judge(CHART, hits)) : { won: false, coinsEarned: 0 };
      fadeTo(k, reducedMotion, () => k.go('room', from || 'workshop', {
        from, spawn: 'fromMinigame', coinsEarned: result.coinsEarned,
        result: { gameId: 'bell', won: result.won },
      }));
    }

    function ringAt(note) {
      const x = LANE_X[note.lane] - 28;
      const parts = [
        block(x, 0, 56, 8, COLORS.brass, 1, 4),
        block(x, 8, 8, 32, COLORS.brass, 1, 4),
        block(x + 48, 8, 8, 32, COLORS.brass, 1, 4),
        block(x, 40, 56, 8, COLORS.brass, 1, 4),
      ];
      rings.set(note, parts);
      return parts;
    }

    function strike(lane) {
      if (elapsed < 0 || end || leaving) return;
      hits.push({ lane, timeMs: elapsed });
      const judged = judge(CHART, hits);
      const note = judged.find((entry) => entry.hitIndex === hits.length - 1);
      const grade = note?.grade ?? 'miss';
      if (note) playBell(lane, isMuted);
      if (!reducedMotion && grade !== 'miss') {
        const flash = block(LANE_X[lane] - 100, 88, 200, 344, COLORS[grade], 0.22, 2);
        flashes[lane] = { obj: flash, until: elapsed + 120 };
      }
      if (!chord && judged.filter((entry) => entry.motif).every((entry) => entry.grade !== 'miss')) {
        chord = true;
        chordElapsed = 0;
        answerText.text = 'The Bell note is yours';
        for (let i = 0; i < 3; i++) k.wait(i * 0.13, () => { if (!leaving) playBell(i, isMuted); });
        if (!reducedMotion) chordBars = LANE_X.map((x) => block(x - 96, STRIKE_Y, 192, 4, COLORS.true, 0.65, 6));
      }
    }
    for (const [lane, keys] of [['left', 'a', '1'], ['down', 's', '2'], ['right', 'd', '3']].entries()) {
      for (const key of keys) k.onKeyPress(key, () => strike(lane));
    }
    k.onKeyPress('escape', () => leave());
    k.onKeyPress('enter', () => { if (end) leave(true); });
    k.onMousePress(() => {
      const point = k.toWorld(k.mousePos());
      if (point.x >= 876 && point.y <= 60) { leave(); return; }
      if (end) { leave(true); return; }
      if (point.y >= 88 && point.y <= 480 && point.x >= 112 && point.x <= 848) {
        strike(Math.min(2, Math.floor((point.x - 112) / 245.34)));
      }
    });
    k.onResize(fitCam);

    k.onUpdate(() => {
      if (leaving) return;
      elapsed += Math.min(k.dt(), 0.05) * 1000;
      if (elapsed < 0) { phraseText.text = `Ready ${Math.ceil(-elapsed / 1000)}`; return; }
      const judged = judge(CHART, hits);
      const active = CHART.filter((note) => elapsed >= note.timeMs - FALL_MS && elapsed <= note.timeMs + 450);
      for (const note of active) {
        const entry = judged[CHART.indexOf(note)];
        const parts = rings.get(note) ?? ringAt(note);
        const y = Math.round((STRIKE_Y - 48 - (note.timeMs - elapsed) * (STRIKE_Y - 48 - 88) / FALL_MS) / 4) * 4;
        const color = entry.hitIndex >= 0 ? COLORS[entry.grade]
          : elapsed > note.timeMs + 150 ? COLORS.miss : COLORS.brass;
        const x = LANE_X[note.lane] - 28;
        const rects = [[x, y], [x, y + 8], [x + 48, y + 8], [x, y + 40]];
        parts.forEach((part, index) => {
          part.pos = k.vec2(...rects[index]);
          part.color = k.Color.fromHex(color);
          part.opacity = entry.hitIndex >= 0 ? 0 : 1;
        });
      }
      for (const [note, parts] of rings) {
        if (active.includes(note)) continue;
        parts.forEach((part) => k.destroy(part));
        rings.delete(note);
      }
      flashes.forEach((flash, index) => {
        if (flash && elapsed >= flash.until) { k.destroy(flash.obj); flashes[index] = null; }
      });
      if (chord && chordBars.length) {
        chordElapsed += k.dt();
        const y = Math.max(0, STRIKE_Y - Math.floor(chordElapsed * 600 / 4) * 4);
        chordBars.forEach((bar) => { bar.pos.y = y; });
        if (y === 0) { chordBars.forEach((bar) => k.destroy(bar)); chordBars = []; }
      }
      const phrase = CHART.find((note) => elapsed < note.timeMs + 800)?.phrase ?? 2;
      phraseText.text = `Phrase ${phrase + 1}/3`;
      coinText.text = `${scoreOf(judged)} coins`;
      if (!end && elapsed > CHART[CHART.length - 1].timeMs + 950) {
        end = true;
        const result = resultOf(judged);
        endText = label(result.won ? 'Enter: collect and return' : 'Try again at the Bell · Enter: return',
          result.won ? 316 : 240, 272, 18);
      }
    });
  });
}
