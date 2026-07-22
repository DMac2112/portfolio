// world/clickable.js — scene-scoped reaction/Curio prop runtime (World Plan W0).
// KAPLAY's touchToMouse:true already turns a tap into one mouse press, so this module deliberately
// registers ONLY onMousePress. Adding an onTouchStart path here would double-fire every tap.

export function clickableAt(props, point) {
  if (!Array.isArray(props) || !point) return null;
  for (let i = props.length - 1; i >= 0; i--) {
    const prop = props[i];
    const halfW = Math.max(1, prop.w ?? 48) / 2;
    const halfH = Math.max(1, prop.h ?? 48) / 2;
    if (Math.abs(point.x - prop.x) <= halfW && Math.abs(point.y - prop.y) <= halfH) return prop;
  }
  return null;
}

function addMotionPiece(k, components, duration, update) {
  const piece = k.add(components);
  const origin = { x: piece.pos.x, y: piece.pos.y };
  let elapsed = 0;
  piece.onUpdate(() => {
    elapsed += Math.min(k.dt(), 0.05);
    const progress = Math.min(1, elapsed / duration);
    update(piece, progress, origin);
    if (progress >= 1) k.destroy(piece);
  });
  return piece;
}

function addVariantReaction(k, prop, color, reducedMotion) {
  const quick = reducedMotion ? 0.22 : 0.7;
  if (prop.reaction === 'snow') {
    const count = reducedMotion ? 3 : 8;
    for (let i = 0; i < count; i++) {
      const x = prop.x - prop.w * 0.42 + (prop.w * 0.84 * i) / Math.max(1, count - 1);
      addMotionPiece(k, [
        k.rect(5, 5, { radius: 3 }), k.pos(x, prop.y - 8 - (i % 3) * 5), k.anchor('center'),
        k.color(color), k.opacity(0.9), k.z(100004),
      ], quick, (piece, progress, origin) => {
        piece.pos.x = origin.x + (reducedMotion ? 0 : Math.sin(progress * 8 + i) * 8);
        piece.pos.y = origin.y + progress * 58;
        piece.opacity = 0.9 * (1 - progress);
      });
    }
  } else if (prop.reaction === 'steam') {
    for (let i = 0; i < 3; i++) {
      addMotionPiece(k, [
        k.rect(10, 10, { radius: 6 }), k.pos(prop.x + (i - 1) * 13, prop.y - 12), k.anchor('center'),
        k.color(color), k.opacity(0.65), k.scale(0.7), k.z(100004),
      ], quick, (piece, progress, origin) => {
        piece.pos.x = origin.x + (reducedMotion ? 0 : Math.sin(progress * 5 + i) * 6);
        piece.pos.y = origin.y - progress * 44;
        const scale = 0.7 + progress * 1.1;
        piece.scale.x = scale; piece.scale.y = scale;
        piece.opacity = 0.65 * (1 - progress);
      });
    }
  } else if (prop.reaction === 'chime') {
    for (let i = 0; i < 3; i++) {
      addMotionPiece(k, [
        k.text('♪', { size: 15 }), k.pos(prop.x + (i - 1) * 18, prop.y), k.anchor('center'),
        k.color(color), k.opacity(0.95), k.z(100004),
      ], quick, (piece, progress, origin) => {
        piece.pos.x = origin.x + (reducedMotion ? 0 : Math.sin(progress * 7 + i) * 5);
        piece.pos.y = origin.y - progress * 30;
        piece.opacity = 0.95 * (1 - progress);
      });
    }
  } else if (prop.reaction === 'wave') {
    for (let i = 0; i < 3; i++) {
      addMotionPiece(k, [
        k.rect(18, 4, { radius: 3 }), k.pos(prop.x - 28 + i * 28, prop.y), k.anchor('center'),
        k.color(color), k.opacity(0.8), k.z(100004),
      ], quick, (piece, progress, origin) => {
        piece.pos.x = origin.x + (reducedMotion ? 0 : Math.sin(progress * Math.PI * 4 + i) * 9);
        piece.pos.y = origin.y - progress * 14;
        piece.opacity = 0.8 * (1 - progress);
      });
    }
  } else if (prop.reaction === 'rattle') {
    for (const offset of [-10, 10]) {
      addMotionPiece(k, [
        k.rect(7, 20, { radius: 3 }), k.pos(prop.x + offset, prop.y), k.anchor('center'),
        k.color(color), k.opacity(0.75), k.z(100004),
      ], reducedMotion ? 0.18 : 0.46, (piece, progress, origin) => {
        piece.pos.x = origin.x + (reducedMotion ? 0 : Math.sin(progress * Math.PI * 10) * 8);
        piece.opacity = 0.75 * (1 - progress);
      });
    }
  } else if (prop.reaction === 'chain') {
    for (let i = 0; i < 7; i++) {
      addMotionPiece(k, [
        k.rect(7, 7, { radius: 3 }),
        k.pos(prop.x - 42 + i * 14, prop.y + (i % 2 ? 8 : -8)), k.anchor('center'),
        k.color(color), k.opacity(0.9), k.scale(0.6), k.z(100004),
      ], reducedMotion ? 0.24 : 0.62, (piece, progress, origin) => {
        const local = Math.max(0, Math.min(1, progress * 2.4 - i * 0.18));
        piece.pos.y = origin.y - (reducedMotion ? 0 : Math.sin(local * Math.PI) * 16);
        const scale = 0.6 + local * 0.8;
        piece.scale.x = scale; piece.scale.y = scale;
        piece.opacity = local >= 1 ? 0 : 0.9;
      });
    }
  } else if (prop.reaction === 'swing') {
    addMotionPiece(k, [
      k.rect(9, 18, { radius: 3 }), k.pos(prop.x, prop.y + 12), k.anchor('center'),
      k.color(color), k.opacity(0.85), k.z(100004),
    ], quick, (piece, progress, origin) => {
      piece.pos.x = origin.x + (reducedMotion ? 0 : Math.sin(progress * Math.PI * 2) * 44);
      piece.pos.y = origin.y + (reducedMotion ? 0 : Math.sin(progress * Math.PI) * 9);
      piece.opacity = 0.85 * (1 - progress);
    });
  } else if (prop.reaction === 'bob') {
    for (let i = 0; i < 3; i++) {
      addMotionPiece(k, [
        k.rect(11, 7, { radius: 4 }), k.pos(prop.x + (i - 1) * 15, prop.y), k.anchor('center'),
        k.color(color), k.opacity(0.8), k.z(100004),
      ], quick, (piece, progress, origin) => {
        piece.pos.y = origin.y + (reducedMotion ? 0 : Math.sin(progress * Math.PI * 4 + i) * 10);
        piece.opacity = 0.8 * (1 - progress);
      });
    }
  } else if (prop.reaction === 'scatter') {
    for (let i = 0; i < (reducedMotion ? 3 : 7); i++) {
      const direction = i % 2 ? 1 : -1;
      addMotionPiece(k, [
        k.text('⌃', { size: 13 }), k.pos(prop.x + (i - 3) * 14, prop.y), k.anchor('center'),
        k.color(color), k.opacity(0.9), k.z(100004),
      ], quick, (piece, progress, origin) => {
        piece.pos.x = origin.x + direction * progress * (18 + i * 5);
        piece.pos.y = origin.y - progress * (24 + (i % 3) * 8);
        piece.opacity = 0.9 * (1 - progress);
      });
    }
  } else if (prop.reaction === 'hum') {
    for (let i = 0; i < 2; i++) {
      addMotionPiece(k, [
        k.rect(18, 8, { radius: 5 }), k.pos(prop.x, prop.y), k.anchor('center'),
        k.color(color), k.opacity(0.6 - i * 0.15), k.scale(1 + i * 0.5), k.z(100004),
      ], quick, (piece, progress) => {
        const scale = (1 + i * 0.5) + (reducedMotion ? 0 : progress * 3);
        piece.scale.x = scale; piece.scale.y = scale;
        piece.opacity = (0.6 - i * 0.15) * (1 - progress);
      });
    }
  }
}

