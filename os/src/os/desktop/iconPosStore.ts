// iconPosStore.ts — session-only desktop-icon layout (BROWSER-PLAN §1.2). Plain module +
// useSyncExternalStore; sparse (dragged icons only); keyed per user; survives F5 via
// sessionStorage, dies with the tab. Not part of the §0.6 localStorage session blob.
import { sessionRead, sessionWrite } from '../storage';
import { USER_ID, type CellPos, type IconLayout } from './iconLayout';

const KEY = `icons.${USER_ID}`; // storage prefixes the dmos.v1 namespace

let layout: IconLayout = sessionRead<IconLayout>(KEY) ?? {};
const subs = new Set<() => void>();

export function getLayout(): IconLayout {
  return layout;
}

export function setPos(id: string, cell: CellPos): void {
  layout = { ...layout, [id]: cell };
  sessionWrite(KEY, layout);
  for (const fn of subs) fn();
}

export function subscribe(fn: () => void): () => void {
  subs.add(fn);
  return () => subs.delete(fn);
}
