// Folder window (§0.4/§7.11): grid of child app icons. 'auto:games' folders self-populate
// from the registry — adding a game manifest later lists it here with zero edits.
import { useState } from 'react';
import { folderChildren } from '../registry';
import { useTrash } from '../desktop/trashStore';
import { ContextMenu, type CtxMenuState } from '../desktop/ContextMenu';
import { isPinned, pin, unpin } from '../taskbar/quickLaunchStore';
import { useOSStore } from '../store/osStore';
import type { AppProps } from '../types';

export default function FolderApp({ manifest }: AppProps) {
  const trash = useTrash();
  const children = folderChildren(manifest).filter((a) => !trash.includes(a.id));
  const [menu, setMenu] = useState<CtxMenuState | null>(null);
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="folder-grid" role="group" aria-label={`${manifest.title} items`}>
        {children.map((child) => (
          <button
            key={child.id}
            type="button"
            className="folder-item"
            onContextMenu={(e) => {
              e.preventDefault();
              setMenu({ x: e.clientX, y: e.clientY, items: [
                { label: 'Open', bold: true, onPick: () => useOSStore.getState().open(child.id) },
                { label: isPinned(child.id) ? 'Remove from taskbar' : 'Add to taskbar', onPick: () => isPinned(child.id) ? unpin(child.id) : pin(child.id) },
              ] });
            }}
            onDoubleClick={(e) => useOSStore.getState().open(child.id, { trigger: e.currentTarget })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') useOSStore.getState().open(child.id, { trigger: e.currentTarget });
            }}
          >
            <img src={child.icon} alt="" draggable={false} />
            <span>{child.title}</span>
          </button>
        ))}
        {children.length === 0 && <p style={{ gridColumn: '1/-1', color: 'var(--ink-subtle)' }}>This folder is empty.</p>}
      </div>
      <ContextMenu menu={menu} onClose={() => setMenu(null)} />
      <div className="status-bar">
        <p className="status-bar-field">{children.length} object{children.length === 1 ? '' : 's'}</p>
        <p className="status-bar-field">Double-click to open</p>
      </div>
    </div>
  );
}
