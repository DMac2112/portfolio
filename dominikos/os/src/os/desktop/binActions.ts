import { byId } from '../registry';
import { announce, useOSStore } from '../store/osStore';
import { clearPos } from './iconPosStore';
import { TRASHABLE, trash } from './trashStore';
import { unpin } from '../taskbar/quickLaunchStore';

export function deny(title: string, message: string): void {
  useOSStore.getState().showDialog({ kind: 'denied', title, message });
}

export function sendToBin(ids: string[]): string[] {
  const trashed: string[] = [];
  const protectedIds: string[] = [];
  for (const id of [...new Set(ids)]) {
    if (id === 'recycle-bin') continue;
    if (TRASHABLE.some((allowed) => allowed === id)) {
      if (trash(id)) {
        clearPos(id);
        unpin(id);
        trashed.push(id);
        announce(`${byId(id)?.title ?? id} moved to the Recycle Bin.`);
      }
    } else {
      protectedIds.push(id);
    }
  }
  if (protectedIds.length) {
    const label = protectedIds.length === 1
      ? `Cannot delete ${byId(protectedIds[0])?.title ?? protectedIds[0]}`
      : `Cannot delete these ${protectedIds.length} items`;
    deny('Error Deleting File or Folder', `${label}: Access is denied. You need administrator privileges to do this.`);
  }
  return trashed;
}
