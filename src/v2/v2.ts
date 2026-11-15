import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { createTrailer } from './trailer';

type Slide = {
  id: string; years: string; title: string; role: string; summary: string; stack: string;
  image: string | null; placeholder: string | null; media?: string; accent?: string;
  quote: { text: string; name: string; company: string } | null;
  quotePlaceholder: string | null; link: { label: string; href: string } | null;
};

gsap.registerPlugin(ScrollTrigger);
const desktopMotion = matchMedia('(min-width: 900px) and (prefers-reduced-motion: no-preference)').matches;
const navOffset = () => innerWidth < 900 && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 92 : 56;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let lenis: Lenis | undefined;

if (desktopMotion) {
  lenis = new Lenis();
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis!.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

}

const landing = document.querySelector<HTMLElement>('#top')!;
const name = document.querySelector<HTMLElement>('.v2-name')!;
const brand = document.querySelector<HTMLElement>('.v2-brand')!;
const avatar = landing.querySelector<SVGSVGElement>('.v2-name .pixel-stand')!;
const nav = document.querySelector<HTMLElement>('.v2-nav')!;
const runner = document.querySelector<HTMLElement>('.v2-runner')!;
const runnerSprite = runner.querySelector<SVGSVGElement>('.pixel-run')!;
const coder = nav.querySelector<HTMLElement>('.v2-coder')!;
gsap.matchMedia().add('(prefers-reduced-motion: reduce)', () => {
  const strip = nav.querySelector<HTMLElement>('.sk-wrap')!;
  const group = strip.querySelector<HTMLElement>('.sk')!;
  strip.classList.add('v2-sr');
  group.tabIndex = -1;
  return () => { strip.classList.remove('v2-sr'); group.tabIndex = 0; };
});
// Keep the actual heading above every section throughout the hand-off.
const nameSlot = document.createElement('div');
nameSlot.className = 'v2-name-slot';
name.before(nameSlot);
const measureName = () => {
  name.removeAttribute('style');
  nameSlot.replaceWith(name);
  const rect = name.getBoundingClientRect();
  const sprite = avatar.getBoundingClientRect();
  name.before(nameSlot);
  nameSlot.style.height = `${rect.height}px`;
  document.body.append(name);
  Object.assign(name.style, {
    position: 'fixed', left: `${rect.left}px`, top: `${rect.top + scrollY}px`,
    width: `${rect.width}px`, margin: '0', zIndex: '60', pointerEvents: 'none',
    transformOrigin: 'top left'
  });
  return { left: rect.left, top: rect.top + scrollY, spriteX: sprite.left, spriteY: sprite.top + scrollY, spriteHeight: sprite.height };
};
let origin = measureName();
brand.style.color = 'transparent';
let docked = scrollY > 2;
let transitioning = false;
const dockState = { progress: docked ? 1 : 0 };
const workTop = () => document.querySelector<HTMLElement>('#work')!.getBoundingClientRect().top + scrollY;
const setScroll = (y: number) => {
  if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
  else window.scrollTo({ top: y, behavior: 'instant' });
};
const positionStrip = () => {
  const strip = nav.querySelector<HTMLElement>('.sk-wrap')!;
  if (innerWidth < 900 || reduced) {
    strip.style.removeProperty('left');
    strip.style.removeProperty('width');
    return;
  }
  const left = brand.getBoundingClientRect().right;
  const gap = coder.getBoundingClientRect().left - left;
  strip.style.left = `${left + gap * .15}px`;
  strip.style.width = `${gap * .7}px`;
};
const renderDock = () => {
  const p = dockState.progress;
  const target = brand.getBoundingClientRect();
  const scale = parseFloat(getComputedStyle(brand).fontSize) / parseFloat(getComputedStyle(name).fontSize);
  gsap.set(name, {
    x: (target.left - origin.left) * p, y: (target.top - origin.top) * p,
    scale: 1 + (scale - 1) * p,
    color: p === 1 ? 'var(--ink)' : 'var(--white)'
  });
  avatar.style.visibility = p === 0 ? 'visible' : 'hidden';
  coder.style.opacity = p === 1 ? '1' : '0';
  runner.style.visibility = p > 0 && p < 1 && !reduced ? 'visible' : 'hidden';
  if (p > 0 && p < 1) {
    const destination = coder.getBoundingClientRect();
    const targetHeight = destination.height * 24 / 18;
    runner.style.height = `${origin.spriteHeight}px`;
    gsap.set(runner, {
      x: origin.spriteX * (1 - p) + destination.left * p,
      y: origin.spriteY * (1 - p) + (destination.bottom - targetHeight) * p,
      scale: 1 + (targetHeight / origin.spriteHeight - 1) * p
    });
    runnerSprite.dataset.frame = `run-${Math.floor(performance.now() / 75) % 4 + 1}`;
  }
  gsap.set('.v2-intro', { opacity: 1 - p });
  nav.classList.toggle('is-solid', p === 1);
};
const dock = (forward: boolean, destination = workTop() - navOffset()) => {
  if (transitioning) return;
  docked = forward;
  if (reduced) {
    dockState.progress = forward ? 1 : 0;
    setScroll(forward ? destination : 0);
    renderDock();
    return;
  }
  transitioning = true;
  lenis?.stop();
  const scroll = { y: scrollY };
  gsap.timeline({
    defaults: { duration: .82, ease: 'power2.inOut' },
    onUpdate: () => { setScroll(scroll.y); renderDock(); },
    onComplete: () => { transitioning = false; lenis?.start(); renderDock(); }
  }).to(dockState, { progress: forward ? 1 : 0 }, 0)
    .to(scroll, { y: forward ? destination : 0 }, 0);
};
const scrollIntent = (event: Event, forward: boolean) => {
  if ((event.target as Element | null)?.closest?.('dialog')) return;
  if (transitioning) { if (event.cancelable) event.preventDefault(); return; }
  if (forward ? !docked && scrollY <= 2 : docked && scrollY <= workTop() - navOffset() + 4) {
    if (event.cancelable) event.preventDefault();
    dock(forward);
  }
};
addEventListener('wheel', (event) => {
  if (event.deltaY !== 0) scrollIntent(event, event.deltaY > 0);
}, { passive: false });
let touchY = 0;
addEventListener('touchstart', (event) => { touchY = event.touches[0].clientY; }, { passive: true });
addEventListener('touchmove', (event) => {
  const delta = touchY - event.touches[0].clientY;
  if (Math.abs(delta) > 6 || transitioning) {
    scrollIntent(event, delta > 0);
    touchY = event.touches[0].clientY;
  }
}, { passive: false });
addEventListener('keydown', (event) => {
  if ((event.target as HTMLElement).closest('a, dialog, input, textarea, select, button, [contenteditable]')) return;
  if (['ArrowDown', 'PageDown', ' '].includes(event.key) && !event.shiftKey) scrollIntent(event, true);
  else if (['ArrowUp', 'PageUp', 'Home'].includes(event.key) || (event.key === ' ' && event.shiftKey)) scrollIntent(event, false);
});
document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', (event) => {
    const id = anchor.getAttribute('href')!.slice(1);
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    const destination = id === 'top' ? 0 : target.getBoundingClientRect().top + scrollY - navOffset();
    if (id === 'top' && docked) dock(false);
    else if (!docked && id !== 'top') dock(true, destination);
    else if (lenis) lenis.scrollTo(destination);
    else window.scrollTo({ top: destination, behavior: reduced ? 'instant' : 'smooth' });
  });
});
addEventListener('scroll', () => {
  if (transitioning) return;
  if (scrollY < workTop() - navOffset() - 2 && docked) dock(false);
  else if (scrollY > 2 && !docked) {
    if (scrollY < workTop() - navOffset()) dock(true);
    else { docked = true; dockState.progress = 1; renderDock(); }
  }
}, { passive: true });
const refreshDock = () => {
  origin = measureName();
  positionStrip();
  renderDock();
};
addEventListener('resize', refreshDock);
document.fonts.ready.then(refreshDock);
positionStrip();
renderDock();

