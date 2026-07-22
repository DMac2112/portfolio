import { forwardRef } from 'react';
import type { AppManifest } from '../types';

interface Props {
  app: AppManifest;
  selected: boolean;
  tabbable: boolean;
  touch: boolean;
  onSelect: () => void;
  onOpen: (trigger: HTMLElement) => void;
  onIconContextMenu: (e: React.MouseEvent, app: AppManifest) => void;
}

/** One desktop icon. Desktop: single-click selects, double-click opens (§10.2);
 *  touch: single tap opens. Roving tabindex — only the selected icon is tabbable. */
export const DesktopIconView = forwardRef<HTMLButtonElement, Props>(function DesktopIconView(
  { app, selected, tabbable, touch, onSelect, onOpen, onIconContextMenu },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className="desk-icon"
      role="option"
      aria-selected={selected}
      tabIndex={tabbable ? 0 : -1}
      onClick={(e) => {
        if (touch) onOpen(e.currentTarget);
        else onSelect();
      }}
      onDoubleClick={(e) => {
        if (!touch) onOpen(e.currentTarget);
      }}
      onFocus={onSelect}
      onContextMenu={(e) => onIconContextMenu(e, app)}
    >
      <img src={app.icon} alt="" draggable={false} />
      <span>{app.desktop?.label ?? app.title}</span>
    </button>
  );
});
