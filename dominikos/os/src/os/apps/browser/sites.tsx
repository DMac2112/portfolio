// sites.tsx — the fake Web inside DM Explorer (BROWSER-PLAN §2.4/§2.6). Every page is
// original art/copy on invented *.dominikos.net domains (legal gate scans this file). Sky
// Hopper and Bubble Shooter render the REAL game components — their lazy imports moved here
// from registry.ts, so the chunks stay code-split. Frostbyte is a third web game, but it was
// already a same-origin iframe (its own dev server under /frostbyte/), so it gets its own
// FrostbyteFrame below instead of a lazy import — same os-bridge-v1 pause contract IframeHost
// uses for native iframe games, just wired against ctx.active instead of shouldRun. Games
// receive the browser's windowId + `active`, which keeps their own §8.4 pause logic working
// (minimize/blur pauses; navigating away unmounts).
import { lazy, Suspense, useEffect, useRef } from 'react';
import type { AppManifest } from '../../types';
import { ExternalFrame } from '../../window/IframeHost';
import { HOME } from './history';
import FitStage from './FitStage';

const FlappyApp = lazy(() => import('../../games/flappy/FlappyApp'));
const BubbleApp = lazy(() => import('../../games/bubble/BubbleApp'));

export interface SiteCtx {
  windowId: string;
  active: boolean; // browser focused ∧ visible ∧ not minimized ∧ not loading ∧ this page current
  go: (url: string) => void;
  reloadToken: number; // bumped by Refresh — remounts external frames
}

export interface Site {
  url: string;      // canonical (normalize()d form)
  title: string;    // window title becomes "<title> - DM Explorer"
  favicon: string;
  render: (ctx: SiteCtx) => JSX.Element;
}

export const SKY_URL = 'http://games.dominikos.net/sky-hopper/';
export const BUBBLE_URL = 'http://games.dominikos.net/bubble-shooter/';
export const FROSTBYTE_URL = 'http://games.dominikos.net/frostbyte/';
export const REAL_URL = 'https://dominikmachowiak.com/';

const noop = (): void => {};

/** The registered manifests are gone (§3.1) — the games get minimal typed stubs instead. */
const stub = (id: string, title: string, icon: string, w: number, h: number): AppManifest => ({
  id,
  title,
  kind: 'react',
  icon,
  category: 'games',
  window: { width: w, height: h, singleton: true },
});
const FLAPPY_STUB = stub('flappy', 'Sky Hopper', '/os/icons/flappy.svg', 400, 700);
const BUBBLE_STUB = stub('bubble', 'Bubble Shooter', '/os/icons/bubble.svg', 440, 720);

function GamePage({ ctx, name, blurb, w, h, fluid = false, children }: {
  ctx: SiteCtx; name: string; blurb: string; w: number; h: number; fluid?: boolean; children: JSX.Element;
}) {
  const game = <Suspense fallback={<p className="arcade__loading">Loading game…</p>}>{children}</Suspense>;

  return (
    <div className="webpage arcade">
      <div className="arcade__banner">
        <strong>DominikNet Arcade</strong>
        <span>no install, plays right in your browser!</span>
      </div>
      <h1>{name}</h1>
      <p className="arcade__blurb">{blurb}</p>
      {fluid ? (
        <div className="arcade__stage arcade__stage--fluid" style={{ width: w, height: h }}>{game}</div>
      ) : (
        <FitStage width={w} height={h}>{game}</FitStage>
      )}
      <p className="arcade__foot">
        More free games on the <button type="button" className="weblink" onClick={() => ctx.go(HOME)}>DominikNet portal</button>.
      </p>
    </div>
  );
}

const BRIDGE_CH = 'os-bridge-v1';

/** Frostbyte's iframe glue — not IframeHost (DM Explorer pages render arbitrary JSX, §2.6),
 *  but the same os-bridge-v1 pause contract IframeHost wires for native games (§8.2): post
 *  pause/resume on `focused` changes, first post gated on 'ready' from the frame, e.source
 *  validated, listener cleaned up on unmount. Same-origin game sandbox (mirrors IframeHost's
 *  trusted-game branch) — frostbyte/os-bridge.js already speaks this protocol, zero changes
 *  needed on that side. The caller keys this by ctx.reloadToken so Refresh unmounts/remounts
 *  the whole frame (a fresh instance = a fresh bridgeReady ref, no manual reset needed). */
