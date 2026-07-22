// content/cosmetics.js — DATA, not logic (Avatar §4). Body colours, equip items, emotes.
// All names/prices/art are original. Prices feed the economy engine; ids feed avatar-layers +
// gen-assets (sprite key `${slot}-${id}`, asset `assets/cosmetics/${slot}-${id}.png`).

/**
 * @typedef {Object} BodyColor
 * @property {string} id       kebab-case unique
 * @property {string} label
 * @property {string} hex      body tint (grayscale body sheet is multiplied by this)
 * @property {number} price    coins; 0 for starters
 * @property {boolean} starter owned at save creation
 */
export const BODY_COLORS = [
  // 4 free starters
  { id: 'classic-charcoal', label: 'Classic Charcoal', hex: '#2b3346', price: 0, starter: true },
  { id: 'powder-blue', label: 'Powder Blue', hex: '#8fb8d8', price: 0, starter: true },
  { id: 'blush-pink', label: 'Blush Pink', hex: '#e6a8bd', price: 0, starter: true },
  { id: 'mint', label: 'Mint', hex: '#a8dcc0', price: 0, starter: true },
  // 8 unlockable dyes (15c each)
  { id: 'frost-blue', label: 'Frost Blue', hex: '#6fb8e8', price: 15, starter: false },
  { id: 'berry', label: 'Berry', hex: '#b0416a', price: 15, starter: false },
  { id: 'moss', label: 'Moss', hex: '#6a8a4a', price: 15, starter: false },
  { id: 'sunrise-orange', label: 'Sunrise Orange', hex: '#e8894a', price: 15, starter: false },
  { id: 'lilac', label: 'Lilac', hex: '#b89ad8', price: 15, starter: false },
  { id: 'slate', label: 'Slate', hex: '#607088', price: 15, starter: false },
  { id: 'harbor-gold', label: 'Harbor Gold', hex: '#d8a838', price: 15, starter: false },
  { id: 'deep-teal', label: 'Deep Teal', hex: '#2a7a7a', price: 15, starter: false },
];

/**
 * @typedef {Object} ItemDef
 * @property {string} id
 * @property {'hat'|'eyewear'|'neck'|'held'} slot
 * @property {string} label
 * @property {'common'|'uncommon'|'rare'|'epic'} rarity
 * @property {number} price
 * @property {string} tint  overlay tint hex (cosmetic sheets are grayscale, recoloured per item)
 * @property {boolean} [rewardOnly] hidden from shops until earned
 */
export const ITEM_CATALOG = [
  // hats
  { id: 'snug-beanie', slot: 'hat', label: 'Snug Beanie', rarity: 'common', price: 20, tint: '#c0523a' },
  { id: 'party-cone', slot: 'hat', label: 'Party Cone', rarity: 'common', price: 20, tint: '#f2c14e' },
  { id: 'propeller-cap', slot: 'hat', label: 'Propeller Cap', rarity: 'uncommon', price: 35, tint: '#4f9dde' },
  { id: 'ice-crown', slot: 'hat', label: 'Ice Crown', rarity: 'rare', price: 60, tint: '#a8e6ff' },
  // eyewear
  { id: 'round-shades', slot: 'eyewear', label: 'Round Shades', rarity: 'common', price: 15, tint: '#1a1e28' },
  { id: 'star-specs', slot: 'eyewear', label: 'Star Specs', rarity: 'uncommon', price: 30, tint: '#f2c14e' },
  { id: 'goggles', slot: 'eyewear', label: 'Goggles', rarity: 'uncommon', price: 30, tint: '#6a8a4a' },
  // neck
  { id: 'striped-scarf', slot: 'neck', label: 'Striped Scarf', rarity: 'common', price: 15, tint: '#b0416a' },
  { id: 'bandana', slot: 'neck', label: 'Bandana', rarity: 'common', price: 15, tint: '#4f9dde' },
  { id: 'bowtie', slot: 'neck', label: 'Bowtie', rarity: 'uncommon', price: 30, tint: '#8a3a3a' },
  // held
  { id: 'mini-flag', slot: 'held', label: 'Mini Flag', rarity: 'uncommon', price: 40, tint: '#d64f4f' },
  { id: 'bubble-wand', slot: 'held', label: 'Bubble Wand', rarity: 'uncommon', price: 40, tint: '#7fd6ff' },
  { id: 'snowball', slot: 'held', label: 'Snowball', rarity: 'uncommon', price: 40, tint: '#eef4fa' },
  { id: 'sparkler-wand', slot: 'held', label: 'Sparkler Wand', rarity: 'epic', price: 120, tint: '#ffe08a' },
  {
    id: 'echoglass-lantern', slot: 'held', label: 'Echoglass Lantern', rarity: 'epic', price: 0,
    tint: '#72e2bd', rewardOnly: true,
  },
];

/** All equip slots (Avatar §4). Body colour is a direct property, not a slot. */
export const EQUIP_SLOTS = ['hat', 'eyewear', 'neck', 'held'];

/**
 * @typedef {Object} EmoteDef
 * @property {string} id
 * @property {string|null} icon  gen-assets icon sprite key, or null
 * @property {'bob'|'wiggle'|'squash'|'none'} tween
 */
export const EMOTES = [
  { id: 'wave', icon: 'icon-wave', tween: 'bob' },
  { id: 'dance', icon: 'icon-note', tween: 'wiggle' },
  { id: 'sit', icon: null, tween: 'squash' },
  { id: 'sleep', icon: 'icon-zzz', tween: 'none' },
  { id: 'heart', icon: 'icon-heart', tween: 'bob' },
];

// Convenience lookups (pure).
export function itemById(id) {
  return ITEM_CATALOG.find((i) => i.id === id) ?? null;
}
export function bodyColorById(id) {
  return BODY_COLORS.find((c) => c.id === id) ?? null;
}
export function starterDyeIds() {
  return BODY_COLORS.filter((c) => c.starter).map((c) => c.id);
}
