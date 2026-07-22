// Skajp — DominikOS fake call app (kind:'react' via componentById; internal id stays `dialtone`).
// An affectionate homage to the 2010-era desktop call/IM clients: browse contacts, place a call,
// and… nobody ever
// answers. Pure theatre — no network, no AI. It's a DOM app (no canvas/useGameLoop): the pure
// machine in ./callMachine drives the call, fed real elapsed time from a §8.4-gated interval,
// so a backgrounded call stops ringing and resumes cleanly.
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { AppProps } from '../../types';
import { useOSStore } from '../../store/osStore';
import { useSystem } from '../../context/SystemContext';
import { usePageVisible } from '../../hooks/usePageVisible';
import { tone } from '../../sound';
import { newCall, dial, tick, hangup, type CallState } from './callMachine';
import { CONTACTS, contactById, initials, avatarColor, PRESENCE_LABEL, type Contact, type Presence } from './contacts';

type View = { kind: 'roster' } | { kind: 'card'; id: string } | { kind: 'chat'; id: string };
interface Msg { from: 'me' | 'sys'; text: string; }
type SfxKind = 'blip' | 'ring' | 'busy' | 'hangup' | 'send' | 'recv';

const DOT: Record<Presence, string> = { online: '#3fbf3f', away: '#e8b23c', busy: '#d24545', offline: '#9a9a9a' };

function awayLine(c: Contact): string {
  const verb = c.presence === 'online' ? 'is online but mysteriously can’t' : `is ${c.presence} and can’t`;
  return `${c.name} ${verb} reply right now.`;
}

/* --------------------------------- glyphs --------------------------------- */
/* All smooth vector — the 2010-era client this evokes had anti-aliased, rounded art, so
   nothing here snaps to the pixel grid (no shapeRendering="crispEdges" anywhere). */

/** Lighten a hex by mixing toward white, for the avatar's top-to-bottom sheen. */
function lighten(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix((n >> 16) & 255)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}

