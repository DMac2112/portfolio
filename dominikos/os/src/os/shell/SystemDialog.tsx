import { useEffect, useRef, useState } from 'react';
import { useSystem } from '../context/SystemContext';
import { sound } from '../sound';
import { getDialogReturnFocus, useOSStore } from '../store/osStore';

export function RelicIcon({ size = 48 }: { size?: number }) {
  return (
    <span className="relic-icon" style={{ width: size, height: size }} aria-hidden="true">
      <img src="/os/icons/game1.svg" alt="" />
      <svg className="relic-icon__web" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M23 1H1M23 1v22M23 1 4 20M14 1c0 5 3 8 9 9M7 1c0 9 6 14 16 16M16 8l-5-5M18 12l-6-6" fill="none" stroke="#d8d2c4" strokeWidth=".8" />
      </svg>
      {Array.from({ length: 9 }, (_, i) => <i key={i} style={{ '--i': i, '--dx': `${(i - 4) * 5}px` } as React.CSSProperties} />)}
    </span>
  );
}

export function SystemDialog() {
  const dialog = useOSStore((s) => s.dialog);
  const { prefs } = useSystem();
  const prior = useRef<HTMLElement | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (!dialog) return;
    prior.current = getDialogReturnFocus();
    if (dialog.kind === 'denied' && !prefs.muted) sound.ding();
    return () => prior.current?.focus?.();
  }, [dialog, prefs.muted]);

  if (!dialog) return null;
  const dismiss = () => useOSStore.getState().dismissDialog();
  const accept = () => {
    if (dialog.kind !== 'relic') return dismiss();
    dismiss();
    useOSStore.getState().open(dialog.appId, { ...dialog.opts, confirmed: true });
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      e.preventDefault();
      dismiss();
    }
    if (e.key === 'Tab') {
      const buttons = Array.from(box.current?.querySelectorAll<HTMLButtonElement>('button') ?? []);
      const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next = (current + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
      buttons[next]?.focus();
      e.preventDefault();
    }
  };
  const backdrop = () => {
    if (!prefs.muted) sound.ding();
    if (document.documentElement.dataset.motion === 'reduce') return;
    setFlash(false);
    requestAnimationFrame(() => setFlash(true));
    window.setTimeout(() => setFlash(false), 500);
  };

  return (
    <div className="sysdlg-back" onPointerDown={(e) => { if (e.target === e.currentTarget) backdrop(); }}>
      <div ref={box} className={`sysdlg${flash ? ' sysdlg--flash' : ''}`} role="alertdialog" aria-modal="true" aria-labelledby="sysdlg-title" aria-describedby="sysdlg-body" onKeyDown={onKeyDown}>
        <div className="sysdlg__titlebar">
          <span id="sysdlg-title">{dialog.kind === 'relic' ? 'Dev District' : dialog.title}</span>
          <button type="button" className="win__btn win__btn--close" aria-label={dialog.kind === 'relic' ? 'No' : 'OK'} onClick={dismiss}>✕</button>
        </div>
        <div className="sysdlg__body" id="sysdlg-body">
          {dialog.kind === 'relic' ? <RelicIcon /> : (
            <svg className="sysdlg__error" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14" fill="#d8231f" stroke="#8f100d" strokeWidth="2" /><path d="M11 11l10 10m0-10L11 21" stroke="white" strokeWidth="3" strokeLinecap="round" /></svg>
          )}
          <div>{dialog.kind === 'relic' ? (
            <><strong>Dev District is an old, dusty relic.</strong><p>It was retired to the Recycle Bin a while back and hasn't been started since. Boot it up anyway?</p></>
          ) : (
            <><p>{dialog.message}</p><small>Only Dominik can do that on this computer.</small></>
          )}</div>
        </div>
        <div className="sysdlg__buttons">
          {dialog.kind === 'relic' ? (
            <><button type="button" autoFocus onClick={accept}>Yes</button><button type="button" onClick={dismiss}>No</button></>
          ) : <button type="button" autoFocus onClick={dismiss}>OK</button>}
        </div>
      </div>
    </div>
  );
}
