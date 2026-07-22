// ui/dialogue.js — singleton controller for the existing #dialogue-overlay (World Plan W0).
// Existing ids stay intact; W0 adds portrait/name/page/choice affordances around them.

let instance = null;

export function createDialogue() {
  if (instance) return instance;
  const overlay = document.getElementById('dialogue-overlay');
  const box = document.getElementById('dialogue-box');
  const title = document.getElementById('dialogue-title');
  const subtitle = document.getElementById('dialogue-subtitle');
  const body = document.getElementById('dialogue-body');
  const portraitFrame = document.getElementById('dialogue-portrait-frame');
  const portrait = document.getElementById('dialogue-portrait');
  const choicesEl = document.getElementById('dialogue-choices');
  const pageEl = document.getElementById('dialogue-page');
  const nextBtn = document.getElementById('dialogue-next');
  const closeBtn = document.getElementById('dialogue-close');
  let lastFocused = null;
  let config = null;
  let pageIndex = 0;

  function isOpen() {
    return overlay ? !overlay.classList.contains('hidden') : false;
  }

  function close() {
    overlay?.classList.add('hidden');
    const focusTarget = lastFocused;
    lastFocused = null;
    config = null;
    if (portrait) portrait.removeAttribute('src');
    focusTarget?.focus?.();
  }

  function render() {
    if (!config) return;
    const pages = config.pages;
    const isLast = pageIndex === pages.length - 1;
    title.textContent = config.name ?? config.title ?? '';
    subtitle.textContent = config.subtitle ?? '';
    subtitle.hidden = !config.subtitle;
    body.textContent = pages[pageIndex] ?? '';
    pageEl.textContent = pages.length > 1 ? `${pageIndex + 1} / ${pages.length}` : '';
    nextBtn.hidden = isLast;
    choicesEl.replaceChildren();

    if (isLast) {
      for (const choice of config.choices) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'dialogue-choice';
        button.textContent = choice.label;
        button.disabled = Boolean(choice.disabled);
        button.onclick = () => {
          const shouldClose = config.onChoice ? config.onChoice(choice) !== false : true;
          if (shouldClose) close();
        };
        choicesEl.appendChild(button);
      }
    }
  }

  function focusAdvanceTarget() {
    const choice = choicesEl.querySelector('button:not(:disabled)');
    (choice ?? closeBtn)?.focus?.();
  }

  function open(nextConfig = {}) {
    if (!overlay) return;
    lastFocused = isOpen() ? lastFocused : document.activeElement;
    const rawPages = Array.isArray(nextConfig.pages) ? nextConfig.pages : [nextConfig.body ?? ''];
    config = {
      ...nextConfig,
      pages: rawPages.length ? rawPages.map((page) => String(page ?? '')) : [''],
      choices: (nextConfig.choices ?? []).slice(0, 3),
    };
    pageIndex = 0;
    const hasPortrait = Boolean(config.portraitSrc);
    box?.classList.toggle('has-portrait', hasPortrait);
    portraitFrame.hidden = !hasPortrait;
    if (hasPortrait) {
      portrait.src = config.portraitSrc;
      portrait.alt = config.portraitAlt ?? '';
    } else {
      portrait.removeAttribute('src');
      portrait.alt = '';
    }
    render();
    overlay.classList.remove('hidden');
    if (config.pages.length > 1) nextBtn.focus();
    else focusAdvanceTarget();
  }

  nextBtn.onclick = () => {
    if (!config || pageIndex >= config.pages.length - 1) return;
    pageIndex += 1;
    render();
    if (pageIndex < config.pages.length - 1) nextBtn.focus();
    else focusAdvanceTarget();
  };
  closeBtn.onclick = close;
  overlay?.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });

  instance = { open, close, isOpen };
  return instance;
}