function FrostbyteFrame({ focused }: { focused: boolean }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const bridgeReady = useRef(false);

  useEffect(() => {
    const post = (type: 'pause' | 'resume') =>
      frameRef.current?.contentWindow?.postMessage({ ch: BRIDGE_CH, type }, window.location.origin);

    if (bridgeReady.current) post(focused ? 'resume' : 'pause');

    const onMessage = (e: MessageEvent) => {
      const m = e.data as { ch?: string; type?: string } | null;
      if (!m || m.ch !== BRIDGE_CH || e.source !== frameRef.current?.contentWindow) return;
      if (m.type === 'ready') {
        bridgeReady.current = true;
        post(focused ? 'resume' : 'pause'); // game may finish loading while inactive
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [focused]);

  return (
    <div className="iframe-stage">
      <iframe
        ref={frameRef}
        src="/frostbyte/index.html?embedded=1"
        title="Frostbyte"
        sandbox="allow-scripts allow-same-origin allow-pointer-lock"
        loading="lazy"
        tabIndex={0}
      />
    </div>
  );
}

const SITES: Site[] = [
  {
    url: HOME,
    title: 'DominikNet',
    favicon: '/os/icons/explorer.svg',
    render: (ctx) => (
      <div className="webpage portal">
        <div className="portal__masthead">
          <h1>DominikNet</h1>
          <p>your friendly on-ramp to the information superhighway</p>
        </div>
        <div className="portal__cols">
          <section className="portal__box">
            <h2>Today's links</h2>
            <ul>
              <li>
                <button type="button" className="weblink" onClick={() => ctx.go(FROSTBYTE_URL)}>Frostbyte</button>
                {' '}— waddle around, dress up, and play daily minigames with friends. Featured!
              </li>
              <li>
                <button type="button" className="weblink" onClick={() => ctx.go(SKY_URL)}>Sky Hopper</button>
                {' '}— one button, endless pipes. New!
              </li>
              <li>
                <button type="button" className="weblink" onClick={() => ctx.go(BUBBLE_URL)}>Bubble Shooter</button>
                {' '}— match three, clear the board.
              </li>
              <li>
                <button type="button" className="weblink" onClick={() => ctx.go(REAL_URL)}>dominikmachowiak.com</button>
                {' '}— the webmaster's real site (opens inside DominikNet).
              </li>
            </ul>
          </section>
          <aside className="portal__box portal__side">
            <h2>DominikNet stats</h2>
            <p className="portal__counter" title="Definitely a real counter">
              You are visitor <b>000&#8201;042&#8201;317</b>
            </p>
            <p>Today's weather: pixels, clearing later.</p>
            <p>Now with 100% more pixels.</p>
          </aside>
        </div>
        <footer className="portal__foot">
          Best viewed at 1024×768 · © 2003 DominikNet · no popups, no cookies, no answers (see Skajp)
        </footer>
      </div>
    ),
  },
  {
    url: FROSTBYTE_URL,
    title: 'Frostbyte — DominikNet Arcade',
    favicon: '/os/icons/frostbyte.svg',
    render: (ctx) => (
      <GamePage ctx={ctx} name="Frostbyte" blurb="Waddle around, dress up your avatar, and win coins in daily minigames. Your save follows you home." w={960} h={640} fluid>
        <FrostbyteFrame key={ctx.reloadToken} focused={ctx.active} />
      </GamePage>
    ),
  },
  {
    url: SKY_URL,
    title: 'Sky Hopper — DominikNet Arcade',
    favicon: '/os/icons/flappy.svg',
    render: (ctx) => (
      <GamePage ctx={ctx} name="Sky Hopper" blurb="Tap, click or press Space to flap through the gaps. How far can you hop?" w={400} h={640}>
        <FlappyApp manifest={FLAPPY_STUB} windowId={ctx.windowId} focused={ctx.active} close={noop} setTitle={noop} />
      </GamePage>
    ),
  },
  {
    url: BUBBLE_URL,
    title: 'Bubble Shooter — DominikNet Arcade',
    favicon: '/os/icons/bubble.svg',
    render: (ctx) => (
      <GamePage ctx={ctx} name="Bubble Shooter" blurb="Aim, fire, and pop groups of three or more before the ceiling comes down." w={440} h={660}>
        <BubbleApp manifest={BUBBLE_STUB} windowId={ctx.windowId} focused={ctx.active} close={noop} setTitle={noop} />
      </GamePage>
    ),
  },
  {
    url: REAL_URL,
    title: 'dominikmachowiak.com',
    favicon: '/os/icons/ie-doc.svg',
    render: (ctx) => (
      <div className="webpage webext">
        <ExternalFrame src={REAL_URL} title="dominikmachowiak.com" windowId={ctx.windowId} focused={ctx.active} reloadToken={ctx.reloadToken} />
        <div className="webext__hint">
          Page looks empty? Some sites refuse to be framed —{' '}
          <button type="button" className="weblink" onClick={() => window.open(REAL_URL, '_blank', 'noopener')}>open it in a new tab ↗</button>.
        </div>
      </div>
    ),
  },
];

/** Era-flavoured 404 (original copy — deliberately NOT the classic MS wording). */
function notFound(url: string): Site {
  return {
    url,
    title: 'Address not found',
    favicon: '/os/icons/explorer.svg',
    render: (ctx) => (
      <div className="webpage dm404">
        <h1>Hmm. That address didn't answer.</h1>
        <p className="dm404__addr">{url.startsWith('search:') ? `"${url.slice(7)}"` : url}</p>
        <p>DominikNet couldn't find that address. Check the spelling, or hop back home.</p>
        <button type="button" className="dm404__home" onClick={() => ctx.go(HOME)}>⌂ Back to DominikNet</button>
        <p className="dm404__small">Error DN-404 · DominikNet has looked everywhere. Both places.</p>
      </div>
    ),
  };
}

const stripSlash = (u: string): string => (u.endsWith('/') ? u.slice(0, -1) : u);

/** Exact match after normalize (tolerant of a missing trailing slash), else the 404 page. */
export function lookup(url: string): Site {
  const target = stripSlash(url);
  return SITES.find((s) => stripSlash(s.url) === target) ?? notFound(url);
}
