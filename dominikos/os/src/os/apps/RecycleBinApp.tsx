import { useState } from 'react';
import { byId } from '../registry';
import { useOSStore } from '../store/osStore';
import { useSystem } from '../context/SystemContext';
import { useTrash, restore, restoreAll } from '../desktop/trashStore';
import { deny } from '../desktop/binActions';
import { ContextMenu, type CtxMenuState } from '../desktop/ContextMenu';
import { RelicIcon } from '../shell/SystemDialog';
import type { AppProps } from '../types';

export default function RecycleBinApp(_props: AppProps) {
  const [showNote, setShowNote] = useState(false);
  const [menu, setMenu] = useState<CtxMenuState | null>(null);
  const trash = useTrash();
  const { input } = useSystem();
  const open = (id: string, trigger?: HTMLElement) => useOSStore.getState().open(id, { trigger });
  const restoreClassic = (e: React.MouseEvent<HTMLButtonElement>) => open('explorer', e.currentTarget);
  const relicDenied = (verb: string) => deny('Error Deleting File or Folder', `Cannot ${verb} Dev District: You need administrator privileges to do this.`);
  const itemMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const app = byId(id);
    if (!app) return;
    setMenu({ x: e.clientX, y: e.clientY, items: id === 'game1' ? [
      { label: 'Open', bold: true, onPick: () => open(id) },
      { label: 'Restore', onPick: () => relicDenied('restore') },
      { label: 'Delete', onPick: () => relicDenied('delete') },
    ] : [
      { label: 'Restore', bold: true, onPick: () => restore(id) },
      { label: 'Open', onPick: () => open(id) },
      { separator: true, label: '' },
      { label: 'Delete', onPick: () => deny('Error Deleting File or Folder', `Cannot delete ${app.title} permanently: You need administrator privileges to do this.`) },
    ] });
  };
  const activation = (id: string) => ({
    onDoubleClick: (e: React.MouseEvent<HTMLButtonElement>) => open(id, e.currentTarget),
    onClick: input === 'touch' ? (e: React.MouseEvent<HTMLButtonElement>) => open(id, e.currentTarget) : undefined,
    onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Enter') open(id, e.currentTarget);
    },
    onContextMenu: (e: React.MouseEvent<HTMLButtonElement>) => itemMenu(e, id),
  });

  return (
    <div className="recyclebin">
      <div className="recyclebin__tasks">
        <button type="button" onClick={() => deny('Empty Recycle Bin', 'Cannot empty the Recycle Bin: You need administrator privileges to do this.')}>Empty Recycle Bin</button>
        <button type="button" disabled={!trash.length} onClick={() => restoreAll()}>Restore all items</button>
      </div>
      <div className="recyclebin__list">
        <button type="button" className="folder-item" title="Original location: C:\Games" {...activation('game1')}>
          <RelicIcon size={40} />
          <span>Dev District</span>
        </button>
        <button
          type="button"
          className="folder-item"
          onDoubleClick={() => setShowNote(true)}
          onClick={input === 'touch' ? () => setShowNote(true) : undefined}
          onKeyDown={(e) => e.key === 'Enter' && setShowNote(true)}
          onContextMenu={(e) => { e.preventDefault(); setShowNote(true); }}
        >
          <img src="/os/icons/ie-doc.svg" alt="" />
          <span>old-portfolio.html</span>
        </button>
        {trash.map((id) => {
          const app = byId(id);
          return app && (
            <button key={id} type="button" className="folder-item" {...activation(id)}>
              <img src={app.icon} alt="" />
              <span>{app.title}</span>
            </button>
          );
        })}
      </div>
      <ContextMenu menu={menu} onClose={() => setMenu(null)} />
      {showNote ? (
        <div className="recyclebin__note">
          <p>
            <strong>old-portfolio.html</strong> — Nah, the old site's still live at{' '}
            <a href="https://dominikmachowiak.com" target="_blank" rel="noopener noreferrer">
              dominikmachowiak.com
            </a>
            .
          </p>
          <button type="button" onClick={restoreClassic}>♻ Restore (opens it right here)</button>
        </div>
      ) : null}
      <div className="status-bar">
        <p className="status-bar-field">{trash.length + 2} objects</p>
      </div>
    </div>
  );
}
