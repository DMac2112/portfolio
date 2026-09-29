import { forwardRef, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useElementFullscreen } from '../../hooks/useFullscreen';
import { FullscreenExit } from '../../window/FullscreenExit';

interface FitStageProps {
  width: number;
  height: number;
  children: ReactNode;
}

const FitStage = forwardRef<HTMLDivElement, FitStageProps>(function FitStage({ width, height, children }, ref) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const fs = useElementFullscreen(hostRef);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const fit = () => {
      const border = fs ? 0 : 4;
      const availW = host.clientWidth - border;
      const availH = host.clientHeight - border;
      const next = Math.min(availW / width, availH / height, fs ? Infinity : 1);
      if (Number.isFinite(next) && next > 0) setScale(next);
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(host);
    return () => observer.disconnect();
  }, [width, height, fs]);

  return (
    <div
      ref={(node) => {
        hostRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      className="arcade__stage fit-stage"
      data-fullscreen={fs || undefined}
    >
      <div className="fit-stage__frame" style={{ width: Math.floor(width * scale), height: Math.floor(height * scale) }}>
        <div className="fit-stage__surface" style={{ width, height, transform: `scale(${scale})`, transformOrigin: '0 0' }}>
          {children}
        </div>
      </div>
      <FullscreenExit targetRef={hostRef} />
    </div>
  );
});

export default FitStage;
