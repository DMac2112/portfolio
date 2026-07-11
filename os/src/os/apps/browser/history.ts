// history.ts — pure browser navigation machine (BROWSER-PLAN §2.3, LOCKED, unit-tested).
// Mirrors the callMachine discipline: no DOM, no wall clock, same-reference no-ops at the
// edges so React state updates can bail out cheaply.

export interface Nav { stack: string[]; index: number }

export const HOME = 'http://start.dominikos.net/';

export function newNav(): Nav {
  return { stack: [HOME], index: 0 };
}

export function current(n: Nav): string {
  return n.stack[n.index];
}

/** Visit a url: truncate any forward stack, push, advance. Re-visiting the exact current
 *  url is a no-op (same reference back). */
export function navigate(n: Nav, url: string): Nav {
  if (url === n.stack[n.index]) return n;
  return { stack: [...n.stack.slice(0, n.index + 1), url], index: n.index + 1 };
}

export function canBack(n: Nav): boolean {
  return n.index > 0;
}

export function canForward(n: Nav): boolean {
  return n.index < n.stack.length - 1;
}

export function back(n: Nav): Nav {
  return canBack(n) ? { ...n, index: n.index - 1 } : n;
}

export function forward(n: Nav): Nav {
  return canForward(n) ? { ...n, index: n.index + 1 } : n;
}

/** Address-bar input → canonical url. Trim; default http:// when no scheme; lowercase the
 *  host; keep path/query; directory-style paths get a trailing slash. Unparseable garbage
 *  becomes a "search:<text>" pseudo-url, which the site registry resolves to the 404 page. */
export function normalize(input: string): string {
  const raw = input.trim();
  if (!raw) return HOME;
  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(raw) ? raw : `http://${raw}`;
  try {
    const u = new URL(withScheme);
    if (!u.hostname) return `search:${raw}`;
    let path = u.pathname;
    if (!/\.[a-zA-Z0-9]+$/.test(path) && !path.endsWith('/')) path += '/';
    const port = u.port ? `:${u.port}` : '';
    return `${u.protocol}//${u.hostname.toLowerCase()}${port}${path}${u.search}`;
  } catch {
    return `search:${raw}`;
  }
}
