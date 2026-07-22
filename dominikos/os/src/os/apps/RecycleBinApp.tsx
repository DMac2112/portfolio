// Recycle Bin easter egg (§7.9): one item, "old-portfolio.html". Opening it reveals the gag;
// Restore opens the Explorer app pointed at the live classic site.
import { useState } from 'react';
import { useOSStore } from '../store/osStore';
import type { AppProps } from '../types';

export default function RecycleBinApp(_props: AppProps) {
  const [showNote, setShowNote] = useState(false);
  const restore = (e: React.MouseEvent<HTMLButtonElement>) =>
    useOSStore.getState().open('explorer', { trigger: e.currentTarget });

  return (
    <div className="recyclebin">
      <div className="recyclebin__list">
        <button
          type="button"
          className="folder-item"
          onDoubleClick={() => setShowNote(true)}
          onKeyDown={(e) => e.key === 'Enter' && setShowNote(true)}
          onContextMenu={(e) => {
            e.preventDefault();
            setShowNote(true);
          }}
        >
          <img src="/os/icons/ie-doc.svg" alt="" />
          <span>old-portfolio.html</span>
        </button>
      </div>
      {showNote ? (
        <div className="recyclebin__note">
          <p>
            <strong>old-portfolio.html</strong> — Nah, the old site's still live at{' '}
            <a href="https://dominikmachowiak.com" target="_blank" rel="noopener noreferrer">
              dominikmachowiak.com
            </a>
            .
          </p>
          <button type="button" onClick={restore}>♻ Restore (opens it right here)</button>
        </div>
      ) : (
        <div className="status-bar">
          <p className="status-bar-field">1 object — double-click it, go on</p>
        </div>
      )}
    </div>
  );
}
