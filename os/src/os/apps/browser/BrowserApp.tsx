// DM Explorer — DominikOS's browser (kind:'react' via componentById, BROWSER-PLAN §2).
// XP-era chrome (toolbar · address bar · favorites · status bar) over the pure ./history
// machine and the ./sites fake-Web registry. Navigation is theatre: a §8.4-gated interval
// animates a ~700ms "load", then the page swaps — a backgrounded load freezes and resumes,
// exactly like the Dialtone call machine's interval.
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import type { AppProps } from '../../types';
import { useOSStore } from '../../store/osStore';
import { useSystem } from '../../context/SystemContext';
import { usePageVisible } from '../../hooks/usePageVisible';
import { tone } from '../../sound';
import { newNav, current, navigate, back, forward, canBack, canForward, normalize, HOME, type Nav } from './history';
import { lookup, SKY_URL, BUBBLE_URL, REAL_URL } from './sites';

interface Load { url: string; progress: number }

const FAVORITES: { label: string; url: string; icon: string }[] = [
  { label: 'Sky Hopper', url: SKY_URL, icon: '/os/icons/flappy.svg' },
  { label: 'Bubble Shooter', url: BUBBLE_URL, icon: '/os/icons/bubble.svg' },
  { label: 'DominikNet Home', url: HOME, icon: '/os/icons/explorer.svg' },
  { label: 'dominikmachowiak.com', url: REAL_URL, icon: '/os/icons/ie-doc.svg' },
];

