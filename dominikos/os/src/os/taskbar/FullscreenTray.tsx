import { useEffect, useRef, useState } from 'react';
import { isFreeFloat } from '../env';
import { fullscreenElement, requestOSFullscreen, useFullscreen } from '../hooks/useFullscreen';
import { useOSStore } from '../store/osStore';
import { sessionRead, sessionWrite } from '../storage';

const FLAG = 'fullscreenTip';
const supported = () => document.fullscreenEnabled || !!(document as Document & { webkitFullscreenEnabled?: boolean }).webkitFullscreenEnabled;
const nativeFull = () => !fullscreenElement() && innerWidth >= screen.width - 1 && innerHeight >= screen.height - 1;

export function FullscreenTray() {
  const { isFullscreen } = useFullscreen();
  const [native, setNative] = useState(nativeFull);
  const [tip, setTip] = useState<'intro' | 'native' | null>(null);
  const [position, setPosition] = useState({ right: 12, bottom: 42 });
  const button = useRef<HTMLButtonElement>(null);
  const timer = useRef<number | null>(null);

  const show = (kind: 'intro' | 'native') => {
    const rect = button.current?.getBoundingClientRect();
    if (rect) setPosition({ right: Math.max(8, innerWidth - rect.right), bottom: innerHeight - rect.top + 8 });
    setTip(kind);
    if (timer.current) clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setTip(null), kind === 'intro' ? 12000 : 5000);
  };
  useEffect(() => {
    const resize = () => setNative(nativeFull());
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  useEffect(() => {
    if (!isFreeFloat() || !supported() || isFullscreen || native || sessionRead<boolean>(FLAG)) return;
    const pending = window.setTimeout(() => {
      if (useOSStore.getState().order.some((id) => useOSStore.getState().windows[id]?.state === 'maximized')) return;
      sessionWrite(FLAG, true);
      show('intro');
    }, 1500);
    return () => clearTimeout(pending);
  }, [isFullscreen, native]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  if (!supported()) return null;
  const active = isFullscreen || native;
  const toggle = () => {
    if (isFullscreen) document.exitFullscreen?.();
    else if (native) show('native');
    else requestOSFullscreen();
    if (!native) setTip(null);
  };
  return (
    <>
      <button ref={button} type="button" aria-label={active ? 'Exit full screen (F11)' : 'Full screen (F11)'} title={active ? 'Exit full screen (F11)' : 'Full screen (F11)'} onClick={toggle}>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d={active ? 'M1 6h5V1M10 1v5h5M15 10h-5v5M6 15v-5H1' : 'M6 1H1v5M10 1h5v5M15 10v5h-5M1 10v5h5'} fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="square" />
        </svg>
      </button>
      {tip && <div className="balloon" role="status" style={position}>
        <div className="balloon__head"><svg className="balloon__info" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="#2a63d4" stroke="#123f9c" /><circle cx="8" cy="4.6" r="1.1" fill="#fff" /><path d="M8 7v5" stroke="#fff" strokeWidth="2" /></svg><strong>{tip === 'intro' ? 'Go full screen' : 'Full screen'}</strong><button type="button" aria-label="Close tip" onClick={() => setTip(null)}>✕</button></div>
        <button type="button" className="balloon__body" onClick={() => { if (tip === 'intro') requestOSFullscreen(); setTip(null); }}>
          {tip === 'intro' ? 'DominikOS looks best without the browser around it. Click here or press F11.' : 'Press F11 to exit full screen.'}
        </button>
      </div>}
    </>
  );
}
