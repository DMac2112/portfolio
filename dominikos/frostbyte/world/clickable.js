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
 *   onCurio?:(curioId:string,prop:object)=>void,reducedMotion?:boolean}} opts
 */
export function spawnClickables(k, opts = {}) {
  const props = opts.props ?? [];
  const anyOverlayOpen = opts.anyOverlayOpen ?? (() => false);
  let active = true;

  function trigger(point) {
    if (!active || anyOverlayOpen()) return null;
    const prop = clickableAt(props, point);
    if (!prop) return null;
    reactionBurst(k, prop, Boolean(opts.reducedMotion));
    opts.onReaction?.(prop);
    if (prop.curioId) opts.onCurio?.(prop.curioId, prop);
    return prop;
  }

  // Scene listener, not window/document. It is cancelled explicitly as well as by KAPLAY teardown.
  const mousePress = k.onMousePress(() => trigger(k.toWorld(k.mousePos())));
  k.onSceneLeave(() => {
    active = false;
    mousePress?.cancel?.();
  });

  return {
    trigger,
    destroy() {
      active = false;
      mousePress?.cancel?.();
    },
  };
}
