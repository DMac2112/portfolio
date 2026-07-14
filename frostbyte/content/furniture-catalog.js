// content/furniture-catalog.js — Home furnishings (H2 furniture economy).
// Ids/labels/prices/art are original. Sprite dims are native px; world display x3.
// Asset path: ./assets/furniture/${id}.png (built by parallel agent).

/**
 * @typedef {Object} FurnitureItem
 * @property {string} id       kebab-case unique identifier
 * @property {string} label    human-readable name
 * @property {string} cls      category (seating|tables|lighting|rugs|decor|tech)
 * @property {number} price    coins; 50–800 inclusive
 * @property {number} w        native sprite width (px)
 * @property {number} h        native sprite height (px)
 */

export const FURNITURE_CLASSES = ['seating', 'tables', 'lighting', 'rugs', 'decor', 'tech'];

export const MAX_PLACED = 30;  // per-home cap (perf + save size)

/**
 * Complete furniture catalog: 19 home furnishing items across 6 categories.
 * @type {FurnitureItem[]}
 */
export const FURNITURE_CATALOG = [
  // seating (4)
  { id: 'snow-sofa', label: 'Snow Sofa', cls: 'seating', price: 350, w: 32, h: 24 },
  { id: 'ice-stool', label: 'Ice Stool', cls: 'seating', price: 80, w: 16, h: 16 },
  { id: 'bean-drift-chair', label: 'Bean-Drift Chair', cls: 'seating', price: 220, w: 24, h: 20 },
  { id: 'log-bench', label: 'Log Bench', cls: 'seating', price: 130, w: 32, h: 16 },
  // tables (2)
  { id: 'ice-slab-table', label: 'Ice-Slab Table', cls: 'tables', price: 300, w: 32, h: 20 },
  { id: 'driftwood-side-table', label: 'Driftwood Side Table', cls: 'tables', price: 150, w: 20, h: 16 },
  // lighting (3)
  { id: 'glowlamp', label: 'Glowlamp', cls: 'lighting', price: 200, w: 16, h: 28 },
  { id: 'aurora-lantern', label: 'Aurora Lantern', cls: 'lighting', price: 320, w: 16, h: 24 },
  { id: 'string-lights', label: 'String Lights', cls: 'lighting', price: 260, w: 48, h: 12 },
  // rugs (3)
  { id: 'oval-knit-rug', label: 'Oval Knit Rug', cls: 'rugs', price: 180, w: 48, h: 32 },
  { id: 'fish-rug', label: 'Fish Rug', cls: 'rugs', price: 240, w: 40, h: 28 },
  { id: 'star-rug', label: 'Star Rug', cls: 'rugs', price: 400, w: 36, h: 36 },
  // decor (4)
  { id: 'frost-fern', label: 'Frost Fern', cls: 'decor', price: 120, w: 16, h: 28 },
  { id: 'snow-bonsai', label: 'Snowdrift Bonsai', cls: 'decor', price: 280, w: 20, h: 24 },
  { id: 'penguin-portrait', label: 'Penguin Portrait', cls: 'decor', price: 500, w: 24, h: 28 },
  { id: 'trophy-shelf', label: 'Trophy Shelf', cls: 'decor', price: 450, w: 32, h: 20 },
  // tech (3)
  { id: 'snowputer', label: 'Snowputer', cls: 'tech', price: 800, w: 24, h: 24 },
  { id: 'record-box', label: 'Record Box', cls: 'tech', price: 380, w: 20, h: 20 },
  { id: 'cocoa-machine', label: 'Cocoa Machine', cls: 'tech', price: 550, w: 20, h: 28 },
];

/**
 * Look up a furniture item by id.
 * @param {string} id
 * @returns {FurnitureItem|undefined}
 */
export function furnitureById(id) {
  return FURNITURE_CATALOG.find((item) => item.id === id);
}

/**
 * Get all furniture items in a given class.
 * @param {string} cls
 * @returns {FurnitureItem[]}
 */
export function byClass(cls) {
  return FURNITURE_CATALOG.filter((item) => item.cls === cls);
}

/**
 * Get the sprite asset path for a furniture item.
 * @param {string} id
 * @returns {string} path like './assets/furniture/snow-sofa.png'
 */
export function spritePathFor(id) {
  return `./assets/furniture/${id}.png`;
}
