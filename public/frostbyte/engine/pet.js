// Pure snowtail rules shared by the save, world and adoption panel.
export const PET_COATS = Object.freeze({ snow: '#f4f8fb', frost: '#bcd3e6', soot: '#5b6470', fox: '#d9824a' });
export const PET_SCARVES = Object.freeze({ moss: '#6f8f4e', mustard: '#d8a23a', berry: '#b5405a', sky: '#7fb3d9', plum: '#7a4f86', cream: '#efe3c8' });
export const PET_NAMES = Object.freeze(['Tuft', 'Drift', 'Puff', 'Pip', 'Ember', 'Sleet']);

export function validPet(pet) {
  return Boolean(pet && typeof pet === 'object' && !Array.isArray(pet) &&
    Object.hasOwn(PET_COATS, pet.coat) && Object.hasOwn(PET_SCARVES, pet.scarf) &&
    typeof pet.name === 'string' && pet.name === pet.name.trim() &&
    /^[A-Za-z][A-Za-z -]{0,11}$/.test(pet.name) &&
    typeof pet.adoptedOn === 'string' && Number.isFinite(Date.parse(pet.adoptedOn)));
}

// Trail is ordered oldest to newest and contains the player's resolved feet positions.
export function followStep(trail, lagPx) {
  if (!Array.isArray(trail) || !trail.length) return null;
  let remaining = Math.max(0, Number.isFinite(lagPx) ? lagPx : 0);
  for (let i = trail.length - 1; i > 0; i--) {
    const a = trail[i - 1], b = trail[i];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    if (length >= remaining && length > 0) {
      const t = 1 - remaining / length;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    remaining -= length;
  }
  return { x: trail[0].x, y: trail[0].y };
}

export function sniff(petPos, curios, foundIds, sniffedIds, radius) {
  if (!petPos || !Array.isArray(curios) || !Number.isFinite(radius) || radius < 0) return null;
  let nearest = null, best = radius * radius;
  for (const curio of curios) {
    const id = curio.curioId ?? curio.id;
    if (!id || foundIds?.[id] || sniffedIds?.has?.(id) || !Number.isFinite(curio.x) || !Number.isFinite(curio.y)) continue;
    const d = (curio.x - petPos.x) ** 2 + (curio.y - petPos.y) ** 2;
    if (d <= best) { nearest = id; best = d; }
  }
  return nearest;
}
