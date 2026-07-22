// Alt+Tab mini switcher overlay (§11.2). Repeated Tab (Alt held) advances the highlight;
// releasing Alt commits focus via the store facade. Caveat: outside browser fullscreen the
// real OS usually eats Alt+Tab — Ctrl+Esc/Win open the Start menu as the reliable alternates.
import { useOSStore } from '../store/osStore';

export interface AltTabState {
  ids: string[];   // most-recent first
  index: number;
}

export function commitAltTab(state: AltTabState): void {
  const id = state.ids[state.index];
  if (!id) return;
  const s = useOSStore.getState();
  if (s.windows[id]?.state === 'minimized') s.setState(id, 'normal');
  s.focus(id);
}

export function AltTabSwitcher({ state }: { state: AltTabState | null }) {
  const windows = useOSStore((s) => s.windows);
  if (!state || state.ids.length === 0) return null;
  return (
    <div className="alt-tab" aria-hidden="true">
      <div className="alt-tab__panel">
        {state.ids.map((id, i) => {
          const w = windows[id];
          if (!w) return null;
          return (
            <div key={id} className="alt-tab__cell" data-active={i === state.index}>
              <img src={w.icon} alt="" />
              <span>{w.title}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
