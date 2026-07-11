// sites.tsx — the fake Web inside DM Explorer (BROWSER-PLAN §2.4/§2.6). Every page is
// original art/copy on invented *.dominikos.net domains (legal gate scans this file). The two
// web games render the REAL game components — their lazy imports moved here from registry.ts,
// so the chunks stay code-split. Games receive the browser's windowId + `active`, which keeps
// their own §8.4 pause logic working (minimize/blur pauses; navigating away unmounts).
import { lazy, Suspense } from 'react';
import type { AppManifest } from '../../types';
import { ExternalFrame } from '../../window/IframeHost';
import { HOME } from './history';

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

function GamePage({ ctx, name, blurb, w, h, children }: {
  ctx: SiteCtx; name: string; blurb: string; w: number; h: number; children: JSX.Element;
}) {
  return (
    <div className="webpage arcade">
      <div className="arcade__banner">
        <strong>DominikNet Arcade</strong>
        <span>no install, plays right in your browser!</span>
      </div>
      <h1>{name}</h1>
      <p className="arcade__blurb">{blurb}</p>
      <div className="arcade__stage" style={{ width: w, height: h }}>
        <Suspense fallback={<p className="arcade__loading">Loading game…</p>}>{children}</Suspense>
      </div>
      <p className="arcade__foot">
        More free games on the <button type="button" className="weblink" onClick={() => ctx.go(HOME)}>DominikNet portal</button>.
      </p>
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
          Best viewed at 1024×768 · © 2003 DominikNet · no popups, no cookies, no answers (see Dialtone)
        </footer>
      </div>
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
