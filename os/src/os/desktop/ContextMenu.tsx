// Minimal XP-style context menu (§13 P2): desktop → Refresh/About; icon → Open.
import { useEffect, useRef } from 'react';

export interface CtxMenuItem {
  label: string;
  onPick?: () => void;
  separator?: boolean;
  bold?: boolean;
}

export interface CtxMenuState {
  x: number;
  y: number;
  items: CtxMenuItem[];
}

export function ContextMenu({ menu, onClose }: { menu: CtxMenuState | null; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const away = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', away, true);
    document.addEventListener('keydown', esc);
    ref.current?.querySelector('button')?.focus();
    return () => {
      document.removeEventListener('pointerdown', away, true);
      document.removeEventListener('keydown', esc);
    };
  }, [menu, onClose]);

  if (!menu) return null;
  const x = Math.min(menu.x, window.innerWidth - 180);
  const y = Math.min(menu.y, window.innerHeight - menu.items.length * 28 - 16);

  return (
    <div ref={ref} className="ctx-menu" role="menu" style={{ left: x, top: y }}>
      {menu.items.map((item, i) =>
        item.separator ? (
          <hr key={i} />
        ) : (
          <button
            key={i}
            type="button"
            role="menuitem"
            style={item.bold ? { fontWeight: 'bold' } : undefined}
            onClick={() => {
              item.onPick?.();
              onClose();
            }}
          >
            {item.label}
          </button>
        ),
      )}
    </div>
  );
}