function reactionBurst(k, prop, reducedMotion) {
  const color = k.Color.fromHex(prop.reactionColor ?? '#ffb45e');
  const burst = k.add([
    k.rect(14, 14, { radius: 4 }),
    k.pos(prop.x, prop.y),
    k.anchor('center'),
    k.color(color),
    k.opacity(0.8),
    k.scale(1),
    k.z(100004),
  ]);
  let elapsed = 0;
  burst.onUpdate(() => {
    elapsed += Math.min(k.dt(), 0.05);
    const progress = Math.min(1, elapsed / (reducedMotion ? 0.18 : 0.42));
    const scale = reducedMotion ? 1 : 1 + progress * 2.4;
    burst.scale.x = scale;
    burst.scale.y = scale;
    burst.opacity = 0.8 * (1 - progress);
    if (progress >= 1) k.destroy(burst);
  });
  addVariantReaction(k, prop, color, reducedMotion);

  if (prop.line) {
    const line = k.add([
      k.text(prop.line, { size: 12, width: 220, align: 'center' }),
      k.pos(prop.x, prop.y - 42),
      k.anchor('center'),
      k.color(k.Color.fromHex('#f5fbff')),
      k.opacity(1),
      k.z(100005),
    ]);
    const startY = line.pos.y;
    let lineElapsed = 0;
    line.onUpdate(() => {
      lineElapsed += Math.min(k.dt(), 0.05);
      const progress = Math.min(1, lineElapsed / 1.6);
      line.pos.y = startY - (reducedMotion ? 0 : progress * 18);
      line.opacity = progress < 0.7 ? 1 : 1 - ((progress - 0.7) / 0.3);
      if (progress >= 1) k.destroy(line);
    });
  }
}

