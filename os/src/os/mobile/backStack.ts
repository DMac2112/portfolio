// Explicit mobile history machine (DOMINIKOS-PLAN §10.4) — NOT pushState-per-window, which
// traps visitors behind N back-presses. Model: chooser → desktop → window with a SINGLE
// window-level entry that is REPLACED as the visible app changes:
//   · entering the mobile desktop pushes ONE {os:'desktop'} state
//   · the first open pushes ONE {os:'window'} state; switching apps replaces it
//   · Back from a window → close it, land on the desktop grid (one press)
//   · Back from the bare desktop → leave the OS (to the referrer/chooser)
type OSHistoryState = { os: 'desktop' } | { os: 'window'; id: string };

let hasWindowEntry = false;
let onBackToDesktop: (() => void) | null = null;

function state(): OSHistoryState | null {
  const s = window.history.state as OSHistoryState | null;
  return s && (s.os === 'desktop' || s.os === 'window') ? s : null;
}

export const backStack = {
  /** call once when the mobile desktop mounts */
  enterDesktop(onBack: () => void): () => void {
    onBackToDesktop = onBack;
    const s = state();
    if (s?.os === 'window') {
      // stale window-entry left on this history entry by a previous visit — normalize it
      window.history.replaceState({ os: 'desktop' } satisfies OSHistoryState, '');
      hasWindowEntry = false;
    } else if (s?.os !== 'desktop') {
      window.history.pushState({ os: 'desktop' } satisfies OSHistoryState, '');
    }
    const pop = () => {
      const s = state();
      if (s?.os === 'desktop') {
        hasWindowEntry = false;
        onBackToDesktop?.(); // close the visible window, show the grid
      }
      // anything else: the user is leaving the OS — let the browser do its thing
    };
    window.addEventListener('popstate', pop);
    return () => {
      window.removeEventListener('popstate', pop);
      onBackToDesktop = null;
    };
  },

  /** call whenever a window becomes the visible app */
  showWindow(id: string): void {
    const entry: OSHistoryState = { os: 'window', id };
    if (hasWindowEntry || state()?.os === 'window') {
      window.history.replaceState(entry, ''); // switching apps never stacks
    } else {
      window.history.pushState(entry, '');
      hasWindowEntry = true;
    }
  },

  /** call when the visible window was closed by UI (not by Back) */
  windowClosedByUI(): void {
    if (hasWindowEntry && state()?.os === 'window') {
      hasWindowEntry = false;
      // consume our own window entry so the NEXT Back exits from the desktop, not to it
      window.history.replaceState({ os: 'desktop' } satisfies OSHistoryState, '');
    }
  },
};
