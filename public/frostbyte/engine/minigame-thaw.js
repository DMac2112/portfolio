export const MAX_COINS = 20;

// Routes are stored as steps through each hand-built floor, including the final thick-tile return.
export const FLOORS = [
  { rows: ['S.....', '......', '......', '......', '.....E'], solution: 'R5 D1 L5 D1 R5 D1 L5 D1 R5' },
  { rows: ['S......', '.......', '.......', '.......', '......E'], solution: 'R6 D1 L6 D1 R6 D1 L6 D1 R6' },
  { rows: ['S.......', '........', '........', '........', '........', 'E.......'], solution: 'R7 D1 L7 D1 R7 D1 L7 D1 R7 D1 L7' },
  { rows: ['S........', '.........', '.........', '.........', '.........', '.........', '........E'], solution: 'R8 D1 L8 D1 R8 D1 L8 D1 R8 D1 L8 D1 R8' },
  { rows: ['S.........', '#########.', '..........', '.#########', '..........', '#E#######.', '.2........'], solution: 'R9 D2 L9 D2 R9 D2 L9 R1 U1' },
];

const DIRECTIONS = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
const keyOf = (x, y) => `${x},${y}`;

export function solutionSteps(floor) {
  return floor.solution.split(' ').flatMap((run) => Array(Number(run.slice(1))).fill(run[0]));
}

export function newGame(floorIndex = 0, coins = 0) {
  const floor = FLOORS[floorIndex];
  const tiles = floor.rows.map((row) => [...row].map((tile) => tile === '#' ? 0 : tile === '2' ? 2 : 1));
  const y = floor.rows.findIndex((row) => row.includes('S'));
  const x = floor.rows[y].indexOf('S');
  return { floorIndex, tiles, x, y, path: [keyOf(x, y)], coins, phase: 'play', event: null, fullCoverage: false };
}

export function legalMoves(state) {
  if (state.phase !== 'play') return [];
  return Object.entries(DIRECTIONS).filter(([, [dx, dy]]) => state.tiles[state.y + dy]?.[state.x + dx] > 0).map(([direction]) => direction);
}

export function restart(state) {
  return { ...newGame(state.floorIndex, state.coins), event: 'refreeze' };
}

export function nextFloor(state) {
  return state.phase === 'clear' ? newGame(state.floorIndex + 1, state.coins) : state;
}

export function move(state, direction) {
  if (state.phase !== 'play' || !legalMoves(state).includes(direction)) return state;
  const [dx, dy] = DIRECTIONS[direction];
  const x = state.x + dx;
  const y = state.y + dy;
  const tiles = state.tiles.map((row) => [...row]);
  tiles[state.y][state.x]--;
  const path = [...state.path, keyOf(x, y)];
  if (FLOORS[state.floorIndex].rows[y][x] === 'E') {
    tiles[y][x] = 0;
    const fullCoverage = tiles.every((row) => row.every((tile) => tile === 0));
    return { ...state, x, y, tiles, path, fullCoverage,
      coins: Math.min(MAX_COINS, state.coins + 2 + (fullCoverage ? 2 : 0)),
      phase: state.floorIndex === FLOORS.length - 1 ? 'won' : 'clear', event: 'clear' };
  }
  const moved = { ...state, x, y, tiles, path, event: null };
  return legalMoves(moved).length ? moved : restart(moved);
}
