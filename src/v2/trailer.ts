import gsap from 'gsap';

export function createTrailer(root: HTMLElement): { play(): void; pause(): void } {
  const q = (selector: string) => root.querySelectorAll<HTMLElement>(selector);
  const toggle = root.querySelector<HTMLButtonElement>('.tr-toggle')!;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.set(q('.tr-scene'), { opacity: 0 });
    gsap.set(q('.tr-desktop'), { opacity: 1 });
    gsap.set(q('.tr-desktop-cursor'), { display: 'none' });
    toggle.hidden = true;
    return { play() {}, pause() {} };
  }

  const boot = q('.tr-boot');
  const welcome = q('.tr-welcome');
  const desktop = q('.tr-desktop');
  const games = q('.tr-games');
  const outro = q('.tr-outro');
  const cards = [...q('.tr-card')];
  const timeline = gsap.timeline({ paused: true, repeat: -1 });
  gsap.set(q('.tr-scene'), { opacity: 0 });
  gsap.set(boot, { opacity: 1 });
  gsap.set(q('.tr-icon'), { scale: 0 });
  gsap.set(q('.tr-taskbar'), { yPercent: 100 });
  gsap.set(q('.tr-games-title span'), { opacity: 0, y: '-18cqh' });
  gsap.set(cards, { opacity: 0, scale: 0, rotation: -8 });
  gsap.set(q('.tr-classic-icons img'), { scale: 0 });
  gsap.set(q('.tr-outro strong'), { scale: 0 });

  q('.tr-progress span').forEach((block, i) => {
    timeline.fromTo(block, { x: '-4cqw' }, { x: '23cqw', duration: 1.2, ease: 'none' }, i * .16);
  });
  timeline.to(boot, { opacity: 0, duration: .18 }, 1.72)
    .to(welcome, { opacity: 1, duration: .18 }, 1.8)
    .to(q('.tr-welcome-cursor'), { x: '-48cqw', y: '-41cqh', duration: .55, ease: 'power2.inOut' }, 1.9)
    .to(q('.tr-user'), { scale: .93, duration: .09, yoyo: true, repeat: 1 }, 2.5)
    .fromTo(q('.tr-ring'), { opacity: .9, scale: 1 }, { opacity: 0, scale: 1.6, duration: .4 }, 2.58)
    .to(welcome, { opacity: 0, duration: .22 }, 3.08)
    .to(desktop, { opacity: 1, duration: .22 }, 3.2)
    .to(q('.tr-taskbar'), { yPercent: 0, duration: .35, ease: 'back.out(1.8)' }, 3.25)
    .to(q('.tr-icon'), { scale: 1, duration: .27, stagger: .07, ease: 'back.out(2.2)' }, 3.45)
    .to(q('.tr-desktop-cursor'), { x: '-61cqw', y: '-54cqh', duration: .56, ease: 'power2.inOut' }, 4.35)
    .to(q('[data-icon="folder-games"]'), { scale: .85, duration: .08, yoyo: true, repeat: 3 }, 4.92)
    .to(q('[data-icon="folder-games"] .tr-selection'), { opacity: 1, duration: .08 }, 4.94)
    .to(desktop, { opacity: 0, duration: .18 }, 5.32)
    .to(games, { opacity: 1, duration: .18 }, 5.4)
    .to(q('.tr-rays'), { rotation: 28, duration: 4.15, ease: 'none' }, 5.4)
    .to(q('.tr-games-title span'), { y: 0, opacity: 1, duration: .5, stagger: .05, ease: 'bounce.out', rotation: (i) => i % 2 ? 4 : -4 }, 5.47);

  const starts = [6, 7.65];
  cards.forEach((card, i) => {
    const start = starts[i];
    timeline.fromTo(card, { opacity: 0, scale: 0, rotation: -8, x: i ? '60cqw' : 0 },
      { opacity: 1, scale: 1, rotation: -2, x: 0, duration: .45, ease: 'back.out(1.8)' }, start)
      .to(card, { y: '-1.2cqh', duration: .35, yoyo: true, repeat: 1, ease: 'sine.inOut' }, start + .48)
      .to(card, { scale: .6, x: '-60cqw', rotation: -12, opacity: 0, duration: .3 }, start + 1.3);
  });
  timeline.to(q('.tr-badge'), { rotation: 12, duration: .18, yoyo: true, repeat: 5 }, 6.3);
  q('.tr-sparkle').forEach((sparkle, i) => {
    timeline.fromTo(sparkle, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: .16, yoyo: true, repeat: 1 }, 6.35 + i * .23);
  });
  timeline.to(q('.tr-classics'), { opacity: 1, duration: .16 }, 8.9)
    .to(q('.tr-classic-icons img'), { scale: 1, duration: .3, stagger: .06, ease: 'back.out(2.5)' }, 8.92)
    .to(games, { opacity: 0, duration: .18 }, 9.47)
    .to(outro, { opacity: 1, duration: .18 }, 9.55)
    .to(q('.tr-outro strong'), { scale: 1, duration: .4, ease: 'back.out(2)' }, 9.63)
    .fromTo(q('.tr-outro-ring'), { opacity: .8, scale: .7 }, { opacity: 0, scale: 1.4, duration: .65 }, 9.83)
    .to(outro, { opacity: 0, duration: .2 }, 10.55)
    .set(boot, { opacity: 1 }, 10.75);

  return {
    play() { timeline.play(); },
    pause() { timeline.pause(); }
  };
}