export default function BrowserApp({ windowId, focused, setTitle, props }: AppProps) {
  const { prefs } = useSystem();
  const visible = usePageVisible();
  const minimized = useOSStore((st) => st.windows[windowId]?.state === 'minimized');
  const active = focused && visible && !minimized;

  const initialUrl = (props as { url?: string } | undefined)?.url;
  const [nav, setNav] = useState<Nav>(() => (initialUrl ? navigate(newNav(), normalize(initialUrl)) : newNav()));
  const navRef = useRef(nav); navRef.current = nav;

  const [displayed, setDisplayed] = useState<string>(() => current(nav)); // last COMPLETED load
  const [loading, setLoading] = useState<Load | null>(null);
  const loadRef = useRef(loading); loadRef.current = loading;
  const [gen, setGen] = useState(0); // bumps per completed load → remounts the page (era-authentic refresh)
  const [reloadToken, setReloadToken] = useState(0); // remounts external frames on Refresh
  const [addr, setAddr] = useState<string>(() => current(nav));
  const [status, setStatus] = useState('Done');
  const [live, setLive] = useState('');

  const sfx = useCallback((kind: 'click' | 'done') => {
    if (prefs.muted) return;
    if (kind === 'click') tone(0, 1400, 0.04, 0.04, 'square');
    else { tone(0, 660, 0.08, 0.05); tone(0.09, 880, 0.12, 0.05); }
  }, [prefs.muted]);

  /* ------------------------------ navigation ------------------------------ */

  const startLoad = useCallback((url: string) => {
    loadRef.current = { url, progress: 0 };
    setLoading(loadRef.current);
    setStatus(`Opening ${url}`);
    setLive(`Opening ${url}`);
    sfx('click');
  }, [sfx]);

  const go = useCallback((input: string) => {
    const url = normalize(input);
    const next = navigate(navRef.current, url);
    navRef.current = next;
    setNav(next);
    startLoad(url);
  }, [startLoad]);

  const goBack = useCallback(() => {
    const next = back(navRef.current);
    if (next === navRef.current) return;
    navRef.current = next;
    setNav(next);
    startLoad(current(next));
  }, [startLoad]);

  const goForward = useCallback(() => {
    const next = forward(navRef.current);
    if (next === navRef.current) return;
    navRef.current = next;
    setNav(next);
    startLoad(current(next));
  }, [startLoad]);

  const stopLoad = useCallback(() => {
    if (!loadRef.current) return;
    loadRef.current = null;
    setLoading(null);
    setStatus('Stopped');
    setLive('Stopped');
  }, []);

  const refresh = useCallback(() => {
    setReloadToken((t) => t + 1);
    startLoad(current(navRef.current));
  }, [startLoad]);

  /* Fake load sequence (§2.5): ~700ms of progress, gated on §8.4 active — a backgrounded
     load freezes mid-bar and resumes on refocus. Completion swaps the page + chimes. */
  useEffect(() => {
    if (!active || !loading) return;
    const t = window.setInterval(() => {
      const l = loadRef.current;
      if (!l) return;
      const p = l.progress + 0.07 + Math.random() * 0.06;
      if (p < 1) {
        loadRef.current = { ...l, progress: p };
        setLoading(loadRef.current);
        return;
      }
      loadRef.current = null;
      setLoading(null);
      setDisplayed(l.url);
      setGen((g) => g + 1);
      setStatus('Done');
      setLive(`Opened ${lookup(l.url).title}`);
      sfx('done');
    }, 60);
    return () => window.clearInterval(t);
  }, [active, loading !== null, sfx]); // eslint-disable-line react-hooks/exhaustive-deps -- restart only on start/stop

  /* address bar follows navigation; window title follows the displayed page */
  useEffect(() => { setAddr(current(nav)); }, [nav]);
  useEffect(() => { setTitle(`${lookup(displayed).title} - DM Explorer`); }, [displayed, setTitle]);

  /* Alt+←/→ history, Esc = Stop while loading. Capture phase: Desktop's global Esc closes
     the focused window — Stop must win while a load is in flight. */
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); goBack(); }
      else if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); goForward(); }
      else if (e.key === 'Escape' && loadRef.current) { e.preventDefault(); e.stopPropagation(); stopLoad(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [active, goBack, goForward, stopLoad]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (addr.trim()) go(addr);
  };

  const site = lookup(displayed);
  const pct = loading ? Math.min(100, Math.round(loading.progress * 100)) : 0;

  return (
    <div className="browser">
      <div className="browser__toolbar" role="toolbar" aria-label="Navigation">
        <button type="button" className="browser__tb" onClick={goBack} disabled={!canBack(nav)} aria-label="Back">◀ Back</button>
        <button type="button" className="browser__tb" onClick={goForward} disabled={!canForward(nav)} aria-label="Forward">▶</button>
        <span className="browser__sep" />
        <button type="button" className="browser__tb" onClick={stopLoad} disabled={!loading} aria-label="Stop">■ Stop</button>
        <button type="button" className="browser__tb" onClick={refresh} aria-label="Refresh">⟳ Refresh</button>
        <button type="button" className="browser__tb" onClick={() => go(HOME)} aria-label="Home">⌂ Home</button>
        <span className={loading ? 'browser__throb is-loading' : 'browser__throb'} aria-hidden="true"><b>DM</b></span>
      </div>

      <form className="browser__addressrow" onSubmit={submit}>
        <label htmlFor={`addr-${windowId}`}>Address</label>
        <input
          id={`addr-${windowId}`}
          type="text"
          value={addr}
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => setAddr(e.target.value)}
          onFocus={(e) => e.target.select()}
        />
        <button type="submit" className="browser__tb browser__go">Go</button>
      </form>

      <div className="browser__favbar" role="toolbar" aria-label="Links">
        <span className="browser__favlabel">Links</span>
        {FAVORITES.map((f) => (
          <button key={f.url} type="button" className="browser__fav" onClick={() => go(f.url)} title={f.url}>
            <img src={f.icon} alt="" width={16} height={16} draggable={false} />
            {f.label}
          </button>
        ))}
      </div>

      <div className="browser__page" key={`${displayed}#${gen}`}>
        {site.render({ windowId, active: active && !loading, go, reloadToken })}
      </div>

      <div className="browser__status">
        <span className="browser__statustext">{status}</span>
        {loading && (
          <span className="browser__progress" aria-hidden="true">
            <span style={{ width: `${pct}%` }} />
          </span>
        )}
        <span className="browser__zone">DominikNet zone</span>
      </div>

      <div className="sr-only" aria-live="polite">{live}</div>
    </div>
  );
}
