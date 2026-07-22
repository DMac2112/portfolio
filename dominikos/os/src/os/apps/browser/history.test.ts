// Browser history-machine tests (vitest, headless — no DOM, no wall clock, bounded).
import { describe, it, expect } from 'vitest';
import { newNav, current, navigate, back, forward, canBack, canForward, normalize, HOME } from './history';

describe('newNav', () => {
  it('starts at home with no history either way', () => {
    const n = newNav();
    expect(current(n)).toBe(HOME);
    expect(canBack(n)).toBe(false);
    expect(canForward(n)).toBe(false);
  });
});

describe('navigate', () => {
  it('pushes and advances', () => {
    const n = navigate(newNav(), 'http://a.dominikos.net/');
    expect(current(n)).toBe('http://a.dominikos.net/');
    expect(n.stack).toEqual([HOME, 'http://a.dominikos.net/']);
    expect(canBack(n)).toBe(true);
    expect(canForward(n)).toBe(false);
  });

  it('truncates the forward stack', () => {
    let n = navigate(newNav(), 'http://a.dominikos.net/');
    n = navigate(n, 'http://b.dominikos.net/');
    n = back(n); // at a, forward = b
    n = navigate(n, 'http://c.dominikos.net/');
    expect(n.stack).toEqual([HOME, 'http://a.dominikos.net/', 'http://c.dominikos.net/']);
    expect(canForward(n)).toBe(false);
  });

  it('re-visiting the current url is a same-reference no-op', () => {
    const n = navigate(newNav(), 'http://a.dominikos.net/');
    expect(navigate(n, 'http://a.dominikos.net/')).toBe(n);
  });
});

describe('back / forward', () => {
  it('walk the stack and clamp at both ends with same-reference no-ops', () => {
    let n = navigate(navigate(newNav(), 'http://a.dominikos.net/'), 'http://b.dominikos.net/');
    n = back(n);
    expect(current(n)).toBe('http://a.dominikos.net/');
    expect(canForward(n)).toBe(true);
    n = back(n);
    expect(current(n)).toBe(HOME);
    expect(back(n)).toBe(n); // clamped at the start
    n = forward(forward(n));
    expect(current(n)).toBe('http://b.dominikos.net/');
    expect(forward(n)).toBe(n); // clamped at the end
  });
});

describe('normalize', () => {
  it('adds http:// to bare domains and a trailing slash to directory paths', () => {
    expect(normalize('start.dominikos.net')).toBe('http://start.dominikos.net/');
    expect(normalize('games.dominikos.net/sky-hopper')).toBe('http://games.dominikos.net/sky-hopper/');
  });

  it('lowercases the host but keeps the path case', () => {
    expect(normalize('GAMES.DominikOS.net/Sky-Hopper/')).toBe('http://games.dominikos.net/Sky-Hopper/');
  });

  it('keeps an existing scheme (and https)', () => {
    expect(normalize('https://dominikmachowiak.com')).toBe('https://dominikmachowiak.com/');
    expect(normalize('http://start.dominikos.net/')).toBe('http://start.dominikos.net/');
  });

  it('keeps query strings and file-like paths', () => {
    expect(normalize('a.dominikos.net/page?x=1')).toBe('http://a.dominikos.net/page/?x=1');
    expect(normalize('a.dominikos.net/logo.png')).toBe('http://a.dominikos.net/logo.png');
  });

  it('trims whitespace; empty input goes home', () => {
    expect(normalize('  start.dominikos.net  ')).toBe('http://start.dominikos.net/');
    expect(normalize('   ')).toBe(HOME);
  });

  it('turns garbage into a search: fallback (→ the 404 page)', () => {
    expect(normalize('sky hopper')).toBe('search:sky hopper');
    expect(normalize('ht tp://x')).toBe('search:ht tp://x');
  });

  it('is deterministic and idempotent on its own output', () => {
    for (const input of ['start.dominikos.net', 'GAMES.dominikos.net/sky-hopper', 'https://dominikmachowiak.com/']) {
      const once = normalize(input);
      expect(normalize(once)).toBe(once);
      expect(normalize(input)).toBe(once);
    }
  });
});
