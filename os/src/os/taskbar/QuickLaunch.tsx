import { byId } from '../registry';
import { useOSStore } from '../store/osStore';

const QUICK_IDS = ['explorer', 'game1'];

/** Small one-click launchers next to Start (§5.5). */
export function QuickLaunch() {
  return (
    <div className="quick-launch" role="group" aria-label="Quick launch">
      {QUICK_IDS.map((id) => {
        const app = byId(id);
        if (!app) return null;
        return (
          <button
            key={id}
            type="button"
            title={app.title}
            aria-label={`Launch ${app.title}`}
            onClick={(e) => useOSStore.getState().open(id, { trigger: e.currentTarget })}
          >
            <img src={app.icon} alt="" draggable={false} />
          </button>
        );
      })}
    </div>
  );
}
