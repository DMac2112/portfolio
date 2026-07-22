// ui/newspaper.js — singleton cork-board/paper overlay for The Chillmere Chirper (World Plan W1).

let instance = null;
let stylesInjected = false;
const cb = { getIssue: () => null };

function injectStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    #chirper-overlay { position:fixed; inset:0; z-index:35; display:grid; place-items:center;
      padding:14px; background:#07111dcc; font-family:inherit; }
    #chirper-overlay.hidden { display:none; }
    #chirper-board { width:min(760px, 96vw); max-height:92vh; overflow:auto; padding:18px;
      background:repeating-linear-gradient(22deg, #76513d 0 7px, #6b4a33 7px 14px);
      border:8px solid #3b281d; border-radius:10px; box-shadow:inset 0 0 0 3px #a97550,
      0 24px 70px #020914e6; }
    #chirper-paper { position:relative; color:#283747; padding:20px 22px 24px;
      background:#f2ead7; border:1px solid #d4c29d; box-shadow:0 7px 18px #2f201899;
      transform:rotate(-.25deg); }
    #chirper-paper::before, #chirper-paper::after { content:""; position:absolute; top:-9px;
      width:15px; height:15px; border-radius:50%; background:#ffb45e; border:2px solid #8a5727;
      box-shadow:0 2px 3px #2f201877; }
    #chirper-paper::before { left:18px; } #chirper-paper::after { right:18px; }
    #chirper-header { display:flex; align-items:flex-start; gap:12px; padding-bottom:10px;
      border-bottom:4px double #566577; }
    #chirper-masthead { flex:1; }
    #chirper-title { margin:0; color:#16283e; font-size:clamp(23px, 6vw, 38px); line-height:1;
      letter-spacing:-.03em; }
    #chirper-date { margin:5px 0 0; color:#657383; font-size:12px; font-weight:800; text-transform:uppercase;
      letter-spacing:.08em; }
    #chirper-close { font:inherit; font-weight:850; color:#f5fbff; cursor:pointer; padding:8px 11px;
      border:2px solid #3b281d; border-radius:5px; background:#6b4a33; box-shadow:0 3px 0 #3b281d; }
    #chirper-close:active { transform:translateY(2px); box-shadow:0 1px 0 #3b281d; }
    #chirper-close:focus-visible { outline:3px solid #3b8fb8; outline-offset:3px; }
    #chirper-articles { display:grid; grid-template-columns:repeat(3, 1fr); gap:0; margin-top:16px; }
    .chirper-article { padding:3px 15px 8px; border-left:1px solid #9c9b8d; }
    .chirper-article:first-child { border-left:0; padding-left:2px; }
    .chirper-article:last-child { padding-right:2px; }
    .chirper-article h3 { margin:0 0 7px; color:#243548; font-size:16px; line-height:1.08;
      text-transform:uppercase; }
    .chirper-article p { margin:0; font-family:inherit; font-size:14px; line-height:1.45; }
    #chirper-hint { margin:16px 0 0; padding:11px 13px; color:#3f321f; font-weight:750;
      border:2px dashed #9b6b31; background:#ffdf9e80; transform:rotate(.35deg); }
    @media (max-width:620px) {
      #chirper-board { padding:10px; }
      #chirper-paper { padding:18px 14px 20px; }
      #chirper-articles { grid-template-columns:1fr; }
      .chirper-article, .chirper-article:first-child, .chirper-article:last-child {
        padding:11px 0; border-left:0; border-top:1px solid #9c9b8d; }
      .chirper-article:first-child { border-top:0; }
    }
    @media (prefers-reduced-motion: reduce) { #chirper-paper { transform:none; } }
  `;
  document.head.appendChild(style);
}

function buildDom() {
  const overlay = document.createElement('div');
  overlay.id = 'chirper-overlay';
  overlay.className = 'hidden';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'chirper-title');
  const board = document.createElement('div');
  board.id = 'chirper-board';
  const paper = document.createElement('article');
  paper.id = 'chirper-paper';
  const header = document.createElement('header');
  header.id = 'chirper-header';
  const masthead = document.createElement('div');
  masthead.id = 'chirper-masthead';
  const title = document.createElement('h2');
  title.id = 'chirper-title';
  title.textContent = 'The Chillmere Chirper';
  const date = document.createElement('p');
  date.id = 'chirper-date';
  masthead.append(title, date);
  const closeBtn = document.createElement('button');
  closeBtn.id = 'chirper-close';
  closeBtn.type = 'button';
  closeBtn.textContent = 'Fold away ✕';
  header.append(masthead, closeBtn);
  const articles = document.createElement('div');
  articles.id = 'chirper-articles';
  const hint = document.createElement('p');
  hint.id = 'chirper-hint';
  paper.append(header, articles, hint);
  board.appendChild(paper);
  overlay.appendChild(board);
  document.body.appendChild(overlay);
  return { overlay, date, articles, hint, closeBtn };
}

export function createNewspaper({ getIssue }) {
  cb.getIssue = getIssue ?? cb.getIssue;
  if (instance) return instance;
  injectStyles();
  const { overlay, date, articles, hint, closeBtn } = buildDom();
  let lastFocused = null;

  function refresh() {
    const issue = cb.getIssue?.();
    date.textContent = issue ? `Weekly edition · Week of ${issue.weekOf}` : 'No edition available';
    articles.replaceChildren();
    for (const story of issue?.articles ?? []) {
      const article = document.createElement('article');
      article.className = 'chirper-article';
      const heading = document.createElement('h3');
      heading.textContent = story.title;
      const copy = document.createElement('p');
      copy.textContent = story.body;
      article.append(heading, copy);
      articles.appendChild(article);
    }
    hint.textContent = issue?.hint?.text ?? 'The editor is still chasing this week’s hunch.';
  }

  function close() {
    overlay.classList.add('hidden');
    lastFocused?.focus?.();
    lastFocused = null;
  }

  function open() {
    lastFocused = document.activeElement;
    refresh();
    overlay.classList.remove('hidden');
    closeBtn.focus();
  }

  const isOpen = () => !overlay.classList.contains('hidden');
  closeBtn.onclick = close;
  overlay.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
  instance = { open, close, isOpen, refresh };
  return instance;
}
