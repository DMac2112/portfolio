// Folder window (§0.4/§7.11): grid of child app icons. 'auto:games' folders self-populate
// from the registry — adding a game manifest later lists it here with zero edits.
import { folderChildren } from '../registry';
import { useOSStore } from '../store/osStore';
import type { AppProps } from '../types';

export default function FolderApp({ manifest }: AppProps) {
  const children = folderChildren(manifest);
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="folder-grid" role="group" aria-label={`${manifest.title} items`}>
        {children.map((child) => (
          <button
            key={child.id}
            type="button"
            className="folder-item"
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
      <div className="status-bar">
        <p className="status-bar-field">{children.length} object{children.length === 1 ? '' : 's'}</p>
        <p className="status-bar-field">Double-click to open</p>
      </div>
    </div>
  );
}
