// Image viewer (§7.9): shows manifest.src or a launch payload { src, title }.
import type { AppProps } from '../types';

export default function ImageViewApp({ manifest, props }: AppProps) {
  const payload = (props ?? {}) as { src?: string; title?: string };
  const src = payload.src ?? manifest.src;
  if (!src) return <div className="app-loading">No image to display.</div>;
  return (
    <div className="imageview">
      <div className="imageview__stage">
        <img src={src} alt={payload.title ?? manifest.title} />
      </div>
      <div className="status-bar">
        <p className="status-bar-field">{payload.title ?? src}</p>
      </div>
    </div>
  );
}
