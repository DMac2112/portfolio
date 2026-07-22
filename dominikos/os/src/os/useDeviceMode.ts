// Live device/input mode (DOMINIKOS-PLAN §10.2). Width + pointer capability are tracked
// separately; SystemContext mirrors the result onto <html data-device data-input>.
import { useEffect, useState } from 'react';
import { getDeviceMode, getInputMode } from './env';
import type { DeviceMode, InputMode } from './types';

export function useDeviceMode(): { device: DeviceMode; input: InputMode } {
  const [device, setDevice] = useState<DeviceMode>(() => getDeviceMode());
  const [input, setInput] = useState<InputMode>(() => getInputMode());

  useEffect(() => {
    const onResize = () => setDevice(getDeviceMode());
    const mq = window.matchMedia('(pointer: coarse)');
    const onPointer = () => setInput(getInputMode());
    window.addEventListener('resize', onResize);
    mq.addEventListener?.('change', onPointer);
    return () => {
      window.removeEventListener('resize', onResize);
      mq.removeEventListener?.('change', onPointer);
    };
  }, []);

  return { device, input };
}