/**
 * @param {object} k KAPLAY scene context
 * @param {{props?:object[],anyOverlayOpen?:()=>boolean,onReaction?:(prop:object)=>void,
 *   onCurio?:(curioId:string,prop:object)=>void,isEnabled?:(prop:object)=>boolean,
 *   reducedMotion?:boolean}} opts
 */
export function spawnClickables(k, opts = {}) {
  const props = opts.props ?? [];
  const anyOverlayOpen = opts.anyOverlayOpen ?? (() => false);
  let active = true;
  let handledPress = false;
  const lineIndexes = new Map();

  function trigger(point) {
    if (!active || anyOverlayOpen()) return null;
    const enabledProps = opts.isEnabled ? props.filter((prop) => opts.isEnabled(prop)) : props;
    const hit = clickableAt(enabledProps, point);
    if (!hit) return null;
    const lines = Array.isArray(hit.lines) ? hit.lines.filter(Boolean) : [];
    const lineIndex = lineIndexes.get(hit.id) ?? 0;
    const prop = lines.length ? { ...hit, line: lines[lineIndex % lines.length] } : hit;
    if (lines.length) lineIndexes.set(hit.id, lineIndex + 1);
    reactionBurst(k, prop, Boolean(opts.reducedMotion));
    opts.onReaction?.(prop);
    if (prop.curioId) opts.onCurio?.(prop.curioId, prop);
    return prop;
  }

  // Scene listener, not window/document. It is cancelled explicitly as well as by KAPLAY teardown.
  const mousePress = k.onMousePress(() => { handledPress = Boolean(trigger(k.toWorld(k.mousePos()))); });
  k.onSceneLeave(() => {
    active = false;
    mousePress?.cancel?.();
  });

  return {
    trigger,
    contains: (point) => Boolean(clickableAt(
      opts.isEnabled ? props.filter((prop) => opts.isEnabled(prop)) : props,
      point,
    )),
    consumePress() {
      const handled = handledPress;
      handledPress = false;
      return handled;
    },
    destroy() {
      active = false;
      mousePress?.cancel?.();
    },
  };
}
