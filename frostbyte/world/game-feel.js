// world/game-feel.js — small, scene-owned KAPLAY effects. No gameplay state lives here.
const INK = '#091827';
const ICE = '#c8f4ff';
const FROST = '#8eacc6';
const AMBER = '#ffe2a1';
const FADE_S = 0.25;

function fadeRect(k, opacity) {
  return k.add([
    k.rect(k.width(), k.height()), k.pos(0, 0), k.fixed(), k.z(900000),
    k.color(k.Color.fromHex(INK)), k.opacity(opacity),
  ]);
}

export function fadeIn(k, reducedMotion) {
  if (reducedMotion) return;
  const veil = fadeRect(k, 1);
  let t = 0;
  veil.onUpdate(() => {
    t += Math.min(k.dt(), 0.05);
    veil.opacity = Math.max(0, 1 - t / FADE_S);
    if (t >= FADE_S) k.destroy(veil);
  });
}

export function fadeTo(k, reducedMotion, done) {
  if (reducedMotion) { done(); return; }
  const veil = fadeRect(k, 0);
  let t = 0, finished = false;
  veil.onUpdate(() => {
    t += Math.min(k.dt(), 0.05);
    veil.opacity = Math.min(1, t / FADE_S);
    if (!finished && t >= FADE_S) { finished = true; done(); }
  });
}

export function addSnowfall(k, room, reducedMotion) {
  if (reducedMotion || room.id === 'den') return;
  const w = room.gridCols * room.tile * room.scale;
  const h = room.gridRows * room.tile * room.scale;
  const flakes = [];
  for (let layer = 0; layer < 2; layer++) for (let i = 0; i < 18; i++) {
    const size = layer ? 5 + (i % 3) : 2 + (i % 2);
    const obj = k.add([
      k.rect(size, size, { radius: size }),
      k.pos((i * 197 + layer * 71) % w, (i * 89 + layer * 137) % h),
      k.anchor('center'), k.color(k.Color.fromHex(ICE)),
      k.opacity(layer ? 0.64 : 0.38), k.z(layer ? 90000 : -900),
    ]);
    flakes.push({ obj, speed: layer ? 62 + (i % 4) * 6 : 28 + (i % 5) * 4, drift: (i % 2 ? 1 : -1) * (layer ? 12 : 5) });
  }
  k.onUpdate(() => {
    const dt = Math.min(k.dt(), 0.05);
    for (const f of flakes) {
      f.obj.pos.y += f.speed * dt;
      f.obj.pos.x += f.drift * dt;
      if (f.obj.pos.y > h + 10) { f.obj.pos.y = -10; f.obj.pos.x = (f.obj.pos.x + 173) % w; }
      if (f.obj.pos.x < -10) f.obj.pos.x = w + 10;
      else if (f.obj.pos.x > w + 10) f.obj.pos.x = -10;
    }
  });
}

export function createWalkPuffs(k, reducedMotion) {
  if (reducedMotion) return { tick() {} };
  const pool = [];
  for (let i = 0; i < 6; i++) {
    const obj = k.add([
      k.rect(13, 7, { radius: 6 }), k.pos(0, 0), k.anchor('center'),
      k.color(k.Color.fromHex(FROST)), k.opacity(0), k.scale(0.6), k.z(0),
    ]);
    pool.push({ obj, life: 0 });
  }
  let clock = 0, cursor = 0;
  return {
    tick(dt, moving, pos) {
      for (const p of pool) if (p.life > 0) {
        p.life = Math.max(0, p.life - dt);
        p.obj.pos.y -= 13 * dt;
        p.obj.opacity = p.life * 0.62;
        const s = 0.6 + (0.42 - p.life) * 0.9;
        p.obj.scale.x = s; p.obj.scale.y = s;
      }
      if (!moving) { clock = 0; return; }
      clock += dt;
      if (clock < 0.14) return;
      clock = 0;
      const p = pool[cursor++ % pool.length];
      p.life = 0.42; p.obj.pos.x = pos.x + (cursor % 2 ? -10 : 10); p.obj.pos.y = pos.y - 3;
      p.obj.z = pos.y - 1; p.obj.opacity = 0.26; p.obj.scale.x = 0.6; p.obj.scale.y = 0.6;
    },
  };
}

export function showMovePing(k, pos, reducedMotion) {
  if (reducedMotion) return;
  const ping = k.add([
    k.text('◎', { size: 24 }), k.pos(pos.x, pos.y), k.anchor('center'),
    k.color(k.Color.fromHex(ICE)), k.opacity(0.86), k.scale(0.5), k.z(95000),
  ]);
  let t = 0;
  ping.onUpdate(() => {
    t += Math.min(k.dt(), 0.05);
    const s = 0.5 + t * 2.2;
    ping.scale.x = s; ping.scale.y = s; ping.opacity = Math.max(0, 0.86 - t * 2);
    if (t >= 0.45) k.destroy(ping);
  });
}

export function showCoinSparkle(k, pos, reducedMotion) {
  if (reducedMotion) return;
  const spark = k.add([
    k.text('✦', { size: 22 }), k.pos(pos.x, pos.y - 12), k.anchor('center'),
    k.color(k.Color.fromHex(AMBER)), k.opacity(1), k.scale(0.45), k.z(120000),
  ]);
  let t = 0;
  spark.onUpdate(() => {
    t += Math.min(k.dt(), 0.05);
    spark.pos.y -= 32 * Math.min(k.dt(), 0.05);
    const s = Math.min(1.25, 0.45 + t * 3.4);
    spark.scale.x = s; spark.scale.y = s; spark.opacity = Math.max(0, 1 - t * 1.8);
    if (t >= 0.56) k.destroy(spark);
  });
}
