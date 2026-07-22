import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

interface FitStageProps {
  width: number;
  height: number;
  children: ReactNode;
}

export default function FitStage({ width, height, children }: FitStageProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const phone = window.matchMedia('(max-width: 520px)');

    const fit = () => {
      const next = phone.matches
        ? Math.min(host.clientWidth / width, host.clientHeight / height, 1)
        : 1;
      setScale(Number.isFinite(next) && next > 0 ? next : 1);
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(host);
    phone.addEventListener('change', fit);
    return () => {
      observer.disconnect();
      phone.removeEventListener('change', fit);
    };
  }, [width, height]);

  const hostStyle = {
    width,
    height,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    overflow: 'hidden',
    '--fit-stage-width': `${width}px`,
    '--fit-stage-height': `${height}px`,
  } as CSSProperties;

  return (
    <div
      ref={hostRef}
      className="arcade__stage fit-stage"
      style={hostStyle}
    >
      <div
        className="fit-stage__surface"
        style={{ width: '100%', height: '100%', flex: 'none', transform: `scale(${scale})`, transformOrigin: 'top center' }}
      >
        {children}
      </div>
    </div>
  );
}
