// Card Game Hub — "Gry Karciane" (CARD-HUB-PLAN Step 2): a pure launcher panel with one
// large tile per card game. Titles/icons come from the registry manifests (single source of
// truth); the games themselves stay category:'games' and open as normal singleton windows.
import { byId } from '../../registry';
import { useOSStore } from '../../store/osStore';

// Grows to 4 tiles as games ship: pasjans → freecell → pajak → kierki (CARD-HUB-PLAN Steps 3–5).
const TILES = [{ id: 'pasjans' }, { id: 'freecell' }, { id: 'pajak' }, { id: 'kierki' }];

export default function CardHubApp() {
  return (
    <div className="cardhub" role="group" aria-label="Gry Karciane">
      {TILES.map(({ id }) => {
        const m = byId(id);
        if (!m) return null;
        return (
          <button
            key={id}
            type="button"
            className="cardhub__tile"
            onClick={(e) => useOSStore.getState().open(id, { trigger: e.currentTarget })}
          >
            <img src={m.icon} alt="" draggable={false} />
            <span>{m.title}</span>
          </button>
        );
      })}
    </div>
  );
}