const slides = JSON.parse(document.querySelector<HTMLScriptElement>('#v2-slides')!.textContent!) as Slide[];
const work = document.querySelector<HTMLElement>('#work')!;
const rail = work.querySelector<HTMLElement>('.ws-rail')!;
const thumbs = [...work.querySelectorAll<HTMLButtonElement>('.ws-thumb')];
const frame = work.querySelector<HTMLElement>('.ws-frame')!;
const dissolve = work.querySelector<HTMLCanvasElement>('.ws-dissolve')!;
const frameImage = work.querySelector<HTMLImageElement>('.ws-image')!;
const placeholder = work.querySelector<HTMLElement>('.ws-placeholder')!;
const trailerRoot = work.querySelector<HTMLElement>('.tr')!;
const trailer = createTrailer(trailerRoot);
let workVisible = false;
let userPaused = false;
const trailerToggle = trailerRoot.querySelector<HTMLButtonElement>('.tr-toggle')!;
function syncTrailer() {
  const playing = !reduced && !userPaused && workVisible && slides[index].media === 'os-trailer';
  if (playing) trailer.play();
  else trailer.pause();
  trailerToggle.textContent = userPaused ? 'Play preview' : 'Pause preview';
  trailerToggle.setAttribute('aria-label', trailerToggle.textContent);
}
trailerToggle.addEventListener('click', () => {
  userPaused = !userPaused;
  syncTrailer();
});
new IntersectionObserver(([entry]) => {
  workVisible = entry.isIntersecting;
  syncTrailer();
}, { threshold: .25 }).observe(work);
const bgImages = [...work.querySelectorAll<HTMLImageElement>('.ws-bg-image')];
const trail = work.querySelector<HTMLCanvasElement>('.ws-trail')!;
const live = work.querySelector<HTMLElement>('.ws-live')!;
let index = 0;
syncTrailer();
let swapping = false;
let bgIndex = 0;
let activeImage: HTMLImageElement | null = null;
const colors = ['#1740C9', '#9CC8F4', '#0E1A44', '#F2F5F9'];