/** Presence badge: a filled disc with a white glyph, the way the era signalled status. */
function PresenceBadge({ p, size }: { p: Presence; size: number }): JSX.Element {
  const stroke = { strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none', stroke: '#fff' };
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className="dialtone__badge" aria-hidden="true">
      <circle cx="8" cy="8" r="8" fill="#fff" />
      <circle cx="8" cy="8" r="6.6" fill={DOT[p]} />
      {p === 'online' && <path d="M4.9 8.3l2.1 2.1 4.1-4.5" {...stroke} />}
      {p === 'away' && <path d="M8 4.6V8.2l2.4 1.6" {...stroke} />}
      {p === 'busy' && <path d="M4.8 8h6.4" {...stroke} />}
      {p === 'offline' && <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" {...stroke} />}
    </svg>
  );
}

function Avatar({ c, size, badge }: { c: Contact; size: number; badge?: boolean }): JSX.Element {
  const base = avatarColor(c.avatarSeed);
  const gid = `sk-ava-${c.id}-${size}`;
  const art = (
    <svg viewBox="0 0 40 40" width={size} height={size} className="dialtone__avatar" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={lighten(base, 0.30)} />
          <stop offset="0.52" stopColor={base} />
          <stop offset="1" stopColor={lighten(base, -0.001)} />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="40" height="40" rx="5" fill={`url(#${gid})`} />
      <path d="M0 5a5 5 0 0 1 5-5h30a5 5 0 0 1 5 5v9C31 19 9 19 0 14z" fill="rgba(255,255,255,.22)" />
      <text x="20" y="26" textAnchor="middle" fontSize="16" fontWeight="600" fill="#fff"
            fontFamily="'Segoe UI', system-ui, sans-serif" letterSpacing="0.5">{initials(c.name)}</text>
      <rect x="0.5" y="0.5" width="39" height="39" rx="4.5" fill="none" stroke="rgba(0,0,0,.22)" />
    </svg>
  );
  if (!badge) return art;
  return (
    <span className="dialtone__ava">
      {art}
      <PresenceBadge p={c.presence} size={Math.max(11, Math.round(size * 0.38))} />
    </span>
  );
}

function Dot({ p }: { p: Presence }): JSX.Element {
  return <PresenceBadge p={p} size={13} />;
}

/** Original Skajp mark: a rounded cloud-bubble holding a handset. Ours, not traced. */
function Logo(): JSX.Element {
  return (
    <svg viewBox="0 0 48 48" className="dialtone__logo" aria-hidden="true">
      <defs>
        <linearGradient id="sk-logo-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4fd0ff" /><stop offset="0.5" stopColor="#00aff0" /><stop offset="1" stopColor="#0089c8" />
        </linearGradient>
        <linearGradient id="sk-logo-gloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M16 9h16a11 11 0 0 1 0 22h-6l-8.5 7.5a1 1 0 0 1-1.6-.9L16.6 31H16a11 11 0 0 1 0-22z"
            fill="url(#sk-logo-body)" stroke="#0072a8" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M16 10.4h16a9.6 9.6 0 0 1 8.9 6C38.6 14 31.8 12.6 24 12.6S9.4 14 7.1 16.4a9.6 9.6 0 0 1 8.9-6z" fill="url(#sk-logo-gloss)" />
      <g transform="rotate(-28 24 20)">
        <path d="M15.4 15.8a2.6 2.6 0 0 1 2.6-2.6h1.3a1.7 1.7 0 0 1 1.7 1.5l.4 3a1.7 1.7 0 0 1-1 1.8l-1.5.7a13 13 0 0 0 6.2 6.2l.7-1.5a1.7 1.7 0 0 1 1.8-1l3 .4a1.7 1.7 0 0 1 1.5 1.7v1.3a2.6 2.6 0 0 1-2.6 2.6A17.5 17.5 0 0 1 15.4 15.8z" fill="#fff" />
      </g>
    </svg>
  );
}

function CallGlyph(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <path d="M5.4 4.2a2.4 2.4 0 0 1 2.4-2.4h1.1a1.6 1.6 0 0 1 1.6 1.4l.4 2.8a1.6 1.6 0 0 1-.9 1.7l-1.4.7a12.2 12.2 0 0 0 5.8 5.8l.7-1.4a1.6 1.6 0 0 1 1.7-.9l2.8.4a1.6 1.6 0 0 1 1.4 1.6v1.1a2.4 2.4 0 0 1-2.4 2.4A16.4 16.4 0 0 1 5.4 4.2z"
            fill="currentColor" transform="translate(1.2 1.6)" />
    </svg>
  );
}

function CamOff(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true">
      <rect x="2" y="7" width="13" height="10" rx="2.4" fill="#26333f" stroke="#4a5d6e" strokeWidth="1.2" />
      <path d="M15.6 10.4l5-2.6a.8.8 0 0 1 1.2.7v6.9a.8.8 0 0 1-1.2.7l-5-2.6z" fill="#26333f" stroke="#4a5d6e" strokeWidth="1.2" strokeLinejoin="round" />
      <line x1="3.4" y1="19.6" x2="20.6" y2="4.4" stroke="#e0574b" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/* -------------------------------- component ------------------------------- */

export default function DialtoneApp({ windowId, focused, setTitle }: AppProps) {
  const { prefs } = useSystem();
  const visible = usePageVisible();
  const minimized = useOSStore((st) => st.windows[windowId]?.state === 'minimized');
  const active = focused && visible && !minimized;

  const [view, setView] = useState<View>({ kind: 'roster' });
  const [call, setCall] = useState<CallState>(newCall());
  const [isVideo, setIsVideo] = useState(false);
  const [q, setQ] = useState('');
  const [cursor, setCursor] = useState(0);
  const [myStatus, setMyStatus] = useState<Presence>('online');
  const [chats, setChats] = useState<Record<string, Msg[]>>({});
  const [draft, setDraft] = useState('');
  const [owed, setOwed] = useState<{ id: string; n: number } | null>(null);
  const [live, setLive] = useState('');

  const callRef = useRef(call); callRef.current = call;
  const viewRef = useRef(view); viewRef.current = view;
  const listRef = useRef<HTMLDivElement>(null);
  const msgsRef = useRef<HTMLDivElement>(null);
  const hangupRef = useRef<HTMLButtonElement>(null);
  const noAnswerRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const callBtnRef = useRef<HTMLButtonElement>(null);
  const composeRef = useRef<HTMLInputElement>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);
  const pendingSfx = useRef<Array<() => void>>([]);

  /** Silence cue tails scheduled into the future (ring's 2nd burst, busy beeps 2-3) so a
   *  minimize/hang-up/close mid-cue doesn't leave audio playing over a gone window (§8.4). */
  const flushSfx = useCallback(() => {
    for (const cancel of pendingSfx.current) cancel();
    pendingSfx.current = [];
  }, []);

  const sfx = useCallback((kind: SfxKind) => {
    if (prefs.muted) return;
    switch (kind) {
      case 'blip': tone(0, 620, 0.07, 0.05, 'square'); tone(0.09, 830, 0.07, 0.05, 'square'); break;
      case 'ring':
        tone(0, 440, 0.38, 0.05); tone(0, 480, 0.38, 0.035);
        pendingSfx.current = [tone(0.55, 440, 0.38, 0.05), tone(0.55, 480, 0.38, 0.035)];
        break;
      case 'busy':
        tone(0, 480, 0.22, 0.05, 'square');
        pendingSfx.current = [tone(0.45, 480, 0.22, 0.05, 'square'), tone(0.9, 480, 0.22, 0.05, 'square')];
        break;
      case 'hangup': tone(0, 520, 0.12, 0.06); tone(0.14, 380, 0.18, 0.05); break;
      case 'send': tone(0, 900, 0.05, 0.04, 'square'); break;
      case 'recv': tone(0, 600, 0.06, 0.04, 'square'); tone(0.07, 500, 0.06, 0.035, 'square'); break;
    }
  }, [prefs.muted]);

  useEffect(() => { if (!active) flushSfx(); }, [active, flushSfx]);
  useEffect(() => () => flushSfx(), [flushSfx]);

  /* ------------------------------ call control ----------------------------- */

  const startCall = useCallback((id: string, video: boolean, trigger?: HTMLElement | null) => {
    const prev = callRef.current;
    const next = dial(prev, id);
    if (next === prev) return; // already mid-call
    // capture the return-focus target only on a fresh call — "Call again" from the no-answer
    // card keeps the original (its own button unmounts the moment the redial starts)
    if (prev.phase === 'idle') {
      lastFocusRef.current = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    }
    setIsVideo(video);
    callRef.current = next;
    setCall(next);
    sfx('blip');
    setLive(`Calling ${contactById(id)?.name ?? id}`);
  }, [sfx]);

  const endCall = useCallback(() => {
    const next = hangup(callRef.current);
    if (next === callRef.current) return;
    callRef.current = next;
    setCall(next);
    flushSfx();
    sfx('hangup');
    setLive('Call ended');
  }, [sfx, flushSfx]);

  const closeCall = useCallback(() => {
    callRef.current = newCall();
    setCall(callRef.current);
    flushSfx();
    try { lastFocusRef.current?.focus(); } catch { /* trigger gone */ }
    lastFocusRef.current = null;
  }, [flushSfx]);

  const leaveMessage = useCallback((trigger: HTMLElement) => {
    closeCall();
    useOSStore.getState().open('contact', { trigger });
  }, [closeCall]);

  /* §8.4: the machine's driving interval only runs while active — a backgrounded/minimised/
     unfocused call freezes mid-ring and resumes cleanly (dt restarts from re-activation). */
  useEffect(() => {
    if (!active || (call.phase !== 'dialing' && call.phase !== 'ringing')) return;
    let last = performance.now();
    const t = window.setInterval(() => {
      const now = performance.now();
      const dt = now - last;
      last = now;
      const prev = callRef.current;
      const next = tick(prev, dt);
      if (next === prev) return;
      if (next.phase === 'ringing' && next.rings !== prev.rings) sfx('ring');
      if (next.phase === 'ringing' && prev.phase === 'dialing') setLive('Ringing');
      if (next.phase === 'noanswer') { sfx('busy'); setLive('No answer.'); }
      callRef.current = next;
      setCall(next);
    }, 200);
    return () => window.clearInterval(t);
  }, [active, call.phase, sfx]);

  /* 'ended' shows a beat of "Call ended." then returns to the roster (gated like everything). */
  useEffect(() => {
    if (call.phase !== 'ended' || !active) return;
    const t = window.setTimeout(closeCall, 900);
    return () => window.clearTimeout(t);
  }, [call.phase, active, closeCall]);

  useEffect(() => {
    if (call.phase === 'dialing') setTitle('Skajp — calling…');
    else if (call.phase === 'ringing') setTitle('Skajp — ringing…');
    else setTitle('Skajp');
  }, [call.phase, setTitle]);

  /* Focus follows the call dialog (a11y): Hang up on open, primary action on no-answer,
     the dialog itself on the buttonless 'ended' beat (so focus never drops to body). */
  useEffect(() => {
    if (call.phase === 'dialing') hangupRef.current?.focus();
    else if (call.phase === 'noanswer') noAnswerRef.current?.focus();
    else if (call.phase === 'ended') overlayRef.current?.focus();
  }, [call.phase]);

  /* Keep Tab inside the modal call dialog (it claims aria-modal). */
  const trapTab = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;
    const focusables = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button'));
    e.preventDefault();
    if (focusables.length === 0) return;
    const idx = focusables.indexOf(document.activeElement as HTMLElement);
    const next = idx === -1
      ? (e.shiftKey ? focusables.length - 1 : 0)
      : (idx + (e.shiftKey ? -1 : 1) + focusables.length) % focusables.length;
    focusables[next].focus();
  };

  /* Moving between views unmounts the focused control — hand focus to the new view's
     natural target (and keep the compose draft per-conversation). */
  const prevViewRef = useRef<View | null>(null);
  useEffect(() => {
    const prev = prevViewRef.current;
    prevViewRef.current = view;
    if (!prev || (prev.kind === view.kind && (prev.kind === 'roster' || ('id' in prev && 'id' in view && prev.id === view.id)))) return;
    if (view.kind === 'card') callBtnRef.current?.focus();
    else if (view.kind === 'chat') { setDraft(''); composeRef.current?.focus(); }
    else listRef.current?.querySelector<HTMLButtonElement>('.dialtone__row')?.focus();
  }, [view]);

  /* Esc = hang up / close / back (only while the window is the active one). */
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const phase = callRef.current.phase;
      if (phase === 'dialing' || phase === 'ringing') { endCall(); e.preventDefault(); }
      else if (phase === 'noanswer' || phase === 'ended') { closeCall(); e.preventDefault(); }
      else if (viewRef.current.kind !== 'roster') { setView({ kind: 'roster' }); e.preventDefault(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, endCall, closeCall]);

  /* ------------------------------- chat logic ------------------------------ */

  /* The canned away-line lands a beat after your last message — timer gated on §8.4 active
     (cleared when backgrounded, re-armed on return; `owed` state remembers the debt). */
  useEffect(() => {
    if (!owed || !active) return;
    const t = window.setTimeout(() => {
      const c = contactById(owed.id);
      if (c) {
        const lineText = awayLine(c);
        setChats((prev) => ({ ...prev, [c.id]: [...(prev[c.id] ?? []), { from: 'sys', text: lineText }] }));
        sfx('recv');
        setLive(lineText);
      }
      setOwed(null);
    }, 1400);
    return () => window.clearTimeout(t);
  }, [owed, active, sfx]);

  const send = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || viewRef.current.kind !== 'chat') return;
    const id = viewRef.current.id;
    setChats((prev) => ({ ...prev, [id]: [...(prev[id] ?? []), { from: 'me', text }] }));
    setDraft('');
    sfx('send');
    setOwed((o) => ({ id, n: (o?.n ?? 0) + 1 }));
  };

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [chats, view]);

  /* ------------------------------ roster logic ----------------------------- */

  const needle = q.trim().toLowerCase();
  const filtered = CONTACTS.filter((c) => !needle || c.name.toLowerCase().includes(needle) || c.tagline.toLowerCase().includes(needle));

  useEffect(() => {
    setCursor((c) => Math.min(c, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  /* Roving tabindex (a11y): one tab stop, arrows walk the list. */
  const onListKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const btns = listRef.current?.querySelectorAll<HTMLButtonElement>('.dialtone__row');
    if (!btns || btns.length === 0) return;
    let next = -1;
    if (e.key === 'ArrowDown') next = Math.min(cursor + 1, btns.length - 1);
    else if (e.key === 'ArrowUp') next = Math.max(cursor - 1, 0);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = btns.length - 1;
    if (next >= 0) { e.preventDefault(); setCursor(next); btns[next]?.focus(); }
  };

  /* --------------------------------- render -------------------------------- */

  const inCall = call.phase !== 'idle';
  const callContact = contactById(call.contactId);
  const me: Contact = { id: 'me', name: 'Dominik Machowiak', tagline: '', presence: myStatus, avatarSeed: 0 };
  const statusLine =
    call.phase === 'dialing' ? 'Calling…' :
    call.phase === 'ringing' ? 'Ringing…' :
    call.phase === 'noanswer' ? 'No answer.' : 'Call ended.';

  const cardContact = view.kind === 'card' ? contactById(view.id) : undefined;
  const chatContact = view.kind === 'chat' ? contactById(view.id) : undefined;
  const msgs = chatContact ? chats[chatContact.id] ?? [] : [];

  return (
    <div className="dialtone">
      <div className="dialtone__head">
        <Logo />
        <div className="dialtone__headtext">
          <strong>Skajp</strong>
          <span>Everyone’s here. Nobody answers.</span>
        </div>
      </div>

      {view.kind === 'roster' && (
        <>
          <div className="dialtone__search">
            <input
              type="search"
              value={q}
              placeholder="Search contacts"
              aria-label="Search contacts"
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="dialtone__list" ref={listRef} role="group" aria-label="Contacts" onKeyDown={onListKey}>
            {filtered.map((c, i) => (
              <button
                key={c.id}
                type="button"
                className={c.pinned ? 'dialtone__row is-pinned' : 'dialtone__row'}
                tabIndex={i === cursor ? 0 : -1}
                title={PRESENCE_LABEL[c.presence]}
                aria-label={`${c.name} — ${PRESENCE_LABEL[c.presence]}. ${c.tagline}`}
                onFocus={() => setCursor(i)}
                onClick={() => setView({ kind: 'card', id: c.id })}
              >
                <Avatar c={c} size={34} badge />
                <span className="dialtone__rowtext">
                  <strong>{c.name}</strong>
                  <em>{c.tagline}</em>
                </span>
              </button>
            ))}
            {filtered.length === 0 && <p className="dialtone__empty">No contacts match “{q}”.</p>}
          </div>
          <div className="dialtone__me">
            <Avatar c={me} size={28} badge />
            <span>You — Dominik</span>
            <select value={myStatus} aria-label="Your status (cosmetic — calls stay unanswered either way)" onChange={(e) => setMyStatus(e.target.value as Presence)}>
              <option value="online">Online</option>
              <option value="away">Away</option>
              <option value="busy">Busy</option>
              <option value="offline">Appear Offline</option>
            </select>
          </div>
        </>
      )}

      {view.kind === 'card' && cardContact && (
        <div className="dialtone__cardwrap">
          <button type="button" className="dialtone__back" onClick={() => setView({ kind: 'roster' })}>◀ Contacts</button>
          <div className="dialtone__card">
            <Avatar c={cardContact} size={76} badge />
            <h2>{cardContact.name}</h2>
            <p className="dialtone__presline"><Dot p={cardContact.presence} /> {PRESENCE_LABEL[cardContact.presence]}</p>
            <p className="dialtone__tagline">{cardContact.tagline}</p>
            <div className="dialtone__actions">
              <button ref={callBtnRef} type="button" className="dialtone__btn dialtone__btn--green" onClick={(e) => startCall(cardContact.id, false, e.currentTarget)}>
                <CallGlyph /> Call
              </button>
              <button type="button" className="dialtone__btn" onClick={(e) => startCall(cardContact.id, true, e.currentTarget)}>
                Video call
              </button>
              <button type="button" className="dialtone__btn" onClick={() => setView({ kind: 'chat', id: cardContact.id })}>
                Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {view.kind === 'chat' && chatContact && (
        <div className="dialtone__chat">
          <div className="dialtone__chathead">
            <button type="button" className="dialtone__back" onClick={() => setView({ kind: 'card', id: chatContact.id })} aria-label="Back to contact card">◀</button>
            <Avatar c={chatContact} size={26} badge />
            <strong>{chatContact.name}</strong>
            <span className="sr-only">{PRESENCE_LABEL[chatContact.presence]}</span>
          </div>
          <div className="dialtone__msgs" ref={msgsRef}>
            {msgs.length === 0 && <p className="dialtone__chathint">Say hi. (Don’t expect much back.)</p>}
            {msgs.map((m, i) =>
              m.from === 'me'
                ? <div key={i} className="dialtone__bubble">{m.text}</div>
                : <p key={i} className="dialtone__sys"><em>{m.text}</em></p>,
            )}
          </div>
          <form className="dialtone__compose" onSubmit={send}>
            <input
              ref={composeRef}
              value={draft}
              maxLength={280}
              placeholder="Type a message"
              aria-label={`Message ${chatContact.name}`}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button type="submit" className="dialtone__btn dialtone__btn--green" disabled={!draft.trim()}>Send</button>
          </form>
        </div>
      )}

      {inCall && callContact && (
        <div ref={overlayRef} tabIndex={-1} className="dialtone__call" role="dialog" aria-modal="true" aria-label={`Call with ${callContact.name}`} onKeyDown={trapTab}>
          {isVideo && (
            <div className="dialtone__cam">
              <CamOff />
              <span>Camera is off</span>
              <small>(nobody ever picks up anyway)</small>
            </div>
          )}
          <div className="dialtone__avatarwrap">
            {call.phase === 'ringing' && (
              <>
                <span className="dialtone__ripple" />
                <span className="dialtone__ripple dialtone__ripple--late" />
              </>
            )}
            <Avatar c={callContact} size={88} />
          </div>
          <h2>{callContact.name}</h2>
          <p className="dialtone__status">{statusLine}</p>

          {call.phase === 'noanswer' ? (
            <div className="dialtone__noanswer">
              <p>
                {callContact.id === 'dominik'
                  ? 'Probably heads-down in the editor. Leave a message — he actually reads those.'
                  : `${callContact.name} didn’t pick up. (They never do.)`}
              </p>
              <div className="dialtone__actions">
                {callContact.id === 'dominik' ? (
                  <button ref={noAnswerRef} type="button" className="dialtone__btn dialtone__btn--green" onClick={(e) => leaveMessage(e.currentTarget)}>
                    Leave a message
                  </button>
                ) : (
                  <button ref={noAnswerRef} type="button" className="dialtone__btn dialtone__btn--green" onClick={() => startCall(callContact.id, isVideo)}>
                    Call again
                  </button>
                )}
                <button type="button" className="dialtone__btn" onClick={closeCall}>Close</button>
              </div>
            </div>
          ) : call.phase !== 'ended' && (
            <button ref={hangupRef} type="button" className="dialtone__hangup" onClick={endCall} aria-label="Hang up">
              Hang up
            </button>
          )}
        </div>
      )}

      <div className="sr-only" aria-live="assertive">{live}</div>
    </div>
  );
}
