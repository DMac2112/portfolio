// Session lifecycle FSM (DOMINIKOS-PLAN §0.5). Windows are NOT in XState — only the rare
// boot/login/desktop/shutdown lifecycle lives here. Input seeds deep links:
//   ?boot=game → { entry: 'desktop', bootApp: 'game1' } (login skipped).
// LOGOFF is required by §7.10 (Start menu → Log Off returns to login); restart returns to
// login, not full boot.
import { setup } from 'xstate';

export interface SessionInput {
  entry: 'boot' | 'desktop';
  bootApp?: string;
}

export const sessionMachine = setup({
  types: {} as {
    context: { bootProgress: number; bootApp?: string; entry: 'boot' | 'desktop' };
    input: SessionInput;
    events:
      | { type: 'BOOT_DONE' }
      | { type: 'LOGIN' }
      | { type: 'LOGOFF' }
      | { type: 'SHUTDOWN' }
      | { type: 'RESTART' };
  },
  guards: {
    enteredAtDesktop: ({ context }) => context.entry === 'desktop',
  },
}).createMachine({
  id: 'session',
  context: ({ input }) => ({ bootProgress: 0, bootApp: input.bootApp, entry: input.entry }),
  initial: 'boot',
  states: {
    // deep-link path fast-forwards boot+login (§0.5)
    boot: {
      always: { guard: 'enteredAtDesktop', target: 'desktop' },
      on: { BOOT_DONE: 'login' },
    },
    // SHUTDOWN from login: the login screen has a "Turn off computer" button (real-XP parity)
    login: { on: { LOGIN: 'desktop', SHUTDOWN: 'shutdown' } },
    desktop: { on: { SHUTDOWN: 'shutdown', LOGOFF: 'login' } },
    shutdown: { on: { RESTART: 'login' } }, // restart returns to login (not full boot)
  },
});
