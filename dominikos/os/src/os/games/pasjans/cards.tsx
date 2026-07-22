// Pasjans card art — pure presentational SVG React components, ALL ORIGINAL artwork drawn in
// code for this project (traditional suit symbols and pip layouts are centuries-old public
// domain; the court-card portraits and the card back are our own designs — copy nothing from
// any existing deck, digital or physical).
//
// Design notes (all coordinates original, viewBox 0 0 100 140):
//   · warm print-like face #fdfdf6 with a thin #b9b9ad inset frame; the OUTER rounded corners
//     come from the UI container's CSS, so the art fills the whole viewBox
//   · pips 2–10 use the classic symmetric grids (columns x=30/50/70, lower half rotated 180°)
//     driven by a per-rank position table — no ad-hoc math
//   · J/Q/K are flat abstract-geometric "portraits" in a gold-framed panel: J = diagonal band
//     + badge, Q = petal rosette, K = chevron crown — no people, no borrowed designs
//   · the back is a navy diamond lattice with a faint italic DM monogram
//
// ============================ CONTRACT (LOCKED) ============================
// The UI builds against exactly these exports. Cards render crisply from ~55px to ~120px wide.
// ==========================================================================
import type { Card, Suit } from './engine';

/** height = width * CARD_RATIO everywhere */
export const CARD_RATIO = 1.4;

export const SUIT_GLYPH: Record<Suit, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };
export const RANK_LABEL = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const RED = '#c8102e';
const BLACK = '#1c1c1c';
const GOLD = '#d8b23a';
const FACE = '#fdfdf6';
const FACE_EDGE = '#b9b9ad';
const PANEL = '#f7f3e2';
const SERIF = 'Georgia, "Times New Roman", serif';

const SUIT_NAME: Record<Suit, string> = { S: 'spades', H: 'hearts', D: 'diamonds', C: 'clubs' };
const RANK_NAME = ['', 'ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king'];

function suitColor(suit: Suit): string {
  return suit === 'H' || suit === 'D' ? RED : BLACK;
}

/** Accessible name, e.g. "queen of hearts". */
export function cardLabel(card: Card): string {
  return `${RANK_NAME[card.rank]} of ${SUIT_NAME[card.suit]}`;
}

// Classic pip grids, one [x, y] list per rank 2–10. Everything strictly below the card's
// vertical center (y > 70) renders rotated 180° so the lower half mirrors the upper half.
const Y1 = 38;   // top row
const Y2 = 70;   // center row
const Y3 = 102;  // bottom row (mirror of Y1)
const Y4A = 59.3, Y4B = 80.7;   // the four-row grid used by 9 and 10
const PIP_GRID: Record<number, ReadonlyArray<readonly [number, number]>> = {
  2: [[50, Y1], [50, Y3]],
  3: [[50, Y1], [50, Y2], [50, Y3]],
  4: [[30, Y1], [70, Y1], [30, Y3], [70, Y3]],
  5: [[30, Y1], [70, Y1], [50, Y2], [30, Y3], [70, Y3]],
  6: [[30, Y1], [70, Y1], [30, Y2], [70, Y2], [30, Y3], [70, Y3]],
  7: [[30, Y1], [70, Y1], [50, 54], [30, Y2], [70, Y2], [30, Y3], [70, Y3]],
  8: [[30, Y1], [70, Y1], [50, 54], [30, Y2], [70, Y2], [50, 86], [30, Y3], [70, Y3]],
  9: [[30, Y1], [70, Y1], [30, Y4A], [70, Y4A], [50, Y2], [30, Y4B], [70, Y4B], [30, Y3], [70, Y3]],
  10: [[30, Y1], [70, Y1], [50, 48.7], [30, Y4A], [70, Y4A], [30, Y4B], [70, Y4B], [50, 91.3], [30, Y3], [70, Y3]],
};

/** One suit glyph as a <text> node; glyphs in the lower half arrive pre-rotated. */
function pip(suit: Suit, x: number, y: number, size: number, color: string, key: string): JSX.Element {
  return (
    <text
      key={key}
      x={x} y={y}
      fontSize={size}
      fontFamily={SERIF}
      fill={color}
      textAnchor="middle"
      dominantBaseline="central"
      transform={y > 70 ? `rotate(180 ${x} ${y})` : undefined}
    >
      {SUIT_GLYPH[suit]}
    </text>
  );
}

/** Rank over suit, drawn at the top-left; the caller rotates a second copy to bottom-right. */
function cornerIndex(suit: Suit, rank: number, color: string): JSX.Element {
  return (
    <g>
      <text
        x={11} y={11}
        fontSize={13}
        fontWeight={700}
        fontFamily={SERIF}
        fill={color}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {RANK_LABEL[rank]}
      </text>
      <text x={11} y={24} fontSize={11} fontFamily={SERIF} fill={color} textAnchor="middle" dominantBaseline="central">
        {SUIT_GLYPH[suit]}
      </text>
    </g>
  );
}

