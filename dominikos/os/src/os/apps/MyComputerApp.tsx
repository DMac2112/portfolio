// My Computer (§7.9): fake drives that open real folders + an honest "About this PC".
import { useOSStore } from '../store/osStore';
import type { AppProps } from '../types';

export default function MyComputerApp(_props: AppProps) {
  const open = (id: string) => (e: React.MouseEvent<HTMLButtonElement>) =>
    useOSStore.getState().open(id, { trigger: e.currentTarget });
  return (
    <div className="mycomputer">
      <button type="button" className="mycomputer__drive" onDoubleClick={open('my-projects')} onClick={open('my-projects')}>
        <img src="/os/icons/folder-projects.svg" alt="" />
        <span>
          <strong>Local Disk (C:) — My Projects</strong>
          <br />
          Live client sites and works in progress
        </span>
      </button>
      <button type="button" className="mycomputer__drive" onDoubleClick={open('games')} onClick={open('games')}>
        <img src="/os/icons/folder-games.svg" alt="" />
        <span>
          <strong>CD Drive (D:) — Games</strong>
          <br />
          Playable portfolio experiments
        </span>
      </button>
      <div className="mycomputer__about">
        <strong>About this PC</strong>
        <br />
        DominikOS v0.1 — running on React 18 + Vite + TypeScript (strict), Zustand + XState,
        with XP.css for in-window controls. Window manager, taskbar and boot flow are custom.
      </div>
    </div>
  );
}
