import { useState } from 'react';
import { StartButton } from './StartButton';
import { StartMenu } from './StartMenu';
import { QuickLaunch } from './QuickLaunch';
import { TaskButtons } from './TaskButtons';
import { SystemTray } from './SystemTray';

interface Props {
  onLogOff: () => void;
  onShutDown: () => void;
  startOpen: boolean;
  setStartOpen: (v: boolean | ((p: boolean) => boolean)) => void;
}

export function Taskbar({ onLogOff, onShutDown, startOpen, setStartOpen }: Props) {
  return (
    <>
      {startOpen && (
        <StartMenu onClose={() => setStartOpen(false)} onLogOff={onLogOff} onShutDown={onShutDown} />
      )}
      <nav className="taskbar" aria-label="Taskbar and Start menu">
        <StartButton open={startOpen} onToggle={() => setStartOpen((p) => !p)} />
        <QuickLaunch />
        <div className="taskbar__divider" />
        <TaskButtons />
        <SystemTray />
      </nav>
    </>
  );
}

/** Local state helper so Desktop owns whether Start is open (keyboard map needs it too). */
export function useStartMenuState() {
  return useState(false);
}
