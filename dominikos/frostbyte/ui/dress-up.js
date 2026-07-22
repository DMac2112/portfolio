// ui/dress-up.js — the #customize-overlay controller (Avatar §5). DOM overlay over the canvas
// (same reasoning as game1's dialogue overlay: crisp text, real focus/keyboard). It never touches
// localStorage directly — it calls the economy engine, then the injected persist(), then notifies
// main.js to re-composite the in-game avatar and update the coin HUD.
import { BODY_COLORS, ITEM_CATALOG, EQUIP_SLOTS } from '../content/cosmetics.js';
import { unlockItem, equipItem, setBodyColor } from '../engine/economy.js';

const TABS = [
  { id: 'color', label: 'Color' },
  { id: 'hat', label: 'Hat' },
  { id: 'eyewear', label: 'Eyewear' },
  { id: 'neck', label: 'Neck' },
  { id: 'held', label: 'Held' },
];

// Singleton state (Home Plan §8.1): `k.scene('room', …)` re-runs on every room change and every
// return from a minigame, and each run used to call createDressUp(...) again — the DOM lookups
// were already idempotent (getElementById finds the same #customize-overlay every time), but
// `overlay.addEventListener('keydown', …)` was NOT: it stacked one more listener per scene entry.
// `instance` caches the listeners/render-closures built on the FIRST call ever; `boundOpts` is a
// mutable ref every handler reads through, rebound on EVERY call. This matters beyond hygiene:
// `onChange` in particular closes over that scene's own `avatar` actor, which KAPLAY destroys on
// the next scene switch, so a stale captured `onChange` would re-composite a dead avatar.
let instance = null;
const boundOpts = { save: null, persist: null, onChange: null };

export function createDressUp(opts) {
  Object.assign(boundOpts, opts); // rebind every call, even repeats
  if (instance) return instance; // already built: DOM listeners stay exactly as they are

  const overlay = document.getElementById('customize-overlay');
  const coinsEl = document.getElementById('customize-coins');
  const tabsEl = document.getElementById('customize-tabs');
  const gridEl = document.getElementById('customize-grid');
  const closeBtn = document.getElementById('customize-close');
  let activeTab = 'color';

  const isEquipped = (tab, id) =>
    tab === 'color' ? boundOpts.save.avatar.bodyColorId === id : boundOpts.save.avatar.equipped[tab] === id;

  function commit() {
    boundOpts.persist(boundOpts.save);
    boundOpts.onChange(boundOpts.save);      // main.js: re-composite avatar + refresh coin HUD
    render();
  }

  function onCellClick(tab, entry) {
    const owned = boundOpts.save.ownedItems.includes(entry.id);
    if (entry.rewardOnly && !owned) return;
    const ev = [];
    if (!owned) {
      if (!unlockItem(boundOpts.save, entry.id, entry.price, ev)) return; // can't afford: no-op
    }
    if (tab === 'color') setBodyColor(boundOpts.save, entry.id, ev);
    else equipItem(boundOpts.save, tab, entry.id, ev);
    commit();
  }

  function render() {
    coinsEl.textContent = `${boundOpts.save.coins} coins`;

    tabsEl.replaceChildren(...TABS.map((t) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = t.label;
      b.className = 'cz-tab' + (t.id === activeTab ? ' active' : '');
      b.onclick = () => { activeTab = t.id; render(); };
      return b;
    }));

    const entries = activeTab === 'color' ? BODY_COLORS : ITEM_CATALOG.filter((i) =>
      i.slot === activeTab && (!i.rewardOnly || boundOpts.save.ownedItems.includes(i.id)));
    gridEl.replaceChildren(...entries.map((entry) => {
      const owned = boundOpts.save.ownedItems.includes(entry.id);
      const equipped = isEquipped(activeTab, entry.id);
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cz-cell' + (equipped ? ' equipped' : '') + (owned ? '' : ' locked');
      const swatch = activeTab === 'color'
        ? `<span class="cz-swatch" style="background:${entry.hex}"></span>`
        : `<span class="cz-swatch cz-item" style="--tint:${entry.tint}"></span>`;
      const state = equipped ? 'Equipped' : owned ? 'Equip' : `${entry.price}c`;
      cell.innerHTML = `${swatch}<span class="cz-label">${entry.label}</span><span class="cz-state">${state}</span>`;
      cell.setAttribute('aria-label', `${entry.label}${owned ? '' : `, ${entry.price} coins`}${equipped ? ', equipped' : ''}`);
      cell.onclick = () => onCellClick(activeTab, entry);
      return cell;
    }));
  }

  function open() { activeTab = 'color'; overlay.classList.remove('hidden'); render(); closeBtn.focus(); }
  function close() { overlay.classList.add('hidden'); }
  const isOpen = () => !overlay.classList.contains('hidden');

  closeBtn.onclick = close;
  overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  instance = { open, close, isOpen, render };
  return instance;
}
