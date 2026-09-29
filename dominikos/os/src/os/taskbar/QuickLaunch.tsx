import { useState } from 'react';
import { byId } from '../registry';
import { useOSStore } from '../store/osStore';
import { usePins, unpin } from './quickLaunchStore';
import { useTrash } from '../desktop/trashStore';
import { ContextMenu, type CtxMenuState } from '../desktop/ContextMenu';

/** Small one-click launchers next to Start (§5.5). */
export function QuickLaunch() {
  const pins = usePins();
  const trash = useTrash();
  const [menu, setMenu] = useState<CtxMenuState | null>(null);
  return (
    <div className="quick-launch" role="group" aria-label="Quick launch">
      {pins.filter((id) => !trash.includes(id)).map((id) => {
        const app = byId(id);
        if (!app) return null;
        return (
          <button
            key={id}
            type="button"
            title={app.title}
            aria-label={`Launch ${app.title}`}
            onClick={(e) => useOSStore.getState().open(id, { trigger: e.currentTarget })}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenu({ x: e.clientX, y: e.clientY, items: [
                { label: 'Open', bold: true, onPick: () => useOSStore.getState().open(id) },
                { separator: true, label: '' },
                { label: 'Remove from taskbar', onPick: () => unpin(id) },
              ] });
            }}
          >
            <img src={app.icon} alt="" draggable={false} />
          </button>
        );
      })}
      <ContextMenu menu={menu} onClose={() => setMenu(null)} />
    </div>
  );
}