/** Gold-framed portrait panel shared by J/Q/K (frame + inner hairline). */
function courtPanel(color: string): JSX.Element {
  return (
    <g>
      <rect x={28} y={38} width={44} height={64} fill={PANEL} stroke={GOLD} strokeWidth={1.5} />
      <rect x={31} y={41} width={38} height={58} fill="none" stroke={color} strokeWidth={0.75} />
    </g>
  );
}

/** Jack: one diagonal band across the panel, a suit glyph and a small gold badge. */
function jackArt(suit: Suit, color: string): JSX.Element {
  return (
    <g>
      {courtPanel(color)}
      <polygon points="28,98 28,84 72,46 72,60" fill={color} />
      <rect x={35} y={45} width={9} height={9} fill={GOLD} stroke={color} strokeWidth={0.75} />
      {pip(suit, 58, 89, 14, color, 'j-pip')}
    </g>
  );
}

/** Queen: symmetric four-petal rosette with gold diamonds between the petals. */
function queenArt(suit: Suit, color: string): JSX.Element {
  return (
    <g>
      {courtPanel(color)}
      <polygon points="50,46 55,60 50,64 45,60" fill={color} />
      <polygon points="50,94 55,80 50,76 45,80" fill={color} />
      <polygon points="34,70 44,65 48,70 44,75" fill={color} />
      <polygon points="66,70 56,65 52,70 56,75" fill={color} />
      <polygon points="58,58 61,61 58,64 55,61" fill={GOLD} />
      <polygon points="42,58 45,61 42,64 39,61" fill={GOLD} />
      <polygon points="58,82 61,79 58,76 55,79" fill={GOLD} />
      <polygon points="42,82 45,79 42,76 39,79" fill={GOLD} />
      {pip(suit, 50, 70, 10, color, 'q-pip')}
    </g>
  );
}

/** King: chevron crown — three triangles on a gold band — under a suit glyph. */
function kingArt(suit: Suit, color: string): JSX.Element {
  return (
    <g>
      {courtPanel(color)}
      {pip(suit, 50, 51, 14, color, 'k-pip')}
      <polygon points="34,82 44,82 39,64" fill={color} />
      <polygon points="45,82 55,82 50,60" fill={color} />
      <polygon points="56,82 66,82 61,64" fill={color} />
      <rect x={34} y={82} width={32} height={7} fill={GOLD} />
      <rect x={34} y={91} width={32} height={2} fill={color} />
    </g>
  );
}

/** Rank-appropriate center art: big Ace pip, classic pip grid, or a court portrait. */
function centerArt(suit: Suit, rank: number, color: string): JSX.Element {
  if (rank === 1) return pip(suit, 50, 70, 34, color, 'ace');
  if (rank === 11) return jackArt(suit, color);
  if (rank === 12) return queenArt(suit, color);
  if (rank === 13) return kingArt(suit, color);
  return <g>{PIP_GRID[rank].map(([x, y], i) => pip(suit, x, y, 16, color, `p${i}`))}</g>;
}

/** Face-up card: corner indices (top-left + rotated bottom-right), pips 2–10, big Ace pip,
 *  original geometric court designs for J/Q/K. Red #c8102e, black #1c1c1c, face #fdfdf6. */
export function CardFace({ suit, rank, width }: { suit: Suit; rank: number; width: number }): JSX.Element {
  const color = suitColor(suit);
  return (
    <svg width={width} height={width * CARD_RATIO} viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x={0} y={0} width={100} height={140} fill={FACE} />
      <rect x={2} y={2} width={96} height={136} rx={3.5} fill="none" stroke={FACE_EDGE} strokeWidth={1.5} />
      {cornerIndex(suit, rank, color)}
      <g transform="rotate(180 50 70)">{cornerIndex(suit, rank, color)}</g>
      {centerArt(suit, rank, color)}
    </svg>
  );
}

/** Face-down card: original navy lattice/diamond back with a subtle DM monogram center. */
export function CardBack({ width }: { width: number }): JSX.Element {
  return (
    <svg width={width} height={width * CARD_RATIO} viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        {/* crossing diagonals tile into a diamond lattice; every back shares this one pattern */}
        <pattern id="dm-card-lattice" width={12} height={12} patternUnits="userSpaceOnUse">
          <path d="M0 0 L12 12 M12 0 L0 12" stroke="#2f55b8" strokeWidth={1} fill="none" />
        </pattern>
      </defs>
      <rect x={0} y={0} width={100} height={140} fill="#1f3f8f" />
      <rect x={5} y={5} width={90} height={130} fill="url(#dm-card-lattice)" />
      <rect x={1.25} y={1.25} width={97.5} height={137.5} rx={3.5} fill="none" stroke="#cfd8f2" strokeWidth={1.5} />
      <rect x={5} y={5} width={90} height={130} fill="none" stroke="#16306e" strokeWidth={1} />
      <text
        x={50} y={70}
        fontSize={30}
        fontFamily={SERIF}
        fontStyle="italic"
        fill="#cfd8f2"
        opacity={0.18}
        textAnchor="middle"
        dominantBaseline="central"
      >
        DM
      </text>
    </svg>
  );
}
