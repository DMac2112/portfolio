// One taskbar button per open window, in LAUNCH order (z-order lives in the window layer).
// Click: focus/restore, or minimize if already focused (§4.3).
import { useMemo } from 'react';
import { useOSStore } from '../store/osStore';

export function TaskButtons() {
  const windows = useOSStore((s) => s.windows);
  const focusedId = useOSStore((s) => s.focusedId);
  const list = useMemo(
    () => Object.values(windows).sort((a, b) => a.createdAt - b.createdAt),
    [windows],
  );

  return (
    <div className="task-buttons" role="group" aria-label="Open windows">
      {list.map((w) => {
        const active = focusedId === w.instanceId && w.state !== 'minimized';
        return (
          <button
            key={w.instanceId}
            type="button"
            className="taskbar-btn"
            data-taskbtn={w.instanceId}
            aria-pressed={active}
            title={w.title}
            onClick={() => {
              const s = useOSStore.getState();
              if (active) s.setState(w.instanceId, 'minimized');
              else if (w.state === 'minimized') s.setState(w.instanceId, 'normal');
              else s.focus(w.instanceId);
            }}
          >
            <img src={w.icon} alt="" draggable={false} />
            <span>{w.title}</span>
          </button>
        );
      })}
    </div>
  );
}
