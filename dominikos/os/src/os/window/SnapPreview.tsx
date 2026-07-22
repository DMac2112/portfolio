import { useSnapPreview } from '../store/snapPreviewStore';

/** Translucent zone overlay while dragging into a screen edge (§4.3). */
export function SnapPreview() {
  const zone = useSnapPreview((s) => s.zone);
  if (!zone) return null;
  const style: React.CSSProperties =
    zone === 'top-max'
      ? { inset: 0 }
      : zone === 'left'
        ? { top: 0, bottom: 0, left: 0, width: '50%' }
        : { top: 0, bottom: 0, right: 0, width: '50%' };
  return <div className="snap-preview" style={style} aria-hidden="true" />;
}
