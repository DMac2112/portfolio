// Five dots per side make 40 edges and 16 boxes. Edges are horizontal first.
export const DOTS = 5;
export const LINE_COUNT = 40;
const BOX_COUNT = 16;

export function createGame() {
  return { lines: Array(LINE_COUNT).fill(null), boxes: Array(BOX_COUNT).fill(null), turn: 'you' };
}

export function legalLines(state) {
  return state.lines.flatMap((owner, index) => owner === null ? [index] : []);
}

export function boxLines(box) {
  const row = Math.floor(box / 4);
  const col = box % 4;
  return [row * 4 + col, (row + 1) * 4 + col, 20 + row * 5 + col, 20 + row * 5 + col + 1];
}

function adjacentBoxes(line) {
  const found = [];
  for (let box = 0; box < BOX_COUNT; box++) if (boxLines(box).includes(line)) found.push(box);
  return found;
}

export function applyLine(state, line) {
  if (!Number.isInteger(line) || line < 0 || line >= LINE_COUNT || state.lines[line] !== null || isOver(state)) {
    throw new RangeError('Line is not available');
  }
  const lines = state.lines.slice();
  const boxes = state.boxes.slice();
  lines[line] = state.turn;
  const boxesCompleted = adjacentBoxes(line).filter((box) =>
    boxes[box] === null && boxLines(box).every((edge) => lines[edge] !== null));
  for (const box of boxesCompleted) boxes[box] = state.turn;
  const extraTurn = boxesCompleted.length > 0;
  return { state: { lines, boxes, turn: extraTurn ? state.turn : state.turn === 'you' ? 'tove' : 'you' },
    boxesCompleted, extraTurn };
}

export function toveMove(state, rng = Math.random) {
  if (state.turn !== 'tove' || isOver(state)) return null;
  const lines = legalLines(state);
  const risk = (line) => adjacentBoxes(line).reduce((count, box) => {
    const sides = boxLines(box).filter((edge) => state.lines[edge] !== null).length;
    return count + (sides === 3 ? -100 : sides === 2 ? 1 : 0);
  }, 0);
  const best = Math.min(...lines.map(risk));
  const choices = lines.filter((line) => risk(line) === best);
  return choices[Math.min(choices.length - 1, Math.max(0, Math.floor(rng() * choices.length)))];
}

export function score(state) {
  return { you: state.boxes.filter((owner) => owner === 'you').length,
    tove: state.boxes.filter((owner) => owner === 'tove').length };
}

export function isOver(state) {
  return state.lines.every((owner) => owner !== null);
}
