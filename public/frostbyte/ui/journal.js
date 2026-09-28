// ui/journal.js — singleton Curio Log overlay (World Plan W0). A knit-bound expedition book,
// intentionally distinct from the game's frosted-glass utility chrome.
import { isCurioFound, roomProgress, totalProgress } from '../engine/curios.js';
import { NOTE_IDS, hasNote } from '../engine/story.js';
import { closeOnBackdrop } from './backdrop.js';

export function journalNotes(save) {
  const places = { bell: 'Emberlight Workshop', floe: 'Driftgate Docks',
    moon: save.secrets?.moonwellUnlocked ? 'the Moonwell' : '???' };
  return NOTE_IDS.map((id) => ({ id, held: hasNote(save, id), place: places[id] }));
}

let instance = null;
let stylesInjected = false;
const cb = {
  registry: [],
  getState: () => ({ found: {} }),
  getRoomLabel: (roomId) => roomId,
  getSave: () => ({}),
};

function injectStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    #journal-overlay { position:fixed; inset:0; z-index:34; display:grid; place-items:center;
      padding:16px; background:#07111dcc; font-family:inherit; }
    #journal-overlay.hidden { display:none; }
    #journal-book { position:relative; width:min(700px, 96vw); max-height:90vh; overflow:auto;
      color:#243548; background:
        repeating-linear-gradient(0deg, #dce9f5 0 3px, #d5e4f1 3px 6px);
      border:10px solid #36536c; border-left-width:34px; border-radius:14px 22px 22px 14px;
      padding:20px 22px 22px; box-shadow:inset 0 0 0 3px #f5fbff, 0 24px 70px #020914e6; }
    #journal-book::before { content:""; position:absolute; left:-25px; top:12px; bottom:12px; width:14px;
      border-left:3px dashed #cfe0f2; border-right:3px dashed #16283e; opacity:.9; }
    #journal-book::after { content:""; position:absolute; inset:8px; pointer-events:none;
      border:2px dashed #6b88a1; border-radius:10px 17px 17px 9px; opacity:.55; }
    #journal-book > * { position:relative; z-index:1; }
    #journal-header { display:flex; align-items:flex-start; gap:12px; padding-bottom:12px;
      border-bottom:3px double #6b88a1; }
    #journal-title-wrap { flex:1; }
    #journal-title { margin:0; color:#16283e; font-size:clamp(22px, 5vw, 31px); letter-spacing:.02em; }
    #journal-summary { margin:3px 0 0; color:#4d667c; font-weight:700; }
    #journal-close { font:inherit; font-weight:800; color:#f5fbff; cursor:pointer; padding:8px 12px;
      border:2px dashed #cfe0f2; border-radius:6px; background:#36536c; box-shadow:0 3px 0 #16283e; }
    #journal-close:active { transform:translateY(2px); box-shadow:0 1px 0 #16283e; }
    #journal-close:focus-visible { outline:3px solid #ffb45e; outline-offset:3px; }
    #journal-empty { margin:22px 0 4px; padding:18px; text-align:center; font-weight:700;
      border:2px dashed #7892aa; background:#eef6fcaa; }
    #journal-rooms { display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:13px;
      margin-top:16px; }
    .journal-room { padding:13px; background:#eef6fccc; border:2px solid #7892aa;
      border-radius:8px; box-shadow:inset 0 0 0 3px #d5e4f1; }
    .journal-room.is-complete { border-color:#557d67; background:#e5f3ed; }
    .journal-room-head { display:flex; gap:10px; align-items:center; }
    .journal-room h3 { margin:0; flex:1; color:#243548; font-size:16px; }
    .journal-count { font-variant-numeric:tabular-nums; font-size:12px; font-weight:900; color:#4d667c; }
    .journal-stitches { display:flex; flex-wrap:wrap; gap:6px; margin:10px 0; }
    .journal-stitch { width:20px; height:20px; display:grid; place-items:center; color:#7892aa;
      border:2px dashed currentColor; background:#d5e4f1; transform:rotate(-2deg); }
    .journal-stitch:nth-child(even) { transform:rotate(2deg); }
    .journal-stitch.is-found { color:#315e4b; background:#a9ddc7; }
    #journal-notes { margin:14px 0 0; }
    #journal-notes .journal-stitches { margin:6px 0; }
    #journal-notes .journal-stitch.is-found { background:#6fe0b2; }
    #journal-notes .journal-entry-list { display:flex; flex-wrap:wrap; gap:6px 16px; }
    .journal-entry-list { list-style:none; padding:0; margin:0; display:grid; gap:5px; }
    .journal-entry { font-size:13px; color:#486176; }
    .journal-entry.is-found { color:#243548; font-weight:750; }
    .journal-entry::before { content:"□"; display:inline-block; width:20px; font-weight:900; }
    .journal-entry.is-found::before { content:"◆"; color:#315e4b; }
    @media (max-width:520px) {
      #journal-overlay { padding:8px; }
      #journal-book { border-left-width:26px; padding:16px 14px 18px; }
      #journal-book::before { left:-20px; }
      #journal-rooms { grid-template-columns:1fr; }
    }
    @media (prefers-reduced-motion: reduce) { #journal-close { transition:none; } }
  `;
  document.head.appendChild(style);
}

function buildDom() {
  const overlay = document.createElement('div');
  overlay.id = 'journal-overlay';
  overlay.className = 'hidden';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'journal-title');

  const book = document.createElement('section');
  book.id = 'journal-book';
  const header = document.createElement('header');
  header.id = 'journal-header';
  const titleWrap = document.createElement('div');
  titleWrap.id = 'journal-title-wrap';
  const title = document.createElement('h2');
  title.id = 'journal-title';
  title.textContent = 'Curio Log';
  const summary = document.createElement('p');
  summary.id = 'journal-summary';
  summary.setAttribute('aria-live', 'polite');
  titleWrap.append(title, summary);
  const closeBtn = document.createElement('button');
  closeBtn.id = 'journal-close';
  closeBtn.type = 'button';
  closeBtn.textContent = 'Close ✕';
  header.append(titleWrap, closeBtn);
  const body = document.createElement('div');
  body.id = 'journal-body';
  book.append(header, body);
  overlay.appendChild(book);
  document.body.appendChild(overlay);
  return { overlay, body, summary, closeBtn };
}

function roomIds(registry) {
  return [...new Set(registry.map((curio) => curio.roomId))];
}

export function createJournal({ registry, getState, getRoomLabel, getSave }) {
  cb.registry = registry ?? [];
  cb.getState = getState ?? cb.getState;
  cb.getRoomLabel = getRoomLabel ?? cb.getRoomLabel;
  cb.getSave = getSave ?? cb.getSave;
  if (instance) return instance;

  injectStyles();
  const { overlay, body, summary, closeBtn } = buildDom();
  const title = document.getElementById('journal-title');
  let lastFocused = null;
  let introClose = null;

  function refresh() {
    const state = cb.getState?.() ?? { found: {} };
    const save = cb.getSave?.() ?? {};
    const visibleRegistry = cb.registry.filter((curio) =>
      (curio.roomId !== 'moonwell' || save.secrets?.moonwellUnlocked) &&
      (curio.roomId !== 'caverns' || save.secrets?.cavernsUnlocked));
    const total = totalProgress(visibleRegistry.filter((curio) =>
      save.visitedRooms?.includes(curio.roomId)), state);
    summary.textContent = state.isleRewardClaimed
      ? `${total.found} of ${total.total} discoveries — Echoglass Lantern and den trophy earned`
      : total.total ? `${total.found} of ${total.total} discoveries` : 'Your expedition starts here';
    body.replaceChildren();
    const notes = document.createElement('section');
    notes.id = 'journal-notes';
    const noteHeading = document.createElement('strong');
    noteHeading.textContent = 'Three notes';
    const marks = document.createElement('div');
    marks.className = 'journal-stitches';
    const labels = document.createElement('ul');
    labels.className = 'journal-entry-list';
    for (const note of journalNotes(save)) {
      const mark = document.createElement('span');
      mark.className = 'journal-stitch' + (note.held ? ' is-found' : '');
      mark.textContent = note.held ? '×' : '';
      mark.setAttribute('aria-hidden', 'true');
      const label = document.createElement('li');
      label.className = 'journal-entry' + (note.held ? ' is-found' : '');
      label.textContent = note.id[0].toUpperCase() + note.id.slice(1) + ' — ' +
        (note.held ? 'held' : note.place);
      marks.appendChild(mark);
      labels.appendChild(label);
    }
    notes.append(noteHeading, marks, labels);
    body.appendChild(notes);

    if (visibleRegistry.length === 0) {
      const empty = document.createElement('p');
      empty.id = 'journal-empty';
      empty.textContent = 'Blank pages for now. New curios will appear as the isle opens up.';
      body.appendChild(empty);
      return;
    }

    const rooms = document.createElement('div');
    rooms.id = 'journal-rooms';
    for (const roomId of roomIds(visibleRegistry)) {
      const charted = save.visitedRooms?.includes(roomId);
      const progress = roomProgress(visibleRegistry, state, roomId);
      const section = document.createElement('section');
      section.className = `journal-room${charted && progress.complete ? ' is-complete' : ''}`;
      const head = document.createElement('div');
      head.className = 'journal-room-head';
      const heading = document.createElement('h3');
      heading.textContent = charted ? cb.getRoomLabel(roomId) : '??? — uncharted';
      if (!charted) {
        section.appendChild(head);
        head.appendChild(heading);
        rooms.appendChild(section);
        continue;
      }
      const count = document.createElement('span');
      count.className = 'journal-count';
      count.textContent = `${progress.found}/${progress.total}`;
      head.append(heading, count);

      const stitches = document.createElement('div');
      stitches.className = 'journal-stitches';
      stitches.setAttribute('aria-hidden', 'true');
      const list = document.createElement('ul');
      list.className = 'journal-entry-list';
      for (const curio of visibleRegistry.filter((entry) => entry.roomId === roomId)) {
        const found = isCurioFound(state, curio.id);
        const stitch = document.createElement('span');
        stitch.className = `journal-stitch${found ? ' is-found' : ''}`;
        stitch.textContent = found ? '×' : '';
        stitches.appendChild(stitch);
        const item = document.createElement('li');
        item.className = `journal-entry${found ? ' is-found' : ''}`;
        item.textContent = found ? curio.label : 'Undiscovered';
        list.appendChild(item);
      }
      section.append(head, stitches, list);
      rooms.appendChild(section);
    }
    body.appendChild(rooms);
  }

  function close() {
    overlay.classList.add('hidden');
    const onIntroClose = introClose;
    introClose = null;
    onIntroClose?.();
    lastFocused?.focus?.();
    lastFocused = null;
  }

  function open() {
    title.textContent = 'Curio Log';
    closeBtn.textContent = 'Close ✕';
    summary.hidden = false;
    lastFocused = document.activeElement;
    refresh();
    overlay.classList.remove('hidden');
    closeBtn.focus();
  }

  function openIntro(onClose) {
    lastFocused = document.activeElement;
    introClose = onClose;
    title.textContent = 'Your Curio Log';
    summary.hidden = true;
    body.replaceChildren();
    const page = document.createElement('p');
    page.id = 'journal-empty';
    page.textContent = 'You step off the Driftwood Gull with a blank Log and nowhere to be. Edda, who runs the Chirper in Glasswind Court, is looking for someone to fill its pages.';
    body.appendChild(page);
    closeBtn.textContent = 'Step ashore';
    overlay.classList.remove('hidden');
    closeBtn.focus();
  }

  const isOpen = () => !overlay.classList.contains('hidden');
  closeBtn.onclick = close;
  closeOnBackdrop(overlay, close);
  instance = { open, openIntro, close, isOpen, refresh };
  return instance;
}
