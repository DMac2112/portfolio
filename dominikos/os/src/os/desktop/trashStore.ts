import { useSyncExternalStore } from 'react';
import { sessionRead, sessionWrite } from '../storage';
import { USER_ID } from './iconLayout';

export const RELIC_ID = 'game1';
export const TRASHABLE = ['paint', 'dialtone', 'experience', 'resume'] as const;
const KEY = `trash.${USER_ID}`;
let items: string[] = sessionRead<string[]>(KEY)?.filter((id) => TRASHABLE.some((allowed) => allowed === id)) ?? [];
const subs = new Set<() => void>();

export const getTrash = (): string[] => items;
export const isTrashed = (id: string): boolean => items.includes(id);
export function trash(id: string): boolean {
  if (!TRASHABLE.some((allowed) => allowed === id) || items.includes(id)) return false;
  items = [...items, id];
  sessionWrite(KEY, items);
  for (const fn of subs) fn();
  return true;
}
export function restore(id: string): void {
  if (!items.includes(id)) return;
  items = items.filter((item) => item !== id);
  sessionWrite(KEY, items);
  for (const fn of subs) fn();
}
export function restoreAll(): void {
  if (!items.length) return;
  items = [];
  sessionWrite(KEY, items);
  for (const fn of subs) fn();
}
export function subscribe(fn: () => void): () => void {
  subs.add(fn);
  return () => subs.delete(fn);
}
export function useTrash(): string[] {
  return useSyncExternalStore(subscribe, getTrash);
}
