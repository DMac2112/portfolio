import { useSyncExternalStore } from 'react';
import { sessionRead, sessionWrite } from '../storage';
import { USER_ID } from '../desktop/iconLayout';
import { announce } from '../store/osStore';

const KEY = `quicklaunch.${USER_ID}`;
const MAX_PINS = 8;
const FORBIDDEN = ['recycle-bin', 'game1'];
let pins: string[] = sessionRead<string[]>(KEY) ?? ['explorer'];
const subs = new Set<() => void>();

export const getPins = (): string[] => pins;
export const isPinned = (id: string): boolean => pins.includes(id);
export function pin(id: string): boolean {
  if (FORBIDDEN.includes(id) || pins.includes(id)) return false;
  if (pins.length >= MAX_PINS) {
    announce('Quick Launch is full. Remove a shortcut first.');
    return false;
  }
  pins = [...pins, id];
  sessionWrite(KEY, pins);
  for (const fn of subs) fn();
  return true;
}
export function unpin(id: string): void {
  if (!pins.includes(id)) return;
  pins = pins.filter((item) => item !== id);
  sessionWrite(KEY, pins);
  for (const fn of subs) fn();
}
export function subscribe(fn: () => void): () => void {
  subs.add(fn);
  return () => subs.delete(fn);
}
export function usePins(): string[] {
  return useSyncExternalStore(subscribe, getPins);
}
