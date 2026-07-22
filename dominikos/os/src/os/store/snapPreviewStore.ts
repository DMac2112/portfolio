// Tiny side-store for the drag-time snap preview overlay. Only <SnapPreview> subscribes, so
// per-frame zone updates re-render ONE small component — the main window store stays quiet
// during drags (§4.3: single commit on drop).
import { create } from 'zustand';
import type { SnapZone } from '../types';

interface SnapPreviewState {
  zone: SnapZone;
  setZone: (z: SnapZone) => void;
}

export const useSnapPreview = create<SnapPreviewState>((set) => ({
  zone: null,
  setZone: (zone) => set((s) => (s.zone === zone ? s : { zone })),
}));
