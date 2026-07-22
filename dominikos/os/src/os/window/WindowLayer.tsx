import { useOSStore } from '../store/osStore';
import { Window } from './Window';

/** Maps z-order → <Window/>. Windows stay mounted while minimized (state preservation, §9.2). */
export function WindowLayer() {
  const order = useOSStore((s) => s.order);
  return (
    <>
      {order.map((id) => (
        <Window key={id} instanceId={id} />
      ))}
    </>
  );
}
