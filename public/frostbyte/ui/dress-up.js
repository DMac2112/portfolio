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

export function createDressUp({ save, persist, onChange }) {
  const overlay = document.getElementById('customize-overlay');
  const coinsEl = document.getElementById('customize-coins');
  const tabsEl = document.getElementById('customize-tabs');
  const gridEl = document.getElementById('customize-grid');
  const closeBtn = document.getElementById('customize-close');
  let activeTab = 'color';

  const isEquipped = (tab, id) =>
    tab === 'color' ? save.avatar.bodyColorId === id : save.avatar.equipped[tab] === id;

  function commit() {
    persist(save);
    onChange(save);      // main.js: re-composite avatar + refresh coin HUD
    render();
  }

  function onCellClick(tab, entry) {
    const owned = save.ownedItems.includes(entry.id);
    const ev = [];
    if (!owned) {
      if (!unlockItem(save, entry.id, entry.price, ev)) return; // can't afford: no-op
    }
    if (tab === 'color') setBodyColor(save, entry.id, ev);
    else equipItem(save, tab, entry.id, ev);
    commit();
  }

  function render() {
    coinsEl.textContent = `${save.coins} coins`;

    tabsEl.replaceChildren(...TABS.map((t) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = t.label;
      b.className = 'cz-tab' + (t.id === activeTab ? ' active' : '');
      b.onclick = () => { activeTab = t.id; render(); };
      return b;
    }));

    const entries = activeTab === 'color' ? BODY_COLORS : ITEM_CATALOG.filter((i) => i.slot === activeTab);
    gridEl.replaceChildren(...entries.map((entry) => {
      const owned = save.ownedItems.includes(entry.id);
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

  return { open, close, isOpen, render };
}
