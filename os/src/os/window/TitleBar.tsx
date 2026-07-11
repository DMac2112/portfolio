import type { AppManifest, WindowInstance } from '../types';

interface TitleBarProps {
  win: WindowInstance;
  manifest: AppManifest;
  dragHandlers: {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => void;
  };
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onClose: () => void;
  onFullscreen?: () => void; // games only (§4.3)
}

export function TitleBar({ win, manifest, dragHandlers, onMinimize, onToggleMaximize, onClose, onFullscreen }: TitleBarProps) {
  const maximizable = manifest.window.maximizable ?? true;
  const maximized = win.state === 'maximized';
  return (
    <div
      className="win__titlebar"
      {...dragHandlers}
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).closest('.win__controls')) return;
        if (maximizable) onToggleMaximize();
      }}
    >
      <img className="win__icon" src={win.icon} alt="" draggable={false} />
      <span className="win__title" id={`win-${win.instanceId}-title`}>
        {win.title}
      </span>
      <div className="win__controls">
        {onFullscreen && (
          <button type="button" className="win__btn win__btn--full" aria-label="Fullscreen this window" onClick={onFullscreen} />
        )}
        <button type="button" className="win__btn win__btn--min" aria-label="Minimize" onClick={onMinimize} />
        {maximizable && (
          <button
            type="button"
            className={`win__btn ${maximized ? 'win__btn--restore' : 'win__btn--max'}`}
            aria-label={maximized ? 'Restore' : 'Maximize'}
            onClick={onToggleMaximize}
          />
        )}
        <button type="button" className="win__btn win__btn--close" aria-label="Close" onClick={onClose} />
      </div>
    </div>
  );
}
