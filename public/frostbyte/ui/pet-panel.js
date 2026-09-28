// The pet panel shares the dress-up overlay's cells, swatches and panel chrome.
import { PET_COATS, PET_SCARVES, PET_NAMES, validPet } from '../engine/pet.js';
import { closeOnBackdrop } from './backdrop.js';

let instance = null;
const bound = { save: null, persist: null, onChange: null };
let suggestion = 0;

export function createPetPanel(opts) {
  Object.assign(bound, opts);
  if (instance) return instance;
  const overlay = document.getElementById('pet-overlay');
  const coats = document.getElementById('pet-coats');
  const scarves = document.getElementById('pet-scarves');
  const name = document.getElementById('pet-name');
  const commit = document.getElementById('pet-commit');
  const error = document.getElementById('pet-error');
  const closeButton = document.getElementById('pet-close');
  const images = ['body', 'scarf', 'detail'].map((layer) => {
    const img = new Image();
    img.src = `./assets/snowtail-${layer}.png`;
    img.onload = render;
    return img;
  });
  let coat = 'snow', scarf = 'moss', returnFocus = null;

  function preview(canvas, coatHex) {
    const ctx = canvas.getContext('2d');
    if (!ctx || images.some((img) => !img.complete || !img.naturalWidth)) return;
    ctx.clearRect(0, 0, 48, 48);
    ctx.imageSmoothingEnabled = false;
    for (const [i, tint] of [[0, coatHex], [1, PET_SCARVES[scarf]], [2, null]]) {
      const layer = document.createElement('canvas');
      layer.width = layer.height = 24;
      const part = layer.getContext('2d');
      part.drawImage(images[i], 0, 0, 24, 24, 0, 0, 24, 24);
      if (tint) {
        part.globalCompositeOperation = 'multiply';
        part.fillStyle = tint;
        part.fillRect(0, 0, 24, 24);
        part.globalCompositeOperation = 'destination-in';
        part.drawImage(images[i], 0, 0, 24, 24, 0, 0, 24, 24);
      }
      ctx.drawImage(layer, 0, 0, 24, 24, 0, 0, 48, 48);
    }
  }

  function render() {
    const adopted = Boolean(bound.save?.pet);
    commit.textContent = adopted ? 'Save changes' : `Take ${name.value.trim() || '___'} home`;
    coats.replaceChildren(...Object.entries(PET_COATS).map(([key, color]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cz-cell' + (coat === key ? ' equipped' : '');
      button.setAttribute('aria-pressed', String(coat === key));
      button.setAttribute('aria-label', `${key} coat`);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 48;
      canvas.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.className = 'cz-label';
      label.textContent = key;
      button.append(canvas, label);
      // render() rebuilds the cells, so hand focus back to the new selected cell for keyboard users.
      button.onclick = () => { coat = key; render(); coats.querySelector('[aria-pressed="true"]')?.focus(); };
      preview(canvas, color);
      return button;
    }));
    scarves.replaceChildren(...Object.entries(PET_SCARVES).map(([key, color]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cz-cell' + (scarf === key ? ' equipped' : '');
      button.setAttribute('aria-pressed', String(scarf === key));
      button.setAttribute('aria-label', `${key} scarf`);
      const swatch = document.createElement('span');
      swatch.className = 'cz-swatch';
      swatch.style.background = color;
      const label = document.createElement('span');
      label.className = 'cz-label';
      label.textContent = key;
      button.append(swatch, label);
      button.onclick = () => { scarf = key; render(); scarves.querySelector('[aria-pressed="true"]')?.focus(); };
      return button;
    }));
  }

  function open() {
    returnFocus = document.activeElement;
    coat = bound.save.pet?.coat ?? 'snow';
    scarf = bound.save.pet?.scarf ?? 'moss';
    name.value = bound.save.pet?.name ?? PET_NAMES[suggestion++ % PET_NAMES.length];
    error.textContent = '';
    overlay.classList.remove('hidden');
    render();
    name.focus();
  }
  function close() {
    overlay.classList.add('hidden');
    returnFocus?.focus?.();
  }
  const isOpen = () => !overlay.classList.contains('hidden');
  name.oninput = () => { error.textContent = ''; commit.textContent = bound.save.pet ? 'Save changes' : `Take ${name.value.trim() || '___'} home`; };
  commit.onclick = () => {
    const pet = { coat, scarf, name: name.value.trim(), adoptedOn: bound.save.pet?.adoptedOn ?? new Date().toISOString() };
    if (!validPet(pet)) { error.textContent = 'Use 1–12 letters, spaces or hyphens.'; name.focus(); return; }
    bound.save.pet = pet;
    bound.persist(bound.save);
    bound.onChange(pet);
    close();
  };
  closeButton.onclick = close;
  closeOnBackdrop(overlay, close);
  instance = { open, close, isOpen };
  return instance;
}