function setText(selector: string, value: string) {
  work.querySelector<HTMLElement>(selector)!.textContent = value;
}
function show(selector: string, visible: boolean) {
  work.querySelector<HTMLElement>(selector)!.hidden = !visible;
}
function sizeCanvas(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const dpr = devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  canvas.getContext('2d')!.setTransform(dpr, 0, 0, dpr, 0, 0);
}
function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
function cells(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const result: { x: number; y: number; color: string }[] = [];
  for (let y = 0; y < rect.height; y += 16) for (let x = 0; x < rect.width; x += 16) {
    result.push({ x, y, color: colors[Math.floor(Math.random() * colors.length)] });
  }
  return shuffle(result);
}
function paintCells(items: ReturnType<typeof cells>, count: number) {
  const context = dissolve.getContext('2d')!;
  const rect = dissolve.getBoundingClientRect();
  context.clearRect(0, 0, rect.width, rect.height);
  items.slice(0, count).forEach((cell) => {
    context.fillStyle = cell.color;
    context.fillRect(cell.x, cell.y, 16, 16);
  });
}
function animateCells(items: ReturnType<typeof cells>, covering: boolean) {
  return new Promise<void>((resolve) => {
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 240);
      paintCells(items, Math.round(items.length * (covering ? progress : 1 - progress)));
      if (progress < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
}
function rollTitle(title: string) {
  const heading = work.querySelector<HTMLElement>('.ws-title')!;
  const line = heading.querySelector<HTMLElement>('.ws-title-line')!;
  heading.setAttribute('aria-label', title);
  line.replaceChildren(...[...title].map((letter) => {
    const span = document.createElement('span');
    span.className = 'ws-char';
    span.setAttribute('aria-hidden', 'true');
    span.textContent = letter === ' ' ? '\u00a0' : letter;
    return span;
  }));
  gsap.fromTo(line.querySelectorAll('.ws-char'), { yPercent: 110 }, { yPercent: 0, duration: .5, stagger: .018, ease: 'power3.out' });
}
function swapContent(slide: Slide, next: number) {
  work.style.setProperty('--accent', slide.accent ?? '#0E1A44');
  setText('.ws-years', slide.years);
  setText('.ws-count', `${next + 1} of ${slides.length}`);
  if (reduced) {
    setText('.ws-title-line', slide.title);
    work.querySelector('.ws-title')!.setAttribute('aria-label', slide.title);
  } else rollTitle(slide.title);
  setText('.ws-role', slide.role);
  setText('.ws-summary', slide.summary);
  setText('.ws-stack', `Built with ${slide.stack}`);
  const hasTrailer = slide.media === 'os-trailer';
  trailerRoot.hidden = !hasTrailer;
  frameImage.hidden = hasTrailer || !slide.image;
  placeholder.hidden = hasTrailer || !!slide.image;
  if (slide.image) {
    frameImage.src = slide.image;
    frameImage.alt = `${slide.title} project preview`;
  }
  placeholder.querySelector('span')!.textContent = slide.placeholder ?? '';
  show('.ws-image-todo', !!slide.image && !!slide.placeholder);
  setText('.ws-image-todo', `To replace: ${slide.placeholder ?? ''}`);
  show('.ws-ask', !!slide.quote);
  show('.ws-quote', !!slide.quote);
  setText('.ws-quote p', slide.quote ? `“${slide.quote.text}”` : '');
  setText('.ws-quote cite', slide.quote ? `${slide.quote.name}, ${slide.quote.company}` : '');
  show('.ws-quote-todo', !!slide.quotePlaceholder);
  setText('.ws-quote-todo', slide.quotePlaceholder ?? '');
  const link = work.querySelector<HTMLAnchorElement>('.ws-link')!;
  link.hidden = !slide.link;
  if (slide.link) {
    link.href = slide.link.href;
    link.textContent = slide.link.label;
    link.classList.toggle('v2-start', slide.link.href.startsWith('/os/'));
    link.classList.toggle('v2-button', !slide.link.href.startsWith('/os/'));
    if (slide.link.href.startsWith('/os/')) link.dataset.boot = '';
    else delete link.dataset.boot;
  }
  const incoming = bgImages[1 - bgIndex];
  const outgoing = bgImages[bgIndex];
  incoming.hidden = !slide.image;
  if (slide.image) incoming.src = slide.image;
  gsap.set(incoming, { opacity: 0 });
  gsap.to(incoming, { opacity: slide.image ? 1 : 0, duration: reduced ? 0 : .6 });
  gsap.to(outgoing, { opacity: 0, duration: reduced ? 0 : .6, onComplete: () => { outgoing.hidden = true; } });
  bgIndex = 1 - bgIndex;
  if (activeImage) activeImage.src = slide.image ?? '';
  thumbs.forEach((thumb, i) => {
    if (i === next) thumb.setAttribute('aria-current', 'true');
    else thumb.removeAttribute('aria-current');
  });
  work.querySelector<HTMLElement>('.ws-progress')!.style.width = `${(next + 1) / slides.length * 100}%`;
  thumbs[next].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
  live.textContent = `Slide ${next + 1} of ${slides.length}: ${slide.title}`;
  if (!reduced) gsap.fromTo('.ws-summary, .ws-quote', { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: .35 });
}
async function goTo(next: number) {
  next = (next + slides.length) % slides.length;
  if (swapping || next === index) return;
  swapping = true;
  if (!reduced) {
    sizeCanvas(dissolve);
    const order = cells(dissolve);
    await animateCells(order, true);
    swapContent(slides[next], next);
    await animateCells(order, false);
  } else swapContent(slides[next], next);
  index = next;
  syncTrailer();
  swapping = false;
}
let dragged = false;
let downX = 0;
let scrollX = 0;
if (matchMedia('(pointer: fine)').matches) {
  rail.addEventListener('pointerdown', (event) => {
    downX = event.clientX;
    scrollX = rail.scrollLeft;
    dragged = false;
  });
  rail.addEventListener('pointermove', (event) => {
    if (!(event.buttons & 1)) return;
    const distance = event.clientX - downX;
    if (Math.abs(distance) > 5) dragged = true;
    if (dragged) rail.scrollLeft = scrollX - distance;
  });
  rail.addEventListener('click', (event) => {
    if (!dragged) return;
    event.preventDefault();
    event.stopPropagation();
    dragged = false;
  }, true);
}
thumbs.forEach((thumb, i) => thumb.addEventListener('click', () => { if (!dragged) void goTo(i); }));
work.addEventListener('keydown', (event) => {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  void goTo(index + (event.key === 'ArrowRight' ? 1 : -1));
});

if (!reduced && matchMedia('(pointer: fine)').matches && getComputedStyle(trail).display !== 'none') {
  type Cell = { x: number; y: number; born: number };
  const points: Cell[] = [];
  const context = trail.getContext('2d')!;
  activeImage = new Image();
  activeImage.src = slides[0].image ?? '';
  let running = false;
  const draw = (now: number) => {
    const rect = trail.getBoundingClientRect();
    context.clearRect(0, 0, rect.width, rect.height);
    for (let i = points.length - 1; i >= 0; i--) {
      const cell = points[i];
      const life = 1 - (now - cell.born) / 500;
      if (life <= 0) { points.splice(i, 1); continue; }
      if (!activeImage?.complete || !activeImage.naturalWidth) continue;
      const scale = Math.max(rect.width / activeImage.naturalWidth, rect.height / activeImage.naturalHeight) * 1.12;
      const width = activeImage.naturalWidth * scale;
      const height = activeImage.naturalHeight * scale;
      const left = (rect.width - width) / 2;
      const top = (rect.height - height) / 2;
      context.save();
      context.beginPath();
      context.rect(cell.x, cell.y, 12, 12);
      context.clip();
      context.globalAlpha = life;
      context.drawImage(activeImage, left, top, width, height);
      context.restore();
    }
    if (points.length) requestAnimationFrame(draw);
    else running = false;
  };
  const resize = () => sizeCanvas(trail);
  resize();
  addEventListener('resize', resize);
  work.addEventListener('pointermove', (event) => {
    if (!slides[index].image) return;
    const rect = trail.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / 12) * 12;
    const y = Math.floor((event.clientY - rect.top) / 12) * 12;
    if (points.some((point) => point.x === x && point.y === y)) return;
    points.push({ x, y, born: performance.now() });
    if (points.length > 40) points.shift();
    if (!running) { running = true; requestAnimationFrame(draw); }
  });
}

const dialog = document.querySelector<HTMLDialogElement>('.cw')!;
document.querySelectorAll<HTMLElement>('[data-contact-open]').forEach((button) => {
  button.addEventListener('click', () => {
    dialog.showModal();
    if (!reduced) gsap.fromTo(dialog, { scale: .96, opacity: 0 }, { scale: 1, opacity: 1, duration: .16 });
  });
});
dialog.querySelector<HTMLButtonElement>('.cw-close')!.addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
});
dialog.querySelector<HTMLButtonElement>('.cw-copy')!.addEventListener('click', async (event) => {
  const button = event.currentTarget as HTMLButtonElement;
  await navigator.clipboard.writeText('dominikmachowiak101@gmail.com');
  button.textContent = 'Copied';
  setTimeout(() => { button.textContent = 'Copy email'; }, 2000);
});
dialog.querySelector<HTMLFormElement>('form')!.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  if (!form.reportValidity()) return;
  const fields = new FormData(form);
  const feedback = dialog.querySelector<HTMLElement>('.cw-feedback')!;
  const submit = form.querySelector<HTMLButtonElement>('[type="submit"]')!;
  feedback.textContent = 'Sending...';
  submit.disabled = true;
  try {
    const response = await fetch('https://formsubmit.co/ajax/dominikmachowiak101@gmail.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        name: fields.get('name'), email: fields.get('email'), message: fields.get('message'),
        _subject: `Portfolio message from ${fields.get('name')}`, _template: 'table', _captcha: 'false',
        _honey: fields.get('_honey') ?? ''
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || String(data.success) !== 'true') throw new Error(data.message ?? 'Send failed');
    feedback.textContent = "Sent. I'll reply within a couple of days.";
    form.reset();
  } catch {
    feedback.textContent = "That didn't send. Email me at dominikmachowiak101@gmail.com instead.";
  } finally {
    submit.disabled = false;
  }
});

function boot(href: string) {
  if (reduced) { location.href = href; return; }
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:100;pointer-events:none';
  document.body.append(canvas);
  sizeCanvas(canvas);
  const tiles: { x: number; y: number; color: string }[] = [];
  for (let y = 0; y < innerHeight; y += 24) for (let x = 0; x < innerWidth; x += 24) {
    tiles.push({ x, y, color: colors[Math.floor(Math.random() * colors.length)] });
  }
  shuffle(tiles);
  const context = canvas.getContext('2d')!;
  const start = performance.now();
  let drawn = 0;
  const tick = (now: number) => {
    const count = Math.min(tiles.length, Math.floor((now - start) / 700 * tiles.length));
    for (let i = drawn; i < count; i++) {
      const tile = tiles[i];
      context.fillStyle = tile.color;
      context.fillRect(tile.x, tile.y, 24, 24);
    }
    drawn = count;
    if (count < tiles.length) requestAnimationFrame(tick);
    else location.href = href;
  };
  requestAnimationFrame(tick);
}
document.addEventListener('click', (event) => {
  const link = (event.target as Element).closest<HTMLAnchorElement>('a[data-boot]');
  if (!link) return;
  event.preventDefault();
  boot(link.href);
});
