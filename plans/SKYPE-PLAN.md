# FAKE CALL APP ("Skype" homage) — DominikOS build plan

A retro voice/video-call app that *pretends* to work: you can browse contacts and place a call, but
nobody ever picks up — it rings, then reports "No answer." Pure theatre, no network.

Status: **PLAN ONLY — not built.** Root: `C:\Users\domin\OneDrive\Desktop\Websites\dominikos\os`.

---

## 0. What this is (and the naming/legal note)

An early-2000s desktop call client — contact list with presence dots, a big "call" button, a ringing
screen, and a chat panel. Everything is fake: calling a contact rings forever until you hang up (or
times out to "No answer"); chat messages get no reply (or a canned auto-away line). It's a flavour
app like My Computer / Recycle Bin — atmosphere, not function.

**Naming (decision needed): "Skype" is a trademark**, so — exactly as we did for Sky Hopper vs "Flappy
Bird" — the app ships under an **original name with an original logo**, evoking the era without the
brand. Recommended: **"Dialtone"** (alternatives: *PicoCall*, *Blabber*, *Voxi*, *Chatterbox*,
*Ringer*). This plan uses the id `dialtone`. The logo is an original code-drawn mark (a pixel
speech-bubble/handset), not the trademarked one.

**Architecture:** a DOM app. No canvas, no `useGameLoop`. A tiny pure state machine drives the call
(idle → dialing → ringing → no-answer → ended); the ring cadence + the "no answer" timeout are
`setInterval`/`setTimeout` gated on the §8.4 active booleans (they pause when the window is
unfocused/hidden/minimised, so a backgrounded call doesn't keep ringing).

---

## 1. Files & integration

| File | Purpose |
|---|---|
| `src/os/apps/dialtone/callMachine.ts` | pure call state machine (LOCKED, unit-tested) |
| `src/os/apps/dialtone/callMachine.test.ts` | vitest headless suite (§5) |
| `src/os/apps/dialtone/DialtoneApp.tsx` | contact list + call screen + chat UI |
| `src/os/apps/dialtone/contacts.ts` | the fictional contact roster (data) |
| `registry/dialtone.json` | manifest (`kind:"react"`, `category:"apps"`) |
| `public/icons/dialtone.svg` | original 48×48 icon |
| `src/styles/globals.css` | a `/* ==== Dialtone ==== */` block |
| `ASSET-CREDITS.md` | one credit row |
| `src/os/registry.ts` | one line into `componentById` |

**`registry/dialtone.json`:**
```json
{
  "id": "dialtone",
  "title": "Dialtone",
  "kind": "react",
  "icon": "/os/icons/dialtone.svg",
  "category": "apps",
  "desktop": { "show": true, "order": 7 },
  "startMenu": { "show": true, "group": "Programs" },
  "window": { "width": 500, "height": 560, "minWidth": 380, "minHeight": 440, "singleton": true, "maximizedOnMobile": true }
}
```
**`registry.ts`** → `componentById`: `dialtone: lazy(() => import('./apps/dialtone/DialtoneApp')),`.

---

## 2. Call state machine — `callMachine.ts` (LOCKED, unit-tested)

Deterministic and time-injected so it tests headlessly (no wall clock, no DOM).
```ts
export type CallPhase = 'idle' | 'dialing' | 'ringing' | 'noanswer' | 'ended';
export interface CallState { phase: CallPhase; contactId: string | null; elapsed: number; rings: number; }
export interface CallEvent { type: 'dial' | 'ring' | 'answer-timeout' | 'hangup'; }  // 'answer' intentionally never sent

export const DIAL_MS = 1200;        // "Calling…" beat before it starts ringing
export const RING_MS = 3200;        // one ring cycle
export const MAX_RINGS = 8;         // after this many unanswered rings -> 'noanswer'

export function newCall(): CallState;
export function dial(s: CallState, contactId: string): CallState;   // idle -> dialing
export function tick(s: CallState, dtMs: number): CallState;        // advances dialing->ringing->noanswer
export function hangup(s: CallState): CallState;                    // -> 'ended' from any active phase
// NOTE: there is deliberately NO answer() — the callee never picks up. That is the whole joke.
```
Flow: `dial` → `dialing`; `tick` accumulates `elapsed`; after `DIAL_MS` → `ringing`; every `RING_MS`
increments `rings` (the UI plays a ring cue); after `MAX_RINGS` → `noanswer`; `hangup` → `ended`.
Pure, so the UI just feeds it `tick(dt)` from an interval and reads `phase`/`rings` to drive sound + UI.

---

## 3. Contacts — `contacts.ts`

A fixed roster of fictional characters (never real people), each `{ id, name, tagline, presence,
avatarSeed }` where `presence ∈ 'online'|'away'|'busy'|'offline'`. A dozen playful entries fit the
portfolio's tone (e.g. "Clippy's Cousin", "The Recruiter", "Mum", "Nokia 3310", "Dial-up Modem").
Avatars are original code-drawn pixel monograms coloured by `avatarSeed` (no photos). Presence dots:
green/amber/red/grey. **Everyone is unreachable regardless of presence** — presence is set dressing.

Optionally include a single "real" pinned contact card for Dominik (name + a link back to the
résumé/contact app) as a subtle CTA — but even *that* call goes unanswered, with a jokey
"leave a message → opens the Contact app" fallback.

---

## 4. UI plan — `DialtoneApp.tsx`

Two views inside the window:
- **Roster** (default): search box, a scrollable contact list (avatar · name · presence dot ·
  tagline), and a footer showing "You — Dominik" with a presence toggle (cosmetic). Clicking a
  contact opens their card with **Call** / **Video Call** / **Chat** buttons.
- **Call screen** (modal over the roster when `phase !== 'idle'`): big avatar, name, a status line
  driven by the machine — "Calling…", then "Ringing…" with an animated ripple, then after
  `MAX_RINGS` "No answer." A **red Hang up** button always cancels. Video call = same, but shows a
  static "camera off" tile (or a looping pixel-noise placeholder) since there's no feed.
- **Chat panel**: type + send; your bubbles appear; the contact **never replies** — after a beat an
  italic system line appears: "*{name} is away and can't reply right now.*" (canned; no AI, no net).

**Sound** (`tone()`, gated on `prefs.muted`): a two-tone **ring** cue each `RING_MS` while `ringing`;
a short **dial blip** on connect; a descending **hang-up** tone on end. All synth (no audio files).

**§8.4:** the machine's driving interval + the ring cues only run while `active`; a call paused by
unfocus resumes cleanly (no runaway ringing in the background).

**a11y:** contacts + buttons are real `<button>`s with `aria-label`s; an `sr-only`
`aria-live="assertive"` announces call status ("Calling {name}", "Ringing", "No answer",
"Call ended"); the roster is keyboard-navigable (roving tabindex); Esc / Enter map to hang-up /
call. **reducedMotion:** the ripple/pulse animations become static.

**Pixel/XP look:** original pixel logo + avatars (crispEdges SVG), hard-bevel buttons, no
border-radius — consistent with the rest of the desktop.

---

## 5. Unit test plan (`callMachine.test.ts`, vitest, headless)

1. `newCall()` → `idle`, no contact.
2. `dial(s,'x')` → `dialing`, contact set, `elapsed 0`, `rings 0`.
3. `tick` past `DIAL_MS` → `ringing`.
4. Repeated `tick` increments `rings` once per `RING_MS` (not per tick); never skips.
5. After `MAX_RINGS` rings → `noanswer` (and stays there under further ticks — never `answered`,
   because no `answer()` exists).
6. `hangup` from `dialing`/`ringing` → `ended`; `tick` after `ended` is a no-op.
7. `dial` while already in a call is ignored (or resets — pick one; test the chosen semantics).
8. Determinism: the same tick sequence yields the same phase/rings every run.

---

## 6. Resolved decisions

1. **Original name + logo** ("Dialtone") — "Skype" is trademarked; homage, not reproduction.
2. **No `answer()` transition exists** — the callee can never pick up; that's the feature.
3. **Time-injected pure machine** (`tick(dtMs)`) so it's deterministic + testable; the UI supplies dt.
4. **§8.4-gated interval** so a backgrounded call stops ringing.
5. **Fictional contacts only** (no real people); avatars are code-drawn monograms.
6. **Chat is one-sided** with a canned away-line; no network, no AI.
7. **DOM app**, `category:"apps"`, desktop icon + Programs menu.

---

## 7. Implementation phases

- **P1 — Machine:** `callMachine.ts` + tests green (bounded `vitest run`).
- **P2 — Data + UI:** `contacts.ts`, `DialtoneApp.tsx` (roster, call screen, chat), CSS, icon, avatars.
- **P3 — Wire-up:** manifest, registry line, credits.
- **P4 — CI:** `npm run ci` green (one bounded run).
- **P5 — Review + deploy:** adversarial review (a11y, §8.4 timers, "never answers" invariant) →
  fix → `deploy:local` → manual test → Netlify.

---

## 8. Open questions for Dominik

1. **Name:** "Dialtone" (recommended) or another original name? (Not "Skype" — trademark.)
2. **Contacts:** playful fictional roster, or a specific set you want (still fictional)?
3. **On "No answer":** stop at a "No answer" card, or auto-offer "Leave a message" → opens Contact app?
4. **Video call:** static "camera off" tile, or a looping pixel-noise placeholder?
5. Desktop icons for Paint + Dialtone on by default?
